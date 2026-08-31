# `PendingAnnotationOperation`: aviso de recursos sin anotar

## 1. Propósito y responsabilidad

La operación `PendingAnnotationOperation` es responsable de detectar cuándo el modelo ha leído recursos paginados (archivos, salidas de comandos, contenidos web) pero no ha consolidado el conocimiento extraído de ellos mediante la herramienta `annotate_observation`. Su objetivo es guiar al modelo para que preserve información valiosa antes de que los resultados de esas lecturas desaparezcan del contexto por consolidación o poda.

Esta operación se ejecuta con prioridad 20, después de `TrimmingOperation` (que ya ha podado los resultados largos) y antes de `TemporalPerceptionOperation` (que añade la percepción del tiempo). Al ejecutarse después del podado, la operación trabaja sobre mensajes que ya han sido recortados, pero conservan la cabecera con los metadatos necesarios (como `RESOURCE_ID` y el rango de líneas leído).

La operación no tiene estado persistente: su decisión se toma en cada proyección basándose exclusivamente en el contenido de la proyección actual y en el historial de mensajes de la memoria reciente. Esto la hace ligera y fácil de mantener.

## 2. Comportamiento general

`PendingAnnotationOperation` actúa en tres fases durante cada ciclo de proyección:

1.  **Análisis de anotaciones existentes**: examina la proyección actual para identificar qué recursos (`resource_id`) han sido ya anotados mediante `annotate_observation`. Para cada llamada a `annotate_observation`, extrae el `resource_id` del argumento (o del resultado) y registra el índice del mensaje en el que se produjo la anotación.

2.  **Detección de recursos pendientes**: itera sobre los mensajes de la proyección que se encuentran en la "zona de riesgo" (los últimos 20 mensajes, aproximadamente). Para cada mensaje que sea un resultado de una herramienta paginada (`AbstractPaginatedAgentTool`), extrae su `resource_id` y comprueba si ha sido anotado. Si el recurso ha sido leído pero no anotado (o la anotación es anterior a la lectura), se marca como pendiente.

3.  **Inyección del aviso**: si hay recursos pendientes, la operación genera una notificación efímera que se añade a la lista de notificaciones del pipeline. El mensaje informa al modelo de qué recursos debe anotar y le recuerda cómo hacerlo.

La operación no modifica la lista de mensajes proyectados; solo genera notificaciones que se inyectarán al final del pipeline.

## 3. Detección de recursos pendientes

La detección se realiza en el método `process()` de la operación. El proceso es el siguiente:

1.  **Identificar anotaciones existentes**: la operación recorre todos los mensajes de la proyección (no solo la zona de riesgo) para construir un mapa `Map<String, Integer> lastAnnotatedIdx` que asocia cada `resource_id` con el índice del mensaje donde se realizó la última anotación.

    - Para cada mensaje de tipo `ToolExecutionResultMessage`, comprueba si la herramienta es `annotate_observation` (a través de `memory.getTool(toolName)`).
    - Si lo es, extrae el `resource_id` del mensaje (usando el método específico de `AnnotateObservationTool.getResourceIdFromResultMessage()`) y actualiza el mapa.

2.  **Identificar zona de riesgo**: la operación define la zona de riesgo como los últimos `messagesToKeep` mensajes de la proyección (por defecto 20). Esto representa los mensajes que están a punto de salir del contexto en las próximas consolidaciones.

3.  **Recorrer la zona de riesgo**: para cada mensaje en la zona de riesgo (desde el inicio de la zona hasta aproximadamente la mitad de la misma, `riskStartIdx` a `riskEndIdx`), la operación:

    - Comprueba si el mensaje es un `ToolExecutionResultMessage` de una herramienta paginada (`AbstractPaginatedAgentTool`).
    - Si lo es, extrae el `resource_id` de la cabecera (usando `getResourceIdFromResultMessage()`).
    - Si el `resource_id` no está vacío y no hay una anotación posterior a la lectura (`lastAnnotatedIdx.get(resourceId) < index`), se añade a un conjunto de recursos pendientes (`Set<String> pendingResources`).

    La operación solo considera herramientas que heredan de `AbstractPaginatedAgentTool`, que son las que generan salidas estructuradas con `RESOURCE_ID`. También se tiene en cuenta el tamaño del mensaje: si el resultado de la herramienta supera un umbral mínimo (por defecto 1024 caracteres), se considera que el recurso es "pesado" y, por tanto, merece ser anotado.

4.  **Generación del aviso**: si `pendingResources` no está vacío, se construye un mensaje de advertencia. El mensaje incluye la lista de recursos pendientes y una instrucción para usar `annotate_observation` con el `resource_id` correspondiente.

## 4. Inyección del aviso

El aviso se inyecta como una notificación efímera. El mensaje se añade a la lista de notificaciones (`notifications`) que la operación recibe como parámetro.

El texto del aviso tiene el siguiente formato:

```
Has leído información de recursos sin extraer y consolidar información relevante.
Si hay datos que deban conservarse relacionados con estos recursos usa la herramienta 'annotate_observation' con el parámetro 'resource_id' correspondiente.
Los recursos involucrados son: resource1, resource2, ...
```

Este mensaje se inyecta al final del pipeline de la memoria proyectada (junto con otras notificaciones generadas por otras operaciones), y el modelo lo recibe como un evento simulado de `pool_event`.

La operación evita inyectar el aviso si ya ha sido inyectado en la proyección actual (gracias a la lista de notificaciones, que se acumula y solo se inyecta una vez al final). Si el modelo ignora el aviso y el recurso sigue sin anotar en el siguiente turno, el aviso se repetirá (si el recurso sigue en la zona de riesgo).

## 5. Estado persistente

`PendingAnnotationOperation` no tiene estado persistente. La decisión de si un recurso está pendiente de anotación se toma en cada proyección, basándose exclusivamente en el contenido de la proyección actual y en el historial de mensajes de la memoria reciente.

Esto tiene dos implicaciones:

- **Simplicidad**: no hay que gestionar un estado que pueda desincronizarse.
- **Eficacia**: la operación siempre evalúa el estado actual del historial, sin depender de datos almacenados que puedan quedar obsoletos.

Sin embargo, tiene una limitación: si el modelo anota un recurso pero la anotación se produce fuera de la ventana de la proyección (por ejemplo, en un turno anterior que ya ha sido consolidado), la operación puede no detectarla y emitir un aviso innecesario. Esto se mitiga porque las anotaciones se conservan en la memoria reciente (a menos que hayan sido consolidadas), y la operación recorre toda la proyección para encontrar anotaciones, no solo la zona de riesgo.
