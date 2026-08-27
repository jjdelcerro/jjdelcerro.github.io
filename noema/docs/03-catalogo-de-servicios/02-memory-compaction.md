# `MemoryCompactionService`: compactación narrativa

## 1. Propósito y responsabilidad

`MemoryCompactionService` es el componente encargado de ejecutar el proceso de compactación narrativa: transformar los turnos acumulados en la memoria reciente en una nueva memoria compactada (`CompactedMemory`). Su función no se limita a reducir el tamaño del contexto; es un proceso de consolidación cognitiva que extrae el conocimiento y el proceso de descubrimiento de la conversación, y lo destila en una narrativa coherente con referencias trazables a los turnos originales.

El servicio actúa como el puente entre la memoria de trabajo (la memoria reciente) y la memoria a largo plazo (la memoria compactada). Cuando la memoria reciente alcanza un umbral de turnos (por defecto 40), el `ReasoningService` invoca a `MemoryCompactionService` para generar un nuevo `CompactedMemory` a partir de los turnos más antiguos. Una vez generado, el nuevo `CompactedMemory` se persiste en `EpisodicMemory` y los turnos compactados se eliminan de la memoria reciente.

La compactación no es una operación mecánica; es un proceso guiado por un LLM que recibe instrucciones detalladas a través del prompt `memory-compact.md`. El servicio se encarga de orquestar esta operación: construir el prompt de usuario (combinando el punto de guardado anterior y los nuevos turnos en formato CSV), invocar al modelo, validar las citas generadas para evitar alucinaciones, y crear el nuevo `CompactedMemory`. El resultado es una narrativa que preserva la intencionalidad, la cronología y la trazabilidad de la conversación, mientras reduce drásticamente el espacio que ocupa en la ventana de contexto.

El servicio está diseñado para ser independiente del `ReasoningService`: utiliza su propio modelo de lenguaje (configurable mediante `memory/provider/*`), su propio prompt, y su propia lógica de validación. Esto permite que la compactación pueda utilizar un modelo diferente (quizás más económico o especializado en resúmenes) sin afectar al razonamiento principal del agente.

La responsabilidad del servicio no incluye decidir cuándo compactar (eso lo decide `ReasoningService`), ni gestionar la persistencia de la memoria compactada (eso lo hace `EpisodicMemory`). Su única responsabilidad es ejecutar la transformación de turnos a narrativa, garantizando que el resultado sea fiel, trazable y narrativamente coherente. El detalle de cómo se estructura y almacena la memoria compactada se describe en la ["Memoria Compactada (`CompactedMemory`)"](../02-el-sistema-de-memoria/030-memoria-compactada.md); el flujo de compactación y su integración con `ReasoningService` se detalla en ["ReasoningService: el orquestador del agente"](01-reasoning.md).


## 2. Ciclo de vida y configuración

El ciclo de vida de `MemoryCompactionService` está gobernado por los métodos `start()` y `stop()`, que son invocados por el agente (`AgentImpl`) cuando este arranca o se detiene. El servicio se instancia a través de su fábrica (`MemoryCompactionServiceFactory`) y solo se inicia si la configuración es válida (es decir, si existen los parámetros de conexión al proveedor LLM).

**Arranque (`start()`)**:

1. **Instalación del prompt**: el servicio despliega en el sandbox del agente el archivo `memory-compact.md` en `var/config/prompts/`. Este archivo contiene el "Protocolo de Generación de Puntos de Guardado" (ahora "Memoria Compactada") y es la base del prompt del sistema que se utiliza en cada compactación. Si el archivo ya existe (porque el usuario lo ha modificado), no se sobrescribe.

2. **Registro de acciones**: el servicio añade al sistema de acciones del agente (`AgentActions`) dos comportamientos que permiten recargar la configuración del modelo en caliente:
   - `CHANGE_MEMORY_PROVIDER`: se dispara cuando el usuario cambia la URL o la API key del proveedor de compactación. Recrea el modelo de lenguaje con los nuevos parámetros de conexión.
   - `CHANGE_MEMORY_MODEL`: se dispara cuando el usuario cambia el identificador del modelo de compactación. Recrea el modelo de lenguaje con el nuevo identificador.

   Estas acciones permiten ajustar la configuración de la compactación sin reiniciar el agente, aunque los cambios solo afectan a futuras compactaciones.

3. **Creación del modelo de lenguaje**: se construye la instancia de `ChatModel` a partir de los parámetros de conexión almacenados en la configuración del agente bajo `memory/provider/`. Los parámetros son:
   - `url`: la URL del proveedor LLM (ej: `https://api.deepseek.com/v1`).
   - `api_key`: la clave de API para autenticación.
   - `model_id`: el identificador del modelo (ej: `deepseek-reasoner` o un objeto JSON con parámetros adicionales como `context`).

   La temperatura del modelo se fija a `0.2f`, un valor bajo que favorece la coherencia y la precisión en la generación de resúmenes, en lugar de la creatividad. El modelo de compactación puede ser diferente al de razonamiento, lo que permite utilizar un modelo más económico o especializado en tareas de resumen.

4. **Carga del prompt del sistema**: se lee el archivo `memory-compact.md` desde el sandbox y se almacena en memoria para su uso en cada compactación. Si el archivo no se puede cargar (por ejemplo, porque falta o está corrupto), el servicio lanza una excepción y no se inicia.

**Parada (`stop()`)**:

El método `stop()` simplemente establece el flag `running` a `false`. No hay recursos que liberar específicamente (el modelo de lenguaje es gestionado por el agente y se recolecta cuando el servicio se detiene). La parada no interrumpe una compactación en curso; esta se completará antes de que el servicio se considere detenido.

**Configuración persistente**:

Los parámetros de configuración se almacenan en `settings.json` bajo la sección `memory`. Ejemplo:

```json
"memory": {
  "provider": {
    "url": "https://api.deepseek.com/v1",
    "model_id": "deepseek-reasoner",
    "api_key": "sk-..."
  }
}
```

El usuario puede modificar estos valores a través de la interfaz de configuración (Swing, Lanterna, Web) y los cambios se aplican en caliente mediante las acciones `CHANGE_MEMORY_PROVIDER` y `CHANGE_MEMORY_MODEL`. La validación de la configuración se realiza en la fábrica (`canStart()`), que verifica que los tres parámetros (URL, API key y model_id) estén definidos antes de permitir el arranque del servicio.


## 3. El método `compact`

El método público `compact(String subchannel, CompactedMemory previous, List<Turn> newTurns)` es la operación principal del servicio. Es invocado por `ReasoningService` cuando la memoria reciente alcanza el umbral de compactación, y su responsabilidad es transformar la lista de turnos proporcionada en una nueva `CompactedMemory`.

**Parámetros de entrada**

- **`subchannel`**: identificador del canal al que pertenecen los turnos. Este parámetro se utiliza para filtrar los turnos durante la validación de citas, para etiquetar la nueva `CompactedMemory`, y para buscar el `previous` correspondiente en la base de datos. El `subchannel` no aísla el conocimiento; solo organiza los turnos para que el servicio sepa qué conversación está compactando.

- **`previous`**: la última `CompactedMemory` generada para este `subchannel`, o `null` si es la primera compactación. Si se proporciona, su contenido textual (Resumen + El Viaje) se incluye en el prompt de usuario para que el LLM pueda continuar la narrativa sin perder el contexto acumulado. El `previous` también se utiliza para construir el conjunto de IDs válidos durante la validación de citas.

- **`newTurns`**: lista de turnos no consolidados que deben integrarse en la nueva `CompactedMemory`. Los turnos vienen ordenados cronológicamente por `id` y pertenecen todos al mismo `subchannel`. La lista no puede estar vacía; si lo está, el método lanza una excepción.

**Proceso de ejecución**

1. **Validación de entrada**: se verifica que `newTurns` no esté vacío. Si es así, se lanza una excepción.

2. **Construcción del conjunto de IDs válidos**: se construye un conjunto (`validTurnIds`) que contiene todos los IDs de turno que pueden ser referenciados en el texto generado. Este conjunto incluye:
   - Los IDs de los turnos en `newTurns`.
   - Los IDs de las citas extraídas del texto del `previous` (si existe).
   - Los IDs de citas encontradas en `tool_result` de turnos de tipo `lookup_turn` o `annotation` dentro de `newTurns` (para preservar la trazabilidad de recuperaciones previas y anotaciones).

3. **Construcción del prompt de usuario**: se invoca al método privado `buildUserPrompt(subchannel, previous, newTurns)`, que genera el mensaje que se enviará al LLM. El prompt combina:
   - El modo de operación ("Creación" si `previous` es `null`, "Actualización" si existe).
   - El contenido textual del `previous` (si existe), delimitado como "DOCUMENTO DE PUNTO DE GUARDADO ANTERIOR".
   - Un CSV de los nuevos turnos generado mediante `Turn.toCSVLine()`, con las columnas `code, timestamp, contenttype, subchannel, annotation_type, text_user, text_model_thinking, text_model, tool_call, tool_result`.

4. **Consulta al LLM**: se invoca al modelo de lenguaje con el prompt del sistema (cargado de `memory-compact.md`) y el prompt de usuario. El modelo genera un texto que contiene el nuevo punto de guardado (Resumen + El Viaje). La temperatura del modelo se fija a `0.2f` para favorecer la coherencia y la precisión sobre la creatividad.

5. **Validación de citas**: se extraen todas las referencias `{cite:ID}` del texto generado mediante `extractCitationIds()`. Para cada ID encontrado, se verifica que pertenezca a `validTurnIds`. Si no pertenece, la cita se reemplaza por `{badcite:ID}` para indicar que la referencia no es válida. Este paso previene alucinaciones de citas y mantiene la integridad del sistema de trazabilidad.

6. **Cálculo de rangos**: se calculan los rangos de turnos que abarca la nueva `CompactedMemory`:
   - `turnFirst`: si `previous` no es `null`, se usa el `turnFirst` del `previous` (para preservar el inicio de la historia); si es la primera compactación, se usa el ID del primer turno de `newTurns`.
   - `turnLast`: siempre es el ID del último turno de `newTurns`.

7. **Creación del `CompactedMemory`**: se invoca a `EpisodicMemory.createCompactedMemory(subchannel, turnFirst, turnLast, timestamp, generatedText)` para crear un nuevo objeto `CompactedMemory` transitorio con ID `-1`. El método devuelve este objeto al `ReasoningService`, que se encargará de persistirlo mediante `EpisodicMemory.add(compactedMemory)` y de integrarlo en el flujo de la memoria proyectada.

**Resultado y responsabilidades posteriores**

El método devuelve un `CompactedMemory` transitorio (con ID `-1`) que aún no está persistido en disco ni en la base de datos. La persistencia es responsabilidad de `ReasoningService`, que debe llamar a `EpisodicMemory.add(compactedMemory)` después de recibir el objeto. El `subchannel` del nuevo `CompactedMemory` es el mismo que el proporcionado en la entrada, lo que permite a `EpisodicMemory` etiquetar el objeto y almacenarlo correctamente en la tabla `compactedmemory`.

El método no gestiona la limpieza de la memoria reciente; esa responsabilidad también recae en `ReasoningService`, que debe eliminar los mensajes compactados mediante `RecentMemory.remove(mark1, mark2)` después de persistir el nuevo `CompactedMemory`.

**Comportamiento ante errores**

Si durante la ejecución ocurre un error (ej: fallo en la llamada al LLM, error de validación, problema de persistencia), el método lanza una excepción de tipo `CompactedMemoryException` o `TurnException` (dependiendo del contexto). El `ReasoningService` captura estas excepciones y las maneja adecuadamente (registrando el error en el log y mostrando un mensaje en la consola), pero no reintenta la compactación automáticamente.



## 4. El prompt de usuario: CSV de turnos

El prompt de usuario es el mensaje que se envía al LLM junto con el prompt del sistema (`memory-compact.md`). Su propósito es proporcionar al modelo toda la información necesaria para generar la nueva `CompactedMemory`: el contexto previo (si existe) y los nuevos turnos que deben integrarse en la narrativa.

La construcción del prompt de usuario se realiza en el método privado `buildUserPrompt(String subchannel, CompactedMemory previous, List<Turn> newTurns)`. El resultado es un texto estructurado que combina dos bloques principales:

1. **Modo de operación y contexto previo**: si `previous` no es `null`, el prompt comienza con la indicación `"MODO DE OPERACIÓN: 2 (Actualización)"` y, a continuación, incluye el texto completo del `previous` delimitado por `=== DOCUMENTO DE PUNTO DE GUARDADO ANTERIOR ===`. Si `previous` es `null` (primera compactación), el prompt comienza con `"MODO DE OPERACIÓN: 1 (Creación Inicial)"` y omite el bloque de contexto previo.

2. **CSV de nuevos turnos**: después del contexto previo (si existe), se incluye un bloque delimitado por `=== NUEVA CONVERSACIÓN A CONSOLIDAR (CSV) ===`. Este bloque contiene una cabecera con los nombres de las columnas, seguida de una línea por cada turno en `newTurns`. La cabecera es:

```
code,timestamp,contenttype,subchannel,annotation_type,text_user,text_model_thinking,text_model,tool_call,tool_result
```

Cada línea se genera mediante el método `Turn.toCSVLine()`, que escapa correctamente los caracteres especiales (comillas dobles se duplican, saltos de línea se reemplazan por `\n`) para producir un CSV válido.

Las columnas del CSV son:

- **`code`**: el identificador único del turno (el ID numérico). Este es el valor que se utiliza en las citas `{cite:ID}`.
- **`timestamp`**: la marca de tiempo del evento en formato ISO.
- **`contenttype`**: clasifica el turno (`chat`, `tool_execution`, `tool_execution_summarized`, `lookup_turn`, `annotation`, etc.). Esta columna es clave para que el LLM sepa cómo interpretar cada turno.
- **`subchannel`**: el identificador del canal al que pertenece el turno. Permite al LLM saber en qué conversación ocurrió cada evento.
- **`annotation_type`**: presente solo en turnos de tipo `annotation`. Almacena el tipo semántico de la anotación (ej: `"section_index"`, `"architecture"`). Permite al LLM categorizar el conocimiento fijado.
- **`text_user`**: el texto del mensaje del usuario (si el turno es un `"chat"`).
- **`text_model_thinking`**: la cadena de pensamiento interna del modelo (si se capturó).
- **`text_model`**: la respuesta textual del modelo (si el turno es un `"chat"`).
- **`tool_call`**: el JSON que describe la llamada a la herramienta (si el turno es una ejecución).
- **`tool_result`**: el resultado de la ejecución de la herramienta (puede estar truncado si es muy largo).

El `subchannel` se incluye en el CSV para que el LLM sepa en qué conversación ocurrió cada turno. Esto es especialmente relevante cuando el agente mantiene varias conversaciones en paralelo, ya que permite al modelo distinguir el contexto de cada una. El `annotation_type` permite al LLM interpretar las anotaciones según su tipo semántico durante la compactación.

El prompt finaliza con una instrucción que pide al LLM que genere el nuevo punto de guardado siguiendo el protocolo definido en el prompt del sistema.

**Ejemplo de fragmento del prompt de usuario**:

```
MODO DE OPERACIÓN: 2 (Actualización)

=== DOCUMENTO DE PUNTO DE GUARDADO ANTERIOR ===
## Resumen
Se decidió utilizar H2 como base de datos embebida.

## El Viaje
El usuario propuso usar PostgreSQL, pero el agente sugirió H2 por simplicidad {cite:23}. Tras discutir las opciones, se acordó usar H2 {cite:45}.
===============================================

=== NUEVA CONVERSACIÓN A CONSOLIDAR (CSV) ===
code,timestamp,contenttype,subchannel,annotation_type,text_user,text_model_thinking,text_model,tool_call,tool_result
101,2026-08-27T10:15:00,chat,default,,¿Qué tal va la migración a H2?,,"La migración está en curso, ya hemos creado las tablas.",,
102,2026-08-27T10:16:00,tool_execution,default,,,,"{\"name\":\"file_write\",\"arguments\":{\"path\":\"schema.sql\"}}","{\"status\":\"success\",\"message\":\"Archivo creado\"}"
=============================================

Siguiendo el protocolo de Generación de Puntos de Guardado procede a generar uno con la información del punto de guardado y los datos CSV que te acabo de suministrar.
```

Este prompt proporciona al LLM toda la información necesaria para generar una nueva `CompactedMemory` que integre la narrativa previa con los nuevos eventos, manteniendo la coherencia narrativa y la trazabilidad determinista.

## 5. El prompt del sistema (`memory-compact.md`)

El prompt del sistema para el `MemoryCompactionService` reside en el archivo `var/config/prompts/memory-compact.md`. Es uno de los documentos más extensos y detallados de Noema, ya que define el "Protocolo de Generación de Puntos de Guardado" ("Memoria Compactada") que guía al LLM durante el proceso de compactación. Este prompt es la pieza central que determina la calidad de la memoria a largo plazo: un prompt bien diseñado produce narrativas coherentes y trazables; un prompt deficiente puede generar resúmenes vagos o con pérdida de información crítica.

**Propósito del prompt**

El prompt tiene como objetivo transformar al LLM en un "MemoryManager" especializado. Le instruye sobre cómo leer el CSV de turnos, cómo interpretar cada tipo de evento (`chat`, `tool_execution`, `lookup_turn`, `annotation`, etc.), cómo integrar el punto de guardado anterior (si existe), y cómo redactar un nuevo punto de guardado que sea narrativamente coherente, trazable y fiel a las fuentes originales. El prompt no es un conjunto de reglas estáticas; es un protocolo detallado que evoluciona con el sistema para adaptarse a nuevas necesidades (como el manejo de `annotation_type` y `resource_id`).

**Estructura del prompt**

El prompt se organiza en varias secciones que guían al LLM paso a paso:

1. **Objetivos y datos de entrada**: describe el formato de entrada (CSV de turnos con columnas específicas) y el punto de guardado anterior (si existe). Explica que la tarea es generar o actualizar un punto de guardado.

2. **Principios Fundamentales**: define los pilares del proceso:
   - *Coherencia Narrativa*: el nuevo punto debe leerse como una continuación natural del anterior.
   - *Trazabilidad Determinista*: cada hecho significativo debe llevar una cita `{cite:ID}` al turno original.
   - *Fidelidad de Referencia*: todas las citas deben pertenecer al conjunto de IDs de entrada; no se pueden inventar.
   - *Espiral de Contexto*: la memoria no es una línea recta, sino una espiral donde cada nueva conversación reinterpreta y enriquece el contexto acumulado.

3. **Directiva de Estilo de Citación**: especifica que las citas deben ir integradas en la narrativa, no al final como una lista. Ejemplo: "El usuario explicó que el sistema aprendía del texto {cite:6}".

4. **Interpretación de eventos técnicos**: proporciona directrices específicas para tratar cada tipo de `contenttype`:
   - Herramientas operativas (`tool_execution`, `tool_execution_summarized`): narrar la acción y su resultado, no transcribir el JSON.
   - Herramientas de memoria (`lookup_turn`): representan un "flashback". Describir el acto de recordar y rehidratar la información recuperada.
   - Anotaciones con `resource_id`: representan conocimiento extraído de un recurso; deben narrarse como un descubrimiento o síntesis.
   - Anotaciones sin `resource_id`: representan conocimiento declarado o mandato del usuario; deben narrarse como una premisa establecida o directiva explícita.

5. **Modos de funcionamiento**: define dos modos:
   - *Modo 1 (Creación)*: cuando solo se dispone de la nueva conversación. Se genera el primer punto de guardado desde cero.
   - *Modo 2 (Actualización)*: cuando se dispone del punto anterior y de la nueva conversación. Se deben fusionar ambos en una narrativa única.

6. **Detalle del Resumen y El Viaje**: explica que el punto de guardado debe contener dos secciones claramente diferenciadas:
   - *Resumen*: ejecutivo, factual, decisiones clave, estado de proyectos.
   - *El Viaje*: narrativo, cronológico, captura el proceso de razonamiento y la evolución de las ideas.

7. **Verificación de calidad**: instruye al MemoryManager a auto-evaluarse contra sesgos como el "sesgo de novedad" (dar más peso a la conversación nueva) y asegurar un balance conceptual entre el pasado y el presente.

8. **Directivas sobre el manejo de anotaciones**: incluye instrucciones específicas sobre cómo tratar las anotaciones en función de si tienen o no `resource_id`. Las anotaciones con `resource_id` deben integrarse como "conocimiento extraído" en El Viaje y, si son relevantes, también en el Resumen. Las anotaciones sin `resource_id` deben integrarse como "conocimiento declarado" en ambos niveles.

**Evolución del prompt**

El prompt ha evolucionado desde las versiones iniciales para incluir nuevas directrices sobre:

- **`annotation_type`**: permite al LLM categorizar el conocimiento fijado durante la compactación, facilitando la búsqueda semántica posterior.
- **`resource_id`**: permite al LLM vincular anotaciones con recursos específicos (archivos, comandos, etc.), mejorando la trazabilidad entre el conocimiento y su origen.
- **Directivas sobre `lookup_turn`**: el prompt ahora instruye explícitamente cómo manejar los turnos recuperados, tratándolos como "recuerdos" que se rehidratan en la narrativa.

**Relación con la memoria compactada y el servicio**

El prompt está diseñado para trabajar en tándem con la estructura de `CompactedMemory` y el método `compact()`:

- La entrada al LLM incluye el anterior `CompactedMemory` (si existe) y el CSV de `newTurns`.
- La salida del LLM es un texto que contiene el Resumen y El Viaje, que `MemoryCompactionService` valida (citas) y convierte en un nuevo `CompactedMemory`.
- El prompt no conoce los detalles de implementación de `CompactedMemory`; solo define el formato de salida (Resumen + El Viaje con citas). La conversión a objetos y la persistencia son responsabilidad del servicio.

**Importancia del prompt en la arquitectura**

El prompt `memory-compact.md` es el punto de control más importante para la calidad de la memoria a largo plazo. Modificarlo permite ajustar el estilo narrativo, el nivel de detalle, el tratamiento de herramientas y anotaciones, y el balance entre pasado y presente, todo sin tocar el código del servicio. Esto hace que el sistema sea altamente configurable y adaptable a diferentes casos de uso sin necesidad de recompilar.


## 6. Validación de citas y corrección de errores

Una vez que el LLM ha generado el texto de la nueva `CompactedMemory`, el servicio ejecuta un paso de validación crítico: verificar que todas las citas `{cite:ID}` presentes en el texto se correspondan con turnos reales y accesibles. Este paso es esencial porque los LLMs tienden a alucinar referencias, inventando IDs que no existen o mezclando números de forma incorrecta. Sin esta validación, el sistema de trazabilidad se rompería, y el modelo intentaría recuperar turnos inexistentes mediante `lookup_turn`, generando errores en tiempo de ejecución.

**Extracción de citas del texto generado**

La validación comienza con la extracción de todas las referencias `{cite:ID}` del texto generado. El método `extractCitationIds(String text)` utiliza una expresión regular para localizar todas las ocurrencias del patrón `{cite:ID}` y `{cite:ID1,ID2,...}` (soportando múltiples IDs separados por comas). Para cada cita encontrada, extrae los IDs numéricos y los añade a un conjunto temporal.

**Construcción del conjunto de IDs válidos**

El conjunto `validTurnIds` contiene todos los IDs de turno que pueden ser referenciados legítimamente en el texto generado. Se construye a partir de tres fuentes:

1. **IDs del `previous` (si existe)**: se extraen todas las citas del texto del `previous` (tanto del Resumen como de El Viaje) y se añaden a `validTurnIds`. Esto asegura que las citas heredadas del punto de guardado anterior sigan siendo válidas.

2. **IDs de `newTurns`**: se añaden los IDs de todos los turnos en la lista `newTurns`. Estos son los turnos que se están compactando y, por tanto, deben ser referenciables.

3. **IDs de citas en `tool_result` de turnos especiales**: se recorren los `newTurns` y, para aquellos con `contenttype` igual a `lookup_turn` o `annotation`, se extraen las citas de su `tool_result` (ya que los resultados de estas herramientas pueden contener referencias a turnos históricos). Estos IDs se añaden a `validTurnIds` para preservar la trazabilidad de recuperaciones y anotaciones previas.

**Validación y corrección de citas inválidas**

Una vez construido `validTurnIds`, se itera sobre todas las citas extraídas del texto generado. Para cada ID encontrado:

- Si el ID pertenece a `validTurnIds`, se mantiene como `{cite:ID}`.
- Si el ID no pertenece a `validTurnIds`, se reemplaza por `{badcite:ID}`.

Este reemplazo es informativo: el modelo sabrá que la referencia no es válida y, en teoría, no intentará recuperarla. En la práctica, el `badcite` sirve como un marcador de depuración que indica que el LLM ha alucinado una referencia.

**Ejemplo de validación**

Supongamos que el texto generado contiene las siguientes citas: `{cite:23}`, `{cite:45}`, `{cite:99}`. El conjunto `validTurnIds` contiene `{23, 45, 67}` (IDs del previous y de newTurns). La validación:

- `{cite:23}` es válido, se mantiene.
- `{cite:45}` es válido, se mantiene.
- `{cite:99}` es inválido, se convierte en `{badcite:99}`.

**Finalidad de la validación**

La validación de citas cumple tres funciones críticas:

1. **Prevenir alucinaciones**: evita que el modelo genere referencias a turnos inexistentes, lo que causaría errores en `lookup_turn` y rompería la trazabilidad.

2. **Mantener la integridad del sistema**: asegura que todas las citas en la memoria compactada sean resolubles, preservando la cadena de trazabilidad desde el conocimiento destilado hasta los turnos originales.

3. **Depuración**: las citas inválidas convertidas en `{badcite:ID}` sirven como indicadores de problemas en el prompt o en el comportamiento del modelo, facilitando la identificación de áreas de mejora en el proceso de compactación.

**Limitaciones de la validación**

La validación es **post-hoc**; no previene la alucinación en origen, solo la corrige después de que ocurra. Esto significa que el texto generado puede contener citas inválidas que luego se marcan como `badcite`, lo que puede afectar a la legibilidad de la memoria compactada. Sin embargo, es un mecanismo pragmático que, combinado con un prompt bien diseñado, reduce significativamente el número de alucinaciones en la práctica. Si el modelo alucina sistemáticamente citas, es un indicador de que el prompt necesita ajustes o de que el modelo utilizado no es adecuado para la tarea de compactación.

La validación se ejecuta en el método `compact()` justo antes de crear el nuevo `CompactedMemory`, asegurando que el texto almacenado en la memoria compactada esté siempre libre de referencias inválidas.

## 7. Herramientas asociadas al servicio

`MemoryCompactionService` no solo consolida la memoria a largo plazo mediante el método `compact()`; también expone al agente un conjunto de herramientas (`AgentTool`) que le permiten **interactuar activamente con su propio historial**. Estas herramientas están disponibles en el catálogo de capacidades del agente y pueden ser invocadas por el LLM durante el razonamiento, permitiéndole recuperar información, buscar por significado y fijar conocimiento de forma explícita.

Las tres herramientas registradas por `MemoryCompactionService` son:


### 7.1. `lookup_turn` (antes `fetch_citation`)

**Propósito**: recuperar el texto exacto de un turno específico junto con su contexto inmediato, a partir de una referencia numérica.

**Uso típico**: cuando el modelo encuentra una cita `{cite:123}` en la memoria compactada, ejecuta esta herramienta para obtener los detalles completos de aquel momento. Esto incluye el turno solicitado y los turnos anteriores y posteriores (mediante el parámetro `context_window`), permitiendo al modelo entender el contexto completo de la conversación original.

**Parámetros**:
- `code` (obligatorio): el ID del turno a recuperar. Soporta formatos numéricos directos (`"123"`) o con prefijo (`"ID-123"`).
- `context_window` (opcional, valor por defecto 2, máximo 5): número de turnos adicionales a recuperar antes y después del turno objetivo.

**Modo**: `MODE_READ` (solo consulta, no modifica estado).

**Tipo**: `TYPE_MEMORY` (sus resultados se registran como `lookup_turn` en la memoria episódica, lo que influye en la compactación futura).

**Filtro por `subchannel`**: la herramienta recibe el `subchannel` del evento en curso y lo utiliza para filtrar los turnos recuperados, asegurando que solo se devuelvan turnos de la conversación correspondiente.

### 7.2. `search_full_history`

**Propósito**: buscar en todo el historial conversacional (desde el primer turno hasta el último) por similitud semántica, utilizando los embeddings almacenados en la memoria episódica. Es la herramienta de recuperación por significado, ideal cuando el modelo no recuerda una referencia concreta pero sabe de qué trata.

**Uso típico**: cuando el contexto inmediato es insuficiente y el modelo tiene la sensación de haber hablado antes de un tema, invoca esta herramienta con una consulta descriptiva. La herramienta devuelve los turnos más relevantes según la similitud coseno.

**Parámetros**:
- `query` (obligatorio): texto que describe el concepto o tema a buscar.
- `limit` (opcional, valor por defecto 10, máximo 50): número máximo de resultados a devolver.
- `minSimilarity` (opcional, valor por defecto 0.2): umbral de similitud mínima para incluir un turno en los resultados.
- `type` (opcional): permite filtrar exclusivamente por `annotation_type` (útil para buscar anotaciones de un tipo específico).

**Modo**: `MODE_READ`.

**Tipo**: `TYPE_MEMORY`.

**Filtro por `subchannel`**: la herramienta filtra los turnos por el `subchannel` del evento en curso, devolviendo solo resultados de la conversación actual. Esto es esencial para mantener la coherencia contextual entre canales.

### 7.3. `annotate_observation`

**Propósito**: permitir al agente fijar una nota, resumen o insight relevante extraído de una lectura o interacción, preservándolo en su memoria episódica. A diferencia de las herramientas anteriores, esta no recupera información del pasado, sino que **la escribe** para el futuro.

**Uso típico**: después de leer un archivo extenso, ejecutar un comando o recibir una explicación detallada del usuario, el modelo invoca `annotate_observation` para consolidar los puntos clave. Estas anotaciones se integran en futuras compactaciones como conocimiento consolidado, y su `annotation_type` permite categorizarlas para búsquedas posteriores.

**Parámetros**:
- `source` (obligatorio): origen de la información (nombre de archivo, URL, o `"instrucción del usuario"`).
- `note` (obligatorio): texto con los hechos, conclusiones o resumen que el agente desea fijar.
- `resource_id` (opcional): identificador de un recurso paginado asociado. Si se proporciona, el sistema puede vincular la anotación con un recurso específico (archivo, comando, etc.), y `PendingAnnotationOperation` la considerará como "anotada" para evitar avisos innecesarios.
- `type` (opcional): tipo semántico de la anotación (ej: `"architecture"`, `"bug"`, `"section_index"`). Se almacena como `annotation_type` en la memoria episódica y permite filtrar búsquedas semánticas.

**Modo**: `MODE_READ` (aunque escribe en la base de datos, no modifica el sistema de archivos ni ejecuta comandos, por lo que no requiere confirmación humana).

**Tipo**: `TYPE_ANNOTATION` (se registra como un turno de tipo `annotation` en la memoria episódica).


**Integración con la compactación**

Estas tres herramientas están diseñadas para trabajar en conjunto con el proceso de compactación:

- **`lookup_turn` y `search_full_history`** permiten al modelo recuperar información del pasado que puede ser relevante para la conversación actual. Los turnos recuperados por `lookup_turn` se registran como `lookup_turn` en la memoria episódica, y durante la próxima compactación, el `MemoryCompactionService` extrae las citas de su `tool_result` para preservar la trazabilidad en la nueva memoria compactada.

- **`annotate_observation`** permite al modelo fijar conocimiento que se integrará en futuras compactaciones. Durante la compactación, el servicio procesa las anotaciones según tengan o no `resource_id`: las anotaciones con `resource_id` se tratan como "conocimiento extraído" y se integran en El Viaje; las anotaciones sin `resource_id` se tratan como "conocimiento declarado" y se incluyen tanto en el Resumen como en El Viaje.

Este ciclo —recuperar, razonar, anotar, compactar— es el que permite al agente transformar el flujo de datos en conocimiento persistente y trazable a lo largo del tiempo.



## 8. Integración con `ReasoningService` y `EpisodicMemory`

`MemoryCompactionService` no opera de forma aislada; es un eslabón en un flujo más amplio que involucra a otros componentes del sistema. Su integración con `ReasoningService` y `EpisodicMemory` es lo que permite que la compactación se ejecute en el momento adecuado, que los turnos se recuperen correctamente y que la nueva `CompactedMemory` se persista y esté disponible para futuras proyecciones.

### 8.1. El flujo de invocación desde `ReasoningService`

El `ReasoningService` es el único cliente de `MemoryCompactionService`. La invocación ocurre al final de cada turno, después de que el modelo haya entregado una respuesta textual y se haya cerrado la interacción. El flujo es el siguiente:

1. **Evaluación del umbral**: `ReasoningService` invoca `recentMemory.needCompaction()` para determinar si la memoria reciente ha acumulado suficientes turnos (por defecto, 40). Si devuelve `true`, se procede a compactar.

2. **Obtención de marcas**: `ReasoningService` obtiene dos marcas de la memoria reciente:
   - `oldestMark = recentMemory.getOldestMark()`: el mensaje consolidado más antiguo.
   - `compactMark = recentMemory.getCompactMark()`: el punto de corte (aproximadamente la mitad de la sesión, ajustado para no romper bloques de herramientas).

3. **Recuperación de turnos**: `ReasoningService` consulta a `EpisodicMemory.getTurnsByIds(subchannel, oldestMark.getTurnId(), compactMark.getTurnId())` para obtener todos los turnos comprendidos en ese rango, filtrados por el `subchannel` correspondiente.

4. **Invocación al servicio**: `ReasoningService` llama a `memoryCompactionService.compact(subchannel, activeCompactedMemory, compactTurns)`. El `activeCompactedMemory` es el último `CompactedMemory` generado para ese `subchannel` (o `null` si es la primera compactación). El servicio devuelve un nuevo `CompactedMemory` transitorio (con ID `-1`).

5. **Persistencia**: `ReasoningService` persiste el nuevo `CompactedMemory` mediante `episodicMemory.add(compactedMemory)`. Esto guarda los metadatos en la tabla H2 y escribe el contenido textual en un archivo `.md`.

6. **Limpieza de la memoria reciente**: `ReasoningService` invoca `recentMemory.remove(oldestMark, compactMark)` para eliminar los mensajes compactados.

7. **Actualización del puntero activo**: `ReasoningService` actualiza `activeCompactedMemory` al nuevo valor para que futuras proyecciones lo incluyan.


### 8.2. Interacción con `EpisodicMemory`

`MemoryCompactionService` utiliza `EpisodicMemory` en dos momentos clave:

1. **Recuperación de turnos para compactación**: durante la construcción del prompt de usuario, el servicio no necesita recuperar turnos directamente (eso ya lo ha hecho `ReasoningService`). Sin embargo, para la validación de citas, el servicio necesita conocer los IDs de los turnos de `newTurns` y las citas extraídas de `tool_result`. Estos IDs se obtienen de los objetos `Turn` proporcionados, que ya han sido recuperados de `EpisodicMemory` por `ReasoningService`.

2. **Persistencia del nuevo `CompactedMemory`**: el servicio devuelve un `CompactedMemory` transitorio (ID `-1`) que `ReasoningService` persiste mediante `episodicMemory.add(compactedMemory)`. `EpisodicMemory` se encarga de:
   - Asignar un nuevo ID al `CompactedMemory` utilizando su contador interno.
   - Insertar los metadatos en la tabla `compactedmemory` (`id`, `turnFirst`, `turnLast`, `timestamp`, `subchannel`).
   - Escribir el contenido textual en un archivo `.md` dentro de `var/lib/compactedmemory/`.

El `MemoryCompactionService` no tiene acceso directo a la base de datos; delega toda la persistencia en `EpisodicMemory`, manteniendo una separación clara de responsabilidades.


### 8.3. Integración con la memoria proyectada

Una vez que el nuevo `CompactedMemory` se ha persistido, `ReasoningService` lo convierte en el `activeCompactedMemory` para ese `subchannel`. La próxima vez que se construya el contexto para ese canal (en la siguiente proyección), `ProjectedMemory` incluirá el nuevo `CompactedMemory` como un bloque de sistema.

El `CompactedMemory` se inyecta como un bloque de texto delimitado (`--- INICIO DEL RELATO --- ... --- FIN DEL RELATO ---`) justo después del prompt de sistema y antes de los mensajes de la memoria reciente. El modelo lo interpreta como "lo que pasó antes", y las citas `{cite:ID}` que contiene activan la "Directiva anti-alucinación" del prompt del sistema, obligando al modelo a usar `lookup_turn` para verificar cualquier detalle antes de responder.

Para otros canales (`subchannel`), su `activeCompactedMemory` permanece inalterado. Sin embargo, el conocimiento contenido en el nuevo `CompactedMemory` está disponible en `EpisodicMemory` para cualquier canal que lo necesite mediante búsqueda semántica (`search_full_history`) o consulta directa (`lookup_turn` con el ID del turno correspondiente). El `subchannel` no aísla el conocimiento; solo organiza los turnos para que el agente pueda contextualizar su origen.

### 8.4. Ciclo completo de compactación

El ciclo completo de compactación, desde la detección hasta la integración en el contexto, es el siguiente:

1. `ReasoningService` detecta que `RecentMemory.needCompaction()` es `true`.
2. Obtiene las marcas `oldestMark` y `compactMark`.
3. Recupera los turnos de `EpisodicMemory` filtrando por `subchannel`.
4. Invoca `MemoryCompactionService.compact(subchannel, activeCompactedMemory, compactTurns)`.
5. `MemoryCompactionService` construye el prompt de usuario (CSV + previous), consulta al LLM, valida citas y devuelve un nuevo `CompactedMemory`.
6. `ReasoningService` persiste el nuevo `CompactedMemory` en `EpisodicMemory`.
7. `ReasoningService` elimina los mensajes compactados de la memoria reciente.
8. `ReasoningService` actualiza `activeCompactedMemory` al nuevo valor.
9. En la siguiente proyección, `ProjectedMemory` incluye el nuevo `CompactedMemory` en el contexto del LLM.

Este ciclo se repite cada vez que la memoria reciente alcanza el umbral, asegurando que el agente mantenga una memoria a largo plazo actualizada y coherente sin saturar su ventana de contexto.

## 9. Limitaciones conocidas

A pesar de su diseño cuidadoso, `MemoryCompactionService` tiene varias limitaciones conocidas que merecen ser documentadas para que los desarrolladores sean conscientes de las restricciones actuales y puedan anticipar posibles problemas.

**Compactación bloqueante**

El servicio se ejecuta en el mismo hilo del `eventDispatcher`, bloqueando el procesamiento de nuevos eventos mientras se genera la nueva `CompactedMemory`. Para conversaciones muy largas o con modelos lentos, esto puede suponer una pausa de varios segundos o incluso minutos. Esto es una decisión de diseño deliberada (compactar es parte del procesamiento del turno), pero limita la interactividad durante la compactación.

**Umbral basado solo en número de turnos**

La compactación se activa al alcanzar un número fijo de turnos (40 por defecto). No se tiene en cuenta el tamaño en tokens de esos turnos. Si los turnos incluyen textos muy largos (ej: salidas de herramientas no paginadas con miles de líneas), el contexto podría saturarse antes del umbral. Por el contrario, conversaciones con mensajes muy cortos podrían acumular muchos más turnos antes de necesitar compactación. El código no combina ambos criterios (turnos y tokens estimados).

**Tratamiento de `lookup_turn` con resultados muy grandes**

Si un `lookup_turn` recupera muchos turnos antiguos, el CSV resultante puede ser inmenso y no caber en el contexto del modelo de compactación. Actualmente no hay manejo de este caso; el servicio intentaría enviar un prompt demasiado grande, lo que podría causar errores en la llamada al LLM. El código contiene un `TODO` sobre la necesidad de trocear la compactación en estos casos.

**Alucinaciones de citas**

Aunque se valida post-hoc, la corrección convierte la cita inválida en `{badcite:ID}`, lo que el modelo interpreta como un error. Esto no impide la alucinación en origen, solo la corrige después. Depende del prompt y del modelo de compactación para minimizar las alucinaciones; si el modelo es propenso a inventar referencias, la calidad de la memoria compactada se degrada.

**Calidad dependiente del prompt y del modelo**

La calidad de la compactación depende completamente del prompt `memory-compact.md` y del modelo de lenguaje utilizado. Un prompt mal diseñado o un modelo inadecuado pueden generar narrativas vagas, incoherentes o con pérdida de información crítica. No hay un mecanismo automático para evaluar la calidad de la compactación; depende de la supervisión humana.

**Idioma y estilo**

El prompt está en español, y se asume que el modelo de compactación lo entiende y responde en el mismo idioma. Para entornos multilingües, habría que parametrizar el idioma del prompt, pero actualmente no está soportado.

**Costo computacional**

Generar una compactación implica una llamada al LLM que puede consumir cientos o miles de tokens, además del tiempo de procesamiento. En conversaciones muy largas, la compactación puede ser costosa. El modelo de compactación se configura independientemente, pero no hay un mecanismo para limitar el coste o el tiempo de la compactación.

**El "Viaje" como espiral de contexto**

La directiva de crear una narrativa que integre pasado y presente en una espiral es ambiciosa. En la práctica, muchos modelos generan resúmenes lineales en lugar de narrativas espirales. Alcanzar la calidad narrativa deseada requiere prompts muy cuidadosos y modelos de razonamiento potentes. No hay una métrica objetiva para evaluar si se ha logrado la "espiral".

**Acumulación de archivos `.md`**

Los archivos de memoria compactada se acumulan en `var/lib/compactedmemory/` sin ninguna política de rotación o limpieza. En sesiones muy largas, esto puede consumir espacio en disco de forma significativa. La limpieza debe hacerse manualmente, o implementarse una política externa.


