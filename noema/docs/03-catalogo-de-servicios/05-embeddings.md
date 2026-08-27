# Servicio de embeddings (`EmbeddingsService`)

## 1. Representación vectorial y búsqueda por significado

Los modelos de lenguaje operan internamente proyectando conceptos en espacios vectoriales multidimensionales. En este espacio, la distancia geométrica entre dos vectores se correlaciona con su afinidad semántica: dos textos con significados similares generan vectores cercanos, con independencia de las palabras exactas que utilicen.

Noema aprovecha esta propiedad para dotar al agente de **búsqueda semántica en su memoria a largo plazo**. El componente `EmbeddingsService` gestiona este subsistema de forma 100% local, ligera y determinista, sin realizar llamadas a APIs externas de pago ni requerir servicios auxiliares en la nube.

Sus funciones principales son:
1. **Vectorización local:** Transformar fragmentos de texto en vectores de números reales utilizando un modelo cuantizado en formato ONNX.
2. **Particionado y recuperación MaxP (*Maximum Passage*):** Dividir turnos extensos en bloques (*chunks*) para evitar la dilución semántica y comparar contra el fragmento de máxima similitud.
3. **Serialización binaria:** Convertir arrays de coma flotante (`float[]`) en secuencias de bytes (`byte[]`) optimizadas para su almacenamiento en columnas BLOB de la base de datos relacional H2.
4. **Filtrado y ordenación Top-K (`EmbeddingFilter`):** Evaluar similitudes coseno en memoria sobre los registros de la memoria episódica para entregar los resultados más relevantes ordenados de forma descendente.


## 2. El modelo de embeddings ONNX multilingüe

A diferencia de aproximaciones que dependen de modelos monolingües descargados en tiempo de ejecución, Noema empaqueta un modelo local optimizado para inferencia en CPU:

* **Modelo principal (ID `0`):** `paraphrase-multilingual-MiniLM-L12-v2` cuantizado (`model_quantized.onnx`), con su correspondiente tokenizador (`tokenizer.json`).
* **Dimensiones:** 384 dimensiones por vector.
* **Modo de pooling:** `PoolingMode.MEAN`.
* **Despliegue:** Los archivos del modelo se instalan en el sandbox del agente bajo `var/models/embeddings/paraphrase-multilingual-MiniLM-L12-v2/` mediante el script de compilación Maven (`download.sh`).

Durante la inicialización del servicio (`start()`), `EmbeddingsService` instancia `OnnxEmbeddingModel` y precarga los pesos en memoria para evitar latencias en la primera consulta:

```java
this.embeddingModels = new EmbeddingModel[]{
  new EmbeddingModel(
      0, 
      384, 
      agent.getPaths().getAgentPath(resources[0]),
      agent.getPaths().getAgentPath(resources[1])
  ),
  new EmbeddingModel(1, 384, AllMiniLmL6V2QuantizedEmbeddingModel.class),
  new EmbeddingModel(2, 384, BgeSmallEnV15QuantizedEmbeddingModel.class)
};
this.embeddingModel = embeddingModels[0];
this.embeddingModel.getModel(); // Fuerza la carga en RAM
```

La elección de un modelo multilingüe cuantizado de 384 dimensiones ofrece un equilibrio óptimo: precisión adecuada para español e inglés técnico, huella de memoria reducida (inferior a 150 MB en RAM) y tiempos de inferencia en CPU del orden de pocos milisegundos por fragmento.


## 3. Particionado de texto y estrategia MaxP (`Embedding`)

Cuando un turno de conversación es extenso (por ejemplo, una respuesta con explicaciones conceptuales y llamadas a herramientas), vectorizar todo el bloque en un único vector genera un promedio ponderado que diluye los conceptos específicos.

Para resolver este problema, la clase interna `EmbeddingsService.Embedding` implementa una estrategia de **recuperación por pasaje máximo (MaxP)**:

```
Texto del turno (> 1024 caracteres)
        │
        ├──► Chunk 0 (1024 chars) ──► Vector 0 (384 floats)
        ├──► Chunk 1 (1024 chars) ──► Vector 1 (384 floats)
        └──► Metadatos ─────────────► [ (float) modelId, (float) dimension ]
```

### Proceso de particionado (`computeTextChunks`)

1. El texto se divide en bloques de un tamaño máximo de 1024 caracteres (`TEXT_CHUNK_SIZE`).
2. Para no cortar oraciones a mitad, el algoritmo busca hacia atrás el último signo de puntuación (`.`, `?`, `!`) dentro del bloque. Si no encuentra puntuación, busca el último espacio en blanco.
3. Cada bloque resultante se vectoriza de forma independiente con el modelo ONNX.

### Estructura binaria del vector resultante

Todos los vectores generados para un texto se concatenan en un único array unidimensional `float[]`, añadiendo dos metadatos obligatorios en las últimas dos posiciones:

$$\text{Longitud del array} = (\text{numChunks} \times \text{dimension}) + 2$$

* `data[data.length - 2]`: Identificador numérico del modelo (`modelId`).
* `data[data.length - 1]`: Dimensión de cada vector (`dimension`, típicamente 384).

### Algoritmo de distancia MaxP (`cosineDistance`)

Cuando se compara una consulta (que generalmente ocupa un único chunk) contra un turno almacenado (que puede tener $N$ chunks), el método `cosineDistance` calcula la similitud coseno contra cada uno de los bloques y se queda con la máxima afinidad encontrada:

```java
double maxSimilarity = -1.0;
for (int i = 0; i < targetNumChunks; i++) {
    int targetOffset = i * this.dimension;
    double similarity = cosineSimilarity(queryData, queryOffset, target.data, targetOffset);
    if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
    }
}
return 1.0 - maxSimilarity;
```

Esto permite que el agente localice un turno histórico relevante incluso si la idea buscada está oculta en medio de un párrafo dentro de una respuesta muy larga.

### Validación estricta de compatibilidad

Antes de realizar el cálculo, `cosineDistance` valida que ambos vectores compartan el mismo `modelId` y la misma `dimension`. Si los metadatos difieren (por ejemplo, si se cambiara el modelo en una migración sin regenerar la base de datos), el sistema lanza una excepción inmediata (`IllegalArgumentException`), evitando comparaciones numéricas sin sentido geométrico.


## 4. Serialización binaria para bases de datos

Las bases de datos relacionales embebidas como H2 no disponen de un tipo nativo para arrays de punto flotante de Java. `EmbeddingsService` gestiona la conversión bidireccional entre `float[]` y `byte[]` mediante buffers directos:

```java
public byte[] toBytes(float[] vector) {
    if (vector == null) return null;
    ByteBuffer buffer = ByteBuffer.allocate(vector.length * 4);
    buffer.asFloatBuffer().put(vector);
    return buffer.array();
}

public float[] fromBytes(byte[] bytes) {
    if (bytes == null) return null;
    FloatBuffer buffer = ByteBuffer.wrap(bytes).asFloatBuffer();
    float[] vector = new float[buffer.remaining()];
    buffer.get(vector);
    return vector;
}
```

Cada valor `float` ocupa 4 bytes. Para un turno estándar de 1 chunk (384 floats + 2 metadatos = 386 valores), el BLOB almacenado en la tabla `episodicmemory` ocupa exactamente 1.544 bytes, optimizando el espacio en disco y acelerando la lectura secuencial.


## 5. Búsqueda y ordenación con `EmbeddingFilter`

Dado que H2 carece de indexación vectorial nativa (como HNSW o IVFFlat), Noema implementa el filtrado y ordenación semántica en cliente mediante la clase `EmbeddingFilterImpl<T>`.

```
[Consulta del usuario: 'copias de seguridad']
                   │
                   ▼
       Vectorización de la query
                   │
                   ▼
 Lectura secuencial de BLOBs en BD (H2)
                   │
                   ▼
  Cálculo de similitud coseno en RAM
                   │
                   ▼
 Min-Heap de tamaño K (PriorityQueue)
 ├── Descarta candidatos con score < minSimilarity (0.2)
 └── Expulsa al peor elemento si entra uno mejor
                   │
                   ▼
   Lista final ordenada de mayor a menor
```

### Características del filtro

* **Min-Heap eficiente:** Utiliza una `PriorityQueue` de tamaño acotado (`maxResults`) ordenada ascendentemente por score. La cabeza de la cola siempre contiene el peor candidato del conjunto actual; si un nuevo turno supera ese valor mínimo, el peor es descartado y el nuevo toma su lugar.
* **Umbral de corte (`minSimilarity`):** Permite fijar un suelo de relevancia (rango `0.0` a `1.0`, por defecto `0.2` en `SearchFullHistoryTool`). Aquellos registros cuya similitud matemática no alcance el umbral son ignorados antes de entrar a la cola.
* **Resultado descendente:** Al finalizar la iteración, el filtro extrae los elementos y los invierte para entregar la lista ordenada desde la mayor afinidad hacia la menor.


## 6. Integración con los subsistemas de Noema

### Memoria episódica (`EpisodicMemoryImpl`)

Durante la persistencia de un nuevo turno (`add(Turn turn)`), si el turno no dispone de vector semántico, `EpisodicMemoryImpl` invoca automáticamente al servicio:

```java
float[] vector = turn.getEmbedding();
if (vector == null) {
    String textToEmbed = turn.getContentForEmbedding();
    vector = embedding.embed(textToEmbed);
}
byte[] blobBytes = (vector != null) ? embedding.toBytes(vector) : null;
```

Cuando el modelo solicita una búsqueda histórica mediante `search_full_history`, `EpisodicMemoryImpl.getTurnsByText()` recupera los registros con `embedding_blob IS NOT NULL`, filtra por `subchannel` y por `annotation_type` (si aplica), y delega el ranking en `EmbeddingFilter`.

### Reutilización de recursos en subagentes (`SubagentImpl`)

La carga de un modelo ONNX y su tokenizador en memoria tiene un coste no despreciable. Para evitar que la creación de múltiples subagentes concurrentes multiplique el consumo de RAM, `SubagentImpl` no instancia un nuevo servicio de embeddings; en su lugar, recibe la instancia del agente padre como servicio compartido:

```java
this.subAgent.addSharedService(this.parent.getService(EmbeddingsService.NAME));
```

Esto permite que todos los procesos trabajadores ejecuten vectorizaciones sobre la misma instancia del modelo en memoria de forma segura.

## 7. Límites del diseño

* **Escaneo lineal en base de datos:** La búsqueda semántica recorre secuencialmente los registros de la tabla `episodicmemory`. Para bases de datos personales (decenas de miles de turnos), la latencia es de pocos milisegundos; en volúmenes superiores a cientos de miles de registros, sería necesario migrar a un motor con soporte nativo de índices vectoriales (como PostgreSQL con `pgvector`).
* **Sin cuantización de almacenamiento:** Los vectores se guardan como floats de 32 bits sin compresión escalar adicional (como cuantización a 8 bits).
* **Modelo residente continuo:** El modelo ONNX permanece cargado en RAM durante toda la vida del proceso para garantizar disponibilidad inmediata en cada turno.
