# Visión general del modelo de memoria

## 1. El problema: el contexto finito y la atención frágil

Los modelos de lenguaje tienen una ventana de contexto limitada. Aunque las cifras comerciales hablen de cientos de miles o millones de tokens, la atención del modelo se degrada mucho antes de alcanzar ese límite. El fenómeno *lost in the middle* implica que los tokens en la parte central de la secuencia reciben menos atención que los del principio y el final. Cuanto más se llena el contexto, más ruido hay y peor razona el modelo.

Almacenar todo el historial en contexto es inviable. Descartar información es perder conocimiento. Noema aborda este problema con una arquitectura de memoria híbrida que destila, organiza y proyecta el conocimiento de forma que el LLM siempre tenga el contexto adecuado sin saturar su atención. El objetivo no es ampliar la memoria del modelo, sino gestionar lo que entra y sale de su campo de consciencia.

## 2. Filosofía del modelo de memoria

El diseño de la memoria en Noema se sostiene sobre tres principios:

- **Narrativa frente a base de datos**: la memoria se organiza como una historia (cronológica, causal, con intencionalidad), no como un conjunto de hechos aislados. Los LLMs están entrenados con prosa, no con registros SQL. Una narrativa fluida es más fácil de procesar para el modelo que una lista de viñetas.

- **Trazabilidad determinista**: cada pieza de conocimiento en la memoria compactada lleva una cita `{cite:ID}` que apunta al turno original en la memoria episódica. Esto permite al modelo recuperar el detalle exacto cuando lo necesita, sin tenerlo permanentemente en contexto. La trazabilidad es la columna vertebral que conecta todas las capas.

- **Destilación progresiva**: los datos brutos (logs, mensajes, resultados de herramientas) se transforman en conocimiento mediante un proceso continuo de anotación y compactación. El sistema no espera a tener todos los datos para procesarlos; procesa y consolida constantemente, manteniendo la memoria de trabajo siempre en un tamaño donde la atención del modelo sea óptima.

El sistema recuerda, el modelo no aprende. Los pesos del LLM permanecen congelados. La memoria es un motor externo que alimenta al modelo con el contexto adecuado en cada turno, construido a partir de la historia completa de la interacción.

## 3. Los cuatro estratos de la memoria

La memoria de Noema se divide en cuatro capas, cada una con una función específica y un ciclo de vida propio:

- **Memoria episódica (`EpisodicMemory`)**: el registro inmutable de todo lo que ha ocurrido. Cada interacción (mensaje del usuario, respuesta del modelo, llamada a herramienta, resultado, anotación) se almacena como un `Turn` en una base de datos H2. Es la fuente de verdad de la que derivan el resto de capas.

- **Memoria compactada (`CompactedMemory`)**: la destilación narrativa del pasado. Se genera periódicamente a partir de los turnos más antiguos de la memoria reciente. Contiene dos partes: un *Resumen* ejecutivo (decisiones clave, estado actual) y *El Viaje* (una crónica cronológica que preserva la intencionalidad y la evolución de las ideas). Es lo que el modelo "lee" en su contexto como memoria a largo plazo.

- **Memoria reciente (`RecentMemory`)**: la memoria de trabajo. Contiene los mensajes de la sesión activa (los últimos intercambios, las herramientas ejecutadas y sus resultados). Su tamaño está limitado (por defecto, unos 40 turnos) para preservar la atención del modelo. Cuando se supera el umbral, los turnos más antiguos se compactan y pasan a la memoria compactada.

- **Memoria proyectada (`ProjectedMemory`)**: la vista efímera que realmente ve el LLM en cada turno. Es una construcción dinámica que se genera justo antes de cada llamada al modelo. Aquí se aplican transformaciones: poda de resultados de herramientas largos, inyección de notificaciones efímeras, fijación de skills activos, y percepción temporal pasiva. La memoria proyectada no persiste; se reconstruye en cada turno a partir de las capas inferiores.

## 4. Implicaciones para el desarrollo

- La memoria es el eje central del sistema; todos los servicios (razonamiento, sensores, herramientas) interactúan con ella directa o indirectamente.
- La memoria proyectada es el punto de control antes de cada inferencia del LLM. Modificar las operaciones del pipeline (`TrimmingOperation`, `PendingAnnotationOperation`, etc.) cambia lo que el modelo ve en cada turno.
- La calidad de la compactación depende del prompt `memory-compact.md`. Editarlo permite ajustar el estilo narrativo, el nivel de detalle y el tratamiento de las citas sin tocar el código.
- La trazabilidad `{cite:ID}` es la columna vertebral que conecta las cuatro capas. Cualquier ruptura en esta cadena (una cita que apunta a un turno inexistente, o un turno que no se puede recuperar) afecta a la integridad del sistema. Los mecanismos de validación (`badcite`) y las herramientas de recuperación (`lookup_turn`) existen precisamente para mantener esta cadena intacta.
