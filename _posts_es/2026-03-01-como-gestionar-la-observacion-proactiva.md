---
layout: post
title: "Control proactivo de la percepción en agentes de IA"
date: 2026-03-01
canonical_url: "https://jjdelcerro.github.io/es/blog/como-gestionar-la-observacion-proactiva/"
image: "https://github.com/jjdelcerro/jjdelcerro.github.io/raw/main/assets/images/como-gestionar-la-observacion-proactiva-v1.png"
---  
En el artículo anterior presentamos el patrón `pool_event()`, una forma de romper el ciclo reactivo de los LLMs permitiendo que el entorno "hable primero". Con esa arquitectura conseguimos que un agente pudiera recibir observaciones proactivas: mensajes de Telegram, alertas del sistema, correos electrónicos, todos ellos capaces de colarse en la conversación sin esperar a que el usuario preguntara. La idea funcionaba, y parecia hacerlo bien. El agente dejaba de ser un mero ejecutor de órdenes para convertirse en un sistema con capacidad de respuesta automática ante estímulos.

Pero cada solución abre nuevas preguntas. La más inmediata saltó a la vista en cuanto empecé a simular escenarios con múltiples fuentes de eventos. Imaginemos un agente conectado a tres sensores: un lector de correo, un cliente de Telegram y un monitor de logs del sistema. Durante una hora de trabajo tranquilo, todo va bien. De repente, el servidor empieza a generar errores de conexión y los logs se disparan, cien eventos por segundo. El agente, fiel a su diseño, inyecta cada uno de esos eventos en el historial de chat. En pocos segundos la ventana de contexto se llena de basura técnica, el LLM pierde el hilo de la tarea que estaba realizando, el coste de tokens se dispara y el sistema se vuelve inútil justo cuando más se le necesita.

Este escenario no es una rareza; es el riesgo natural de cualquier sistema abierto al entorno. Si dotamos a un agente de la capacidad de percibir, tenemos que dotarlo también de la capacidad de *gestionar* lo que percibe. De lo contrario, su proactividad se convierte en un ataque de denegación de servicio autoinfligido.

Las preguntas que guían este artículo es... *¿cómo diseñamos un agente que pueda recibir información del entorno sin ser desbordado por ella?* ¿Qué mecanismos necesita para proteger su propia capacidad de razonamiento, para distinguir la señal del ruido y para decidir, de forma autónoma, cuándo debe escuchar y cuándo debe ignorar?

## El sistema nervioso del agente

Cuando nos enfrentamos al problema de la saturación sensorial, la tentación inmediata es buscar soluciones planas. Un filtro aquí o un límite de eventos por segundo allá. Pero la experiencia nos dice que los sistemas planos no escalan bien cuando la complejidad del entorno crece. Necesitamos una arquitectura con división de responsabilidades, y la biología nos ofrece ideas al respecto.

En los organismos complejos, el sistema nervioso no es una masa homogénea que lo procesa todo con el mismo nivel de detalle. Está jerarquizado en dos grandes subsistemas que colaboran y se complementan.

Por un lado está el **Sistema Nervioso Central (SNC)**. Es el cerebro, la sede de la consciencia, el razonamiento y la voluntad. Cuando decidimos concentrarnos en leer un libro, es el SNC quien toma esa decisión. Pero el SNC tiene un coste energético alto y una capacidad de atención limitada. No puede procesar cada mínima variación del entorno.

Por otro lado está el **Sistema Nervioso Autónomo (SNA)**. Funciona en segundo plano, sin que tengamos que pensar en él. Regula el latido del corazón, la digestión y, lo que nos interesa aquí, filtra la información sensorial antes de que llegue a la consciencia. Cuando paseamos por una calle concurrida, el SNA procesa miles de estímulos y solo eleva a la consciencia aquellos que son relevantes. El claxon de un coche que se acerca o la voz de alguien que nos llama. El SNA protege al cerebro de la sobrecarga, permitiéndole dedicar sus recursos a lo que realmente importa.

Esta división mas alla de ser un capricho es una necesidad arquitectónica que podemos trasladarla directamente al diseño de agentes de IA.

En nuestro modelo, el *Sistema Nervioso Central* del agente es el *LLM*. Es la pieza capaz de razonar, planificar y mantener una conversación coherente. Pero también es la más cara y la que tiene un recurso escaso: la ventana de contexto. Cada token que ocupa un evento irrelevante es un token que roba a la capacidad de razonamiento. El SNC debería dedicarse a las tareas que realmente requieren inteligencia.

El *Sistema Nervioso Autónomo* del agente reside en el *orquestador*, el código que gestiona la comunicación con el LLM, las herramientas y el estado interno. Es el cuerpo del agente. Su misión es recibir todos los estímulos del entorno en bruto y procesarlos antes de que lleguen al cerebro. No decide qué pensar, pero sí decide qué merece ser pensado. Puede aplicar reglas de filtrado, de agregación, de fusión. Puede mantener colas y estados. Puede, en definitiva, actuar como un guardián inteligente que protege al SNC de torrente sensorial.

Un agente, por tanto, no es solo el LLM. Tampoco es solo el código que lo envuelve. Es el **sistema completo**, la interacción entre un cerebro que razona y un cuerpo que percibe y filtra.

## El procesamiento autónomo de la señal sensorial

Una vez establecida la división entre sistema central y autónomo, toca descender al nivel del orquestador y preguntarnos ¿qué hace exactamente ese "cuerpo" del agente con los estímulos que recibe? La respuesta intuitiva sería "pasarlos al cerebro", pero eso es justo lo que nos mete en problemas. Un SNA que se limite a transmitir es un SNA que no cumple su función.

El orquestador debe recibir los eventos en bruto y aplicar sobre ellos operaciones que reduzcan su volumen sin perder su significado. Eliminando redundancias sin sacrificar información crítica, y que entreguen al LLM un flujo depurado y contextualizado de eventos. Para ello, el SNA necesita conocer *la naturaleza de cada tipo de evento*.

No todos los estímulos son iguales. Un mensaje de Telegram no debe tratarse como un log del sistema, ni una alerta de correo como una lectura de sensor. Cada fuente de eventos tiene una semántica o una forma de ser interpretada propia. El SNA debe disponer de una suerte de *propiocepción*: el conocimiento de sus propios sentidos y de las reglas que gobiernan su funcionamiento.

Esta información puede estar codificada de diversas manera pero lo esencial es que el orquestador sepa, para cada evento que llega, a qué categoría pertenece y, por tanto, qué tipo de procesamiento debe aplicarle. Por ejemplo, el SNA "sabe" que los eventos procedentes de un monitor de logs son de naturaleza *agregable*. Lo relevante no es cada línea individual, sino la frecuencia con la que aparecen y su distribución en el tiempo. También "sabe" que los mensajes de un chat son *fusionables*: varios mensajes seguidos forman una única conversación, y deben presentarse juntos para conservar el sentido.

Sobre esta base, el SNA puede aplicar una serie de operaciones sin que el LLM tenga que intervenir. Puede mantener colas por cada sensor, aplicar ventanas temporales, contar ocurrencias, concatenar textos con marcas de tiempo, descartar valores obsoletos. Todo ello ocurriendo en segundo plano, de forma continua, mientras el cerebro del agente está ocupado en tareas de razonamiento más profundas.

Lo crucial es que estas operaciones no son arbitrarias. Responden a la naturaleza del sentido, no a una decisión momentánea del LLM. El SNA actúa como un sistema reflejo. Cuando llega un estímulo de cierto tipo, aplica la regla de tratamiento que su propia constitución le dicta. Estamos ante una *fisiología del agente*.

## Taxonomía de tratamiento de eventos

Una vez que el orquestador asume el rol de sistema nervioso autónomo, su primera tarea es comprender la naturaleza de los estímulos que recibe. No todos los eventos son iguales, ni deben ser tratados con las mismas reglas. Mezclarlos en un único flujo sin distinción es la receta perfecta para la confusión cognitiva. Necesitamos, por tanto, una *taxonomía de tratamiento* que clasifique los eventos según su comportamiento semántico y permita al SNA aplicar la estrategia de procesamiento adecuada a cada uno.

Esta clasificación emerge de la propia función que cada "sentido" del agente desempeña. Un sensor de logs no informa de lo mismo que un cliente de mensajería, y el SNA debe conocer esa diferencia. Podemos imaginar que cada fuente de eventos declara su naturaleza al orquestador, formando parte de esa "propiocepción" del sistema que mencionábamos antes. Con esa información, el SNA puede aplicar cuatro grandes modos de tratamiento:

*   Eventos discretos (el estándar).
    Son la categoría por defecto, la más simple y la que menos intervención requiere. Un evento discreto representa un hecho único. Su aparición es significativa por sí misma, y perder cualquier instancia supondría una pérdida de información crítica. El SNA los deja pasar sin transformación directamente al historial de conversación.

*   Eventos agregables (cuantificación).
    Hay situaciones en las que el valor informativo no reside en cada evento individual, sino en su frecuencia o volumen. Un monitor de logs del sistema puede generar cientos de entradas por segundo cuando algo empieza a ir mal. Si el SNA inyecta cada una de esas líneas en la conversación, en pocos segundos el LLM estará ahogado en un mar de texto repetitivo y el contexto habrá volado por los aires.

    Los eventos agregables son aquellos en los que podemos sustituir una secuencia de ocurrencias por un único evento que informe de la cantidad producida en un intervalo. El SNA los acumula en una ventana temporal, cuenta las ocurrencias y, transcurrido cierto umbral o cuando el LLM esté disponible, inyecta un mensaje del tipo: *"Se han producido 150 eventos de tipo 'error de conexión'"*.

    Pero aquí hay un matiz crucial, y es el *tiempo*. No es lo mismo recibir 150 errores en cinco minutos que en diez días. La misma cantidad puede significar cosas radicalmente distintas según la ventana en la que se produzca. La inyección debería ser algo así como: *"Se han registrado 150 eventos de tipo 'error de conexión' en los últimos 5 minutos (tasa media de 30 eventos/minuto)"*.

    El SNA, al agregar, no solo cuenta: añade contexto temporal. Convierte una avalancha de datos en un indicador de intensidad, preservando la información esencial sin saturar al cerebro.

*   Eventos fusionables (continuidad).
    Son otra familia de eventos tiene una naturaleza radicalmente distinta. Son los que forman parte de una secuencia narrativa. El ejemplo más claro es la mensajería instantánea. Cuando un usuario envía varios mensajes seguidos en un chat, cada mensaje individual es un evento, pero juntos constituyen una sola conversación. Si el SNA los inyecta por separado, el LLM recibirá algo como:

    * Mensaje 1: «Hola»
    * Mensaje 2: «¿Estás?»
    * Mensaje 3: «Necesito hablar contigo»

    Esto fragmenta artificialmente lo que debería percibirse como un todo coherente. Además, multiplica innecesariamente el número de turnos en el historial.
    Los eventos fusionables permiten al SNA concatenar varios mensajes de una misma fuente en un solo bloque, preservando el orden y, lo que es más importante, las *marcas de tiempo individuales*. El resultado sería algo así:

    ```
    [10:05:01] Hola
    [10:05:03] ¿Estás?
    [10:05:07] Necesito hablar contigo
    ```

    De este modo, el LLM recibe un paquete semántico completo, con toda la riqueza temporal de la secuencia, pero ocupando un solo "turno" en la conversación. El SNA ha realizado una fusión que respeta la naturaleza del sentido.

*   Eventos de estado / únicos (sustitución).
    Por último, tenemos eventos que representan una *condición* más que una *ocurrencia*. Pensemos en un sensor de correo electrónico. Cuando llega un nuevo mensaje, se genera un evento "tienes correo". Pero si mientras el LLM está procesando otra tarea llegan cinco correos más el LLM recibirá una secuencia de avisos redundantes y obsoletos en cuanto aparece el siguiente.

    Los eventos de estado (o eventos únicos) funcionan por *sustitución*. El SNA mantiene internamente, para cada sensor de este tipo, el *último valor* recibido. Cuando llega un nuevo evento, descarta el anterior de la cola (si aún no se había inyectado) y lo reemplaza por el nuevo. Así, cuando el LLM esté disponible para recibir información, solo verá el estado más actualizado: *"Tienes 6 correos sin leer"*.

    Esta estrategia elimina la redundancia y evita que el agente actúe sobre información desactualizada. Es particularmente útil para sensores que notifican cambios de estado.


Con esta taxonomía, el SNA dispone de un repertorio básico de operaciones para transformar el torrente sensorial en un flujo depurado y significativo. Cada evento, al llegar, es clasificado según su naturaleza y tratado con la estrategia correspondiente. El resultado es una reducción drástica del volumen de información que llega al LLM, sin pérdida de la riqueza semántica que cada tipo de evento requiere.

## El control consciente de los sentidos

Hasta ahora hemos reflexionado sobre como dotar al cuerpo del agente de la capacidad de procesar la señal sensorial de forma inteligente. El SNA sabe que los logs se agregan, que los mensajes de chat se fusionan, que los avisos de correo se sustituyen por su último valor. Todo esto ocurre en segundo plano, de forma refleja, sin que el cerebro tenga que intervenir. Es la fisiología del agente.

Pero la autonomía real no se construye solo con reflejos. Un organismo que no puede controlar voluntariamente sus sentidos es un organismo esclavo de su entorno. Cuando necesitamos concentrarnos en una tarea compleja, cerramos los ojos o nos tapamos los oídos. Tomamos decisiones conscientes sobre qué estímulos merecen nuestra atención y cuáles deben ser ignorados, aunque estén presentes. Nuestro sistema nervioso central puede decirle al autónomo: "ahora silencia esto".

Nuestros agentes necesitan esa misma capacidad. El LLM, como cerebro del sistema, debe poder ejercer su voluntad sobre los sentidos del cuerpo. Debe poder decir "durante los próximos treinta minutos, ignora todo lo que llegue de Telegram; estoy revisando un documento importante y no quiero distracciones". O bien: "reactiva el monitor de logs, necesito estar al tanto de cualquier error".

Para ello, el orquestador expone un conjunto de herramientas que convierten el control sensorial en una acción más del repertorio del agente. Estas herramientas no actúan sobre el mundo exterior, sino sobre la propia arquitectura de percepción del sistema. Son herramientas de *metacognición* que el agente usa para regular su propia actividad cognitiva.

La primera de ellas, que ya presentamos en una sección anterior, es *`get_sensor_capabilities`*. A través de ella, el LLM puede obtener un inventario completo de sus sentidos: qué sensores están disponibles, a qué categoría pertenecen (discretos, agregables, fusionables, únicos), qué parámetros de configuración admiten y cuál es su estado actual. Es el equivalente a que un humano cierre los ojos y sienta su propio cuerpo. "Tengo ojos, los tengo abiertos; tengo oídos, los tengo tapados; tengo un sentido del equilibrio funcionando". Sin esta propiocepción, el control voluntario sería ciego.

Sobre esa base, el LLM dispone de tres herramientas para la regulación activa:

* *`sensor_stop(channels, duration)`*. Ordena al SNA que suspenda temporalmente la recepción de eventos de uno o varios canales.  Durante ese período, el SNA descartará silenciosamente cualquier evento procedente de esos canales, como si el agente hubiera cerrado los párpados.

* *`sensor_start(channels)`*. Reactiva los sensores previamente detenidos. Los eventos vuelven a fluir para su procesamiento habitual por parte del SNA.

* *`sensor_status(channels)`*. Consulta el estado actual de uno o varios sensores. Devuelve información como: activo/inactivo, tiempo restante de desactivación (si la hay), estadísticas básicas de eventos recientes y cualquier otra métrica que el SNA haya ido acumulando. Esta herramienta permite al LLM tomar decisiones informadas. Antes de iniciar una tarea que requiera concentración, podría consultar qué sensores están especialmente ruidosos y decidir si conviene silenciar alguno.

Es importante notar que estas herramientas no modifican el comportamiento del SNA en lo que respecta al *tratamiento* de los eventos. Cuando un sensor está activo, sus eventos siguen siendo procesados según su naturaleza: agregados, fusionados, convertidos a estado único, etc. La desactivación es una operación más drástica: es una compuerta que se cierra por completo. El SNA no acumula eventos mientras el sensor está detenido. Cuando se reactiva, el mundo sensorial vuelve a fluir desde cero, con el estado actual.

Esta distinción entre **procesamiento** (lo que hace el SNA siempre) y **filtrado voluntario** (lo que ordena el SNC) es clave. El procesamiento es fisiológico, automático, basado en la naturaleza del sentido. El filtrado es voluntario, basado en las prioridades del momento.

## De la reactividad a la autoregulación cognitiva

Hemos recorrido un camino que empezó con una constatación incómoda: un agente capaz de percibir el entorno, pero sin control sobre esa percepción, es un agente condenado a la saturación. La misma proactividad que celebrábamos en el artículo anterior se convertía, en cuanto el entorno se volvía ruidoso, en una fuente de parálisis cognitiva. El agente escuchaba todo, pero precisamente por eso dejaba de entender nada.

La solución no podía pasar por renunciar a la proactividad. Tenía que involucrar el dotar al agente de una arquitectura interna que le permitiera gestionar su propia percepción con la misma sofisticación con la que gestiona sus razonamientos. Inspirándonos en la biología, hemos propuesto una división fundamental entre dos sistemas que colaboran y se complementan:

- El **Sistema Nervioso Autónomo**, encarnado en el orquestador, actúa como el guardián fisiológico.

- El **Sistema Nervioso Central**, el propio LLM, se reserva el control voluntario sobre esa percepción a través de herramientas como `sensor_stop`, `sensor_start` y `sensor_status`.

Esta separación cambia la naturaleza misma de lo que entendemos por "agente". Un agente ya no es un programa que reacciona a estímulos, ni siquiera un LLM con herramientas. Es un *sistema cognitivo complejo*, con un cuerpo que filtra y procesa, y un cerebro que razona y decide. Entre ambos construyen lo que podríamos llamar *autoregulación cognitiva*. La capacidad de mantener un equilibrio interno frente a las variaciones del entorno.

Hemos puesto sobre la mesa los cimientos de esa autoregulación. Hemos definido una taxonomía de tratamiento que permite al cuerpo procesar la señal sin perder su significado. Y hemos dotado al cerebro de herramientas para regular su propia percepción. El agente que empieza a emerger de este diseño como un sistema con capacidad de autoprotección y con reflejos.

Pero, como ocurre siempre en arquitectura, cada capa de solución revela una nueva capa de complejidad. Al dar al agente la capacidad de cerrar los ojos, hemos abierto una pregunta incómoda: *¿qué ocurre cuando, con los ojos cerrados, ocurre algo que no puede esperar?* 

Al final, la autonomía real no es la capacidad de aislarse del entorno, sino la capacidad de relacionarse con él sin perderse a uno mismo. Y eso, como tantas cosas en la vida, es cuestión de equilibrio.

