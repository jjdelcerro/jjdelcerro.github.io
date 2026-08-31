
# `PinnedTurnsOperation`: fijación de mensajes

## 1. Propósito y responsabilidad

La operación `PinnedTurnsOperation` garantiza que ciertos mensajes permanezcan en el contexto del LLM incluso después de que la memoria reciente haya sido consolidada. Su propósito principal es sostener la presencia de skills activos en el campo de consciencia del modelo, asegurando que las directivas de un skill (activadas mediante `activate_skill`) no se pierdan cuando los turnos que las contienen son eliminados de la memoria reciente.

La operación se ejecuta con prioridad 5, la más alta del pipeline de la memoria proyectada. Esto asegura que los mensajes fijados se reinyecten antes de que otras operaciones (como `TrimmingOperation` o `PendingAnnotationOperation`) modifiquen la lista de mensajes, evitando que estos procesos interfieran con la fijación.

La operación también se encarga de emitir recordatorios periódicos al modelo mientras un skill está activo, recordándole que debe seguir las directivas del skill y que puede desactivarlo cuando haya completado la tarea.

## 2. Comportamiento general

`PinnedTurnsOperation` actúa en tres fases durante cada ciclo de proyección:

1. **Captura**: detecta nuevas ejecuciones de herramientas que solicitan ser fijadas (`shouldPin() == true`). Cuando encuentra una, almacena el par de mensajes (llamada + resultado) en su estado persistente.

2. **Reinyección**: cuando la memoria reciente ha sido consolidada y los mensajes fijados han desaparecido de la lista de mensajes activos, la operación los reinyecta en la proyección justo después de los mensajes del sistema (prompt y memoria consolidada), garantizando que el modelo siga viendo la activación del skill.

3. **Recordatorios**: cada `N` turnos (por defecto 5), la operación inyecta una notificación efímera recordando al modelo que el skill sigue activo y que debe considerar su desactivación cuando concluya la tarea.

La operación mantiene un estado persistente que incluye la lista de mensajes fijados y el último turno en el que se emitieron recordatorios. Este estado se conserva entre reinicios del agente.

## 3. Captura de mensajes fijados

La captura ocurre durante la ejecución del método `process()` de la operación, que recibe la lista de mensajes de la proyección actual (`projectedMessages`) y el objeto `ProjectedMemory` que proporciona acceso al catálogo de herramientas.

El proceso de captura sigue estos pasos:

1. La operación itera sobre todos los mensajes de `projectedMessages`.
2. Cuando encuentra un mensaje de tipo `ToolExecutionResultMessage`, extrae el nombre de la herramienta mediante `resultMsg.toolName()`.
3. Obtiene la herramienta asociada llamando a `memory.getTool(toolName)`.
4. Si la herramienta existe y `tool.shouldPin()` devuelve `true`, la operación busca el `AiMessage` que originó la llamada:
   - Recorre hacia atrás desde la posición actual del resultado hasta encontrar un `AiMessage` que contenga un `ToolExecutionRequest` con el mismo `id` que el resultado.
5. Si encuentra tanto el `AiMessage` como el `ToolExecutionResultMessage`, y el par no está ya en la lista de fijados, lo añade al estado persistente.
6. La adición al estado persistente se realiza mediante una llamada a `pinnedTurns.add(new PinnedTurnStateImpl(tool, requestMsg, resultMsg))`.

La operación mantiene un mapa o lista interna (`pinnedTurns`) que se sincroniza con el estado persistente al inicio de cada proyección.

La herramienta que solicita ser fijada (`shouldPin() == true`) es responsable de proporcionar el mensaje de recordatorio mediante `getPinnedNotificationMessage(ToolExecutionRequest request, ToolExecutionResultMessage result)`. Esta función se invoca durante la fase de recordatorios (ver sección 5).

## 4. Reinyección de mensajes fijados

La reinyección ocurre también durante `process()`, después de la captura de nuevos mensajes. El objetivo es garantizar que los mensajes fijados estén siempre presentes en la proyección, incluso si han sido eliminados de la memoria reciente por una consolidación.

El proceso de reinyección sigue estos pasos:

1. La operación obtiene la lista de `pinnedTurns` de su estado persistente.
2. Para cada par `(requestMessage, resultMessage)` en `pinnedTurns`:
   a. Comprueba si el `resultMessage` (identificado por su `id`) está presente en la lista de mensajes de la proyección actual.
   b. Si no está presente, significa que el mensaje ha sido eliminado de la memoria reciente y debe reinyectarse.
3. Para reinyectar, la operación localiza el punto de inserción:
   - Busca el último índice de la proyección que contiene un `SystemMessage` (el prompt de sistema y la memoria consolidada).
   - La inserción se realiza justo después de este índice, antes de los mensajes de la memoria reciente.
4. Se añade el `requestMessage` y el `resultMessage` en el orden correcto (primero la llamada, luego el resultado).
5. Se incrementa el índice de inserción para que los mensajes fijados se añadan en el mismo orden en que fueron capturados originalmente.

Este mecanismo asegura que, incluso después de una consolidación, el modelo siga viendo la secuencia completa de activación del skill y su resultado, manteniendo la coherencia del historial.

## 5. Recordatorios periódicos

La operación emite recordatorios periódicos para mantener al modelo consciente de que el skill sigue activo. Esto es importante porque el modelo puede "olvidar" que tiene un skill activo si han pasado muchos turnos desde su activación.

El proceso de recordatorios sigue estos pasos:

1. La operación obtiene el turno actual del sistema mediante `memory.getLastInteractionTurn()`.
2. Compara el turno actual con `lastNotifiedTurn` (almacenado en el estado persistente).
3. Si la diferencia entre el turno actual y `lastNotifiedTurn` supera `NOTIFICATION_TURN_INTERVAL` (constante con valor 5), se procede a emitir recordatorios.
4. Para cada par fijado en `pinnedTurns`, se obtiene la herramienta asociada (`pinnedTurn.getTool()`).
5. Si la herramienta existe, se invoca `tool.getPinnedNotificationMessage(request, result)`.
6. Si la herramienta devuelve un mensaje no vacío, se añade a la lista de notificaciones efímeras (`notifications`).
7. Una vez procesados todos los pares, se actualiza `lastNotifiedTurn` al turno actual para evitar repetir la notificación en el mismo turno.

El mensaje de recordatorio que devuelve la herramienta suele ser del tipo:

```
[SKILL ACTIVO: nombre_del_skill]
Este skill define directivas obligatorias para tu comportamiento. 
Cuando concluyas el procedimiento, invoca 'deactivate_skill(name: "nombre_del_skill")' para liberarlo del contexto.
```

Este recordatorio se inyecta como una notificación efímera al final del pipeline de la memoria proyectada.

## 6. Estado persistente

`PinnedTurnsOperation` mantiene un estado persistente que se almacena en el archivo `projected_memory-{subchannel}.json` bajo la clave `pinned_turns`. El estado contiene dos campos principales:

- **`lastNotifiedTurn`**: un entero que almacena el ID del último turno en el que se emitieron recordatorios. Se inicializa a `0` y se actualiza cada vez que se emiten recordatorios.

- **`pinnedTurns`**: una lista de objetos `PinnedTurnStateImpl` que contienen:
  - `requestMessage`: el `AiMessage` que contiene la llamada a la herramienta (con los `ToolExecutionRequest`).
  - `resultMessage`: el `ToolExecutionResultMessage` que contiene el resultado de la ejecución.
  - `tool`: una referencia transitoria a la herramienta (no se serializa; se restaura mediante `memory.getTool()` durante la rehidratación).

La serialización se realiza con Gson, utilizando adaptadores personalizados para `ChatMessage` (`ChatMessageAdapter`) y `Content` (`ContentAdapter`) que preservan la estructura polimórfica de los mensajes de LangChain4j.

La restauración del estado ocurre durante la construcción de `ProjectedMemoryImpl`. Se invoca `restoreState(JsonObject state)` para cada operación, pasándole el estado serializado correspondiente. La operación deserializa la lista de `pinnedTurns` y restaura `lastNotifiedTurn`. Las referencias a las herramientas (`tool`) se resuelven durante la primera proyección, cuando se invoca `process()` y se dispone del catálogo de herramientas completo.

## 7. Interfaz pública

La operación expone un método adicional a través de `ProjectedMemory.getOperation("pinned_turns")`:

- **`boolean removePinnedTurn(Predicate<PinnedTurnState> predicate)`**: elimina de la lista de mensajes fijados aquellos que cumplan con el predicado. Recorre la lista `pinnedTurns` y elimina los elementos que satisfacen el predicado. Devuelve `true` si se eliminó al menos un elemento.

Este método es utilizado principalmente por `Skill.deactivate()` para eliminar los mensajes asociados a un skill específico. El predicado verifica que el `resultMessage` sea de la herramienta `activate_skill` y que el argumento `name` coincida con el nombre del skill que se está desactivando.

Además, la operación implementa los métodos estándar de `ProjectedMemoryOperation`:

- `String getName()`: devuelve `"pinned_turns"`.
- `int getPriority()`: devuelve `5`.
- `void process(ProjectedMemory memory, List<ChatMessage> projectedMessages, List<String> notifications)`: la lógica principal descrita en las secciones anteriores.
- `JsonObject getState()`: devuelve el estado persistente serializado (incluyendo `lastNotifiedTurn` y la lista de `pinnedTurns`).
- `void restoreState(JsonObject state)`: restaura el estado desde un JSON, inicializando `lastNotifiedTurn` y la lista de `pinnedTurns` (con `tool` a `null`; se resolverá después).

## 8. Limitaciones conocidas

- **Los mensajes fijados no se eliminan automáticamente**: si un skill se desactiva sin invocar `deactivate_skill`, o si la invocación falla, los mensajes fijados permanecen en el estado persistente indefinidamente. La única forma de eliminarlos es mediante `removePinnedTurn()`.

- **Reinyección sin consolidación**: si la memoria reciente aún contiene los mensajes fijados (porque no se ha consolidado), la operación los reinyecta duplicándolos. La operación verifica que el `resultMessage` no esté ya presente en la proyección para evitar duplicados. Sin embargo, si el mensaje ha sido modificado (por ejemplo, por `TrimmingOperation`), la verificación puede fallar y provocar una duplicación.

- **Los recordatorios son globales por `subchannel`**: no hay un mecanismo para que cada skill tenga su propio intervalo de recordatorios. Todos los skills comparten el mismo `NOTIFICATION_TURN_INTERVAL` (5 turnos). Esto puede ser excesivo para skills de larga duración o insuficiente para skills de corta duración.

- **Acumulación de estado**: la lista de `pinnedTurns` puede crecer indefinidamente si muchos skills se activan y no se desactivan correctamente. La operación no implementa una política de límite de tamaño ni de rotación. En la práctica, esto es poco probable, pero podría ocurrir en sesiones muy largas con múltiples skills activos.

- **El estado persistente puede contener referencias a herramientas obsoletas**: si una herramienta se elimina del catálogo (por ejemplo, porque se desactiva el servicio que la proporciona), la referencia a `tool` en `PinnedTurnStateImpl` se resuelve a `null` durante la rehidratación. En ese caso, la operación no puede emitir recordatorios y debe manejar la situación de forma segura (ignorando ese par o eliminándolo).

- **Las notificaciones de recordatorio no se pueden cancelar**: una vez que se ha emitido una notificación efímera, permanece en el historial de la conversación. No hay un mecanismo para retractarla o suprimirla si el skill se desactiva inmediatamente después. Esto es una limitación del modelo de notificaciones efímeras, no de la operación en sí.
