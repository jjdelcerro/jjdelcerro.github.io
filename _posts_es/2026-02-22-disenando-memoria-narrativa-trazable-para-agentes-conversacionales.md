---
layout: post
title: "Diseñando memoria narrativa trazable para agentes conversacionales"
date: 2026-02-22
canonical_url: "https://blog.gvsig.org/2025/12/22/disenando-memoria-narrativa-trazable-para-agentes-conversacionales/"
---  
La semana pasada publiqué el artículo [«¿Memoria narrativa o resumen para un LLM?»](https://jjdelcerro.github.io/es/blog/memoria-narrativa-o-resumen-para-un-llm/). Contaba mi progresiva desilusión con los resúmenes como mecanismo para mantener conversaciones largas con un asistente de IA. Cómo, a fuerza de usarlos, empecé a notar que se perdía la intencionalidad de las decisiones, la cronología lógica de los razonamientos y los matices desaparecian en una simple lista de hechos. Contaba también que caí en la cuenta de que el problema no era cómo resumía, sino el hecho de resumir. Los LLMs, criaturas entrenadas con ingentes cantidades de prosa, narrativa y texto fluido, entienden mucho mejor cuando les das un texto con una narrativa fluida, cuando les cuentas una "historia".

El artículo terminaba con el esbozo de una arquitectura de memoria de tres niveles, con un nivel medio, "El Viaje", que en lugar de ser un resumen era una "historia". Y con la idea de que si esa "historia" incorporara citas a los turnos originales, como las notas a pie de página en un artículo académico, podríamos tener lo mejor de los dos mundos. Por un lado la riqueza contextual de la narrativa y por otro la verificabilidad del dato.

Pero una idea no es un diseño. Una intuición, por potente que sea, no se sostiene sin un protocolo que la haga funcionar de forma fiable, sin depender de que el LLM "tenga un buen día" o de que el prompt esté especialmente inspirado. Cuando llegué a esa conclusión, dediqué las siguientes semanas dedicado a convertir aquella sospecha en algo más sólido. Pasé de preguntarme "¿qué formato debería tener la memoria?" a preguntarme "¿cómo consigo que un LLM genere sistemáticamente ese formato?" Eso, como suele ocurrir cuando bajas al detalle, ha resultado ser un viaje con más recovecos de los que esperaba.

## El falso amigo del resumen narrativo

Una vez asumido que el resumen tradicional era un callejón sin salida, la siguiente tentación fue pensar que la solución era trivial. Si los resúmenes fallan, probemos con narrativa. En lugar de listas de puntos, pidámosle al asistente que nos cuente lo que hemos hablado como si fuera una historia.

Así que lo intenté. Al final de varias sesiones, en lugar del habitual "resume esto", le pedí crónicas, relatos, narraciones que capturaran no solo los hechos sino también su evolución. Los resultados fueron desiguales. A veces obtenía textos excelentes, fluidos y matizados. Otras veces, la crónica era plana y desordenada o directamente incorrecta. Afiné los prompts, especifiqué con más detalle qué entendía por "historia". La tasa de aciertos mejoró ligeramente, pero la variabilidad se mantuvo. El modelo, sencillamente, no era fiable como cronista de sí mismo.

Fue entonces cuando caí en la cuenta de que el problema no era de prompting, sino de fondo. Cuando yo le contaba a mi asistente lo que habíamos hablado, implícitamente le daba una estructura y una selección de lo relevante. En cambio, cuando le pedía al LLM que generara esa crónica a partir del historial crudo, le exigía que hiciera tres cosas a la vez, identificar lo relevante, ordenarlo causalmente y redactarlo con fluidez. Todo ello sin un esquema claro de qué esperaba. Era demasiado pedir.

La conclusión a la que llegue fue que no basta con cambiar el prompt. La narrativa no puede ser un añadido cosmético sobre el mismo sistema de memoria. Para que funcione de forma fiable, necesita estar en el centro de la arquitectura, con un componente especializado y un protocolo bien definido. Dicho de otro modo, la intuición era correcta (los LLMs entienden mejor las historias), pero el camino para hacerla realidad no era pedirle al mismo modelo que además hiciera de cronista. Había que separar responsabilidades.

## Los tres niveles de memoria

Una vez aceptado que para resolver el problema tenia que repensar la arquitectura, empecé a dibujar esquemas. La idea de fondo era sencilla. Necesitamos separar aquello que es inmediato y volátil de aquello que es permanente y verificable, y en medio, algo que haga de puente. Lo que fue emergiendo es lo que ahora llamo los *tres niveles de memoria*, y que ya anticipé en el artículo anterior, pero que aquí merece una explicación más detallada porque es la base de todo lo demás.

### Nivel 1: memoria de corto plazo (la sesión activa)

Este es el más obvio y lo que cualquier chat hace por defecto: los últimos mensajes, el intercambio reciente, todo aquello que cabe en la ventana de contexto del modelo. Aquí no hay magia ni compactación. Es el historial crudo, tal como se produjo, con sus peticiones, sus respuestas, sus llamadas a herramientas y sus resultados. Su función es mantener la inmediatez. Permitir que el agente responda a lo que acaba de ocurrir sin necesidad de interpretar ni resumen. Es la memoria de trabajo, la que usamos mientras la conversación está caliente.

En mis esquemas, este nivel acabo residiendo en una `Session` que se mantiene en RAM y que se persiste en disco para sobrevivir a reinicios. Pero conceptualmente, es la parte más simple del sistema.

### Nivel 3: memoria de largo plazo (los turnos inmutables)

En el extremo opuesto está la memoria permanente. Cada interacción, cada mensaje del usuario, respuesta del agente, llamada a una herramienta o resultado, se guarda en una base de datos. A cada uno de estos eventos se le asigna un identificador único, un `code` (por ejemplo, `1042`) que nunca cambia y que sirve como referencia canónica.

Esta base de datos es la "fuente primaria". Contiene todo, pero es demasiado grande para leerla en cada interacción. Ahí están los datos originales, los números exactos, los fragmentos de código que se discutieron, las trazas de las herramientas. No se toca en el día a día, pero está disponible para cuando se necesita. Es, siguiendo la analogía del artículo académico, la biblioteca donde descansan las fuentes citadas.

### Nivel 2: memoria de medio plazo ("El Viaje")

Por otro lado, lo que fue emergiendo es lo que llamo el "*Punto de Guardado*", un artefacto que actúa como la memoria consolidada del LLM. Su núcleo no es una lista de hechos, sino una sección llamada '*El Viaje*', una crónica narrativa que cuenta la historia de la conversación desde la última compactación hasta el momento actual.

Aquí es donde está la clave de todo. "El Viaje" *no es un resumen*. No es una lista de puntos, una extracción de hechos o una versión comprimida y empobrecida de lo que pasó. Es una *crónica*. Una narración que cuenta lo ocurrido preservando la intencionalidad, la evolución de las ideas, los giros conversacionales, los momentos de duda, las correcciones y el tono. Lo hace en el lenguaje que los LLMs entienden mejor. Una prosa fluida, con principio, desarrollo y, si procede, desenlace.

Pero hay un matiz crucial. Esta crónica no es solo un ejercicio literario. En los puntos clave, allí donde una decisión se apoya en un dato concreto, donde un razonamiento cambia de dirección o donde aparece una idea que luego será relevante, la narrativa debe contener una *cita* explícita al turno original (por ejemplo, `{cite: 1042}`). Algo así:

> El usuario explicó que su sistema original no era un simple motor de reglas, sino que aprendía de un diccionario para construir una red semántica {cite: 6}. Fue entonces cuando surgió la pregunta clave: ¿era aquello una especie de LLM primitivo? {cite: 7}.

De esta forma, "El Viaje" tiene lo mejor de ambos mundos. El LLM lee esta narrativa y se beneficia de su riqueza contextual. Entiende no solo qué pasó, sino por qué pasó, cómo se llegó a las conclusiones y qué matices hubo. Y si en algún momento necesita el detalle exacto puede seguir la cita, usar una herramienta especifica como `lookup_turn` y recuperar el original de la base de datos.

### Por qué el nivel medio es el pegamento

La metáfora que me ayudó a entenderlo vino del mundo académico. Un paper de investigación no incrusta las fuentes originales en el texto. Sería inmanejable. Lo que hace es contar una historia, la hipótesis, los experimentos y las conclusiones, y cuando necesita apoyarse en un resultado concreto, cita la fuente. El lector tiene así una experiencia de lectura fluida, pero con la seguridad de que, si quiere profundizar, puede acudir a la referencia.

Eso es exactamente lo que hace "El Viaje". Es el texto del paper. Las citas son las notas al pie. Y la base de datos de turnos es la biblioteca.

Con esta arquitectura, los tres problemas que identificaba en el artículo anterior se mitigan bastante:
- La *intencionalidad* se conserva porque la narrativa explica no solo qué se hizo, sino por qué.
- La *cronología lógica* se mantiene porque la historia respeta el orden causal de los acontecimientos.
- La *pérdida de detalle* desaparece porque el dato, al compactarse, en lugar de perderse se cita. La narrativa puede permitirse el lujo de ser evocadora porque sabe que, si alguien necesita el dato exacto, tiene dónde encontrarlo.

Dicho de otro modo. El nivel medio es el pegamento que une la inmediatez del corto plazo con la permanencia del largo plazo. Es lo que permite que un agente tenga una conversación larga sin perder el hilo.

Un detalle importante de esta arquitectura es su higiene. Cada vez que se genera un nuevo "Punto de Guardado", este sustituye tanto al anterior como al bloque de turnos que se acaba de compactar. De este modo, mantenemos el contexto limpio y predecible. En las sesiones futuras, el agente solo recibe el último "Punto de Guardado" y los nuevos mensajes que aún no han sido procesados, evitando que la ventana de contexto se sature de información redundante.
    
Ahora bien, tener el esquema claro es una cosa. Conseguir que un LLM genere sistemáticamente "El Viaje" con la calidad y la precisión necesarias es otra muy distinta. Ahí es donde entra el *MemoryService* y el protocolo que tuve que diseñar conseguir que hiciese lo que buscaba.

## El arte de ser cronista

Con los tres niveles de memoria ya definidos, la pregunta era quién y cómo generaba ese nivel medio, "El Viaje". Estaba claro que no podía ser el mismo modelo que llevaba la conversación diaria. Ya tenía bastante con razonar, responder y manejar las herramientas. Pedirle además que cada cierto tiempo, hiciera de cronista y condensara la historia en una narrativa coherente era sobrecargarlo. Y como ya había comprobado, pedirle que hiciera dos cosas a la vez rara vez sale bien.

Necesitaba un componente especializado. Un servicio cuya única responsabilidad fuera la de tomar el historial reciente y el "Viaje" anterior, y generar un nuevo "Viaje" que integrara lo nuevo con lo antiguo de forma orgánica. En el esquema creció una nueva cajita, el *MemoryService*. Probablemente con su propio modelo de lenguaje. En mis pruebas usé Gemini 2.5 Pro, pero podría ser cualquier LLM con suficiente capacidad.

Tener un servicio dedicado no bastaba. Había que darle instrucciones muy precisas. Instrucciones que convirtieran la tarea vaga de "cuéntame lo que pasó" en un *protocolo* con reglas claras y sobre todo, restricciones. Porque de lo contrario, el modelo haría lo que mejor hace, improvisar, inventar, resumir y su manera.

Para que esto funcione, el Orquestador no le pasaria al LLM un volcado caótico de texto, sino una secuencia estructurada y eficiente de lo que llamo turnos atómicos, preparados para que el modelo pueda identificar los IDs de los turnos y su contenido y pueda procesarlos con el menor consumo de tokens posible.

### El núcleo del protocolo

El prompt que acabé construyendo después de muchas iteraciones se apoya en varios pilares que fui descubriendo sobre la marcha:

*1. "No me resumas, cuéntame la historia"*

Puede parecer una perogrullada, pero es el primer filtro. El modelo tiende por naturaleza a la condensación, a la lista de puntos, al esquema. Hay que decirle explícitamente: 

> Tu tarea TERMINA EXCLUSIVAMENTE cuando has capturado la atmósfera, las dudas y la evolución de las ideas. Si entregas una lista de puntos: HAS FALLADO. Si eres conciso: HAS FALLADO. Si narras la historia como un cronista detallado: HAS TENIDO ÉXITO.

Esta directiva, que en el prompt aparece con mayúsculas y cierto dramatismo, es la que marca la diferencia entre un resumen y una crónica.

*2. "Las citas van integradas, no al final"*

Este fue uno de los aprendizajes más sutiles. Al principio, el modelo ponía las citas al final del párrafo, como una nota a pie. Pero eso rompe la fluidez y el lector (sea humano o LLM) no sabe qué punto exacto de la narración apoya la referencia. La directiva es clara:

> Las citas deben integrarse en la narrativa para señalar el origen de una idea clave en el punto en el que aparezca la idea.

Y se muestra un ejemplo:

> ✅ Correcto: `El punto de inflexión ocurrió cuando el usuario aclaró que su sistema aprendía del texto {cite: 6}, un detalle que cambió por completo la dirección de la conversación.`
> ❌ Incorrecto: `El punto de inflexión ocurrió cuando el usuario aclaró que su sistema aprendía del texto, un detalle que cambió por completo la dirección de la conversación. {cite: 6}`

*3. "Los flashbacks no son eventos nuevos"*

Cuando el LLM usa una herramienta de memoria (`lookup_turn` o `search_full_history`) y recupera turnos antiguos, esos turnos se inyectan en la secuencia que recibe el MemoryService. Pero el modelo tiende a tratarlos como si fueran conversación nueva, perdiendo la noción de que son recuerdos. El protocolo le instruye:

> No son eventos nuevos. Estos turnos son **recuerdos**. El agente está releyendo su pasado en ese instante para informar su acción presente. ... Narra el acto de recordar.

Y se le da un ejemplo de cómo debe quedar:

> El agente, para responder con precisión, **consultó sus registros históricos** y recuperó la conversación original donde se detallaba la 'crisis de sentido' con SHRDLU {cite: 40}.

*4. "No alucines IDs"*

Esta es una regla de hierro. El conjunto de identificadores `{cite:ID}` que aparecen en el nuevo "Viaje" debe ser un subconjunto de los IDs que existen en la entrada (el "Viaje" anterior más los nuevos turnos). Si el modelo inventa una cita, todo el sistema de trazabilidad se viene abajo. El prompt lo dice sin ambages: 

> NO DEBES inventar, alucinar o modificar un ID.

### Fragmentos reales del prompt

Para que nos hagamos una idea, aquí dejo algunos fragmentos literales de cómo quedó el prompt después de muchas pruebas:

```
## 2. Principios Fundamentales

Debes operar bajo los siguientes principios rectores:

*   **Principio de Coherencia Narrativa:** El nuevo Punto de Guardado debe leerse como una continuación lógica y natural del estado anterior.

*   **Principio de Trazabilidad Determinista:** Cada pieza de información significativa debe estar vinculada a su turno de origen mediante una referencia explícita (`{cite:ID}`).

*   **Principio de Fidelidad de Referencia:** El conjunto de todos los identificadores (`{cite:ID}`) presentes en el Punto de Guardado que generes **debe ser un subconjunto** del conjunto de IDs proporcionados en el contexto de entrada.
    *   **NO DEBES** inventar, alucinar o modificar un ID.
```

Y más adelante, en la sección de calidad:

```
**Directiva de Calidad Esencial para el Viaje**
Para esta sección, tu tarea **TERMINA EXCLUSIVAMENTE** cuando has capturado la atmósfera, las dudas y la evolución de las ideas.
*   Si entregas una lista de puntos: **HAS FALLADO** (Pérdida de contexto cognitivo).
*   Si eres conciso: **HAS FALLADO** (Pérdida de resolución).
*   Si narras la historia como un cronista detallado: **HAS TENIDO ÉXITO.**
```

### Por qué este protocolo funciona

Lo interesante de este enfoque es que no confía en la "bondad" del modelo. No le pide que sea creativo o que haga lo correcto porque sí. Le da un marco tan estricto que, aunque el modelo tienda a desviarse, las instrucciones actúan como una guía. Y cuando a pesar de todo se desvía (por ejemplo, inventando una cita), el orquestador tendrá que añadir una capa de validación posterior que lo detecta y lo rechaza.

Esa capa de validación es la que comprueba que todas las citas del nuevo "Viaje" existen realmente en los datos de entrada. Si encuentra una cita huérfana, el proceso de compactación no ha sido correcto, habrá que ver que hacemos con esto, si se intenta de nuevo, o se marca el error para revisión. Es un mecanismo de seguridad que convierte una operación probabilística (un LLM generando texto) en un proceso determinista y verificable.

Con el protocolo definido y el MemoryService funcionando, el siguiente paso era ponerlo a prueba con una conversación real. Y los resultados, como veremos, superaron mis expectativas.

## La prueba de concepto

Hasta aquí todo eran ideas. Pero una cosa es que algo funcione en la pizarra y otra muy distinta es que funcione cuando lo pones a prueba con una conversación real. Así que preparé un experimento.

Cogí una conversación larga que había mantenido con mi asistente durante la preparación de un artículo. Una conversación que, además, tenía la particularidad de contener un *cambio de tema relevante*. En un momento dado, pasamos de discutir los fundamentos de mi antiguo sistema de IA (algo muy personal y con mucho contexto acumulado) a adentrarnos en una exploración sobre lingüística y relativismo cultural. Exactamente el tipo de transición que pone a prueba la capacidad de un sistema de memoria para mantener la coherencia sin perder el hilo.

Esa conversación la troceé en varios bloques, simulando el paso del tiempo y las compactaciones sucesivas. Estructure los turnos con sus códigos y luego invoqué al LLM (usando Gemini 2.5 Pro para las pruebas) siguiendo el protocolo que he descrito. El resultado fue el punto de guardado del que ahora os muestro un fragmento muy concreto. Justo el momento de la transición temática.

> Con el proyecto ya bautizado y los fundamentos técnicos iniciales establecidos, la conversación tomó una nueva dimensión, alejándose momentáneamente de la implementación para sumergirse en las raíces mismas del lenguaje y el pensamiento. Esta fase comenzó con una pregunta clásica: ¿el lenguaje conforma nuestra manera de pensar o viceversa? {cite: 20}. La exploración concluyó que la visión más acertada es la de una influencia mutua y un ciclo de retroalimentación constante {cite: 24}.
> 
> La indagación se profundizó, cuestionando si las categorías gramaticales que nos son familiares, como "sujeto que realiza una acción", son universales {cite: 21}. La revelación de la existencia de marcos conceptuales radicalmente distintos, como las lenguas ergativo-absolutivas que no se centran en el "sujeto" sino en el "agente" frente al "paciente", fue un punto clave {cite: 22}. Esto llevó a cuestionar directamente la hipótesis de una "estructura profunda común" o Gramática Universal chomskiana {cite: 23}. La conversación se inclinó hacia la idea de que la diversidad lingüística es genuina y no una mera variación superficial, reflejando distintas formas de categorizar la experiencia {cite: 26}.

Fijaos en lo que tenemos aquí.

Primero, la *fluidez narrativa*. No hay un corte brusco, no hay un "cambio de tema" anunciado con un ladrillo. La transición se construye con un conector narrativo: *"Con el proyecto ya bautizado... la conversación tomó una nueva dimensión"*. El lector (sea humano o LLM) percibe una continuidad, no una ruptura.

Segundo, las *citas integradas*. No están al final del párrafo. Están incrustadas en el momento exacto donde la idea aparece: `{cite: 20}` junto a la pregunta sobre lenguaje y pensamiento, `{cite: 22}` junto al descubrimiento de las lenguas ergativas, `{cite: 26}` al final de la reflexión. El sistema de referencias no interrumpe la lectura, pero está ahí, disponible para quien quiera verificar o profundizar.

Tercero, lo más importante: *verifiqué que todas las citas son reales*. Cada uno de esos números corresponde a un turno que existía en los datos de entrada. El LLM no inventó ni una sola referencia. El principio de fidelidad se cumplió a rajatabla.

Lo potente de este sistema no es solo que el asistente 'recuerde' el tema, sino que, gracias a esas citas, puede realizar una rehidratación de la memoria. Si en el futuro necesita recuperar el detalle técnico exacto de una discusión antigua, solo tiene que seguir el hilo de la cita para traer de vuelta el turno original de la base de datos.
    
Un detalle. Ese hilo conversacional sobre lingüística no se quedó en una mera charla. Acabó formando parte de las notas con las que escribí el articulo "[¿Podemos usar la gramática para modelar el conocimiento?](https://jjdelcerro.github.io/es/blog/podemos-usar-la-gramatica-para-modelar-el-conocimiento/)" unas semanas mas tarde.

Ahora bien, conviene ser honesto sobre el alcance de esta prueba. Esto es una *validación conceptual*, no una demostración de que el sistema funciona integrado en un agente real. Los puntos de guardado se generaron en un entorno controlado. Sin la complejidad de una sesión viva con herramientas, *eventos* y *proactividad*. El siguiente paso sería ver como integrar este mecanismo en un agente real.

Pero lo que ya tenía era una base sólida. El protocolo funciona. Generaba narrativas coherentes, trazables y sin alucinaciones. El diseño había pasado la primera prueba.

## Lo que viene después

Había recorrido un buen trecho desde aquella insatisfacción inicial con los resúmenes hasta el punto en que me encontraba ahora. Hemos visto por qué llegue a la conclusión de que la narrativa no es un simple cambio de prompt. Por qué necesitamos tres niveles de memoria. Y cómo el nivel medio, "El Viaje", actúa como pegamento entre la inmediatez del corto plazo y la permanencia del largo plazo. Hemos visto las ideas que hicieron que el protocolo permita a un LLM especializado generar esas crónicas con la precisión y la trazabilidad necesarias. Y hemos contemplado los resultados tangibles de ese protocolo: unos puntos de guardado reales, generados por Gemini 2.5 Pro, que demuestran que la idea es viable y que las citas se mantienen fieles a los turnos originales.

Ahora tocaba ponerlo a prueba en el terreno, porque la verdadera validación de una idea ocurre cuando compila, se ejecuta y se enfrenta a la realidad. Integrar esta memoria narrativa en un agente y ver cómo se comporta cuando se enfrenta a herramientas, eventos y conversaciones largas. Contar esto será el siguiente viaje
    

    

    
