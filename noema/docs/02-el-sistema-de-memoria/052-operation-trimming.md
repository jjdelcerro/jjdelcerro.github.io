
# `TrimmingOperation`: podado de resultados de herramientas

## 1. Propósito y responsabilidad

La operación `TrimmingOperation` es responsable de reducir el tamaño de los resultados de herramientas excesivamente largos que han sido almacenados en la memoria reciente y que, de otro modo, saturarían la ventana de contexto del LLM. Su objetivo es preservar la información esencial (metadatos, cabeceras, referencias) mientras descarta el cuerpo de datos masivo que ya ha sido procesado por el modelo en turnos anteriores.

Esta operación se ejecuta con prioridad 10, después de `PinnedTurnsOperation` (que fija mensajes importantes) y antes de `PendingAnnotationOperation` (que detecta recursos sin anotar). Esto asegura que los mensajes fijados no se vean afectados por la poda, y que la operación de anotación pueda trabajar con los metadatos de los recursos podados para determinar si el modelo ha extraído el conocimiento necesario.

La poda no es destructiva sobre el historial persistente: solo afecta a la proyección efímera que ve el LLM en cada turno. La memoria reciente y la memoria episódica conservan los resultados completos (aunque en la memoria episódica los resultados largos ya están truncados a 2KB; la poda actúa sobre la copia en memoria reciente que aún contiene el texto completo durante el turno activo).

## 2. Comportamiento general

`TrimmingOperation` actúa durante la fase de construcción de la memoria proyectada, específicamente en el pipeline de operaciones. Su comportamiento se resume en los siguientes pasos:

1.  **Iteración**: recorre todos los mensajes de la lista de mensajes proyectados (`projectedMessages`).
2.  **Identificación**: identifica aquellos mensajes que son `ToolExecutionResultMessage`.
3.  **Evaluación**: para cada resultado de herramienta, verifica si el tamaño de su contenido textual (`text`) supera un umbral configurable (por defecto, 1024 caracteres).
4.  **Poda**: si el tamaño supera el umbral, obtiene la herramienta asociada (`AgentTool`) mediante `memory.getTool(toolName)` y llama a `tool.trimResult(text, TrimResultType.Trim)`.
5.  **Reemplazo**: si el resultado del recorte no es `null`, reemplaza el mensaje original en la proyección por el nuevo mensaje recortado.

La operación no modifica la memoria reciente ni la memoria episódica; actúa exclusivamente sobre la copia de trabajo que se enviará al LLM.

## 3. Criterios de poda

La decisión de podar un mensaje se basa en dos criterios:

- **Tipo de mensaje**: solo se consideran los mensajes de tipo `ToolExecutionResultMessage`. Los mensajes de usuario, respuestas del modelo y otros tipos no se ven afectados.
- **Tamaño del contenido**: el contenido textual del mensaje (`message.text()`) debe superar un umbral de tamaño, configurable mediante `minimumSizeForTrim`. Por defecto, este umbral es de 1024 caracteres.

Estos criterios se aplican en `TrimmingOperation.process()`:

```java
if (message instanceof ToolExecutionResultMessage toolResult) {
    AgentTool tool = memory.getTool(toolResult.toolName());
    if (tool != null) {
        String text = toolResult.text();
        if (text != null && text.length() > this.minimumSizeForTrim) {
            String trimmedText = tool.trimResult(text, TrimResultType.Trim);
            if (trimmedText != null) {
                ToolExecutionResultMessage trimmedMessage = ToolExecutionResultMessage.from(
                        toolResult.id(),
                        toolResult.toolName(),
                        trimmedText
                );
                projectedMessages.set(i, trimmedMessage);
            }
        }
    }
}
```

El umbral predeterminado (1024 caracteres) es un equilibrio entre preservar información suficiente para el modelo y evitar la saturación del contexto. Puede ajustarse en la construcción de la operación, aunque actualmente no es configurable a través de `settings.json`.

## 4. El método `trimResult` y el contrato de las herramientas

La poda se delega en la propia herramienta a través del método `trimResult(String result, TrimResultType trimResultType)`. Este método está definido en la interfaz `AgentTool` y su implementación por defecto en `AbstractAgentTool` devuelve `null` (es decir, no realiza ninguna poda). Las herramientas que necesitan un comportamiento de poda específico deben sobrescribir este método.

La clase base `AbstractPaginatedAgentTool` proporciona una implementación por defecto para herramientas paginadas. Esta implementación:

- **Analiza la estructura de la respuesta**: asume que la respuesta sigue el formato de paginación (cabecera + separador `---` + contenido).
- **Recorta el contenido**: si `trimResultType` es `TrimResultType.Trim`, elimina el cuerpo de la respuesta, conservando únicamente la cabecera y añadiendo un campo `CONTENT_TRIMMED: true` para indicar que el contenido ha sido recortado. El formato resultante es:

```
STATUS: ok
EMPTY: false
LINE_RANGE: 0-999
TOTAL_LINES: 50000
CONTENT_TRIMMED: true
---
```

- **No recorta**: si `trimResultType` es `TrimResultType.None`, devuelve `null` (sin cambios), indicando que la herramienta no desea que se aplique ninguna poda en ese momento.

El método `trimResult` en `AbstractPaginatedAgentTool` maneja específicamente `TrimResultType.Trim` y `TrimResultType.None`. Ya no utiliza el estado `Notify` (que era un artefacto de versiones anteriores y ha sido eliminado).

Las herramientas que no heredan de `AbstractPaginatedAgentTool` pueden implementar su propia lógica de poda, o devolver `null` si no desean participar en el proceso.

## 5. Ejecución en el pipeline

`TrimmingOperation` se ejecuta como parte del pipeline de la memoria proyectada, en el método `ProjectedMemoryImpl.getMessages()`. El flujo es el siguiente:

1.  Se ensambla la lista base de mensajes (prompt del sistema + memoria compactada + mensajes de la memoria reciente).
2.  Se itera sobre las operaciones registradas en orden de prioridad.
3.  Cuando se alcanza `TrimmingOperation` (prioridad 10), se invoca su método `process()`.
4.  La operación recibe la lista de mensajes proyectados y la lista de notificaciones efímeras (que en este caso no modifica).
5.  La operación recorre los mensajes, aplica la poda según los criterios descritos y reemplaza los mensajes largos por sus versiones recortadas.
6.  El pipeline continúa con las siguientes operaciones (`PendingAnnotationOperation`, `TemporalPerceptionOperation`).

La poda ocurre antes de que se inyecten notificaciones efímeras, lo que asegura que las herramientas de anotación (que examinan los resultados de herramientas) reciban los mensajes ya podados, lo que es relevante para la detección de recursos sin anotar.

## 6. Estrategias de poda específicas

Aunque `AbstractPaginatedAgentTool` proporciona una implementación genérica, las herramientas pueden sobrescribir `trimResult` para implementar comportamientos personalizados:

- **`ShellExecuteTool` y `FileReadTool`**: heredan de `AbstractPaginatedAgentTool` y utilizan su implementación por defecto. Esto significa que la salida de comandos y el contenido de archivos se recortan conservando la cabecera y el `HINT`, pero eliminando el cuerpo.

- **Herramientas sin paginación**: si no heredan de `AbstractPaginatedAgentTool`, su implementación por defecto en `AbstractAgentTool` devuelve `null`, lo que significa que sus resultados nunca se podan, incluso si son muy largos. Esto es una decisión de diseño: solo las herramientas que generan salidas paginadas (y que por tanto tienen un formato estructurado con cabecera y contenido) participan en el mecanismo de poda.

- **Herramientas personalizadas**: los desarrolladores pueden implementar su propia lógica de poda si, por ejemplo, desean conservar ciertas partes del contenido (como los primeros N caracteres) en lugar de eliminarlo por completo. En ese caso, deben implementar `trimResult` en la herramienta concreta.

