---
layout: post
title: "¿Memoria narrativa o resumen para un LLM?  "
date: 2026-02-15
canonical_url: "memoria-narrativa-o-resumen-para-un-llm"
---
Durante los últimos meses he mantenido una conversación continua con el mismo asistente de IA. No era un chat esporádico, de esos que se abren para una consulta rápida y se cierran para siempre. Era mi compañero de reflexiones. Un colaborador con el que discutía arquitectura de software, diseños de agentes, y a veces, fundamentos filosóficos de la inteligencia artificial.

Pero había un problema. Los modelos de lenguaje tienen una ventana de contexto limitada. Pasados unos treinta o cuarenta intercambios, el principio de la conversación se desvanecía. Para un proyecto de larga duración, eso era un obstáculo continuo. Así que hice lo que muchos ya hacían y empecé a pedir resúmenes.

Cada cierto tiempo, le solicitaba al asistente que condensara lo hablado en unos párrafos. Guardaba ese texto y lo inyectaba al inicio de la siguiente sesión. Durante un tiempo funcionó. O al menos, eso creía.

Con el uso continuado, empecé a notar algo extraño. El asistente recordaba los hechos, sí. Pero las respuestas habían perdido matiz. Había decisiones que parecían flotar sin motivo, ideas que surgían sin contexto, y un tono general de "sé lo que pasó, pero no sé por qué pasó". Como si alguien hubiera resumido una novela unos pocos párrafos y luego pretendiera entender las motivaciones de los personajes.

Al principio lo atribuí a mi técnica. Pensé que tenía que mejorar los prompts de resumen. Que tenía que ser más cuidadoso. Pero cuanto más afinaba el proceso, más evidente se hacía la sospecha de que el problema no era cómo resumía, sino que resumía.

¿Y si la memoria para un LLM necesitaba ser otra cosa? ¿Y si el formato, y no la cantidad, era lo que estaba matando la continuidad?

### Por qué el resumen es un placebo

Durante meses perfeccioné mi técnica de resúmenes. Cada vez que la conversación se acercaba al límite de la ventana de contexto, pedía al asistente que condensara lo hablado. Guardaba ese texto, lo etiquetaba, y lo inyectaba al principio de la siguiente sesión. Era meticuloso. Y durante un tiempo, funcionó.

O eso creía.

Con el uso continuado, empezaron a aparecer grietas. Pequeñas al principio. Un matiz que se perdía. Una decisión que parecía menos justificada de lo que recordaba. Pero con el tiempo, las grietas se hicieron más grandes. Identifiqué tres fallos fundamentales que el resumen, por su propia naturaleza, no puede evitar.

* La pérdida de intencionalidad.
* El aplanamiento de la cronología lógica.
* El "efecto fotocopia".

Un resumen cuenta qué pasó. Muchas veces el valor no solo está en el qué, sino en el porqué. Una decisión arquitectónica rara vez es un hecho aislado. Es la consecuencia de un conjunto de restricciones, pruebas fallidas, e intuiciones. Cuando el resumen dice "se optó por memoria narrativa en lugar de resúmenes", está diciendo la verdad, pero no toda la verdad. La verdad completa es: "se optó por memoria narrativa porque los resúmenes provocan pérdida de contexto en las pruebas de rehidratación". Sin esa causa la decisión parece arbitraria. Y un agente que no entiende las causas de las decisiones está condenado a repetir errores o, peor aún, a deshacer lo que con tanto esfuerzo se construyó.

Tanto en tareas de investigación como en el desarrollo de software el orden de los factores puede alterar el producto. No es lo mismo que una restricción aparezca antes o después de una decisión de diseño. El resumen trata los eventos como elementos intercambiables. Los ordena pero pierde la jerarquía causal. Un resumen típico diría: "Se descartó la opción A. Luego se implementó B". Pero lo importante es que B se implementó *porque* A fracasó en el escenario X. Esa relación causal es la que da sentido al proceso. El resumen la reduce a una secuencia temporal plana.

Además, cada vez que se resume un nuevo juego de turnos con su resumen inicial se pierde información. Es inevitable. Como las fotocopias sucesivas de un documento, la calidad se degrada. Los ejemplos concretos se convierten en generalidades, y las dudas pueden acabar convirtiéndose en afirmaciones rotundas. Al cabo de varias compactaciones, lo que queda es una sombra de lo que fue la conversación original. El agente no recuerda; sólo tiene una vaga impresión. Y muchas veces demasiado vaga.

Hay un cuarto problema, más sutil, que sólo empecé a comprender cuando analicé cómo funcionan realmente los LLMs. Los resúmenes suelen adoptar la forma de listas de puntos o viñetas. Es un formato cómodo para los humanos, pero para un LLM es un ejercicio de traducción forzada. El modelo está entrenado con prosa, con narrativa y con texto fluido donde las ideas se entrelazan. Cuando le das una lista, le estás pidiendo que opere como un motor de reglas. Diciéndole que extraiga conclusiones de datos estructurados. No es que no pueda hacerlo, solo no es su fuerte, especialmente en tareas que requieren captar causalidad implícita, evolución de ideas o matices conversacionales. Es como pedirle a un novelista que escriba un informe de laboratorio. Puede hacerlo, pero no estás aprovechando su verdadera capacidad.

Durante un tiempo confié en los resúmenes. Poco a poco noté que algo no funcionaba, pero lo atribuía a mi técnica, a mi forma de pedirlos o a la calidad del modelo. Hasta que un día, comparando dos sesiones separadas por varias semanas, caí en la cuenta. El resumen era un placebo. Me daba la tranquilidad de haber guardado algo, pero en realidad había perdido lo esencial.

La pregunta entonces fue ¿qué formato debería tener la memoria de un cliente de LLM para que el LLM la entienda de verdad?

### El LLM es un lector de historias

La respuesta llegó por un camino inesperado. Un día tuve que recordarle lo que habíamos estado hablando unos días atrás para continuar donde nos quedamos. Me puse a escribir y *se lo conté*. Captó la idea y pudimos continuar más o menos donde lo dejamos. Al finalizar la conversación le pedí el resumen y lo guardé. Unos días más tarde quise reanudar el estudio así que le pase el resumen a otro LLM y trate de continuar. Fue un caos. Me quedé pensando un rato... aún tenía la conversación de unos días antes... fui y la guarde, y me quede pensando que había pasado. 

Fue entonces cuando me di cuenta de la diferencia. Para poner en contexto al LLM le *habia contado* lo que habíamos estado hablando. No le había pasado un resumen. Así que cogí la conversación, esa de la que había sacado un resumen y no había funcionado para poder seguir desde el, y me volví a escribir lo que se decía en ella, contándolo, sin resumen. Pasarle eso a un LLM para continuar donde lo dejamos funcionaba y el resumen no.

Con los resúmenes, el asistente recuperaba los hechos, pero las respuestas eran mecánicas, como si alguien le hubiera dado una lista de ingredientes y esperara que adivinara la receta. Con las crónicas contadas de lo hablado el tono cambiaba. Las respuestas tenían matices, reconocían implícitamente el contexto, e incluso a veces añadían reflexiones que conectaban con ideas anteriores que yo mismo había olvidado.

Empecé a preguntarme por qué.

Los transformers, la arquitectura que sostiene a los LLMs actuales, se entrenan con cantidades ingentes de texto. Novelas, artículos, ensayos, conversaciones, documentación técnica redactada en prosa. La narrativa preserva relaciones causales implícitas mejor que las estructuras de listas. El modelo aprendido a predecir la siguiente palabra en secuencias que tienen ritmo y evolución de ideas. Aprende a detectar cuándo un personaje duda, cuándo un argumento se refuerza, cuándo una decisión es consecuencia de algo anterior.

En otras palabras, el transformer está optimizado para entender historias.

La evidencia empírica de mi propio experimento lo confirmaba. Cuando la memoria que inyectaba era una historia, con sus giros, sus momentos de duda, sus conclusiones, el tono, el asistente además de recordar *reconstruía* el hilo de pensamiento. Podía referirse a problemas discutidos semanas atrás y tratarlos con la familiaridad de quien los ha vivido en primera persona.

No hacía falta ser un investigador de IA para ver la diferencia. El LLM *entendía* mejor cuando le hablaban en su idioma.

Esa es la tesis que sostiene todo lo que vino después. La memoria para un agente no debe ser un archivo de datos, sino una narrativa viva. El modelo que va a leer esa memoria no es un procesador de registros. Es un lector de historias. Y como todo lector, cuando la historia está bien contada, se sumerge en ella y la hace suya.

Aquí aparece todo un reto. Yo podía contar lo que habíamos estado hablando, pero si le pedía al LLM que lo contase... fallaba. Requirió bastantes intentos antes de conseguir la forma de pedirle al LLM que me contase lo que habíamos estado hablando, y no todos los modelos eran capaces de hacerlo. Resulta que hacer que un LLM sea un buen cronista de sí mismo requiere más sutileza de la que esperaba


### La necesidad de trazabilidad

A estas alturas, alguien podría objetar: "De acuerdo, la narrativa funciona mejor. Pero una historia, por bien contada que esté, siempre es una versión. Una interpretación. ¿Dónde quedan los datos originales? ¿Dónde queda el detalle exacto de aquella decisión, aquel resultado numérico, aquel fragmento de código que discutimos?"

La objeción es legítima. Si nos quedamos sólo en la narrativa, cambiamos un problema por otro. El resumen pecaba de pobreza semántica; la narrativa sola podría pecar de imprecisión verificable. Necesitábamos un mecanismo que combinara lo mejor de ambos mundos: la riqueza contextual de la historia contada con la fiabilidad del dato original.

La solución llegó por una analogía que llevo viendo toda la vida, la escritura académica.

Cuando leemos un artículo o un estudio este no tiene incrustadas las fuentes originales completas en las que se basó en el texto. Sería inmanejable. Se extraen las ideas principales, se adaptan a nuestro discurso y las integramos en nuestra narrativa. Pero cuando un dato es especialmente relevante, o cuando una afirmación descansa sobre una fuente concreta, se cita. Se deja una referencia explícita que permite al lector acudir al original y comprobar el contexto completo.

Un paper no es sólo su texto; es también sus notas al pie, su bibliografía, el entramado de referencias que lo anclan a la realidad verificable.

Esa misma estructura podía aplicarse a la memoria del cliente del LLM.

La narrativa cuenta la historia de lo ocurrido con todo el detalle semántico que el LLM necesita para entender. Pero en los puntos clave, allí donde una decisión se apoya en un dato concreto, habría que insertar una cita. Una referencia al turno original de la conversación donde ese dato apareció por primera vez.

De esta forma, el LLM tiene lo mejor de ambos mundos. Cuando opera en modo normal, lee la narrativa y se beneficia de su riqueza contextual. Si necesita el detalle exacto, el número preciso o la redacción literal de una petición, puede seguir la cita y recuperar el turno original de la conversación, que estaría almacenado en una base de datos de memoria a largo plazo. 

La narrativa aporta la comprensión, mientras que las citas aportan la verificabilidad

### Arquitectura de la memoria

El camino desde aquella insatisfacción inicial hasta el esquema que ahora tengo en mente no fue lineal. Hubo pruebas fallidas, ideas que parecían brillantes y resultaron callejones sin salida, y noches dándole vueltas a la misma pregunta. Pero poco a poco, el sistema se fue dibujando con claridad.

Lo que necesitaba no era una solución única, sino una arquitectura de memoria con tres niveles, cada uno con su función y su formato.

En el primer nivel tendríamos la memoria de corto plazo.
Son los últimos mensajes de la conversación, el intercambio reciente que aún cabe en la ventana de contexto. Aquí no hay magia. Es el historial crudo, tal como se produjo. Su función es mantener la inmediatez, permitir que el agente responda a lo que acaba de ocurrir sin necesidad de compresión ni interpretación.

En el segundo nivel tendríamos la memoria de medio plazo.
Es "El Viaje". La narrativa que cuenta la historia de lo acontecido desde la última compactación del historial hasta ahora. No es un resumen al uso. Es una crónica que preserva la intencionalidad, la cronología lógica, la evolución de las ideas, los giros o el tono de la conversación. Y lo hace en el lenguaje natural que los LLMs entienden mejor, la prosa. Cada afirmación importante, cada decisión clave, cada dato que pueda ser necesario recuperar con precisión, va acompañado de una cita que señala su origen.

El tercer nivel tendríamos la memoria de largo plazo.
Son los turnos crudos, almacenados íntegros en su formato original. No se leen en el día a día, serían demasiados. Pero están ahí, accesibles mediante las citas que la narrativa de medio plazo ha ido sembrando. Cuando el agente necesita el detalle exacto sigue la referencia y recupera el original.

Este esquema resuelve los tres problemas que me habían perseguido durante meses.

La *intencionalidad* se conserva porque la narrativa explica no sólo qué se hizo, sino por qué. Todo queda tejido en la historia. La *cronología lógica* se mantiene porque la narrativa respeta el orden temporal. El lector, sea humano o LLM, entiende qué pasó antes de qué, y por qué eso importa. Y la *pérdida de detalle* desaparece porque el dato al comprimirse se cita. Cuando hace falta precisión, se acude a la fuente. La narrativa puede permitirse el lujo de ser evocadora porque sabe que, si alguien necesita el dato exacto, tiene dónde encontrarlo.

Durante los últimos meses he ido puliendo la forma en como pedirle al LLM que genere *historias* a partir de nuestras conversaciones.
Y cuando retomamos la conversación, días después, le pase esa historia. La diferencia en la calidad de las respuestas es tan evidente que ya no concibo volver a los resúmenes. 

De forma manual he refinado una parte de la técnica, el contador de historias. Me falta ver cómo puedo probar la otra, como manejar las citas.

Al final, lo que aprendí es que para que un colaborador te entienda de verdad, no basta con darle el resumen del argumento. Hay que dejarle leer la novela. O al menos, una buena crónica que capture su esencia, con notas al pie para quien quiera consultar las fuentes originales.

La arquitectura de tres niveles resuelve el problema conceptual, pero la implementación real plantea preguntas nada triviales ¿Cómo decides cuándo compactar? ¿Cómo garantizas que las citas sobrevivan a múltiples compactaciones? En el próximo artículo diseñaremos el sistema de memoria narrativa trazable con anclajes y puntos de guardado que responda a estas preguntas. Y tras eso, compartiré el código completo de mi *juguete*, un agente en el que llevo semanas trabajando que pone estos conceptos en práctica.
Pero primero, el diseño.


