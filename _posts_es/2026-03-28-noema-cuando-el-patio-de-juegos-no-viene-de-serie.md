---
layout: post
title: "Noema: cuando el patio de juegos no viene de serie"
date: 2026-03-28
canonical_url: "https://jjdelcerro.github.io/es/blog/noema-cuando-el-patio-de-juegos-no-viene-de-serie/"
---  
Hola,
llevo meses escribiendo sobre arquitecturas de agentes. Sobre cómo un agente debería percibir su entorno, gestionar sus sensores, priorizar eventos, y recordar no como una lista de hechos sino como una historia con intencionalidad y trazabilidad. Ha sido un viaje conceptual en su mayor parte honesto: cada artículo describía ideas que estaba explorando, no sistemas que ya funcionaban.

Pero había algo que no contaba. Que mientras escribía esos artículos, también estaba intentando construir el laboratorio donde probarlos.

Este artículo es sobre ese laboratorio. Se llama Noema.

Noema no es un producto. No es una herramienta lista para que cualquiera la use. Es mi *patio de juegos de IA*. Un agente conversacional autónomo que he ido construyendo durante los últimos meses para validar si las ideas que publicaba aguantaban el paso a la realidad. Memoria narrativa trazable, sensores con filtrado inteligente, control voluntario de la percepción. Todo eso que sonaba tan bonito en los artículos, tenía que ver si se podía articular en un agente.

Y como suele ocurrir cuando bajas de la teoría al código, el camino no fue el que esperaba.

El propósito de este artículo no es contar cómo lo hice. Eso se puede mirar en los fuentes y en el [README](https://github.com/jjdelcerro/io.github.jjdelcerro.noema) del repositorio. Tampoco es un tutorial paso a paso. Es una *presentación honesta* de lo que encontré cuando intenté convertir mis propias ideas en algo que se pudiera ejecutar, probar y romper.

Porque **Noema está roto en muchos sitios**. Lo digo explícitamente en el repositorio. Pero hay cosas que ya funcionan. Y lo que funciona son precisamente parte de las piezas que más me interesa ir probando.

Así que esto es lo que pasa cuando dejas de escribir sobre un sistema y te pones a construirlo.

## Un laboratorio que no viene de serie

Todo empezó de forma engañosamente sencilla. Quería validar la idea central del sistema de memoria narrativa: que un LLM comprende mejor su historial si se le presenta como una crónica fluida, con citas a los turnos originales, que si se le pasa un resumen convencional.

Para probar eso no necesitaba mucho, en teoría. Un bucle que leyese líneas de consola, las procesase, y de vez en cuando compactase la conversación en un "Punto de Guardado". Unas horas de código y listo.

Lo que no calculé es que para validar si la compactación narrativa *funciona de verdad*, no valen dos inputs de prueba. Necesitas conversaciones reales, densas, de varios mensajes, con cambios de tema, retomando hilos de hace una hora. Las preguntas triviales no estresan el sistema. Y esas conversaciones largas, con una interfaz de consola básica, eran un suplicio. Cada error, cada fallo en la compactación, tiraba por tierra una sesión de prueba de varias horas. Volver a empezar desde cero, una y otra vez.

Así que empecé a añadir funcionalidad de configuración. Guardar el estado de la sesión entre reinicios. Poder ajustar parámetros sin tocar el código. Pequeñas cosas al principio. Pero la consola seguía siendo un obstáculo, sobre todo en la parte de configuración.

Llegó un momento en que la interfaz de consola se me quedó corta y me dije que tocaba pasar a una GUI. Días enteros para montar la parte gráfica de la configuración, el diálogo de inicio, el sistema de selección de modelos. Nada de eso tenía que ver con probar la memoria narrativa. Era pura fontanería. Pero sin ella, las pruebas seguían siendo un caos.

Cuando por fin tenía algo usable, empecé a darle capacidades reales al agente. Acceso al sistema de ficheros. Acceso a mis artículos y borradores. Y en cuanto me descuidé, el agente modificó algo que no debía. Perdí trabajo. Así que me detuve, estudié el problema, e implementé un mecanismo de control de versiones para cada escritura. Cada vez que el agente escribe en disco, queda un commit en el histórico. No estaba en el plan original. Pero después de perder ese trabajo, no podía seguir sin él.

Este patrón se repitió varias veces. Cada problema real que aparecía en las pruebas generaba una necesidad de infraestructura que no estaba en el diseño inicial. La GUI, el sistema de configuración, el versionado, el scheduler, el control de acceso al sistema de ficheros. Capas y capas de fontanería que no aparecen en los artículos sobre arquitectura de agentes, pero sin las cuales el experimento no puede ejecutarse.

Lo curioso es que esa fontanería no es un añadido accidental. Acabó siendo parte de la definición de Noema. Un agente que puede corromper tus archivos necesita un sistema de commits automáticos. Un agente con el que quieres conversar largamente necesita persistencia de estado. Un agente que accede a tus documentos necesita controles de acceso estrictos. Lo que empezó como una molestia se convirtió en un requisito arquitectónico.

Al final, el laboratorio no vino de serie. Tuve que construirlo pieza a pieza, dejando que cada fallo me enseñara qué faltaba. Y lo que resultó no es solo el sistema que quería probar, sino también toda la infraestructura que lo hace posible.

## Lo que Noema implementa (y lo que no)

Así que después de algunas semanas de fontanería, de añadir GUI, persistencia, control de versiones y capas de seguridad, he acabado con un sistema sobre el que por fin parece que puedo probar las ideas que me habían llevado hasta allí. Un laboratorio con sus andamios puestos, listo para ser sometido a conversaciones reales.

Noema implementa, en su estado actual, tres bloques conceptuales que ya había explorado en artículos anteriores. No son funcionalidades aisladas. Son las piezas que me interesaba validar.

**Memoria narrativa trazable.**
El corazón del sistema es un `MemoryService` que genera lo que llamo "Puntos de Guardado". Este mecanismo, que describí en detalle en "[Diseñando memoria narrativa trazable para agentes conversacionales](https://jjdelcerro.github.io/es/blog/disenando-memoria-narrativa-trazable-para-agentes-conversacionales/)", es lo que permite que Noema mantenga conversaciones que duran semanas sin perder el hilo.

**Percepción proactiva y filtrado sensorial.** 
Implementa la capacidad de reaccionar al entorno sin esperar a que el usuario pregunte. Actúa como el sistema nervioso autónomo del agente: recibe eventos de múltiples fuentes y los procesa antes de que lleguen al LLM.
Este filtrado, que exploré en "[Control proactivo de la percepción en agentes de IA](https://jjdelcerro.github.io/es/blog/como-gestionar-la-observacion-proactiva/)", evita que el agente se ahogue en su propia capacidad de escucha.

**Seguridad y autonomía.**
De la parte de seguridad no reflexioné en ninguno de mis artículos, pero fue haciendose necesaria con forme iba dándole al agente capacidades de interactuar con el entorno. Un agente con capacidad de escribir archivos y ejecutar comandos puede hacer mucho daño si se descuida. Esta capa de seguridad no es un añadido cosmético. Es lo que permite que el agente tenga autonomía real sin que cada interacción sea un riesgo.

**Lo que no funciona.**
Sería deshonesto no decirlo. Hay partes de Noema que están simplemente "dejadas caer", o directamente rotas.

El servicio de documentos no está operativo. El cliente de correo y el bot de Telegram existen en el código pero no se han probado. La ejecución de comandos de shell utilizando `firejail` está pendiente de testing. La búsqueda web depende de una API key que aún no he configurado nunca.

**Noema es un prototipo de investigación, no un producto**. Prefiero publicar un sistema con partes marcadas como "no funciona" que esperar a tenerlo todo pulido. Porque si espero a que esté perfecto, nunca lo publicaría.

Con estas piezas funcionando ya tengo suficiente para ir probando lo que me interesaba. El resto puede esperar.

## Por qué está construido así

Cuando comente sobre Noema a algunos colegas, la primera pregunta solía ser: "¿Por qué Java?" En un mundo donde los prototipos de IA se escriben en Python con tres líneas de LangChain, volver a Swing y a compilaciones estáticas parece una rareza.

La respuesta no es nostalgia. Es consecuencia directa de cómo creció el proyecto.

Noema no fue diseñado de arriba abajo. Creció a *estirones*. Cada nueva idea que quería probar, la memoria narrativa, los sensores, el filtrado de eventos, me obligaba a reestructurar partes profundas del sistema. En un lenguaje dinámico, esos cambios habrían sido una apuesta. En Java, el compilador actuaba como mi red de seguridad. Si después de una refactorización masiva el código compilaba, tenía una garantía razonable de que los contratos básicos seguían intactos.

Esa necesidad de contratos claros se convirtió en un principio de diseño. Cada servicio en Noema está definido por una interfaz. No es burocracia. Es la única forma de mantener la coherencia cuando el sistema lleva ocho semanas cambiando cada fin de semana.

El momento más duro llegó cuando decidí implementar el `SensorsService` como una pieza de primera clase. Había escrito el artículo sobre cancelación y priorización de eventos, y sabía cómo quería que funcionase. Pero llevarlo al código implicó tocar casi todos los servicios existentes. Durante días, el proyecto ni siquiera compilaba. Horas y horas de ajustar dependencias, redefinir responsabilidades, mover lógica de un sitio a otro.

Ese es el coste que no se menciona cuando se habla de "arquitectura limpia". El precio de ir de un sistema que funciona a medias pero compila, a uno mejor diseñado que de momento solo compila. Pero cuando al final todo encajó, la estructura resultante era más sólida que antes. El compilador había sido mi auditor, asegurándose de que ningún contrato se rompiera en el camino.

JavaRCS es otro ejemplo de esta filosofía. Cuando el agente rompió mi primer borrador, busqué soluciones. Lo obvio era usar Git. Pero integrar Git habría significado una dependencia externa, romper la portabilidad del JAR, y añadir un sistema pensado para repositorios compartidos en un contexto de commits automáticos por cada escritura.

Así que escribí mi propio sistema de control de versiones. Un RCS minimalista, implementado íntegramente en Java, que hace commit automático antes de cada modificación del agente. Fueron tres días peleándome con un bug en el parser de diferencias. Pero al final, conseguí que cada escritura de la IA dejara una traza recuperable, sin depender de nada que no estuviera dentro del propio JAR.

El resultado es un Fat JAR. Un único archivo ejecutable que contiene el agente, sus dependencias, las bases de datos embebidas y el sistema de control de versiones. No necesita Docker. No necesita servicios externos. Solo Java 21. Puedo llevarlo a cualquier máquina, ejecutarlo, y tener un agente autónomo con memoria persistente, sensores y capacidad de razonamiento. Esa autonomía era el objetivo.

Hay algo que no quiero ocultar. Noema no lo construí solo. Gemini me acompañó en todo el trayecto. No quiere decir que lo hiciese todo. De hecho, era un peligro dejarle hacer cosas por su cuenta. Solía no entender bien la arquitectura. Cuando algo no debía hacerse de cierta forma porque se acoplaba con otra funcionalidad... discutíamos. A veces durante horas, antes de consensuar y empezar a escribir una línea de código.

Recuerdo los días en que definimos `ReasoningService` y `Session`: un tira y afloja hasta que las responsabilidades quedaron claras. Al final, después de dos días de discusión y varios intentos fallidos, implementé yo mismo el diseño de arriba abajo y se lo mostré: "ves, esto es lo que quería". Solo entonces entendió por qué lo quería así.

El resultado de ese método, sin embargo, era otro que normalmente no se cuenta. Cuando el diseño estaba consensuado y le daba las guías, el código generado *casi siempre iba*. La depuración se hacía sobre el *plano*, no en *obra*. Y aunque repasaba el código, el compilador actuaba como auditor final.

Por eso Noema tiene esta forma. No es el camino más corto. Es el que me permitió construir un sistema complejo, mutarlo sin miedo, y tener la certeza de que cuando decía "funciona", era verdad.

## Por qué lo publico ahora

Durante semanas me dio reparo publicar el repositorio. Un código a medias, con deuda técnica visible, con partes rotas documentadas sin pudor. No parecía "presentable".

Le he dado vueltas y creo que ese reparo estaba equivocado.

Lo que Noema tiene ahora, con todas sus imperfecciones, es algo interesante por si mismo. Una implementación real, funcional en sus partes centrales, de las ideas que describo en los artículos. No es un tutorial. No es un repositorio de ejemplo con datos limpios y un caso de uso simplificado. Es el sistema con el que trabajo, con su complejidad real, su deuda técnica real y sus decisiones de diseño documentadas tal como surgieron.

Si los artículos describen el *por qué* y el *cómo* de estas arquitecturas, Noema es el *esto es lo que encontré cuando intenté construirlo*.

Creo que hay un valor en mostrar los *andamios* antes de que la obra esté terminada. Quizá más que en esperar a que todo esté perfecto, porque en un proyecto de investigación personal esa perfección nunca llega. Siempre hay un servicio más que implementar, un bug que corregir, una optimización que añadir. Si espero a que esté listo, nunca publicaría nada.

Así que ahí está. El código, el README, y los andamios puestos.

Para quien quiera entender la arquitectura en detalle, el punto de entrada es el [README](https://github.com/jjdelcerro/io.github.jjdelcerro.noema) del repositorio. Ahí encontrará también enlaces a los artículos de la serie y una descripción honesta de lo que funciona y lo que no.

El siguiente paso es seguir probando. Ahora que la fontanería parece que aguanta, toca ver si las ideas de verdad funcionan cuando se enfrentan a la realidad. Lo que tengo ya es suficiente para poner a prueba las piezas que más me interesaban: la consolidación narrativa y el filtrado sensorial. El resto de servicios irán madurando según los necesite. Ya tengo el patio de juegos montado, así que a jugar.

