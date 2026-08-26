# Memoria Episódica (`EpisodicMemory`)

## 1. Propósito y responsabilidad

La memoria episódica es el registro inmutable de todo lo que ha ocurrido en la conversación. Es la fuente de verdad del sistema: cada interacción, cada mensaje del usuario, cada respuesta del modelo, cada llamada a una herramienta y cada resultado se almacena aquí de forma permanente. Ningún dato se modifica una vez escrito; solo se añaden nuevos registros.

Su responsabilidad principal es doble:

- **Persistir los turnos** de forma duradera, garantizando que el historial completo esté disponible para futuras consultas y compactaciones.
- **Proporcionar acceso eficiente** a esos turnos para operaciones como la recuperación por rango (necesaria para la compactación) y la búsqueda semántica (necesaria para la herramienta `search_full_history`).

La memoria episódica se apoya en una base de datos H2 embebida (`memory.mv.db`) y, para la búsqueda semántica, en el servicio de embeddings (`EmbeddingsService`).

## 2. Modelo de datos: `Turn`

La unidad atómica de la memoria episódica es el `Turn`. Cada turno representa una interacción completa o un fragmento significativo de ella.

La interfaz `Turn` define los siguientes campos principales:

- **`int getId()`**: identificador único e inmutable del turno. Se asigna automáticamente mediante un `Counter` al persistir.
- **`LocalDateTime getTimestamp()`**: momento exacto en que ocurrió el evento.
- **`String getContenttype()`**: clasifica el turno. Valores habituales: `"chat"` (mensaje de usuario o respuesta del modelo), `"tool_execution"` (ejecución de una herramienta), `"tool_execution_summarized"` (resultado truncado), `"lookup_turn"` (recuperación de un turno histórico), `"annotation"` (anotación del modelo).
- **`String getSubchannel()`**: identifica el canal o terminal al que pertenece el turno (por defecto `"default"`). Permite separar conversaciones paralelas.
- **`String getTextUser()`**: texto del mensaje del usuario (si el turno es un `"chat"`).
- **`String getTextModelThinking()`**: cadena de pensamiento interna del modelo (si se ha capturado).
- **`String getTextModel()`**: respuesta textual del modelo (si el turno es un `"chat"`).
- **`String getToolCall()`**: JSON que describe la llamada a la herramienta (si el turno es una ejecución).
- **`String getToolResult()`**: resultado de la ejecución de la herramienta (puede estar truncado, ver sección 3).
- **`float[] getEmbedding()`**: vector semántico del turno, utilizado para búsqueda por similitud.

El método `getContentForEmbedding()` devuelve una concatenación de los campos relevantes (`textUser`, `textModel`, `toolCall`, `toolResult`). Es el texto que se utiliza para calcular el embedding.

El método `toCSVLine()` genera una representación CSV del turno, utilizada durante la compactación para alimentar al LLM (ver `MemoryCompactionService`).

## 3. La tabla `episodicmemory`

La tabla H2 tiene el siguiente esquema (simplificado):

```sql
CREATE TABLE episodicmemory (
    id INT PRIMARY KEY,
    timestamp TIMESTAMP,
    contenttype VARCHAR(50),
    subchannel VARCHAR(20),
    annotation_type VARCHAR(100),
    text_user CLOB,
    text_thinking CLOB,
    text_model CLOB,
    tool_call CLOB,
    tool_result CLOB,
    embedding_blob BLOB
)
```

- **`annotation_type`**: se usa exclusivamente para turnos de tipo `"annotation"`. Almacena el tipo semántico de la anotación (por ejemplo, `"section_index"`, `"architecture"`), permitiendo filtrar búsquedas semánticas por tipo.
- **`text_*` y `tool_*`**: se almacenan como `CLOB` para soportar textos largos, pero se aplica una política de truncado en `tool_result` (ver más abajo).
- **`embedding_blob`**: almacena el vector de embedding como un BLOB (serializado con `toBytes()`).

### Política de truncado de resultados largos

El campo `tool_result` puede contener textos masivos (ej: salida de un comando de 50.000 líneas). Para evitar que la base de datos crezca sin control, se aplica un truncado a 2 KB:

```java
if (originalText.length() > MAX_DB_TEXT_SIZE) {
    // Reemplazar con un JSON que contiene los primeros 2KB y metadatos
}
```

El `contenttype` cambia a `"tool_execution_summarized"` para indicar que el contenido original no está completo. El contenido original solo está disponible durante el turno activo en la memoria reciente; una vez compactado, solo se conservan los metadatos.

## 4. El repositorio: `EpisodicMemoryImpl`

La implementación concreta de `EpisodicMemory` es `EpisodicMemoryImpl`. Proporciona los siguientes métodos clave:

### `void add(Turn turn)`

Persiste un turno en la base de datos. Pasos:

1. Si `turn.getId() < 0`, se asigna un nuevo ID usando `Counter`.
2. Si `turn.getEmbedding()` es `null`, se calcula automáticamente usando `EmbeddingsService.embed(turn.getContentForEmbedding())`.
3. Se aplica la política de truncado a `toolResult`.
4. Se ejecuta el `INSERT` en la tabla `episodicmemory`.
5. Se vuelca el turno a `turns.csv` (ver sección 6).

### `List<Turn> getTurnsByIds(int first, int last)`

Recupera todos los turnos cuyo `id` está en el rango `[first, last]`, ordenados ascendentemente. Se utiliza exclusivamente durante la compactación (ver `MemoryCompactionService`).

### `Turn getTurnById(int id)`

Recupera un turno concreto por su ID. Se utiliza en `LookupTurnTool` (`fetch_citation`).

### `List<Turn> getTurnsByText(String query, int maxResults, double minSimilarity, String annotationType)`

Búsqueda semántica en el historial. Pasos:

1. Vectoriza la consulta usando `EmbeddingsService`.
2. Crea un `EmbeddingFilter` (min-heap) para mantener los `maxResults` mejores.
3. Escanea la tabla `episodicmemory` seleccionando todos los turnos con `embedding_blob` no nulo y que cumplan el filtro de `annotationType` (si se proporciona).
4. Para cada turno, deserializa el blob a `float[]` y calcula la similitud coseno contra la consulta.
5. Añade el turno al filtro si supera `minSimilarity`.
6. Devuelve la lista ordenada de mayor a menor similitud.

### `CompactedMemory getLatestCompactedMemory(String subchannel)`

Recupera la memoria compactada más reciente para un `subchannel` dado. Se utiliza para obtener el `CompactedMemory` activo que se inyecta en el contexto del LLM (ver `Session`).

### Gestión de IDs con `Counter`

Tanto los turnos como las memorias compactadas utilizan un `Counter` independiente que se inicializa consultando `SELECT MAX(id)` de la tabla correspondiente. Esto garantiza que los IDs sean secuenciales y únicos incluso si la base de datos ha sido manipulada externamente.

## 5. Búsqueda semántica con embeddings

La búsqueda semántica en el historial se basa en el servicio `EmbeddingsService` y la clase `EmbeddingFilter`.

### `EmbeddingFilter`

Es una cola de prioridad (min-heap) que mantiene los `K` elementos con mayor similitud a la consulta. Cada elemento se añade con su similitud; si el heap está lleno y el nuevo elemento tiene mayor similitud que el peor actual, se reemplaza. Al final, `get()` devuelve la lista ordenada de mayor a menor.

### Escaneo completo

Dado que H2 no soporta índices vectoriales nativos, la búsqueda realiza un escaneo completo de la tabla. Para volúmenes moderados (miles de turnos) es aceptable; para decenas de miles puede ser lento. El código incluye comentarios sobre la posibilidad de migrar a PostgreSQL con `pgvector` en el futuro.

### Umbral de similitud (`minSimilarity`)

El parámetro `minSimilarity` permite filtrar resultados que no alcancen un nivel mínimo de relevancia. Un valor alto (ej: `0.8`) hace la búsqueda muy estricta; un valor bajo (ej: `0.2`) la hace más permisiva. Por defecto se usa `0.2` en `SearchFullHistoryTool`.

## 6. CSV de depuración (`turns.csv`)

Cada turno se vuelca en el archivo `turns.csv` dentro de `var/lib/`. Este CSV tiene la cabecera:

```
code,timestamp,contenttype,text_user,text_model_thinking,text_model,tool_call,tool_result
```

No es utilizado por la lógica del agente, pero es útil para:

- Inspeccionar el historial de forma legible sin consultar la base de datos.
- Depurar problemas de compactación.
- Alimentar herramientas externas de análisis.

El archivo se abre en modo "append"; si no existe, se crea con la cabecera.

## 7. Limitaciones conocidas

- **Escaneo completo sin índices vectoriales**: la búsqueda semántica puede volverse lenta con historiales muy largos (> 50.000 turnos).
- **Truncado irreversible de resultados largos**: el contenido original de `tool_result` se pierde tras la compactación (solo se conservan los metadatos). Esto es deliberado para ahorrar espacio, pero implica que ciertos detalles solo están disponibles durante el turno activo.
- **H2 no es distribuida**: la base de datos está diseñada para un solo proceso. No es adecuada para entornos con múltiples instancias del agente.
- **Ausencia de compresión en embeddings**: cada vector de 384 dimensiones ocupa ~1.5 KB en disco. Para millones de turnos, el espacio podría ser significativo.
- **El contador de IDs no es resistente a fallos**: si la JVM falla entre la asignación del ID y la persistencia del turno, se pierde un ID (aunque no hay problema de consistencia, solo un hueco en la secuencia).
- **`annotation_type` solo se usa en turnos de tipo `"annotation"`**: no se reutiliza para otros tipos, lo que limita su utilidad para búsquedas cruzadas.
