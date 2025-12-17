---
layout: post
title: "Del libro de Hartnell al MCP, 40 años de IA en la estantería de un desarrollador"
date: 2025-12-17
canonical_url: "https://blog.gvsig.org/2025/12/17/del-libro-de-hartnell-al-mcp-40-anos-de-ia-en-la-estanteria-de-un-desarrollador/"
---  
## El polvo del estante

Hace unas semanas, mientras reorganizaba la estantería del estudio, me tropecé con un libro que no veía la luz desde hacía décadas. *"Inteligencia Artificial: Conceptos y Programas" de Tim Hartnell, 1984*. La cubierta estaba gastada y las páginas despedían ese olor característico a papel viejo que te transporta instantáneamente al pasado.

Aquí estaba yo leyendo las mismas páginas que me fascinaron a los 18 años. Hartnell explicaba la IA mediante bloques lógicos y reglas `if-then` en BASIC, prometiendo máquinas que algún día entenderían nuestro mundo.

Cuatro décadas después, esa promesa sigue viva, pero las herramientas han cambiado radicalmente. Hartnell usaba reglas explícitas para un "mundo de bloques", yo ahora implemento herramientas contextuales que permiten a un LLM ver el mapa activo en gvSIG desktop y ejecutar consultas SQL sobre datos reales.

El polvo del estante era el mismo, pero mi mirada había cambiado. Ya no era la de aquel adolescente que soñaba con sistemas que piensan, sino la de un desarrollador que construye sistemas útiles. La curiosidad seguía intacta, pero ahora estaba templada por la experiencia de saber lo que cuesta hacer que las cosas funcionen de verdad.

Este viaje desde Hartnell hasta el MCP es la crónica de cómo un desarrollador mantuvo viva una pregunta fundamental a través de lenguajes, frameworks y paradigmas que surgieron y cayeron con el paso del tiempo. La pregunta sigue siendo la misma: ¿cómo hacemos que las máquinas no solo calculen, sino que comprendan?

## Los albores

Aquel libro de Hartnell llegó a mis manos en una época en que la inteligencia artificial no era una API REST, sino un territorio por explorar con las herramientas que tenías a mano. En mi caso, esas herramientas eran un Commodore 64 y luego un Amiga 2000. Aprendí lo que significaba hablar directamente con la máquina en código máquina.

Mi primer compilador de C lo implementé sobre ese C64, migrándolo después al Amiga. Pero donde realmente encontré el lenguaje que resonaba con mi forma de pensar fue en Prolog. Aquella idea de definir reglas lógicas y dejar que el motor de inferencia encontrara soluciones me pareció lo más cercano a la promesa de Hartnell: máquinas que no solo calculaban, sino que razonaban.

Fue entonces cuando empecé un proyecto personal que me obsesionó durante años. Un sistema que no solo analizara gramática, sino que intentara modelar cómo se forman los conceptos. El sistema aprendía de un diccionario con apenas 2000 vocables para construir una red de conocimiento. Tenía un motor de inferencia que le permitía generar nuevas hipótesis sobre el conocimiento adquirido para luego contrastarlas con el usuario... me gustaba pensar que soñaba.

Mirando hacia atrás, veo que aquel sistema era el antecesor directo de lo que ahora llamamos IA neuro-simbólica. Usaba reglas de Prolog para el núcleo lógico. Los sistemas modernos usan LLMs para la percepción y componentes simbólicos para el razonamiento. El patrón era el mismo. Separar la comprensión estructural de la mera manipulación de símbolos.

Hartnell hablaba de mundos de bloques con reglas simples. Yo intentaba construir un mundo de conceptos con reglas complejas. Los recursos eran limitados. La memoria se medía en kilobytes. El procesamiento en segundos por inferencia. Pero el objetivo no era imitar el lenguaje, sino capturar el significado.

## El intermedio

Los años que separaron aquellos experimentos con Prolog del actual renacer de la IA fueron, sobre todo, años de construcción. La inteligencia artificial pasó de ser un campo de investigación prometedor a convertirse en un término que evocaba escepticismo entre los desarrolladores prácticos. Mientras tanto, yo seguía construyendo software que la gente usaba.

Mi transición de Unix a Java y Swing no fue una elección casual. Después de años trabajando en C, descubrí en Java un equilibrio entre el control de bajo nivel y la productividad que necesitaba para aplicaciones de escritorio complejas. gvSIG Desktop se convirtió en mi canvas durante casi dos décadas, un proyecto donde la arquitectura y la estabilidad a largo plazo importaban más que las tecnologías de moda.

Durante esos años, la IA nunca desapareció por completo de mi radar, pero se convirtió en un interés dormido. Libros como el de Russell y Norvig se unieron al de Hartnell, esta vez en digital, mientras yo me enfrentaba a problemas más inmediatos. Diseñar sistemas de control de versiones para datos GIS. Optimizar renderizados de mapas. Coordinar integraciones entre componentes desarrollados por equipos distribuidos...

Visto con perspectiva, aquellos desafíos de gestión de datos y sistemas distribuidos eran el entrenamiento que realmente necesitaba. Diseñar la arquitectura de VCSGis (un sistema de control de versiones para datos geoespaciales) me enseñó a pensar en escalabilidad, conflicto y consistencia. Coordinar desarrollos entre múltiples empresas me obligó a definir interfaces claras y protocolos robustos.

Eran lecciones de arquitectura de sistemas que resultarían cruciales cuando, años después, tuviera que diseñar un servidor MCP que integrara un LLM con las herramientas internas de gvSIG desktop. Sin saberlo, estaba construyendo el músculo que necesitaría para el renacer que estaba por llegar.

Mientras la IA pasaba por su invierno, yo seguía trabajando en lo que mejor sé hacer. Tomar problemas complejos y descomponerlos en componentes manejables que funcionen de forma fiable. No era el trabajo glamuroso que había soñado a los 18 años, pero era un trabajo real, con usuarios reales que dependían de mis decisiones técnicas.


## El renacer

Para mí, el verdadero cambio de paradigma no llegó con los grandes titulares, sino hacia 2024. Los LLMs habían dejado de ser un tema académico para convertirse en una herramienta que cualquier desarrollador podía probar. Y yo, como aquel adolescente que descubrió a Hartnell, sentí que era el momento de volver a ensuciarme las manos.

Mi primera aproximación fue puramente práctica. ¿Podría un LLM entender lo que ocurre dentro de gvSIG desktop y ayudar a los usuarios? El prototipo inicial en Jython era rudimentario, un chat que conversaba con Gemini y generaba respuestas en JSON. Pero funcionaba. Por primera vez en años, estaba construyendo algo que resonaba con aquel proyecto de red de conocimiento de mis tiempos de Prolog.

Implementar un servidor MCP en Java dentro de gvSIG desktop fue la materialización de un principio arquitectónico que había estado desarrollando durante décadas. Desacoplar el núcleo de negocio de los mecanismos de comunicación. Donde Hartnell usaba reglas explícitas para un mundo de bloques limitado, yo ahora exponía herramientas contextuales que permitían a un LLM operar sobre un mundo real de datos geoespaciales.

Aquellas ideas sobre cómo estructuramos el conocimiento encontraban su expresión práctica en un sistema donde un LLM interactuaba con herramientas específicas de gvSIG desktop. No importaba si realmente 'pensaba'. Lo importante era que el sistema se comportaba como si entendiera.

Cuando empecé a ejecutar consultas complejas en lenguaje natural y ver los resultados aparecer en su mapa de gvSIG desktop, supe que valía la pena haber guardado aquel libro de Hartnell. No por nostalgia, sino porque algunas preguntas merecen ser respondidas a lo largo de toda una vida.

## Mismo estante, nuevas herramientas

Hoy, el libro de Hartnell sigue en su sitio, compartiendo estante con impresos técnicos de Django, guías de React y mis propios cuadernos de notas sobre arquitectura MCP. El polvo se sigue acumulando, pero ahora lo veo de otra manera. No como signo de abandono, sino como testimonio de una curiosidad que ha sabido evolucionar sin perder su esencia.

Las herramientas han cambiado radicalmente. Antes tenía que usar Prolog o implementar mis propios motores de inferencia. Ahora integro LLMs a través de protocolos estandarizados. Antes luchaba con kilobytes de memoria, ahora diseño sistemas que manejan gigabytes de datos geoespaciales. Pero el desafío fundamental sigue siendo el mismo. Cerrar la brecha entre la intención humana y la ejecución mecánica.

En estas cuatro décadas he aprendido que la auténtica continuidad no está en las tecnologías específicas, sino en la forma de abordar los problemas. Aquella mente curiosa de que me llevó a la biblioteca tras leer Fundación es la misma que me impulsa hoy a analizar críticamente las limitaciones de los LLMs y a tratar de diseñar arquitecturas híbridas que compensen sus carencias.

Cuando alguien me pregunta por dónde empezar con la IA, mi respuesta siempre es la misma. No busques el framework más moderno o el modelo más grande. Busca un problema real que te apasione y explora cómo estas nuevas herramientas pueden ayudarte a resolverlo. En mi caso, fue la integración con gvSIG desktop; en el tuyo, podría ser cualquier otra cosa.

Si tienes en tu estante algún libro que marcó tu camino, te sugiero que le quites el polvo. Revisita esas ideas iniciales con la experiencia que has acumulado. Quizás descubras, como yo, que las mejores herramientas no son las más nuevas, sino las que te permiten conectar quien fuiste con quien eres capaz de ser.

El polvo del estante es el mismo. La curiosidad, afortunadamente, no.



