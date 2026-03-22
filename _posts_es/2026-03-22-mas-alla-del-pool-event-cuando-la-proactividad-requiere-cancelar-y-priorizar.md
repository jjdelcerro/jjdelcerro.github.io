---
layout: post
title: "Cuando la proactividad de un agente requiere cancelar y priorizar en su percepción"
date: 2026-03-22
canonical_url: "https://jjdelcerro.github.io/es/blog/mas-alla-del-pool-event-cuando-la-proactividad-requiere-cancelar-y-priorizar/"
---  
Hola,
en el artículo anterior, "[Control proactivo de la percepción en agentes de IA](https://jjdelcerro.github.io/es/blog/como-gestionar-la-observacion-proactiva/)", vimos que teniamos la necesidad de filtrar y procesar los eventos del exterior. Pero proteger al LLM de la sobrecarga no basta si el entorno envía información más rápido de lo que el LLM puede procesar. Necesitamos procesar la entrada de información, a gestionar "turnos", y decidir cuándo un evento merece interrumpir el dialogo con el LLM.

Sin embargo, cuando sacas el patrón *pool_event* del laboratorio y lo enfrentas a un sistema real, la arquitectura empieza a sufrir. Porque la proactividad no es solo un problema de atención; es, sobre todo, un problema de **gestión de turnos**.

### La ventanilla única del razonamiento síncrono

Recordemos el patrón *pool_event*. Es un "hack" elegante que permite al entorno hablar insertando un evento en el historial, simulando que el LLM lo había pedido. Funciona bien mientras el mundo ocurra a un ritmo pausado. Pero tiene una limitación estructural ya que convierte el historial en una *ventanilla única*.

Si el LLM está inmerso en un diagnóstico complejo, el evento debe esperar en la cola. El problema es que el ciclo conversacion con el LLM es intrínsecamente síncrono y costoso, mientras que el *orquestador* recibe estímulos de forma asíncrona y potencialmente masiva.

Esta asincronía es, precisamente, la que en el artículo anterior dotamos de *inteligencia fisiológica*. Ese *sistema nervio autonomo* que tenía que filtrar, agregar y fusionar eventos para proteger al LLM de la saturación. Ahora nos enfrentamos a un problema de *turnos*, no de volumen. El SNA puede tener la bandeja de eventos perfectamente ordenada y hasta cierto punto comprimida, pero si el LLM tarda diez segundos en responder, los eventos seguirán acumulándose. Cuando el LLM termine su ciclo, recibirá una descarga concentrada de eventos que, aunque bien empaquetada, puede llegar demasiado tarde o desbordar su capacidad de atención inmediata.

Cuando los eventos llegan más rápido de lo que el LLM puede procesarlos, el sistema se ahoga en su propia cola. La información se vuelve obsoleta antes de ser atendida. Habíamos creado un sistema que podía escuchar, pero que se bloqueaba si el entorno hablaba demasiado rápido.

### Clasificar el caos mediante una taxonomía de urgencia

Para que el agente no sea una víctima pasiva de esta cola, el *orquestador*, el cuerpo del agente, debe dejar de ser un mero mensajero y convertirse en un componente inteligente. Si en el artículo anterior clasificamos los eventos por su **naturaleza de tratamiento** (cómo se digieren, discretos, agregables, fusionables, de estado), ahora necesitamos clasificarlos por su **grado de urgencia** (cuándo se atienden). Ambas taxonomías son complementarias. Una define la *fisiología* de la percepción, la otra su *prioridad temporal*.

El primer paso es, por tanto, establecer una **taxonomía basada en la urgencia y el impacto** que permita al orquestador decidir qué estímulos merecen interrumpir el curso del pensamiento. Podríamos empezar por una clasificación simple:

1.  *Eventos normales.* Son el ruido de fondo o las actualizaciones de estado no críticas. El orquestador los acumula y, al final del ciclo de razonamiento actual, los inyecta como un bloque de información cohesivo. No interrumpen, no alteran el flujo.

2.  *Eventos prioritarios.* Indican que algo relevante ha ocurrido y debería atenderse en el próximo ciclo. Aquí el orquestador debe evaluar si es *"seguro"* interrumpir. Podemos considerar que un ciclo es "seguro" para cancelar si el *LLM* aún *no ha ejecutado ninguna herramienta con efectos secundarios* (como escribir en un fichero o modificar una base de datos). Si es seguro, el orquestador puede cancelar el *pensamiento en curso* de forma transparente y da paso a la nueva información. Si no es seguro, el evento prioritario espera su turno, igual que uno normal.

3.  *Eventos urgentes.* Estos justifican interrumpir el pensamiento a medias **en cualquier instante**, independientemente de lo que esté haciendo el agente. Una alerta crítica de seguridad, una orden de parada de emergencia o un cambio de estado que invalida completamente la acción en curso. Para estos, no hay evaluación de "seguridad". El orquestador toma el mando y aborta la operación inmediatamente.

Observa lo que ocurre aquí: la decisión de **cuándo** un evento merece interrumpir no la toma el LLM, sino el orquestador. Este evalúa la urgencia, consulta su registro de herramientas ejecutadas y decide si puede aplicar una cancelación limpia o debe notificar la interrupción. El LLM ni siquiera es consciente de que esta deliberación está ocurriendo. Para él, la realidad es que un evento ha llegado en el momento justo. Esta *soberanía del orquestador sobre la agenda del LLM** es lo que permite que el sistema responda con *"reflejos"*, sin esperar a que el LLN "pueda prestar atención".

Esta taxonomía traslada, por tanto, la carga de la decisión del "pesado" LLM al orquestador, normalmente mas ágil en la toma de decisiones. Define una política clara: **qué puede esperar, qué debería adelantarse si es posible y qué debe pararlo todo sin contemplaciones.** Y lo hace respetando la jerarquía que establecimos en el artículo anterior. El LLM puede ejercer un control voluntario sobre sus sentidos (mediante herramientas como `sensor_stop`), pero el orquestador tiene siempre la autoridad para inyectar un evento clasificado como prioritario o urgente, saltándose cualquier filtro activo si las reglas de criticidad del sistema así lo requieren. La autonomía del agente en la gestión de su atención está, por tanto, acotada por la soberanía del sistema que lo alberga.

### Los dos mecanismos de interrupción

Una vez clasificado un evento como prioritario o urgente, el *orquestador* debe materializar esa prioridad interrumpiendo el ciclo actual del LLM. Pero no todas las interrupciones son iguales. Distinguimos dos mecanismos fundamentales, basados en un único criterio: **si el ciclo en curso ha ejecutado ya herramientas con efectos secundarios**.

1.  *Cancelación segura.*
    Se aplica cuando *no se ha ejecutado ninguna herramienta de escritura*. El orquestador aborta la petición al LLM y realiza una "sanitización" del historial, eliminando por completo el último turno de conversación. A continuación, inyecta el nuevo evento (prioritario o urgente) y reinicia el ciclo.
    Como *Consecuencia*, el LLM *nunca llega a enterarse* de que fue interrumpido. Para él, es como si el evento hubiera llegado un instante antes de que empezara a pensar. Este mecanismo mantiene el historial limpio y coherente, y es la opción más eficiente en complejidad cognitiva, a costa de un consume extra de tokens.

2.  *Cancelación insegura.*
    Es la opción por defecto cuando *el ciclo ya ha ejecutado al menos una herramienta escritura*, o cuando la política del sistema obliga a notificar una interrupción urgente. El orquestador aborta la petición, pero en lugar de borrar el turno, *inyecta una herramienta ficticia de consulta* para informar al LLM. Como *Consecuencia,* el LLM es *informado explícitamente* de que sus operaciones fueron canceladas, y ve el motivo inmediatamente después. Esto preserva la coherencia narrativa a costa de un historial más largo y del coste de los tokens de la notificación.
    Este mecanismo asume que las herramientas de escritura ejecutadas dejan un estado que debemos aceptar. En futuras reflexiones sería interesante explorar cómo dotar a estas herramientas de mecanismos de compensación para aumentar la robustez del sistema frente a interrupciones.

En ambos casos, es el orquestador quien, basándose en su conocimiento del estado de ejecución, aplica la política de interrupción. El LLM simplemente *experimenta* las consecuencias. En la cancelación segura, ni siquiera llega a saber que fue interrumpido, mientras que en la insegura, descubre *a posteriori* que sus planes fueron abortados. Esta asimetría de información es precisamente la que permite agilizar los "reflejos". El orquestador no pide permiso, actúa.

La elección entre un mecanismo y otro no es una decisión del LLM; es una *función de orquestación* basada en su rastreo del estado del ciclo. Esta separación es lo que permite que un evento urgente sea a la vez *inmediato* y *eficiente* cuando la situación lo permite.


### La herramienta de notificación de cancelación

El mecanismo de *cancelación insegura* requiere una forma elegante de comunicar la interrupción al LLM sin salirse del protocolo de herramientas. La solución es inyectar una herramienta ficticia: `haveCurrentOperationsBeenCancelled`.

Esta herramienta no es un comando del sistema (como un `emergency_stop`), sino una *consulta que simulamos que el propio LLM ha realizado*. El orquestador la inyecta en el historial y proporciona inmediatamente la respuesta: `true`. De este modo, el agente recibe una notificación en su propio lenguaje, y descubre que las operaciones que estaba realizando han sido canceladas.

Sin embargo, esta notificación por sí sola podría llevar a un bucle patológico: si el LLM solo sabe que lo cancelaron, pero no el porqué, podría decidir reintentar la misma tarea, colisionando con la siguiente interrupción. Para evitarlo, el orquestdor *inyecta el evento urgente justo después de esta notificación*. Así, el agente ve un flujo coherente: *"Mis operaciones fueron canceladas… porque ha ocurrido ESTO."* Esta secuencia le permite reevaluar su plan anterior a la luz de la nueva emergencia y decidir racionalmente si reintentarlo o pasar a la nueva tarea.

Esta herramienta es el pegamento que mantiene la coherencia narrativa en las interrupciones más disruptivas. Convierte un corte brusco en una transición gestionada, permitiendo que el LLM mantenga su sentido de la continuidad incluso cuando el orquestador ha tenido que tomar el control de manera abrupta.

### El protocolo de interrupción para cancelar un pensamiento

Con la taxonomía definida y los mecanismos de interrupción explicados, podemos ahora describir el protocolo concreto que el el orquestador, *el sistema nervioso autónomo*, ejecuta cada vez que recibe un estímulo del entorno. Este no es un simple *if-else*; es un algoritmo de gestión de estado que mantiene la coherencia entre el mundo asíncrono y el razonamiento síncrono del LLM.

Flujo de decisión y acción del orquestador:

1.  *Recepción y clasificación.* Al llegar un evento, el orquestador lo etiqueta como **normal**, **prioritario** o **urgente**, según reglas preconfiguradas o políticas de la aplicación. Esta clasificación se basa en la taxonomía de urgencia, independientemente de la naturaleza del evento (discreto, agregable, etc.) que ya fue procesada en la capa fisiológica.

2.  *Evaluación del ciclo actual.* El orquestador consulta su estado interno: *¿Se ha ejecutado ya alguna herramienta con efectos secundarios en este ciclo?* La respuesta determina si el ciclo es *"seguro"* para una cancelación transparente. Esta información la obtiene rastreando cada invocación de herramienta durante el ciclo en curso.

3.  *Aplicación de la política y selección del mecanismo*:
    *   Si el evento es **normal**, se añade a una cola de agregación para su procesamiento normal. El orquestador lo mantendrá en espera, posiblemente aplicando técnicas de empaquetado cuando llegue el momento de inyectarlo.
    *   Si el evento es **prioritario**:
        *   Si el ciclo es *seguro*, no han habido escrituras, se desencadena una *cancelación segura*. El orquestador corta el flujo de tokens al LLM, sanitiza el historial eliminando el turno en curso y reintroduce el evento prioritario en un nuevo ciclo.
        *   Si el ciclo *no es seguro*, ya han habido escrituras, el evento se inyecta en la cola, pero no al final, si no como proximo evento a procesar, y espera al final del ciclo. El orquestador prioriza la integridad del estado sobre la inmediatez.
    *   Si el evento es **urgente**:
        *   Si el ciclo es *seguro*, se aplica una *cancelación segura*, es la opción más eficiente y limpia.
        *   Si el ciclo *no es seguro*, se aplica una *cancelación insegura*. El orquesatdor aborta la petición, inyecta la herramienta `haveCurrentOperationsBeenCancelled` con valor `true`, inyecta inmediatamente el evento urgente a continuación, y reinicia el ciclo.
4.  **Ejecución y limpieza.** Dependiendo del mecanismo seleccionado, el orquestador manipula el historial, gestiona las colas de eventos y, en el caso de la cancelación insegura, asegura que la secuencia de notificación y evento nuevo sea atómica dentro del historial. En todos los casos, el orquestador mantiene un registro de los eventos procesados para evitar bucles o reintentos infinitos.

Este protocolo hace explícito el compromiso entre capacidad de respuesta e integridad del estado. Toda cancelación tiene un coste inmediato: los tokens consumidos por el ciclo interrumpido se pierden. Sin embargo, una cancelación insegura añade capas de complejidad: el coste adicional de los tokens de notificación, la obligación de gestionar un estado potencialmente inconsistente y la posible necesidad de compensaciones futuras. Por el contrario, una cancelación segura es óptima en simplicidad: el sistema retorna a un estado conocido sin requerir ninguna intervención del LLM. La inteligencia del orquestador reside, por tanto, en maximizar las oportunidades para una cancelación segura, eligiendo ese camino siempre que la política (evento prioritario o urgente) y el estado (ciclo seguro) lo permitan.

El orquestador se convierte así en un verdadero *sistema de control de ejecución*. No es un mensajero, es un regulador que decide "rapidamente" si el LLM debe seguir pensando o si debe ser interrumpido. Es, en definitiva, la implementación de un *sistema nervioso autónomo artificial* capaz de gestionar la agenda cognitiva del agente.

### De mensajero a orquestador

Este protocolo transforma al cliente de una librería de comunicación en un *controlador de estado con responsabilidades críticas*. El orquestador, actuando como un *sistema nervioso autónomo* asume funciones que van mucho más allá del simple encaminamiento de mensajes, así:

*   *Mantiene la cola priorizada de eventos pendientes.* No es una cola FIFO simple; es una estructura que respeta la taxonomía de urgencia, preserva el orden temporal dentro de cada categoría y aplica las políticas de agregación y fusión definidas por la naturaleza de cada sensor.

*   *Rastrea con precisión el estado de ejecución del ciclo.* El orquestador debe saber, en cada momento, si el LLM ha ejecutado ya herramientas con efectos secundarios, cuántas lleva, y cuál es la última acción confirmada. Esta información es la que permite decidir entre cancelación segura e insegura.

*   *Manipula el historial de conversación con precisión.* Inserta o elimina turnos completos, inyecta herramientas ficticias, sanitizar el contexto sin romper la coherencia narrativa. Todo ello manteniendo la ilusión para el LLM de que la conversación fluye de forma natural.

*   *Toma decisiones en milisegundos que equilibran urgencia e integridad.* Cada evento entrante dispara un microciclo de evaluación ¿es normal, prioritario o urgente? ¿Es seguro cancelar? ¿Aplicamos cancelación limpia o notificamos la interrupción? Estas decisiones se toman por el orquestador, sin consultar al LLM, minimizando retrasos harian que la interrupción llegase demasiado tarde.

*   *Empaqueta inteligentemente los eventos acumulados.* Cuando el ciclo termina y toca inyectar los eventos normales o aquellos prioritarios que no pudieron adelantarse, el orquestador no hace un volcado bruto. Aplica técnicas de compresión semántica, como preservar los eventos más antiguos y los más recientes de una ráfaga, resumiendo el resto cuantitativamente, para que el LLM reciba un bloque de información cohesivo sin que su ventana de contexto se vea desbordada. Este "empaquetado sensorial" es la siguiente frontera en la gestión de la percepción, y apunta a resolver el problema de la inundación sin renunciar a la riqueza informativa.

Este es el "sistema nervioso" que estamos diseñando. Un orquestador de estado que media entre un mundo asíncrono y caótico y un razonamiento síncrono y pesado. Ya no estamos ante un chat que responde a comandos. Hemos diseñado los cimientos de un sistema reactivo autónomo, capaz de tomar el control de su propia percepción, priorizar el flujo del caos y, cuando la situación lo exige, abortar su propio proceso cognitivo para garantizar que la respuesta más crítica siempre llegue a tiempo.

El siguiente paso sería explorar cómo dar robustez a esas herramientas que se quedan a medias, introduciendo mecanismos de compensación y transacciones. Pero esa, como suele decirse, será otra historia.


