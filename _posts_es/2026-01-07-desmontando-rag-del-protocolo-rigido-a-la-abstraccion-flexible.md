---
layout: post
title: "Desmontando RAG, del protocolo rígido a la abstracción flexible"
date: 2026-01-07
canonical_url: "https://jjdelcerro.github.io/es/blog/desmontando-rag-del-protocolo-rigido-a-la-abstraccion-flexible/"
---  
>
> Nota: Este artículo se escribió originalmente en septiembre de 2025, poco antes de la consolidación de arquitecturas como GraphRAG. Quedó guardado en un "cajón digital", pero al revisarlo hoy, me sorprendió ver cuánto de su diagnóstico arquitectónico sigue vigente. He decidido publicarlo manteniendo intacto el texto original para preservar el contexto del análisis, añadiendo solo una breve nota al final sobre cómo ha evolucionado el ecosistema RAG en estos últimos meses.
>

Hola a todos,
Llevo un tiempo dándole vueltas a la arquitectura de los sistemas RAG (Retrieval-Augmented Generation) y, como arquitecto, hay algo que me chirría profundamente. Sentimos que estamos en la frontera de la IA, pero las herramientas que usamos nos fuerzan a pasar por una puerta muy estrecha. Si volvemos al paper original que lo empezó todo (Lewis et al., 2020), la definición era elegantemente simple: un modelo generativo que se aumenta con información externa.

Esta definición es amplia y potente. No prescribe *cómo* debe ser esa recuperación. Sin embargo, en la práctica, el ecosistema ha convergido masivamente en una implementación muy específica: la búsqueda de similitud vectorial sobre bases de datos de texto no estructurado. Esta técnica es tan dominante que ha empezado a moldear no solo nuestra percepción de lo que *es* RAG, sino también las herramientas y protocolos que construimos a su alrededor. Y es aquí donde, como arquitectos, debemos pararnos a analizar las consecuencias.

#### **Cuando la API refleja el mecanismo y no la intención**

Cuando una aplicación cliente necesita interactuar con un "retriever" como servicio externo, lo hace a través de una API. Y aunque no existe un estándar formal, el patrón de facto es claro, en gran parte popularizado por el auge de las bases de datos vectoriales como Pinecone, Weaviate o Chroma: APIs RESTful sobre HTTP/S (con JSON) o, para mayor rendimiento, gRPC. 

El diablo, como siempre, está en los detalles de estas APIs. Una llamada típica a un servicio de retriever vectorial se parece a esto:

```json
{
  "vector": [0.12, 0.54, ..., -0.08],
  "topK": 5,
  "metric_type": "cosine"
}
```

Observemos el lenguaje de esta API. Sus "verbos" y "sustantivos" son `vector`, `topK` (los K vecinos más cercanos), `metric_type`. Es un lenguaje intrínsecamente geométrico y estadístico. Esta API no está diseñada para "recuperar información"; está diseñada para **"encontrar los vecinos más cercanos a un punto en un espacio de N dimensiones"**.

Esto tiene una implicación profunda: cualquier cliente que se programe contra esta API queda fuertemente acoplado, no al concepto abstracto de RAG, sino a una de sus posibles implementaciones. La capa de transporte nos ha encerrado en un único paradigma. ¿Qué pasaría si nuestro "retriever" no trabajara con vectores? ¿Y si fuera una base de datos SQL? ¿O una API meteorológica? ¿O un grafo de conocimiento lógico? La API actual no tiene el vocabulario para expresar esas preguntas.

#### **Subiendo a la capa de aplicación**

Este problema de acoplamiento entre la aplicación y el "motor" subyacente no es nuevo en nuestra industria. Lo vivimos hace décadas con las bases de datos, donde cada fabricante tenía su propio protocolo. La solución fue la creación de una capa de abstracción a nivel de aplicación: ODBC y JDBC.

Hoy estamos viendo exactamente la misma solución en el ecosistema RAG, liderada por librerías como LangChain. En lugar de forzar a los desarrolladores a codificar contra una API de transporte rígida, proponen un contrato a un nivel superior.

En LangChain, esta la interfaz `BaseRetriever`. Su método principal es de una simplicidad que desarma:

```python
get_relevant_documents(query: str) -> List[Document]
```

Analicemos la genialidad de este contrato:

1.  **`query: str`**: La entrada se unifica. Ya no es un vector. Es la pregunta original del usuario, en lenguaje natural. Se abstrae el *cómo* se va a buscar.
2.  **`-> List[Document]`**: La salida se estandariza. Siempre será una lista de objetos `Document`, que contienen el texto recuperado y metadatos sobre su origen.

Un cliente que programa contra esta interfaz ya no sabe, ni le importa, qué hay debajo. El `BaseRetriever` puede ser un `PineconeRetriever` que, internamente, convierte el `query` en un vector y hace la llamada HTTP que vimos antes. O podría ser un `SQLRetriever` encargado de la tarea nada trivial de traducir la pregunta en lenguaje natural a una consulta SQL estructurada, ya sea mediante un modelo de lenguaje o un conjunto de reglas. O, teóricamente, cualquier otro tipo de retriever que se nos ocurra.

Pero esta flexibilidad no es solo un ejercicio teórico. Es la llave que abre la puerta a problemas que la búsqueda por similitud vectorial simplemente no puede resolver. Pensemos por un momento en un dominio donde la "verdad" no es un texto similar, sino una estructura lógica y espacial: un Sistema de Información Geográfica (SIG). 

Imaginemos que un usuario le hace a nuestro asistente de IA una pregunta aparentemente simple __"¿Qué parcelas de cultivo se encuentran a menos de 500 metros de un cauce de agua que haya sufrido una sequía en los últimos dos años?"__

Un retriever vectorial tradicional estaría completamente perdido. Buscaría documentos que contengan las palabras "parcela", "cauce", "sequía" y "500 metros". El resultado sería una lista de textos, quizás informes técnicos o noticias, pero nunca una respuesta directa y precisa a la pregunta. 

Sin embargo, un hipotético `GeoRetriever`, programado contra la misma interfaz `BaseRetriever`, podría operar de forma completamente diferente: 

1.  **Interpretar la pregunta**. El LLM, en colaboración con el retriever, descompone la consulta en sus componentes espaciales y temporales: 
    *   tipo: parcela
    *   relación: distancia < 500m, 
    *   objeto: cauce de agua, 
    *   condición: sequía en los últimos 2 años.

2.  **Consultar datos estructurados**. En lugar de buscar en un mar de texto, el `GeoRetriever` construye y ejecuta una consulta espacial compleja sobre una base de datos geográfica (como PostGIS). Esta consulta no busca "similitud", sino que **evalúa restricciones geométricas y de atributos** de forma rigurosa.

3.  **Devolver un resultado preciso** La salida no sería una lista de documentos, sino un conjunto de datos geográficos concretos: las geometrías exactas de las parcelas que cumplen con todos los criterios. Este resultado podría luego ser pasado a otra herramienta para, por ejemplo, dibujarlas en un mapa.
     
Este ejemplo ilustra el poder de la abstracción. Desde la perspectiva de la aplicación cliente, el proceso es simple: recibe la pregunta del usuario en lenguaje natural y, a través de un contrato único (get_relevant_documents(query: str)), obtiene los datos relevantes sin importar el mecanismo subyacente. La interfaz BaseRetriever garantiza que la intención del usuario se traduzca a una acción coherente. 

En nuestro caso, el GeoRetriever especializado se encargó de traducir esa intención a un mecanismo de búsqueda lógico y espacial, algo impensable para un retriever basado únicamente en la similitud estadística de texto. El resultado final, una vez que estos datos estructurados se inyectan en el contexto del LLM, es una respuesta fundamentada y precisa, en lugar de una suposición basada en la similitud de textos. 

Por supuesto, construir un `GeoRetriever` así es un desafío de ingeniería mayúsculo que involucra múltiples disciplinas. No lo presento como una solución trivial, sino como un ejemplo del **potencial que estamos dejando sobre la mesa**. Una arquitectura flexible es la que nos permite tener esta visión de futuro. Es el cimiento que nos da permiso para imaginar y, eventualmente, construir soluciones a problemas que hoy parecen intratables. Nos permite avanzar gradualmente sin tener que demoler y reconstruir nuestra aplicación cada vez que surge un motor de conocimiento más potente que una simple búsqueda vectorial.

#### La convergencia y la abstracción como patrón histórico

Esta tensión entre una solución dominante pero limitante y la necesidad de una mayor flexibilidad no es un fenómeno nuevo en nuestro campo. Es, de hecho, un patrón recurrente en la evolución de los ecosistemas tecnológicos. 

Lo vivimos de forma paradigmática con las bases de datos. Durante años, cada fabricante impuso su propio protocolo de comunicación, encerrando a los desarrolladores en ecosistemas propietarios. La innovación se veía lastrada hasta que surgieron capas de abstracción como ODBC y JDBC, que liberaron a las aplicaciones de los detalles de implementación y permitieron que el ecosistema floreciera. 

Lo que estamos presenciando con RAG es una repetición de ese ciclo. El ecosistema ha convergido rápidamente en una implementación eficiente (la búsqueda vectorial) pero acoplante. Y, al igual que en el pasado, la respuesta no es desechar esa implementación, sino construir sobre ella la capa de abstracción que nos devuelva la libertad de innovar. Estas capas no son solo una conveniencia técnica; son un mecanismo fundamental para la salud a largo plazo de cualquier tecnología. 

#### Hacia una API basada en la intención del usuario

Todo el análisis anterior parte de una sensación que, como desarrollador, me resulta profundamente **frustrante**: la de sentirme limitado no por la tecnología en sí, sino por la "puerta de entrada" que nos han dado para usarla. La API actual es eficiente, pero es una puerta estrecha que solo deja pasar un tipo de pregunta. 

Por eso, creo que nuestra responsabilidad no termina en construir capas de abstracción para sortear el obstáculo. **Deberíamos impulsar activamente la creación de APIs más flexibles y con visión de futuro**. 

Este es un mensaje tanto para los creadores de bases de datos vectoriales como para los diseñantes de frameworks. El reto es dejar de pensar en la API como un reflejo directo del mecanismo interno y empezar a diseñarla como una expresión de la **intención del usuario**. 

En lugar de una API que pregunta "¿cuáles son los K vecinos más cercanos a este vector?", deberíamos aspirar a APIs que pregunten "recupera información relevante para esta consulta, usando esta estrategia". La estrategia podría ser "búsqueda vectorial", "razonamiento lógico sobre un grafo" o "consulta a una API externa". La decisión del mecanismo debería quedar, en la medida de lo posible, del lado del servidor. 

No se trata solo de una conveniencia técnica. Se trata de la salud a largo plazo de nuestro ecosistema. Las APIs que son demasiado específicas sobre el "cómo" se vuelven obsoletas tan pronto como aparece un "cómo" mejor. Las APIs que se centran en el "qué" perduran, porque permiten que la innovación prospere por debajo sin que el mundo de arriba tenga que cambiar. 

#### **Construir puertas, no solo pasillos**

El paradigma RAG es mucho más que la búsqueda por similitud. Es la promesa de una IA que consulta dinámicamente cualquier fuente de conocimiento para fundamentar sus respuestas. Sin embargo, las APIs que dominan hoy son un pasillo estrecho que solo nos lleva a un destino: la búsqueda vectorial.

La solución no es dejar de usar ese pasillo, sino construir un vestíbulo con muchas puertas. Abstracciones como las de LangChain son el primer paso: desacoplan la aplicación del mecanismo de recuperación y nos dan un "enchufe" estándar para conectar futuros motores de conocimiento.

El próximo gran avance en RAG no será un algoritmo vectorial un 1% más rápido. Será una clase de `Retriever` completamente nueva que nadie había pensado en conectar hasta ahora. Y solo podremos usarla si hemos construido una arquitectura que nos lo permita. 

Las herramientas que construimos terminan definiendo los problemas que podemos resolver. Si solo tenemos APIs para búsqueda vectorial, solo podremos resolver problemas de similitud estadística, no problemas que requieran razonamiento estructural. Como arquitectos, nuestro trabajo no es solo optimizar el camino conocido, sino asegurarnos de que tenemos la libertad para explorar los que aún no existen.

>
> Nota: Cuando comencé a escribir este artículo hace unos meses, la búsqueda vectorial seguía siendo el paradigma dominante en RAG. Desde entonces, el ecosistema ha evolucionado rápidamente: propuestas como GraphRAG de Microsoft (y su variante más eficiente LazyGraphRAG), LinearRAG o LightRAG ilustran precisamente la tendencia que defendía aquí: estamos pasando de un RAG rígidamente vectorial a enfoques que incorporan grafos de conocimiento, razonamiento estructurado y mecanismos de recuperación híbrida. Estos avances no invalidan la crítica a las APIs geométricas de las bases vectoriales; al contrario, la refuerzan. Solo gracias a capas de abstracción como las que proponen LangChain o LlamaIndex podemos integrar estos nuevos 'retrievers' sin tener que reescribir toda la aplicación. El futuro que imaginábamos ya está llegando.
>

### Para saber más

Para aquellos interesados en profundizar en los fundamentos técnicos y arquitectónicos de los sistemas RAG, y explorar más allá de la implementación dominante, aquí hay una selección de recursos clave.

*   **El Fundamento Original:**
    *   **"Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" de Patrick Lewis, et al. (2020).** Este es el paper que dio origen al acrónimo RAG. Su lectura es esencial para comprender la visión original del marco, que es deliberadamente más amplia y agnóstica al mecanismo de recuperación que muchas de las implementaciones actuales.

*   **El Ecosistema Dominante (Búsqueda Vectorial):**
    *   **Documentación de bases de datos vectoriales como Pinecone, Weaviate o Chroma.** Más allá de los tutoriales, sus secciones de conceptos y arquitectura explican en detalle el "porqué" detrás de las APIs que analizamos en el artículo. Son la mejor fuente para entender el protocolo de facto que ha moldeado el ecosistema.
    *   **"Vector Search for Practical Machine Learning" de A. Aji, et al.** Un artículo de revisión que ofrece una visión técnica sólida de los algoritmos y las estructuras de datos (como HNSW) que hacen posible la búsqueda de similitud a gran escala.

*   **La Abstracción y el Futuro:**
    *   **Documentación de LangChain y LlamaIndex sobre "Retrievers".** La forma más directa de ver en práctica la capa de abstracción que proponemos. Analizar la interfaz `BaseRetriever` en LangChain o los conceptos de `QueryEngine` y `Retriever` en LlamaIndex es fundamental para cualquier desarrollador que quiera construir sistemas RAG flexibles y desacoplados.
    *   **"Seven Failure Points When Engineering a Retrieval Augmented Generation System" de Scott Barnett, et al. (2024).** Un artículo práctico y honesto que va más allá del hype y detalla los problemas reales que se encuentran al construir sistemas RAG en producción. Ofrece una perspectiva muy valiosa sobre los puntos de fricción que van más allá del simple mecanismo de búsqueda.

*   **Un Puente hacia lo Conceptual:**

    *   **"Desmontando RAG, Del Protocolo Rígido a la Abstracción Flexible" (este artículo).** 😉 Un pequeño recordatorio de que el primer paso es siempre cuestionar y deconstruir las herramientas que usamos para entender sus verdaderas limitaciones y potencial.



Un saludo a todos.
