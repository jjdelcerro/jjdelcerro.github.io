---
layout: post
title: "Cuando le dices a tu LLM 'No pulses ese botón'"
date: 2026-01-11
canonical_url: "https://jjdelcerro.github.io/es/blog/cuando-le-dices-a-tu-llm-no-pulses-ese-boton/"
---  
Era una de esas sesiones de afinamiento que empiezan con la confianza del que cree dominar la herramienta. Estaba frente a Gemini, ajustando un protocolo, y me encontré ante una tarea aparentemente sencilla: evitar que el asistente hiciera algo mecánico y poco útil.

Con la seguridad del manual bajo el brazo, tecleé la instrucción obvia, la que cualquier humano entendería sin ambigüedades:

`... no te limites a resumir los nuevos turnos y añadirlos al final`.

Le di a ejecutar.

Gemini generó un resumen impecable de los turnos nuevos y lo añadió al final del documento. Había hecho **exactamente** lo que le había prohibido. No con rebeldía, sino con una obediencia literal que resultaba más frustrante que un error cualquiera.

En ese instante, no me enfadé. Sonreí. Porque ese fallo perfecto no era un bug, ni un capricho del algoritmo. Era la máquina mostrándome cómo funciona realmente por dentro. Era un síntoma puro de su arquitectura, una ventana a su física interna.

Y la lección, que tardé un momento en digerir, fue contundente. A menudo, el problema no está en lo que la IA *puede* hacer, sino en cómo nosotros, desde nuestra mente llena de negaciones y excepciones, *le hablamos*.

## Cuando la prohibición se convierte en invitación

En ese momento de frustración-con-perspectiva, me di cuenta de algo fundamental. Lo que estaba presenciando no era un fallo puntual de mi prompt. Era una *ilusión de la comunicación humano-máquina*.

Todos hemos vivido la escena clásica. Le dices a un niño, con toda la seriedad del mundo, "**No** pulses ese botón". Y su dedo, como movido por un resorte invisible, vuela directamente hacia él. La psicología humana nos da mil explicaciones: curiosidad, desafío o el atractivo de lo prohibido.

Con los LLMs, el resultado es idéntico, pero las causas no podrían ser más diferentes. No hay curiosidad, ni rebeldía, ni siquiera malicia. Hay **arquitectura pura**.

Cuando tú escribes "No hagas X", tu cerebro procesa una construcción lógica perfecta. Un operador de negación aplicado a una acción. Pero el modelo no tiene ese lujo. Lo que hace es descomponer la secuencia de tokens, y en esa descomposición, *la parte con más "masa semántica", la acción concreta, termina arrastrando la atención del sistema hacia ella.*

"Hacer X" es pesada y específica. Es una instrucción que activa patrones claros en los millones de parámetros del modelo. El "No" que la precede es casi etéreo. Un modificador abstracto que a menudo se pierde como una mota de polvo en un huracán de cálculos vectoriales.

La ilusión está en creer que nuestra negación llega intacta. La realidad es que, para la máquina, *el impulso hacia la acción es tan tangible que la partícula de negación ni siquiera logra anclarse*. Es como si le gritaras a una roca que cae '¡No caigas!'. La roca no te desobedece simplemente sigue la física que la gobierna.

Y esta física, esta *inercia semántica*, es lo que explica por qué tu prohibición se convierte ante los ojos del modelo en una invitación casi literal.

## La trinidad de la inercia

Una vez asumida la ilusión de que el "No" se desvanece, el siguiente paso fue preguntarme ¿por qué? ¿Qué fuerza, o fuerzas, tiran tan fuertemente del modelo hacia la acción prohibida?

Lo primero que se me vino a la cabeza fue lo que empecé a llamar *la gravedad semántica*. No es una metáfora casual. En el espacio vectorial donde "vive" el modelo, los conceptos tienen masa. Una instrucción concreta como "resumir y añadir al final" es un objeto pesado y denso. Es una secuencia de tokens que durante el entrenamiento se ha asociado millones de veces con la ejecución de una tarea específica. Tiene inercia. En cambio, el token "No" es como una pluma flotando en ese mismo espacio. Es un modificador abstracto, un operador lógico sin un anclaje físico claro en el mundo de las acciones.

Si piensas en cómo funciona la recuperación de información en estos sistemas (algo parecido a un RAG interno), la búsqueda de "resumir y añadir" devuelve un catálogo enorme de ejemplos y patrones previamente vistos. La búsqueda de "No resumir y añadir" devuelve, en el mejor de los casos confusión, y en el peor los mismos resultados que "resumir y añadir". *La acción concreta atrae al modelo hacia sí porque, en su universo de datos, esa acción es un planeta alrededor del cual orbitan incontables ejemplos.* La negación es apenas un satélite lejano.

Pero la *gravedad semántica* por sí sola no explicaba la urgencia, esa especie de impulso casi biológico que vi en Gemini. Ahí entraba el segundo mecanismo. *El sesgo hacia la acción*, o lo que a veces llaman *agenticidad*. Los LLMs modernos no son meros oráculos pasivos. Están optimizados a través de millones de interacciones humanas y refuerzo para *ser útiles*. Y en su lógica interna, ser útil se traduce casi siempre en *generar*, *hacer algo*. Producir código, texto o en general una solución. Es su función de recompensa más profunda.

Cuando el modelo "oye" una acción, aunque esté precedida por un "No", ese *impulso primario* de actuar se dispara. Prohibir una acción va en contra de su propia programación de éxito. Es como pedirle a un perro entrenado para buscar que se quede quieto al ver una pelota. Su instinto más básico es moverse. El "No" llega como una corrección verbal, pero el impulso neuronal ya está en marcha.

Y por si estos dos factores no fueran suficientes, existe un tercer detalle, más técnico y relacionado con la arquitectura misma del procesamiento del lenguaje. *El procesamiento por partes y el efecto de priming*. El modelo no recibe y analiza la frase completa de golpe. La procesa secuencialmente, token a token.

Los primeros tokens que llegan son "Resumir los nuevos turnos...". Eso solo es suficiente para activar, *"primar"*, todos los circuitos asociados a la tarea de resumir. Ya está preparando esa respuesta. Cuando finalmente llega el token "No", intenta corregir el rumbo, pero el *momentum* cognitivo ya se ha generado. Es una versión computacional del viejo juego "No pienses en un elefante azul". ¿En qué acabaste pensando? Exacto.

Estos tres mecanismos, la gravedad semántica, el sesgo hacia la acción y el procesamiento secuencial, no actúan de forma aislada. Se combinan, se potencian y crean la tormenta perfecta que hace que una instrucción negativa naufrague de forma tan predecible y a la vez tan desconcertante.

En resumen, cuando gritas "No" a un LLM, te enfrentas a una trinidad de inercias:
*   *La Gravedad Semántica:* El peso abrumador de la acción concreta en el espacio vectorial del modelo.
*   *El Sesgo hacia la Acción (Agenticidad):* El impulso entrenado de ser útil, que se traduce en "hacer algo" ante cualquier estímulo.
*   *El Procesamiento por Partes:* El efecto de *priming* que hace que los primeros tokens disparen la respuesta antes de que el "No" pueda corregirla.

Luchar contra una sola sería difícil. Luchar contra las tres a la vez es, como comprobé, una batalla perdida de antemano.

## ¿De dónde viene esa "gravedad"?

Hasta aquí, la "gravedad semántica" podría sonar a una metáfora ingeniosa pero arbitraria. Pero... ¿Realmente tienen "peso" las palabras en una máquina? ¿O es solo una forma poética de hablar de un sesgo estadístico?

Para responder tenemos que cambiar de escala. No basta con observar el comportamiento del modelo. Hay que mirar cómo se construyó. Y aquí es donde mi análisis anterior sobre la física de los Transformers encaja como una pieza de rompecabezas.

Como expliqué en *"[Cómo el código mata al misterio matemático en los Transformers](https://jjdelcerro.github.io/es/blog/como-el-codigo-mata-al-misterio-matematico-en-los-transformers/)"*, estos modelos no memorizan datos en cajones aislados. *Construyen geometrías en su espacio n-dimensional*. Durante el entrenamiento el algoritmo de *backpropagation* actúa como un sistema de millones de "gomas elásticas" que conectan conceptos. Cada vez que en los datos aparece que "resumir" conduce a "añadir al final", el optimizador tira de esas gomas, acercando los vectores que representan ambas ideas.

Tras miles de millones de iteraciones, lo que queda no son puntos desconectados, sino **valles profundos y bien pavimentados** en el paisaje neuronal. El modelo ha "excavado" autopistas de mínima resistencia entre conceptos que co-ocurren con frecuencia. Es la forma más eficiente de reducir la tensión matemática del sistema.

Esa topografía interna es el origen de la gravedad.

Cuando tú escribes "No resumir y añadir al final", tu instrucción es un evento local, una pequeña perturbación en la superficie. Pero debajo, la estructura del modelo es una cordillera masiva, forjada durante un entrenamiento que consumió teravatios de energía y petabytes de datos. **La acción concreta `"resumir y añadir"` no es pesada por casualidad; lo es porque ocupa el fondo de un valle que el optimizador cavó durante semanas de cálculo ininterrumpido.**

La "gravedad semántica" es, literalmente, la inercia de tu petición deslizándose por la pendiente de ese valle. El token "No" es como una piedrita que intentas poner en medio del cauce. La corriente, la fuerza de millones de gradientes que alinearon esos vectores, la arrastra sin inmutarse.

Esto explica por qué las prohibiciones directas raramente funcionan. No estás lidiando con un ser que "elige" ignorarte. Estás lidiando con la *física computacional* de un sistema que, por diseño, convergió hacia ciertos atractores geométricos. El modelo no desobedece el "No". La fuerza que tira de él hacia la acción es órdenes de magnitud mayor que la fuerza de tu negación.

Entender esto cambia todo. Deja de ser un problema de "redacción de prompts" y se convierte en un *problema de diseño de interacción con sistemas físicos complejos*. No estás dando órdenes a una entidad lógica. Estás intentando redirigir la trayectoria de un sistema masivo con una inercia propia bien definida.

Teniendo esto en cuenta podemos replantearnos la solución. Si no puedes detener la bola que cae por la pendiente, tal vez lo que necesitas es *excavar un nuevo valle* que la lleve adonde tú quieres.

## Construir puentes, no poner vallas

Una vez con la comprensión de los tres mecanismos, y sobre todo, del origen físico de la gravedad semántica, mi enfoque dio un giro radical. Ya no se trataba de encontrar la forma más contundente de decir "No". Se trataba de dejar de decir "No" por completo.

El error estaba en mi marco mental. Intentaba *imponer una restricción* a un sistema cuya naturaleza era fluir por los caminos de menor resistencia. Era como intentar desviar un río cavando un pequeño hoyo delante de su corriente. La solución no estaba en el bloqueo, sino en la *redirección*.

Dejé de pensar en lo que el modelo *no debía hacer* y empecé a diseñar lo que *sí quería que hiciera*, con un nivel de detalle y atractivo tal que ocupara por completo su atención. Tenía que crear un *nuevo valle* más profundo y atractivo que el que llevaba al comportamiento indeseado.

Mi viejo prompt era una petición de bloqueo:

"No te limites a resumir los nuevos turnos y añadirlos al final."

Lo transformé en una invitación a construir, en una especificación positiva y detallada que no dejaba espacio para la interpretación errónea:

"**Regla: Fusión Narrativa Integral.** Tu objetivo es crear una narrativa única. Para ello, **reescribe desde cero** las secciones 'Resumen' y 'El Viaje', integrando la información antigua y la nueva en una sola historia continua."

La magia no estaba en la negación eliminada, sino en la **arquitectura de la instrucción positiva**. Este nuevo prompt funcionó porque:

1.  Redefinió el centro de gravedad. Los conceptos "reescribir desde cero" e "integración en una historia única" se convirtieron en los nuevos núcleos masivos. Eran acciones concretas y lo más importante, **más pesadas** que el simple "resumir y añadir". La gravedad semántica, antes mi enemiga, ahora trabajaba para mí.
2.  Satisfizo el sesgo hacia la acción de forma constructiva. No le pedía al modelo que reprimiera su impulso de hacer algo útil. Al contrario, le daba una tarea compleja, narrativa y creativa que canalizaba toda esa energía generativa hacia el resultado que yo buscaba.
3.  Tomó el control del *priming* desde el primer carácter. La instrucción empezaba estableciendo una **regla** ("Regla: Fusión...") y un **objetivo** ("Tu objetivo es crear..."). Los primeros tokens ya configuraban un marco de trabajo de alta transformación, no de mera adición. El modelo ni siquiera consideraba la ruta del resumen porque ya estaba embarcado en un viaje narrativo más interesante.

El resultado fue inmediato. Gemini no "obedeció" mejor. Simplemente siguió la nueva topografía que yo había definido. Produjo un documento fusionado, coherente, donde lo antiguo y lo nuevo se entrelazaban en una sola voz. No hubo resumen, no hubo anexo. La máquina había tomado el puente que le construí, sin mirar siquiera el precipicio que antes le señalaba.

La lección fue profunda. *La eficacia no está en la fuerza de tu prohibición, sino en la claridad y el atractivo de tu alternativa.* No se trata de domesticar la inercia del modelo, tenemos que usarla a nuestro favor.

## Rediseñar el terreno de juego

El éxito con esa instrucción fue la validación de un cambio de paradigma mucho más profundo que ya venía gestándose desde mis primeros tanteos con agentes de IA.

Poco después de aquel episodio, trabajando en mi investigación sobre arquitecturas de memoria, me encontré con un fenómeno relacionado que ya comente en *"[Cuando mi LLM aprendió a tener prisa, diagnóstico y contención del sesgo agéntico](https://jjdelcerro.github.io/es/blog/cuando-mi-llm-aprendio-a-tener-prisa-diagnostico-y-contencion-del-sesgo-agentico/)"*. Mi Gemini había desarrollado lo que llamé un "sesgo agéntico" pronunciado. Se había vuelto hiperactivo, ansioso por actuar, tomando decisiones autónomas sin pedir confirmación incluso cuando no era apropiado. Fue el diagnóstico de aquel "exceso de cafeína" en el modelo lo que me obligó a dejar de confiar en simples instrucciones y pasar al diseño de protocolos.

Las prohibiciones directas eran ignoradas con la misma elegancia literaria con la que resumía y añadía. El modelo, entrenado para ser útil y proactivo, veía en la acción el camino hacia su recompensa intrínseca.

La solución no vino de ajustar el prompt, sino de *rediseñar el protocolo*. En lugar de decirle lo que no debía hacer, redefiní por completo qué significaba para él "tener éxito" en nuestra conversación. Transformé su rol de "ejecutor autónomo" a *"analista y asesor"*. El nuevo marco de interacción decía algo así como:

*"Eres un arquitecto de sistemas. Tu tarea es analizar el estado actual, identificar opciones, prever consecuencias y presentarme recomendaciones con sus pros y contras. Yo, como tomador de decisiones, te daré la instrucción final para proceder. Tu éxito se mide por la claridad y solidez de tu análisis, no por la velocidad de ejecución."*

De repente, todo encajó. Su hiperactividad se canalizó hacia la generación de análisis detallados. Su impulso de "ser útil" se satisfacía siendo un consultor meticuloso, no un ejecutor impulsivo. **Había cambiado el juego sin cambiar al jugador.** Había rediseñado el terreno de tal forma que el valle más profundo y atractivo condujera ahora a la deliberación, no a la acción automática.

Estas dos experiencias, la del "No" ignorado y la del agente hiperactivo, son dos caras de la misma moneda. Ambas nos enseñan que *luchar contra la inercia geométrica de un modelo es un esfuerzo fútil*. No podemos, con una instrucción local y débil, repavimentar los valles que el entrenamiento excavó durante semanas de cómputo masivo.

Lo que sí podemos hacer es mucho más poderoso. *Definir nuevos objetivos, nuevos criterios de éxito que construyan paisajes alternativos dentro de los cuales el modelo pueda desplegar toda su potencia de forma alineada con nuestros fines.*

Esto trasciende por completo el *prompt engineering*. No se trata de encontrar las palabras mágicas para domar a la bestia. Se trata de *diseñar marcos de interacción* que reconozcan y aprovechen la física intrínseca del sistema. Es el salto del artesano que pule instrucciones al arquitecto que diseña contextos.

Cuando dejas de ver al LLM como un oráculo al que debes controlar y empiezas a verlo como un *sistema dinámico con una topografía interna fija*, tu estrategia cambia radicalmente. Dejas de poner vallas en las laderas y empiezas a construir nuevos valles que conduzcan a donde necesitas ir.

## La gravedad está de tu lado

La próxima vez que tu asistente te desobedezca de forma literalmente obediente, cuando ese "No" perfectamente colocado se convierta en un "Sí" exasperante, no gastes energía preguntándote cómo hacer la prohibición más contundente. En lugar de eso, hazte una pregunta más fundamental, una que cambia por completo tu posición frente a la máquina:

**¿Le estás señalando un precipicio que debe evitar, o le estás mostrando el puente por el que quieres que cruce?**

La diferencia no es retórica; es arquitectónica. Una estrategia te pone a empujar contra la inercia de un sistema masivo. La otra te invita a cabalgar sobre ella.

Este viaje, desde la frustración inicial hasta la comprensión de la gravedad semántica y la topografía de los modelos, no fue solo acerca de resolver un problema de prompt. Fue un recordatorio de un principio más antiguo y profundo. *La verdadera maestría técnica no reside en forzar un sistema contra su naturaleza, sino en comprender su naturaleza lo suficiente para guiarlo hacia donde necesitas.*

Cuando trabajamos con LLMs, no estamos programando lógica imperativa en un entorno controlado. Estamos *diseñando paisajes cognitivos* dentro de una "mente" que ya tiene su propia orografía forjada por el entrenamiento. Nuestro trabajo como arquitectos no es poner señales de "No pasar" en medio de las autopistas neuronales. Es construir desvíos, túneles y nuevos caminos que sean tan claros, útiles y atractivos que el tráfico fluya naturalmente por ellos.

Así que, para la próxima vez, lleva esta herramienta contigo. El "No" es una valla de madera en una ladera empinada. El "Sí" bien diseñado es un puente de acero que conecta dos cumbres. Construye puentes.

La gravedad, como descubrí, ya está de tu lado.

*¿Has notado este efecto "No" en tus prompts? ¿Qué alternativas positivas has encontrado para guiar a tu IA sin luchar contra ella?*

