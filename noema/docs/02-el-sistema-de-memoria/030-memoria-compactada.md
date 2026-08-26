
# Memoria Compactada (`CompactedMemory`)

## 1. Propósito y responsabilidad

La memoria compactada es la destilación narrativa del pasado. Es la capa que permite al agente recordar conversaciones de cientos o miles de turnos sin saturar la ventana de contexto del LLM. Su función es transformar el registro detallado de la memoria episódica en una narrativa densa y coherente que preserve la esencia de lo ocurrido, manteniendo al mismo tiempo la trazabilidad hacia los turnos originales.

A diferencia de la memoria episódica, que es un registro inmutable y detallado, la memoria compactada es una vista resumida y estructurada. Se genera periódicamente a partir de los turnos más antiguos de la memoria reciente, y una vez creada, los turnos que la componen se eliminan de la memoria de esta. El resultado es un sistema donde el pasado no se olvida, sino que se destila.

## 2. Estructura de la memoria compactada

Cada `CompactedMemory` se compone de dos secciones claramente diferenciadas:

- **Resumen**: un bloque ejecutivo y factual que sintetiza las decisiones clave, el estado actual de los proyectos discutidos, los hechos consolidados y los próximos pasos acordados. Está pensado para ser leído rápidamente por el LLM y proporcionar una visión general del contexto.

- **El Viaje**: una crónica narrativa que preserva la cronología, la intencionalidad y la evolución de las ideas. No es un simple listado de hechos, sino una historia que captura el proceso de razonamiento, los puntos de inflexión, los malentendidos resueltos y el tono de la conversación. Está diseñada para ser leída como un relato, no como un registro.

Ambas secciones integran citas `{cite:ID}` en el flujo del texto. Estas citas apuntan al turno original en la memoria episódica, permitiendo al modelo recuperar el detalle exacto cuando lo necesita.

**Ejemplo de fragmento de El Viaje**:

> Tras la propuesta inicial del usuario sobre la nueva arquitectura {cite:23}, el agente exploró varias alternativas. La discusión se centró en la escalabilidad del sistema, y se decidió que la base de datos H2 era suficiente para las necesidades actuales {cite:45}. Sin embargo, el usuario insistió en mantener la opción de migrar a PostgreSQL en el futuro {cite:67}, lo que llevó a diseñar una capa de abstracción que lo permitiera.

## 3. Persistencia híbrida

La memoria compactada se almacena de forma híbrida:

- **Metadatos en base de datos H2** (tabla `compactedmemory`):
  - `id`: identificador único.
  - `turnFirst`: ID del primer turno que abarca.
  - `turnLast`: ID del último turno que abarca.
  - `timestamp`: momento de creación.
  - `subchannel`: canal o terminal al que pertenece.

- **Contenido textual en archivo `.md`** dentro de `var/lib/compactedmemory/`:
  - Nombre del archivo: `compactedmemory-{id}-{first}-{last}.md`.
  - Contiene el texto completo (Resumen + El Viaje) en formato Markdown.

La implementación de `CompactedMemoryImpl` implementa **lazy loading**: el texto solo se carga desde el disco cuando se invoca `getText()`. Esto evita cargar en memoria todas las memorias compactadas al arrancar el agente.

## 4. Generación de una nueva memoria compactada

La generación de una nueva `CompactedMemory` es responsabilidad de [`MemoryCompactionService`](../03-catalogo-de-servicios/02-memory-compaction.md)). Brevemente:

- El servicio toma el último `CompactedMemory` existente (si lo hay) y la lista de turnos no consolidados de la memoria reciente.
- Utiliza un LLM con un prompt específico (`memory-compact.md`) para generar un nuevo texto que integre ambas fuentes en una narrativa única.
- El prompt define el protocolo de generación: estilo narrativo, manejo de citas, interpretación de herramientas, verificación de calidad, etc.
- Una vez generado, el nuevo `CompactedMemory` se persiste mediante `EpisodicMemory.add(compactedMemory)`.

## 5. Uso en el contexto del LLM

La memoria compactada se inyecta en el prompt del sistema a través de la **memoria proyectada** (`ProjectedMemory`). Cuando `ProjectedMemory` construye la vista final para el LLM, incluye el `CompactedMemory` más reciente como un bloque de texto delimitado:

```
--- INICIO DEL RELATO ---
[contenido de la memoria compactada]
--- FIN DEL RELATO ---
```

El modelo interpreta este bloque como "lo que pasó antes", sin saber que es un resumen generado. Esto permite que el LLM tenga una visión global de la conversación sin ocupar todo su contexto con detalles antiguos.

Las citas `{cite:ID}` incrustadas en el texto permiten al modelo recuperar el turno completo mediante la herramienta `lookup_turn` (ver [herramientas de memoria](../04-subsistemas-de-ejecucion-y-capacidades/01-herramientas-base-y-paginacion.md)), proporcionando acceso bajo demanda a los detalles exactos.

El prompt del sistema (`reasoning-system.md`) contiene directrices explícitas que complementan este mecanismo. En particular, la "Directiva anti-alucinación" obliga al modelo a utilizar `lookup_turn` para recuperar el detalle de cualquier cita antes de responder, y le prohíbe inventar información si existe una referencia `{cite:ID}`. Además, las instrucciones sobre "Interpretación de la información recuperada" le piden que considere la antigüedad de los datos recuperados para no presentar información obsoleta como vigente. Este acoplamiento entre el prompt y la estructura de la memoria compactada es lo que garantiza que la trazabilidad se mantenga en la práctica y que el modelo no alucine detalles que debería consultar.

## 6. Herramientas asociadas

La memoria compactada se complementa con tres herramientas que permiten al modelo interactuar con su propio historial:

- **`lookup_turn`**: recupera un turno completo a partir de un `{cite:ID}` encontrado en la memoria compactada. Devuelve el turno solicitado junto con un contexto inmediato a su alrededor.

- **`search_full_history`**: realiza una búsqueda semántica en toda la memoria episódica cuando la compactada no es suficiente. Permite al modelo encontrar información que intuye que conoce pero de la que no tiene una referencia directa.

- **`annotate_observation`**: permite al modelo fijar notas, resúmenes o insights que se integran en la memoria episódica y, por tanto, en futuras compactaciones. Es el mecanismo mediante el cual el modelo extrae conocimiento del flujo de datos y lo preserva.

## 7. Limitaciones conocidas

- **Compactación bloqueante**: el agente se detiene mientras se genera la nueva `CompactedMemory`. Para conversaciones muy largas o con modelos lentos, esto puede suponer una pausa de varios segundos.

- **Umbral basado en número de turnos**: la compactación se activa al alcanzar un número fijo de turnos (por defecto 40). No se tiene en cuenta el tamaño en tokens, lo que puede provocar que el contexto se sature antes del umbral si los turnos incluyen textos muy largos.

- **Calidad dependiente del prompt y del modelo**: una compactación deficiente puede perder información relevante o distorsionar la narrativa. El prompt `memory-compact.md` es el principal punto de control para la calidad.

- **Validación post-hoc de citas**: las citas se validan después de generar el texto, pero no se previenen las alucinaciones en origen. Si el modelo inventa una cita, se convierte en `{badcite:ID}` y el agente no podrá recuperar ese turno.

- **Acumulación de archivos `.md`**: no hay una política de rotación o limpieza de los archivos de memoria compactada. En sesiones muy largas, el directorio `compactedmemory/` puede crecer indefinidamente.

- **Sin compresión de texto**: los archivos `.md` se almacenan en texto plano. Para conversaciones extremadamente largas, el espacio en disco puede ser significativo.
