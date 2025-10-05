---
layout: post
title: "¿Qué es un agente?"
date: 2025-10-06
canonical_url: "[https://blog.gvsig.org/2025/09/29/la-importancia-de-describir-correctamente-las-herramientas-a-un-llm/](https://blog.gvsig.org/2025/10/06/que-es-un-agente/)"
---  

Hola,

llevo un tiempo dándole vueltas a cómo escribir sobre esto, verás...

Hace un tiempo incursioné en esto de los chats de IA (puedes leer sobre eso en estos artículos). La cuestión es que hice mis pinitos y acabé haciendo un ¿chatbot? dentro de gvSIG desktop tirando del API de Gemini. Bueno, para mí era un simple chatbot. Lo arrancabas como una herramienta más dentro de la aplicación y tenía el aspecto característico de una aplicación de chat de IA. La cosa es que, aunque inicialmente fue simplemente hacia eso, un chat, decidí que lo chulo era darle acceso a algunas funcionalidades de la aplicación. Le di acceso a explotar los datos tabulares de la aplicación, que pudiese saber qué área se veía en la Vista, poder generar gráficos a partir de los datos que tenían las capas y tablas cargadas, y tal vez alguna cosilla más. Para mí era un "simple chatbot" dentro de la aplicación.

Mientras hacía cosas de esas, iba leyendo sobre LLMs y trataba de estar al tanto de lo que iba saliendo. Se nombraba que eso de los "Agentes" era el futuro, y empezaron a inundarme sugerencias de vídeos y publicaciones sobre ellos. Aparecieron docenas de vídeos sobre cosas como "Claude Code" o "Copilot" que te los "vendían" como el asistente perfecto para programar... pero un día, no creo que fuese de repente, esos vídeos y publicaciones empezaron a llamarlos "agentes". Y aparecían vídeos de "Y XXX destrona a YYY como la plataforma de agentes definitiva" y cosas así. Por entonces ya había salido "Gemini CLI" y yo lo había adoptado como mi herramienta de IA de apoyo en programación. Y empecé a pensar que eran muy escandalosos con eso de los Agentes. ¿Por qué llamaban agente a mi "Gemini CLI"? (ya era "mi" Gemini, porque lo usaba día a día en mi trabajo). Total, ¿qué hacía más él en la consola que mi chatbot en gvSIG desktop? La respuesta simple era "nada". Así que me puse a ver qué hacían "Claude Code" o "Copilot", que competían por ser los "agentes definitivos" para el programador.

Pues qué desilusión. No hacían nada especial más.

Fue entonces cuando empecé a pensar en las cada vez más comunes publicaciones sobre este o aquel agente que iba a hacer maravillas para que aumentases tu productividad. ¿Era humo? No, no era humo, pero empecé a pensar que estaban estirando la palabra agente más de la cuenta para tener más "clics" o para "venderte" más. Y la idea no hacía más que darme vueltas e incluso me molestaba por lo descarado que me parecía a veces.

Un día, me senté con Gemini y le dije:

__"Mira, he oído hablar mucho de que "Gemini CLI" es un agente en el contexto de IA. Me cuentas qué es eso de los agentes, que igual me podía interesar aprender sobre ello."__

Y cómo no, empezó a contarme cosas sobre lo que es un agente. Y cuando leí la extensa respuesta que me había soltado, le pregunté: __"Y Gemini CLI, ¿es un agente?"__. Y sin mediar un segundo empezó a contarme por qué sí era un agente. Conforme lo leía, pensaba que justificar por qué su propia herramienta calificaba como agente parecia claramente sesgado. Y cuando acabó, le pregunté lo mismo de "Claude Code" y "Copilot". Y también empezó a justificármelo. Y cuando acabó, le pasé el código de mi "chatbot" para gvSIG desktop, y le pedí que lo analizara y me dijo rotundamente que no, eso no es un agente. Esto último ya lo pensaba yo. Pero ni entonces, ni ahora, veo las diferencias entre el cliente "Gemini CLI" y mi "simple chatbot". Mi chatbot permite al LLM percibir el estado actual de la aplicación (qué capas están cargadas, qué área se muestra en la vista), razonar sobre los datos tabulares disponibles y actuar generando gráficos o ejecutando consultas. Si __Gemini CLI__ califica de agente y esto no califica como agente, ¿dónde está exactamente el límite?

Esta pregunta me llevó a documentarme a fondo, y la conclusión a la que llegué es que el problema no reside en la tecnología, sino en la terminología. El término 'agente' se ha vuelto tan amplio que ha perdido su significado útil. Por eso, propongo una distinción fundamental que creo que aclara todo el panorama: debemos empezar a diferenciar entre los agentes **"ejecutores de tareas"**, que es lo que tenemos mayoritariamente hoy, y los agentes **"proactivos"**. Para entender por qué esta distinción es tan necesaria, primero tenemos que ver de dónde viene la confusión.

¿Qué es un agente hablando de IA?

Para salir de dudas, decidí ir a las fuentes originales y buscar una definición. En este artículo, vamos a hacer ese viaje juntos. Empezaremos por revisar los textos fundacionales que definieron el concepto de 'agente' en IA, veremos por qué esas definiciones, aunque correctas, se quedan cortas hoy en día, y propondremos una distinción clave que nos permita separar las herramientas increíblemente útiles que ya tenemos de la promesa de la verdadera autonomía que está por venir.


## **Buscando una definición de agente**

Entre las definiciones clásicas de agente podemos resaltar las de los trabajos:

*   "Artificial Intelligence: A Modern Approach" (1995) de Stuart Russell y Peter Norvig.
*   "Rationality and Intelligence" (1995) de Stuart Russell.
*   "Intelligent Agents: Theory and Practice" (1995) de Michael Wooldridge y Nicholas R. Jennings.

Estos textos los podemos enmarcar dentro de la corriente de conceptos y principios fundamentales que se asentaron en los eventos de la "Association for the Advancement of Artificial Intelligence (AAAI)" a lo largo de los simposios de 1994 y la primera Conferencia Internacional sobre Sistemas Multiagente en 1995.

Cuando nos centramos en los dos textos de Russell, podemos ver que "Rationality and Intelligence" establece las bases filosóficas, argumentando que la inteligencia debe medirse por su manifestación externa y su éxito en el entorno. Presenta una definición de agente directa y funcional: es cualquier sistema que percibe su entorno y actúa sobre él. El foco se pone en el comportamiento observable, en lo que el agente *hace*, y no necesariamente en los procesos internos que lo llevan a actuar, o siquiera si "piensa" en un sentido tradicional.

En "Artificial Intelligence: A Modern Approach" se toman esos principios y se formalizan. Proporciona las herramientas conceptuales y las clasificaciones necesarias para que estudiantes y desarrolladores puedan efectivamente diseñar y construir sistemas inteligentes con distintos grados de complejidad. Es un manual práctico para la construcción de la inteligencia artificial. Se define un agente como una **entidad capaz de percibir su entorno y actuar sobre él**. Aunque luego hay muchos matices, en esencia queda una caracterización de "agente" demasiado amplia.

En los textos de Russell se clasifican los agentes por tipos o categorías, en función de niveles de complejidad y capacidades. Así tenemos:
*   **Agentes Reactivos Simples (Simple Reflex Agents):** Actúan basándose únicamente en la percepción actual, utilizando reglas de condición-acción.
*   **Agentes Reactivos Basados en Modelos (Model-Based Reflex Agents):** Mantienen un estado interno (un modelo del mundo) que les permite rastrear aspectos del entorno que no son directamente observables.
*   **Agentes Basados en Objetivos (Goal-Based Agents):** Tienen información sobre sus objetivos y toman acciones que creen que los llevarán más cerca de alcanzar esos objetivos.
*   **Agentes Basados en Utilidad (Utility-Based Agents):** Además de los objetivos, tienen una función de utilidad que les permite seleccionar acciones que maximizan su "felicidad" o utilidad esperada, especialmente cuando hay incertidumbre o múltiples objetivos.
*   **Agentes de Aprendizaje (Learning Agents):** Pueden mejorar su rendimiento con el tiempo a través de la experiencia.

Pero esto sigue sin clarificarme mucho el concepto de agente.

Cuando echo un vistazo al texto de Wooldridge y Jennings encuentro una descripción de agente como una entidad que mapea un historial de percepciones de su entorno a acciones, con el fin de maximizar el rendimiento para ese entorno específico. Sigue siendo un concepto muy amplio.

Estas definiciones, válidas en su momento, son demasiado amplias para el contexto actual. Según Russell y Norvig, incluso un termostato sería un agente, lo que diluye completamente el término en la era de los LLMs. La pregunta relevante hoy no es '¿es un agente?', sino '¿qué tipo de agente es y cuál es su grado de autonomía?'.

Cuando barajamos estas definiciones clásicas, gran parte de las herramientas modernas de hoy en día califican como agentes. Sin embargo, no nos podemos quedar en las definiciones clásicas. Tendríamos que ver cómo se han ido adaptando a la tecnología actual con el paso del tiempo. Espóiler: no se han adaptado.

Existen varias normativas que hablan de agentes, como IEEE P7000, P7001, P7006 y P7007, pero se centran más en la parte ética de cómo interactúan los sistemas autónomos con la información personal que en definir lo que es un agente. Aunque en P7006 se presentan algunas características de los agentes, siempre lo hace desde la perspectiva de la ética en el tratamiento de la información.

En cuanto a las normas ISO, podemos encontrarnos con la norma ISO/IEC 42001:2023 para Sistemas de Gestión de Inteligencia Artificial, que proporciona un marco para el desarrollo y uso responsable de la IA, abordando aspectos de fiabilidad, transparencia y ética. Pero no define explícitamente un "agente" como tal. También se mencionan en otras normas a agentes de IA, pero no se definen.

En el reglamento de la Unión Europea, "Reglamento (UE) 2024/1689" sobre inteligencia artificial, se nombran los agentes pero no se especifica una definición formal.

Y en los RFC (Request for Comments) del IETF no se define formalmente lo que es un agente de IA.

Vamos, que cuando hablamos de normativa que diga qué es un agente de IA no hay nada específico; en varios sitios se habla de ello, pero nadie dice qué es.

En cuanto a documentación académica sobre agentes de IA, la de más peso sigue siendo la de los textos de Russell y Norvig, con la idea central de un agente como una entidad que **percibe y actúa**.

Podemos encontrar artículos que mencionan que los agentes de IA se definen por atributos como "autonomía, reactividad y ejecución basada en herramientas" (AAMAS 2025) o que definen a los agentes como entidades con "autonomía, percepción y capacidades de comunicación" (Ferber). Y si rascamos, podemos encontrar otros artículos que, más o menos con sus variaciones, dicen cosas parecidas.

Un texto que me gustó especialmente es "Agents" de Chip Huyen (enero de 2025), una pieza que es una adaptación de la sección sobre agentes de su libro "AI Engineering". En él, a la hora de definir un agente, recurre a la definición clásica:

__"Un agente es cualquier cosa que pueda percibir su entorno y actuar sobre él. El libro *Artificial Intelligence: A Modern Approach* (1995) define un agente como cualquier cosa que pueda ser vista como percibiendo su entorno a través de sensores y actuando sobre ese entorno a través de actuadores."__

En general, el consenso se puede resumir en esta definición de Chip Huyen.

Si queremos extenderlo un poco más, podemos juntar las características que se exponen en artículos de internet y los documentos base que he nombrado, y podríamos tener una lista de conceptos que definen un agente como:

*   Percepción: La capacidad de un agente para percibir su entorno.
*   Razonamiento: La habilidad de un agente para procesar información y tomar decisiones.
*   Acción: La capacidad de un agente para actuar en su entorno para lograr objetivos.
*   Autonomía: Operar de forma independiente.
*   Objetivos: Tener metas predeterminadas a alcanzar.
*   Memoria/Planificación: Mantener el contexto, aprender de experiencias y planificar acciones.
*   Uso de herramientas: Capacidad para interactuar con el entorno a través de herramientas externas.

Pero es importante entender que no existe un concepto ligado a qué es un agente más allá de lo que se definió en su día en "Artificial Intelligence: A Modern Approach".

## **Un agente no es solo una cosa, es un sistema**

Antes de seguir, hay una confusión muy común que debemos despejar. Cuando hablamos de herramientas como Gemini CLI o un asistente integrado, a menudo surge la pregunta: ¿qué parte *es* el agente? La reacción instintiva de muchos, incluyéndome en mis primeras aproximaciones, es señalar al cliente: el programa que ejecutamos, la ventana con la que interactuamos.

Pero esta visión es incompleta. Un agente de IA moderno no es una pieza de software monolítica. Es más preciso entenderlo como un **sistema agéntico**, una entidad compuesta por tres pilares que son inseparables:

1.  **El Cerebro (El LLM):** Es el motor de razonamiento y planificación. Analiza la petición, descompone el problema y decide qué herramientas necesita usar y en qué orden. Por sí solo, es un cerebro en una cubeta: puede pensar, pero no puede actuar.
2.  **El Cuerpo (El Cliente/Framework):** Es el orquestador. Es el código (en mi caso, Java en gvSIG o el propio `gemini-cli`) que recibe las instrucciones del LLM y las traduce en acciones concretas. Invoca las herramientas, gestiona el flujo de datos y devuelve los resultados al LLM. Es el sistema nervioso que conecta el cerebro con el mundo.
3.  **Las Manos y los Sentidos (Las Herramientas):** Son los actuadores y sensores. Son las funciones que permiten al sistema percibir su entorno (leer el estado de las capas en gvSIG, ver el contenido de un fichero) y actuar sobre él (generar un gráfico, escribir código).

La agencia, la capacidad real de hacer cosas, no reside en una de estas partes, sino que **emerge de la interacción de todo el conjunto**.

Por eso, aunque por brevedad y costumbre en el resto del artículo usemos la palabra "agente", es fundamental tener en mente que nos referimos siempre a este sistema tripartito. Entender esto es clave para analizar correctamente sus capacidades y limitaciones.


## **Del ejecutor de tareas al agente proactivo**

Tras revisar las definiciones clásicas y el supuesto consenso actual, queda claro que el término 'agente' carece hoy de una definición rigurosa que lo distinga de las herramientas avanzadas. Esta ambigüedad no es solo un debate semántico; tiene consecuencias prácticas.

### El coste real de la ambigüedad

Mi escepticismo inicial no era solo una cuestión de purismo terminológico. Me hizo reflexionar sobre las consecuencias reales de esta ambigüedad. Cuando el marketing promete un 'agente' autónomo y lo que encontramos es un sofisticado 'ejecutor de tareas', se abren varios riesgos evidentes. Desde mi perspectiva como desarrollador, el más inmediato es la posible pérdida de un tiempo valioso en ciclos de evaluación que terminan en un 'no era esto lo que buscaba'. A una escala mayor, esta desconexión entre la promesa y la realidad corre el riesgo de alimentar el clásico ciclo de 'hype' tecnológico: se pueden inflar las expectativas hasta un punto insostenible, lo que a menudo lleva a una posterior decepción que opaque los avances, que sí son genuinos y realmente útiles. Y lo que es más importante para la innovación, esta confusión nos roba el lenguaje preciso que necesitamos para debatir y construir la próxima generación de sistemas verdaderamente autónomos.

### Dos categorías para ganar claridad

No es que la gran mayoría de los agentes que nos "venden" no sean "Agentes". Sino que la definición de agente que tenemos es poco precisa. La gran mayoría de los agentes que nos encontramos hoy en día presentan una __percepción__ reactiva y una autonomía limitada. Esto los convierte en **"Sistemas de Ejecución de Tareas Complejas impulsados por LLMs con soporte de Herramientas"**; en adelante me referiré a estos como **"Ejecutores de tareas"** para abreviar. No son capaces de responder a estímulos externos y precisan de un humano para iniciar el ciclo de __instrucción->planificación->ejecución-de-herramientas->respuesta__. Por un lado están los agentes como ejecutores de tareas complejas, y por otro estarían los **"agentes proactivos"**, con capacidad de observar el entorno y de reaccionar automáticamente a eventos o cambios específicos sin necesidad de una instrucción directa para cada acción. Su "proactividad" reside en esta capacidad de respuesta automatizada a estímulos, no en la capacidad de definir sus propios objetivos.

Para combatir esta ambigüedad y sus riesgos, tenemos que empezar a no dejarnos cegar por el `hype` de los `agentes` y ser capaces de distinguir entre dos tipos de sistemas fundamentalmente distintos:

*   Los sistemas **"ejecutores de tareas"**, que son herramientas reactivas que ejecutan un ciclo de `instrucción -> planificación -> ejecución -> respuesta` bajo demanda humana.
*   Los sistemas **"proactivos"**, que tienen la capacidad de observar su entorno de forma continua y actuar automáticamente en respuesta a condiciones o eventos predefinidos, persiguiendo objetivos a largo plazo establecidos por el usuario. La clave es la automatización de la respuesta a estímulos, no la autonomía para crear o modificar los fines últimos del sistema.


### Mi 'chatbot' bajo esta nueva luz

Volviendo a mi 'simple chatbot' de gvSIG desktop, esta distinción lo sitúa claramente en su lugar. Califica sin duda como un **ejecutor de tareas**. Percibe el estado de la aplicación cuando se lo pido, razona sobre él y actúa. Pero no monitoriza la vista del mapa por su cuenta ni inicia acciones para, por ejemplo, optimizar la visualización sin que yo se lo ordene. Es una herramienta poderosa, sí, pero le falta esa capacidad de respuesta automatizada a eventos que definiría a un agente **proactivo**.

### Llamar a las cosas por su nombre para poder avanzar

Así que, volviendo a la pregunta que planteaba hacia el inicio del artículo, ¿dónde está el límite entre mi 'simple chatbot' para gvSIG desktop y herramientas como Gemini CLI? Con esta nueva lente, la respuesta es clara. No hay un límite funcional; ambos son **'ejecutores de tareas'** de una sofisticación impresionante. La diferencia no estaba en la tecnología, sino en la palabra que usábamos para describirla.

En definitiva, no se trata de desacreditar estas fantásticas herramientas. Al contrario, se trata de llamarlas por lo que son para apreciar su verdadero valor: son los **"ejecutores de tareas"** más sofisticados que hemos tenido nunca. Pero la próxima vez que nos encontremos con el término 'agente', debemos aplicar este filtro crítico y preguntarnos: ¿estamos ante un sistema que ejecuta tareas bajo demanda o ante una entidad que percibe y actúa proactivamente sobre su entorno?

La diferencia es fundamental, porque nos lleva a la verdadera frontera de la investigación en IA. Nos obliga a plantear la pregunta que realmente importa ahora: si ya hemos perfeccionado los ejecutores, ¿qué mecanismos y arquitecturas necesitamos para programar esa percepción proactiva y dar el salto a la autonomía real?

Un saludo.
