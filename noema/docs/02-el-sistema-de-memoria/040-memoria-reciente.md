
# Memoria Reciente (`RecentMemory`)

## 1. Propósito y responsabilidad

- La memoria reciente es la memoria de trabajo del agente.
- Contiene los mensajes de la sesión activa: los intercambios recientes, las herramientas ejecutadas y sus resultados.
- Su tamaño está limitado para preservar la atención del modelo. Cuando se supera el umbral, los turnos más antiguos se compactan y pasan a la memoria compactada.
- Soporte multi-canal: cada `subchannel` tiene su propia instancia de `RecentMemory`, permitiendo conversaciones paralelas e independientes.

## 2. Estructura interna

La memoria reciente mantiene dos estructuras de datos que evolucionan en paralelo:

- **Lista de mensajes (`messages`)**: una secuencia ordenada de objetos `ChatMessage` de LangChain4j. Contiene mensajes de usuario (`UserMessage`), respuestas del modelo (`AiMessage`), llamadas a herramientas (`AiMessage` con `toolExecutionRequests`) y resultados de herramientas (`ToolExecutionResultMessage`).

- **Mapa de trazabilidad (`turnOfMessage`)**: asocia cada posición en la lista de mensajes con el identificador del `Turn` persistido que originó ese mensaje. La clave es el índice en la lista (`Integer`), y el valor es un objeto `ChatMessageInfo` que contiene el `turnId`.

Un mensaje puede estar en dos estados:
- **No consolidado**: no tiene `turnId` asignado porque aún no se ha persistido el turno correspondiente.
- **Consolidado**: tiene `turnId` asignado tras la persistencia del turno en la memoria episódica.

## 3. El ciclo de vida de un mensaje

### `add(ChatMessage)`

Añade un mensaje al final de la lista. El mensaje se marca como no consolidado (sin `turnId`). No se persiste en disco en este momento.

### `consolideTurn(Turn)`

Se invoca tras persistir un turno en la memoria episódica. Realiza una operación de **backfill**:

1. Recibe el `Turn` que acaba de persistirse.
2. Recorre la lista de mensajes desde el final hacia atrás.
3. Asigna el `turnId` del turno a todos los mensajes que aún no tienen `turnId` asignado.
4. Se detiene al encontrar un mensaje que ya tiene `turnId`.

Este mecanismo garantiza que todos los mensajes de un mismo turno compartan el mismo `turnId`, incluso si se añadieron en momentos ligeramente diferentes.

### Persistencia en disco

La memoria reciente se serializa a disco tras cada modificación en el archivo `recent_memory-{subchannel}.json` dentro de `var/lib/`. El guardado es atómico (archivo temporal + movimiento) para evitar corrupción.

## 4. Construcción del contexto

La memoria reciente no se envía directamente al LLM. Es la memoria proyectada (`ProjectedMemory`) quien construye la vista final.
La memoria reciente proporciona los mensajes sin transformaciones; la memoria proyectada aplica las transformaciones (poda, inyección de notificaciones, etc.) justo antes de cada inferencia.

## 5. Compactación: marcas y eliminación

La memoria reciente expone tres métodos para gestionar la compactación:

### `getOldestMark()`

Devuelve una `RecentMemoryMark` correspondiente al mensaje consolidado más antiguo de la sesión. Es el punto de inicio del bloque a compactar. Si no hay mensajes consolidados, devuelve `null`.

### `getCompactMark()`

Determina el punto de corte para la compactación incremental:

1. Toma la mitad de la lista de mensajes (`size() / 2`).
2. Ajusta hacia atrás hasta encontrar un mensaje consolidado.
3. Avanza hasta el final del bloque del mismo `turnId` para no romper la secuencia de un mismo turno (que puede constar de varios mensajes: llamada a herramienta, resultado, etc.).
4. Si el mensaje inmediatamente posterior al corte es un `ToolExecutionResultMessage`, avanza obligatoriamente hasta consumir todas las respuestas de herramientas consecutivas.

Este mecanismo garantiza que no se corte en mitad de un bloque de herramientas paralelas.

### `getNewestMark()`

Devuelve una marca correspondiente al mensaje consolidado más reciente de la sesión. Se utiliza para la compactación total (`COMPACT_REASONING_FULL_SESSION`).

### `remove(mark1, mark2)`

Elimina de la sesión todos los mensajes comprendidos entre `mark1` y `mark2` (inclusive):

1. Ordena las marcas para asegurar que `mark1` es el índice menor.
2. Calcula el desplazamiento (`offset = idx2 - idx1 + 1`).
3. Crea un nuevo mapa donde los mensajes anteriores al corte conservan su índice original; los posteriores se insertan con su índice reducido en `offset`.
4. Elimina físicamente los mensajes de la lista y sustituye el mapa antiguo por el nuevo.

La operación es atómica desde la perspectiva de la sesión: una vez ejecutada, los mensajes compactados desaparecen y no volverán a formar parte del contexto.

## 6. Umbral de compactación

El método `needCompaction()` determina si la memoria reciente ha alcanzado el límite:

1. Recoge todos los valores únicos de `turnId` en el mapa `turnOfMessage`.
2. Si el número de turnos únicos supera un umbral configurable, devuelve `true`.

El umbral se lee de la configuración bajo la clave `reasoning/compaction_turns`. Por defecto, 40 turnos. La compactación se dispara al final del turno, después de que el modelo haya entregado una respuesta.

## 7. Limitaciones conocidas

- **Umbral basado solo en número de turnos**: no se tiene en cuenta el tamaño en tokens de los mensajes. Si un turno incluye una herramienta que devuelve grandes volúmenes de texto sin paginar, el contexto puede saturarse antes del umbral.

- **`getCompactMark()` es costoso**: recorre la lista de mensajes y puede ser costoso en sesiones muy largas (aunque la lista está limitada a ~40 turnos).

- **Persistencia en disco por modificación**: la memoria reciente se guarda en disco en cada `add()` y `consolideTurn()`. Esto puede generar muchas escrituras en sesiones con alto ritmo de interacción.

- **No hay compactación manual**: la compactación solo se dispara automáticamente por `needCompaction()`. No hay forma de forzar una compactación parcial desde fuera (más allá de las acciones de depuración).

- **La memoria reciente no es compartida**: cada `subchannel` tiene su propia instancia. No hay un mecanismo para compartir mensajes entre canales.
