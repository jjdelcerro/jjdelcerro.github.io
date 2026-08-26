
# `TemporalPerceptionOperation`: percepción temporal pasiva

## 1. Propósito y responsabilidad

La operación `TemporalPerceptionOperation` es responsable de informar al modelo del tiempo transcurrido desde la última interacción con el usuario. Su objetivo es dotar al agente de una conciencia temporal pasiva que le permita contextualizar sus respuestas cuando el usuario retoma una conversación después de un lapso significativo.

A diferencia de un sensor activo que emitiría eventos periódicos, esta operación actúa de forma pasiva: solo se activa cuando el agente va a construir el contexto para el modelo, y solo si ha pasado un umbral de tiempo desde la última interacción. Esto evita la generación innecesaria de eventos y mantiene el sistema simple y eficiente.

La operación se ejecuta con prioridad 30, la más baja del pipeline de la memoria proyectada. Se ejecuta después de todas las demás operaciones (`PinnedTurnsOperation`, `TrimmingOperation`, `PendingAnnotationOperation`), asegurando que su notificación se inyecte después de que el resto del contexto ya esté construido y optimizado.

## 2. Comportamiento general

`TemporalPerceptionOperation` actúa durante la fase de construcción de la memoria proyectada, en el método `process()`.

El comportamiento se resume en los siguientes pasos:

1.  **Obtener la última interacción**: la operación consulta el estado persistente de la memoria proyectada para obtener `lastInteractionTime` (la fecha de la última interacción del usuario) a través de `memory.getLastInteractionTime()`.

2.  **Calcular el tiempo transcurrido**: si `lastInteractionTime` no es `null`, calcula la diferencia entre la hora actual y la última interacción.

3.  **Evaluar el umbral**: si la diferencia supera un umbral configurable (por defecto, 1 hora), la operación genera una notificación efímera.

4.  **Inyectar la notificación**: la notificación se añade a la lista de notificaciones del pipeline (`notifications`), que se inyectarán al final del pipeline.

La operación no modifica la lista de mensajes proyectados; solo genera una notificación efímera que se inyectará al final del pipeline junto con otras notificaciones de otras operaciones.

## 3. Condiciones de activación

La operación se activa solo si se cumplen todas las condiciones siguientes:

- **Hay mensajes en la proyección**: la operación comprueba que `projectedMessages` no esté vacía. Si no hay mensajes (es decir, el modelo no va a responder a nada), no se inyecta notificación. Esto evita notificaciones en contextos donde no hay interacción.

- **Ha pasado más de `hoursThreshold`**: la operación compara la última interacción con la hora actual. El umbral por defecto es 1 hora (60 minutos). El umbral está fijado en la constante `DEFAULT_HOURS_THRESHOLD` y no es configurable en tiempo de ejecución a través de `settings.json`.

- **La última interacción no es `null`**: si nunca ha habido una interacción (es decir, `lastInteractionTime` es `null`), no se inyecta ninguna notificación.

La operación no comprueba el tipo de la última interacción (si fue del usuario o del sistema). Simplemente usa el valor almacenado en `lastInteractionTime` que se actualiza cada vez que se construye una proyección (es decir, cada vez que el agente va a responder).

## 4. Inyección del mensaje temporal

Cuando se activa la operación, genera un mensaje con el siguiente formato:

```
Ha pasado [tiempo] desde la última interacción con el usuario.
```

Donde `[tiempo]` se expresa en un formato legible usando la librería `PrettyTime` (ej: "2 horas", "3 días", "un mes"). La librería `PrettyTime` está configurada con el locale español (`Locale.of("es")`).

El mensaje se añade a la lista de notificaciones (`notifications`) que la operación recibe como parámetro. Las notificaciones se inyectan al final del pipeline de la memoria proyectada mediante el mecanismo unificado de inyección de eventos efímeros (ver sección 6 de `050-memoria-proyectada.md`).

El mensaje temporal se inyecta como una notificación efímera, no como un mensaje persistente en la memoria reciente. Esto significa que el modelo lo recibe una sola vez y no se almacena en el historial de la conversación. Si el modelo no reacciona a la notificación en el turno actual (por ejemplo, porque responde sin tenerla en cuenta), la notificación no persistirá en turnos posteriores.

## 5. Estado persistente

`TemporalPerceptionOperation` no tiene estado persistente propio. Depende del estado general de la memoria proyectada, específicamente de:

- **`lastInteractionTime`**: almacenado en el estado persistente de `ProjectedMemory`, se actualiza cada vez que se construye una proyección (en `ProjectedMemoryImpl.getMessages()`). La operación consulta este valor mediante `memory.getLastInteractionTime()`.

- **`lastInteractionTurn`**: almacenado en el estado persistente de `ProjectedMemory`, se actualiza en cada proyección con el ID del último turno procesado. La operación no utiliza este valor directamente, pero se actualiza junto con `lastInteractionTime`.

La operación no modifica el estado persistente; solo lo lee. Esto la hace ligera y sin efectos secundarios sobre el estado del sistema.

La actualización de `lastInteractionTime` ocurre en `ProjectedMemoryImpl.getMessages()`, justo después de construir la proyección y antes de devolverla. Esto asegura que la próxima vez que se evalúe la operación, el tiempo transcurrido se calcule desde la última interacción real, no desde el momento en que se generó la proyección.

## 6. Limitaciones conocidas

- **Umbral fijo de 1 hora**: el umbral no es configurable en tiempo de ejecución. Para cambiar el umbral, es necesario modificar la constante `DEFAULT_HOURS_THRESHOLD` en el código fuente y recompilar.

- **Solo considera el tiempo entre interacciones del usuario**: la operación solo se activa cuando ha pasado tiempo desde la última interacción del usuario. Si el usuario interactúa continuamente, nunca se activa. Si el usuario se ausenta pero el agente ejecuta tareas en segundo plano (ej: indexación de documentos), `lastInteractionTime` no se actualiza (porque no hay interacción del usuario) y la operación se activará cuando el usuario vuelva.

- **La notificación es efímera y no persiste**: si el modelo no reacciona a la notificación en el turno actual, la notificación no estará disponible en turnos posteriores. Esto es intencionado, pero puede hacer que el modelo "olvide" el tiempo transcurrido si no lo procesa inmediatamente.

- **Dependencia de `lastInteractionTime`**: la operación asume que `lastInteractionTime` se actualiza correctamente en cada proyección. Si el estado persistente de la memoria proyectada se corrompe o se actualiza incorrectamente, la operación puede fallar (ej: no inyectar la notificación cuando debería).

- **La notificación no incluye la hora exacta**: el mensaje solo indica el tiempo transcurrido ("2 horas"), no la hora exacta de la última interacción. Esto es suficiente para el propósito de la operación, pero podría ser insuficiente si el modelo necesita precisión temporal.

- **No hay percepción de tiempo en ausencia de interacción del usuario**: si el usuario no interactúa durante mucho tiempo, la operación solo se activa en el momento en que el usuario vuelve a interactuar. No hay una percepción continua del tiempo mientras el usuario está ausente.
