
# Memoria Proyectada (`ProjectedMemory`)

## 1. Propósito y responsabilidad

La memoria proyectada es la vista efímera que realmente ve el LLM en cada turno. No es una capa de almacenamiento persistente; es una construcción dinámica que se genera justo antes de cada inferencia del modelo, a partir de las capas inferiores de la memoria (episódica, consolidada y reciente). Una vez que el LLM ha respondido, la memoria proyectada se descarta; la próxima inferencia se construirá de nuevo desde cero, aunque el estado de algunas operaciones se conserva entre proyecciones.

Su responsabilidad principal es **transformar y optimizar el contexto** que recibe el modelo, garantizando que:

- La información relevante esté presente y sea fácilmente accesible.
- Los datos antiguos o redundantes no saturen la ventana de atención.
- Las notificaciones efímeras (aviso de recursos sin anotar, percepción temporal, recordatorios de skills) se inyecten sin modificar el historial persistente.

La memoria proyectada no es una capa aislada; es el punto de control final antes de cada interacción con el LLM. Las transformaciones que aplica son el resultado de un pipeline de operaciones (`ProjectedMemoryOperation`) que se ejecutan secuencialmente, cada una con una prioridad determinada. La proyección se construye en el método `getMessages()`, que es invocado por `ReasoningService` justo antes de consultar al modelo.

## 2. Interfaz pública (`ProjectedMemory`)

La interfaz `ProjectedMemory` define los siguientes métodos públicos:

- **`List<ChatMessage> getMessages(RecentMemory recentMemory, ConsolidateMemory consolidateMemory, String systemPrompt)`**: construye la proyección ejecutando el pipeline de operaciones. Devuelve la lista de mensajes lista para enviar al LLM. Recibe como parámetros la memoria reciente, la memoria consolidada más reciente y el prompt de sistema proporcionado por `ReasoningService`. Este método es el punto de entrada principal del componente.

- **`AgentTool getTool(String name)`**: recupera una herramienta por su nombre desde el catálogo del agente. Utilizada por las operaciones que necesitan consultar el catálogo de herramientas, como `PendingAnnotationOperation` para saber si una herramienta es paginada, o `PinnedTurnsOperation` para obtener la herramienta asociada a un mensaje fijado.

- **`ProjectedMemoryOperation getOperation(String name)`**: recupera una operación registrada por su nombre. Permite que componentes externos (ej: `Skill.deactivate()`, acciones de depuración) interactúen con el estado de una operación específica, como eliminar mensajes fijados o consultar estadísticas.

- **`void save()`**: persiste el estado de la memoria proyectada (incluyendo el estado de cada operación) en disco. Se invoca al final de cada turno, después de que el LLM haya respondido y la proyección se haya consumido.

- **Métodos de gestión de estado**:
  - `LocalDateTime getLastInteractionTime()`: devuelve la fecha de la última interacción del usuario.
  - `void setLastInteractionTime(LocalDateTime lastInteractionTime)`: actualiza la fecha de la última interacción.
  - `long getLastInteractionTurn()`: devuelve el ID del último turno procesado.
  - `void setLastInteractionTurn(long lastInteractionTurn)`: actualiza el ID del último turno.

## 3. Construcción de la proyección: el pipeline

El método `getMessages()` sigue un flujo fijo y detallado:

1. **Ensamblaje de la base**:
   - Se añade el prompt de sistema como primer mensaje de la lista (`SystemMessage`).
   - Se añade la memoria consolidada como un bloque de texto delimitado, precedido por un encabezado que indica el momento de la última consolidación.
   - Se añaden todos los mensajes de la memoria reciente (`RecentMemory.getMessages()`) en el orden en que ocurrieron.

2. **Ejecución del pipeline**:
   - Se itera sobre la lista de operaciones registradas, ordenadas por prioridad ascendente.
   - Para cada operación, se invoca `process(ProjectedMemory memory, List<ChatMessage> projectedMessages, List<String> notifications)`.
   - La operación recibe la lista de mensajes actual y una lista de notificaciones acumuladas. Puede:
     - Modificar la lista de mensajes (añadir, eliminar, modificar elementos).
     - Generar notificaciones efímeras que se inyectarán al final del pipeline.

3. **Inyección unificada de notificaciones**:
   - Al final del pipeline, si la lista de notificaciones no está vacía, se inyectan en la proyección mediante un mecanismo uniforme (ver sección 6).

4. **Volcado de depuración**:
   - La proyección final (la lista de mensajes completa) se escribe en un archivo JSON en `var/tmp/context-{subchannel}-{timestamp}.json`. Esto permite inspeccionar el contexto exacto que recibe el LLM en cada turno.

5. **Actualización del estado**:
   - Se actualiza `lastInteractionTime` a la hora actual.
   - Se actualiza `lastInteractionTurn` con el ID del último turno procesado (obtenido de la memoria reciente).

## 4. Registro de operaciones

Las operaciones son plugables. Se registran en `AgentManagerImpl` mediante el método `registerProjectedMemoryOperation(ProjectedMemoryOperationFactory)`.

Cada operación debe implementar dos interfaces:

- **`ProjectedMemoryOperation`**: define el comportamiento de la operación.
  - `String getName()`: devuelve el nombre único de la operación.
  - `int getPriority()`: devuelve la prioridad de ejecución (los valores más bajos se ejecutan primero).
  - `void process(ProjectedMemory memory, List<ChatMessage> projectedMessages, List<String> notifications)`: ejecuta la lógica de la operación sobre la proyección actual.
  - `JsonObject getState()`: devuelve el estado persistente de la operación serializado a JSON.
  - `void restoreState(JsonObject state)`: restaura el estado de la operación desde un JSON.

- **`ProjectedMemoryOperationFactory`**: crea instancias de la operación.
  - `String getName()`: devuelve el nombre de la operación que factoriza.
  - `ProjectedMemoryOperation create(JsonObject state)`: crea una instancia de la operación, opcionalmente restaurando su estado desde un JSON.

Durante la inicialización de `ProjectedMemoryImpl`:

1. Se obtienen todas las factorías registradas en `AgentManager` mediante `getProjectedMemoryOperationFactories()`.
2. Se instancia cada operación llamando a `create(null)`.
3. Se cargan los estados persistentes desde el archivo `projected_memory-{subchannel}.json` (ver sección 7).
4. Para cada operación, se invoca `restoreState()` con el estado correspondiente (si existe).
5. Se ordena la lista de operaciones por prioridad usando `Comparator.comparingInt(ProjectedMemoryOperation::getPriority)`.

## 5. Acceso a operaciones

El método `getOperation(String name)` permite recuperar una operación registrada por su nombre. Recorre la lista de operaciones y devuelve la primera cuyo nombre coincida (comparación insensible a mayúsculas/minúsculas). Si no se encuentra, devuelve `null`.

Este método es utilizado por:

- **`Skill.deactivate()`**: cuando un skill se desactiva, debe eliminar sus mensajes fijados de `PinnedTurnsOperation`. Para ello, recupera la operación mediante `getOperation("pinned_turns")` y llama a `removePinnedTurn()`.
- **Depuración y herramientas externas**: permite inspeccionar o modificar el estado de una operación desde el panel de depuración o desde acciones del agente.

El método `getTool(String name)` se utiliza internamente por las operaciones para recuperar herramientas del catálogo. Por ejemplo, `PinnedTurnsOperation` necesita conocer la herramienta asociada a un mensaje fijado para llamar a `getPinnedNotificationMessage()`.

## 6. Inyección unificada de notificaciones efímeras

Las notificaciones generadas por las operaciones durante el pipeline se inyectan al final mediante un mecanismo uniforme:

1. Se recopilan todas las notificaciones en una lista de strings (`List<String> notifications`).
2. Si la lista está vacía, no se hace nada.
3. Si hay al menos una notificación, se construye un mensaje compuesto. Si hay varias, se numeran.
4. Se construye un `Map<String, Object>` con los siguientes campos:
   - `event_time`: la hora actual en formato ISO.
   - `current_time`: la hora actual (redundante, pero por compatibilidad).
   - `channel`: `"SYSTEMNOTIFICATION"` (constante de `SensorsServiceImpl`).
   - `status`: `"ok"`.
   - `priority`: `"alta"` (constante `PRIORITY_HIGH`).
   - `contents`: el texto compuesto de las notificaciones.
5. Se serializa el mapa a JSON usando Gson.
6. Se añade un `AiMessage` que simula una llamada a `pool_event` con un ID único generado con `UUID`.
7. Se añade un `ToolExecutionResultMessage` que contiene el JSON serializado.

Este mecanismo mantiene la coherencia del historial: desde la perspectiva del modelo, las notificaciones aparecen como el resultado de una consulta a sus propios sensores, no como mensajes de sistema inyectados externamente. El `channel` y `priority` permiten al modelo identificar la fuente y urgencia de la notificación si es necesario.

## 7. Persistencia del estado

La memoria proyectada mantiene un estado persistente que se almacena en `projected_memory-{subchannel}.json` dentro de `var/lib/`. El archivo contiene la siguiente estructura (serializada con Gson):

- **`lastInteractionTime`**: string con la fecha de la última interacción del usuario en formato ISO (`LocalDateTime.toString()`).
- **`lastInteractionTurn`**: long con el ID del último turno procesado.
- **`operations`**: un mapa `Map<String, JsonObject>` donde la clave es el nombre de la operación y el valor es el estado serializado de esa operación.

El método `load()` se invoca durante la construcción de `ProjectedMemoryImpl` para restaurar el estado desde el archivo. Si el archivo no existe, se inicializa con valores por defecto (`lastInteractionTime` a `null`, `lastInteractionTurn` a `0`, y los estados de las operaciones vacíos).

El método `save()` se invoca al final de cada turno, después de que el LLM haya respondido y la proyección se haya consumido. En `save()`:
- Se actualiza `lastInteractionTime` y `lastInteractionTurn` con los valores actuales.
- Para cada operación, se obtiene su estado mediante `getState()` y se añade al mapa.
- Se serializa el estado completo a JSON y se escribe en disco (con pretty-printing para facilitar la depuración).

El guardado utiliza el mismo mecanismo atómico que otras partes del sistema: se escribe primero a un archivo temporal (`projected_memory-{subchannel}.json.tmp`) y luego se renombra al destino final.

## 8. Operaciones del pipeline

La memoria proyectada incluye un conjunto de operaciones predefinidas que se ejecutan en un orden fijo según su prioridad. Cada operación es responsable de una transformación específica del contexto.

Las operaciones registradas actualmente son:

- **[`PinnedTurnsOperation`](051-operation-pinned.md) (prioridad 5)**:
  - Fija mensajes de herramientas que lo solicitan (`shouldPin() == true`), como la activación de skills.
  - Reinyecta estos mensajes en la proyección después de cada consolidación.
  - Emite recordatorios periódicos cada N turnos mientras el skill está activo.

- **[`TrimmingOperation`](052-operation-trimming.md) (prioridad 10)**:
  - Poda los resultados de herramientas que superan un umbral de tamaño (por defecto, 1KB).
  - Reemplaza el cuerpo del mensaje por una versión recortada que conserva la cabecera.

- **[`PendingAnnotationOperation`](053-operation-pending-annotation.md) (prioridad 20)**:
  - Detecta recursos paginados que han sido leídos pero no anotados.
  - Inyecta un aviso efímero para que el modelo consolide el conocimiento.
  - Solo se activa para recursos en la "zona de riesgo" (próximos a salir del contexto).

- **[`TemporalPerceptionOperation`](054-operation-temporal-perception.md) (prioridad 30)**:
  - Inyecta una notificación si ha pasado más de una hora desde la última interacción.
  - El mensaje informa al modelo del tiempo transcurrido para que contextualice su respuesta.

El orden de ejecución está determinado por la prioridad: las operaciones con prioridad más baja se ejecutan primero. Esto permite que operaciones como `PinnedTurnsOperation` (que añaden mensajes) se ejecuten antes que `TrimmingOperation` (que puede podar esos mismos mensajes si son grandes).

