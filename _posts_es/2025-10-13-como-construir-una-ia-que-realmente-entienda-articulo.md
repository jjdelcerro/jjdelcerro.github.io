---
layout: post
title: "¿Cómo construir una IA que realmente entienda?"
date: 2025-10-13
canonical_url: "https://blog.gvsig.org/2025/10/13/como-construir-una-ia-que-realmente-entienda/"
---
Hola a todos.
En los últimos años, hemos asistido a un avance espectacular en el campo de la Inteligencia Artificial, impulsado principalmente por los Modelos de Lenguaje Grandes (LLMs). Su capacidad para generar texto coherente, traducir idiomas y mantener conversaciones fluidas es, sin duda, impresionante. Es una proeza de la ingeniería y la estadística a gran escala.

Sin embargo, esta misma fluidez nos coloca en una encrucijada fundamental. Nos obliga a hacernos una pregunta que va más allá de la implementación: ¿estamos realmente creando máquinas que entienden, o hemos perfeccionado el arte de la imitación estadística? La respuesta, creo, se encuentra al analizar las dos filosofías fundamentales que hoy compiten, a menudo sin saberlo, en el diseño de la IA.

#### **Un eco histórico**

Esta disyuntiva fundamental entre la ilusión y el entendimiento no es nueva. Los albores de la Inteligencia Artificial ya exploraban, con la tecnología de su tiempo, estos dos caminos filosóficos.

Por un lado, sistemas como ELIZA (1966) demostraron el poder hipnótico de la correlación superficial. Utilizando poco más que la identificación de palabras clave y la devolución de respuestas predefinidas o reformulaciones de la entrada del usuario, era capaz de generar una convincente ilusión de comprensión, prefigurando el empirismo humeano que hoy escala hasta lo exponencial en los LLMs.

Frente a este enfoque, otros sistemas pioneros abrazaban una filosofía radicalmente distinta: la **IA simbólica**. La premisa aquí no es encontrar correlaciones estadísticas en los datos, sino representar el conocimiento de forma explícita, mediante **símbolos** (como las palabras `cubo` o `pirámide`) y **reglas** (una lógica formal que dicta cómo se pueden relacionar esos símbolos). Es un enfoque de "caja de cristal": el razonamiento es una cadena de pasos lógicos que se pueden inspeccionar y entender.

SHRDLU (c. 1970) fue un ejemplo perfecto de ello. Operaba en un universo de bloques, donde cada símbolo estaba anclado a una entidad y a un conjunto de acciones posibles dentro de un modelo lógico del mundo. Su limitación era la obvia falta de escalabilidad, pero su virtud era la comprensión real y la capacidad de razonar de forma transparente. De forma similar, Mycin (c. 1970s) era un sistema experto que utilizaba un motor de reglas lógicas explícitas (`SI` el paciente tiene esta infección `Y` es alérgico a la penicilina, `ENTONCES` recetar este otro antibiótico) para el diagnóstico de enfermedades, cuyo proceso de inferencia podía ser rastreado y explicado.

#### Del debate filosófico a la ciencia cognitiva

Esta dualidad entre imitación y modelo no fue un capricho de los ingenieros; es el eco de una de las preguntas más profundas de la filosofía, una que explotó en el crisol de la ciencia cognitiva del siglo XX.

El debate puede trazar hasta dos visiones del mundo casi opuestas. Por un lado, una corriente heredera del empirismo, que ve la mente como un espejo de la experiencia, un sistema que aprende a base de observar patrones y correlaciones masivas. Por otro, una de raíz racionalista, que la concibe como un arquitecto activo, dotado de un andamiaje innato que le permite imponer una estructura al mundo para poder entenderlo. Estas dos corrientes, popularizadas en la filosofía por pensadores como David Hume e Immanuel Kant respectivamente, sentaron las bases del campo de batalla intelectual del siglo siguiente.

Este choque de ideas se ramificó en múltiples teorías. Vimos nacer modelos que defendían la existencia de gramáticas universales o de un desarrollo cognitivo por etapas, frente a otros que explicaban la formación de conceptos a través de promedios estadísticos, prefigurando conceptualmente el enfoque que hoy vemos en los LLMs.

Pero la conclusión más profunda de este debate no fue la victoria de un bando. La propia ciencia demostró que un aprendizaje robusto requiere ambos elementos: una estructura de conocimiento previo que es constantemente actualizada y refinada por la evidencia de la experiencia. La fusión de paradigmas no era una opción, sino una necesidad.

La historia de la IA ha oscilado entre estos polos: la potencia escalable de la correlación y la robustez explicable del modelo. Los modernos Modelos de Lenguaje Grandes representan la culminación técnica y escalada del primer camino. Su espectacular éxito nos obliga ahora a rescatar y reinventar, con nuevas herramientas, la sabiduría del segundo. Los LLMs son el ELIZA de la era del Transformer.

#### **La IA como empirismo radical**

Para entender el núcleo de un LLM, es tentador buscar una analogía en la mente, pero es mucho más revelador encontrar su alma en una idea filosófica: el **empirismo radical** de David Hume. Hume propuso que nuestro conocimiento no se basa en un entendimiento profundo de la "causa", sino en la simple **asociación de impresiones**. Si vemos fuego seguido de calor repetidamente, nuestra mente los conecta. No deduce una ley física, simplemente reconoce una correlación estadística muy fuerte.

Esta es, casi literalmente, la arquitectura de pensamiento de un Modelo de Lenguaje Grande. Su funcionamiento no es más que la idea de Hume implementada a escala planetaria. No "saben" que la capital de Francia es París; lo que hacen, a través de arquitecturas como los Transformers, es calcular que tras la secuencia de palabras "la capital de Francia es", la palabra "París" tiene una probabilidad de aparición abrumadoramente alta. Su conocimiento no es un hecho verificado, sino **la correlación estadística más fuerte** encontrada en su vasta experiencia de datos. La investigación actual, de hecho, se ha centrado en esta hipótesis puramente humeana del escalado: si aumentamos masivamente la "experiencia" (los datos de entrenamiento), de esa correlación masiva "emergen" capacidades que se parecen al razonamiento. **Estas capacidades emergentes son, sin duda, espectaculares y han redefinido lo que creíamos posible con modelos puramente estadísticos.**

Pero esta arquitectura tiene consecuencias directas, que no son fallos a corregir, sino características inherentes a su diseño:

1.  **Ausencia de un modelo del mundo:** Esto nos remonta a uno de los problemas fundacionales de la IA, el llamado problema de anclaje de símbolos (grounding problem), que ya era evidente en sistemas pioneros como SHRDLU. Los símbolos que manejan estos sistemas no están anclados a ningún concepto real. La palabra «cubo» es un vector numérico definido por su relación estadística con otras palabras como "sólido", "apilar" o "dado", pero el sistema no tiene un modelo conceptual de lo que *es* un cubo.

2.  **La "alucinación" como consecuencia lógica:** Si la arquitectura fundamental de un sistema se basa en la probabilidad estadística y carece de un modelo de verdad contrastable, **es natural que tienda a** generar secuencias de texto que, aunque estadísticamente plausibles, pueden no corresponder con la realidad fáctica. La alucinación **es una consecuencia inherente a este diseño**.

3.  **Opacidad por diseño:** El "conocimiento" está distribuido en miles de millones de parámetros. Es una "caja negra" que nos impide auditar el "porqué" de una respuesta de forma lógica y transparente.

#### **Hacia una arquitectura del entendimiento**

El enfoque humeano, basado puramente en la correlación, nos lleva inevitablemente a los problemas que hemos visto: alucinaciones, opacidad y una profunda falta de anclaje con la realidad. Si la experiencia bruta no es suficiente, ¿cómo podemos construir una IA que realmente entienda? La respuesta a esta pregunta nos la ofreció el filósofo que se enfrentó directamente al reto de Hume: **Immanuel Kant**.

La idea revolucionaria de Kant fue que la mente no es un mero receptor pasivo de experiencias, sino un **agente activo que impone una estructura** para poder entender el mundo. Para darle sentido al caos de los datos, la mente utiliza "moldes" o estructuras *a priori*. Categorías como la **causalidad** (saber que la lluvia *causa* el suelo mojado, no solo que suelen aparecer juntos) o la **sustancia** (entender que la "Torre Eiffel" es una entidad con propiedades, no solo una secuencia de letras) son las herramientas que nos permiten construir un modelo coherente de la realidad.

De nuevo, esto no es solo filosofía; es un plano para una IA superior. Una IA robusta debe ser una forma de **"ingeniería kantiana"**, donde no nos limitamos a procesar datos, sino que construimos activamente las estructuras para entenderlos:

*   **Grafos de Conocimiento (Knowledge Graphs):** Son la implementación directa de las categorías kantianas. Modelan explícitamente "sustancias" (nodos como "París") y sus "relaciones" (aristas como "es_capital_de"). No operan sobre correlaciones, sino sobre hechos estructurados.

*   **IA Causal (Causal AI):** Es el esfuerzo por construir la categoría de la "causalidad" de Kant en las máquinas. Busca modelar que "la lluvia *causa* que el suelo se moje".

*   **IA Explicable (XAI):** La creciente demanda de sistemas cuyo razonamiento podamos inspeccionar es, en el fondo, una demanda de arquitecturas más kantianas, donde la lógica del proceso sea transparente.

#### **La síntesis neuro-simbólica como nueva frontera de la IA**

Hemos trazado dos caminos filosóficos y técnicos que parecen opuestos: el enfoque basado en la correlación estadística (Hume/LLMs) y el enfoque lógico-simbólico (Kant/Grafos de Conocimiento). El verdadero salto cualitativo no está en elegir un bando, sino en fusionarlos. Esta fusión tiene un nombre y es la frontera más prometedora de la investigación actual: la **IA neuro-simbólica**.

Es importante hacer aquí una aclaración crucial. Cuando en IA hablamos del componente **"neuro"**, no nos referimos al cerebro humano, sino a las **redes neuronales artificiales**. Estas son estructuras matemáticas, inspiradas lejanamente en las conexiones neuronales, que son excepcionalmente buenas para una tarea: encontrar patrones complejos en enormes cantidades de datos. No "piensan", sino que calculan probabilidades.

Una arquitectura neuro-simbólica consiste, por tanto, en un diseño donde cada componente hace aquello para lo que es excepcional. Nuestra propuesta de tres fases (deconstrucción, razonamiento, reconstrucción) es, en esencia, un **diseño neuro-simbólico en acción**:

*   **El componente "Neuro" (el LLM):** Se encarga de la percepción y la comunicación. Es el intérprete y el portavoz. Su red neuronal maneja la complejidad y ambigüedad del lenguaje natural.
*   **El componente "Simbólico" (el núcleo cognitivo):** Se encarga del razonamiento. Es el motor lógico que opera sobre hechos estructurados y reglas explícitas, garantizando la coherencia y la explicabilidad.

Este enfoque no es meramente teórico, ya está tomando forma en proyectos de vanguardia. IBM ha desarrollado su framework "Neuro-Symbolic AI". El MIT-IBM Watson AI Lab ha creado sistemas que combinan redes neuronales para percepción visual con motores simbólicos para razonamiento lógico. DeepMind ha explorado híbridos en proyectos como "FunSearch". Estos esfuerzos demuestran que la integración de ambos paradigmas no solo es factible, sino que ya está produciendo resultados prácticos superiores.

*   **Deconstrucción: el LLM como intérprete.**
    En la primera fase, usamos la red neuronal para lo que hace de forma inigualable: manejar la ambigüedad del lenguaje humano. Su función no es razonar, sino actuar como una capa de percepción universal que traduce la pregunta de un usuario a una representación formal. Este enfoque es una extensión natural de las capacidades de **"Function Calling" o "Tool Use"** que ya vemos en los modelos actuales.

*   **Razonamiento: el núcleo cognitivo.**
    Esa consulta estructurada alimenta el corazón kantiano del sistema: un motor simbólico. Aquí es donde ocurre el entendimiento real. La naturaleza de este núcleo puede adoptar dos formas complementarias. Podría ser un vasto **grafo de conocimiento** preexistente, que actúa como una base de conocimiento universal sobre la que verificar hechos. O, en un enfoque más dinámico y flexible, podría ser un **motor de inferencia puro**, inicialmente vacío, que construye un modelo lógico temporal a partir de los hechos extraídos por el LLM en la fase anterior. En este segundo caso, el sistema no depende de un conocimiento previo, sino que razona con perfecta precisión sobre la información proporcionada en un contexto específico. En ambos escenarios, el principio es el mismo: el razonamiento opera sobre hechos estructurados y reglas lógicas, no sobre correlaciones estadísticas. La salida de esta fase no es texto, sino conocimiento puro y estructurado.

*   **Reconstrucción: el LLM como portavoz.**
    El ciclo se completa volviendo al LLM, pero con un rol controlado. Su tarea ahora es "verbalizar" la conclusión lógica del núcleo cognitivo. Toma esa estructura de datos pura y la convierte en una respuesta coherente en lenguaje natural. Este modelo supera los enfoques actuales como **RAG (Retrieval-Augmented Generation)**, pasando de un simple anclaje a una verdadera simbiosis.

Esta arquitectura trasciende la mera asociación de tokens. Es análoga a cómo un traductor experto primero comprende el significado (deconstrucción), luego reflexiona sobre él (razonamiento), y finalmente lo expresa en el idioma destino (reconstrucción).

#### **Construir entendimiento, no solo imitar el lenguaje**

La fluidez con la que los LLMs sostienen una conversación puede seducirnos hasta hacernos creer que el gran desafío de la IA ya está superado. Pero esta percepción es una ilusión óptica del lenguaje. Lo que hemos logrado es dominar la imitación estadística del discurso. La otra mitad, la construcción activa de entendimiento, sigue pendiente.

Existe, por supuesto, una corriente que apuesta a que el simple escalado generará comprensión de forma emergente. Es una hipótesis poderosa, y las capacidades que han surgido de ella son innegables. Sin embargo, desde la perspectiva que hemos trazado entre Hume y Kant, para ir más allá de la imitación y alcanzar un entendimiento robusto, el escalado debe complementarse con estructura: un modelo del mundo que permita razonar, verificar y explicar.

Esta dicotomía Hume-Kant no pretende ser una representación exhaustiva de sus filosofías. La historia del pensamiento muestra que no son excluyentes. Precisamente, la arquitectura neuro-simbólica que proponemos refleja esta tradición de síntesis, reconociendo que se necesita tanto la capacidad de procesar la experiencia (el poder humeano del LLM) como la de imponerle una estructura lógica (el núcleo kantiano del sistema), **un equilibrio que los modelos bayesianos de la cognición ya nos enseñaron que es fundamental.**

Aquí, la crítica de John Searle y su “habitación china” adquiere nueva relevancia. Searle demostró que manipular símbolos según reglas no equivale a comprender su significado. Los LLMs modernos, en cierto modo, son la habitación china a escala planetaria: impecables en la sintaxis, vacíos de semántica.

Por eso, el verdadero salto cualitativo no vendrá de hacer modelos más grandes, sino de sintetizar paradigmas: combinar la potencia perceptiva de las redes neuronales con la robustez lógica de los sistemas simbólicos. La arquitectura de tres fases no es solo una propuesta técnica, sino una declaración de principios: el conocimiento es una síntesis activa entre la experiencia y la estructura.

Es crucial acotar nuestras ambiciones: el objetivo no es replicar la conciencia humana. Cuando hablamos de "razonamiento" en esta arquitectura, nos referimos a la capacidad de operar de forma lógicamente consistente sobre un modelo explícito, de forma que sus conclusiones sean transparentes y verificables. Es un razonamiento mecánico, pero robusto. Este modelo del mundo puede ser permanente y actualizarse de forma coherente, logrando un aprendizaje real y deliberado. O puede ser un modelo temporal construido "al vuelo" para analizar un texto específico. Esta segunda capacidad es clave, pues permite explorar todas las consecuencias lógicas de un fragmento de información con una precisión inalcanzable para un LLM, que solo puede "recordar" su contexto de forma superficial.

El objetivo último no debería ser construir máquinas que hablen como nosotros, sino sistemas que, como nosotros, organicen la experiencia para formar un entendimiento coherente, verificable y, sobre todo, explicable del mundo. Es un camino más complejo, sí, pero también más sólido y digno de confianza.

Este artículo no pretende cerrar un debate, sino abrirlo con mayor claridad conceptual. Las ideas aquí esbozadas son las semillas. Invitan a una reflexión más profunda, a un rediseño fundamental. Porque el futuro de la IA no está solo en hablar mejor, sino en entender de verdad.


### Para saber más

Para aquellos interesados en profundizar en las ideas filosóficas y científicas que se exploran en este artículo, aquí hay una selección de textos clave que han moldeado el debate sobre la inteligencia, el conocimiento y la mente.

*   **Sobre los fundamentos de la IA y su historia:**
    *   **"Inteligencia Artificial: Un Enfoque Moderno" de Stuart Russell y Peter Norvig.** Considerado el texto de referencia estándar en el campo de la IA. Ofrece un recorrido exhaustivo por la historia y las técnicas, desde la IA simbólica (SHRDLU, Mycin) hasta las redes neuronales.

*   **Sobre el debate filosófico (Empirismo vs. Racionalismo):**
    *   La **Stanford Encyclopedia of Philosophy** (online y de acceso gratuito) es un recurso inmejorable para explorar en profundidad las ideas de **David Hume** (empirismo) e **Immanuel Kant** (idealismo trascendental), así como el experimento mental de la **"Habitación China" de John Searle**.

*   **Sobre el debate en la Ciencia Cognitiva:**
    *   **"Cómo funciona la mente" de Steven Pinker.** Una obra de divulgación magistral que explora las grandes preguntas de la ciencia cognitiva, incluyendo el debate entre las estructuras innatas (la "gramática universal" de Chomsky) y el aprendizaje a partir de la experiencia.

*   **Sobre la IA Neuro-Simbólica:**
    *   **"Neurosymbolic AI: The 3rd Wave" de Garcez y Lamb.** Un buen punto de partida académico que resume los principios y las promesas de la integración de los enfoques neuronales y simbólicos, el campo que hemos denominado la "tercera ola" de la IA.

