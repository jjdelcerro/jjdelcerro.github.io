---
layout: post
title: "El Desarrollador y su compañero. Cómo la IA me ayudó a construir el asistente de gvSIG desktop desde el primer momento"
date: 2025-09-25
canonical_url: "https://blog.gvsig.org/2025/09/25/el-desarrollador-y-su-companero-como-la-ia-me-ayudo-a-construir-el-asistente-de-gvsig-desktop-desde-el-primer-momento/"
---

Hola a todos,

Si habéis estado siguiendo esta serie de artículos, ya conocéis el **qué** y el **porqué**. El viaje desde un chat simple en gvSIG desktop hasta un asistente contextual inteligente gracias al protocolo MCP. Pero hoy quiero hablaros del **cómo**. Y no me refiero a las librerías o el código, sino a algo más fundamental, **la forma en que trabajé para hacerlo realidad**.

La respuesta es simple, aunque no simplona: no lo hice solo. Pero mi colaboración con la IA no empezó con un plan de proyecto, sino con una historia de descubrimiento que lo cambió todo.

## "El pueblo de los inicios".

A principios de año, los LLMs eran para mí un juguete fascinante, pero totalmente desconectado de mi trabajo diario. La curiosidad me asaltó con la llegada de modelos más avanzados, y mi primer proyecto "serio" (por decir algo) con ellos no tuvo nada que ver con gvSIG desktop. Fue un **experimento narrativo personal**. Durante un par de fines de semana intenté usar la IA para continuar la historia del anime a partir de sus documentos originales.

El proceso fue un curso intensivo y práctico. Descubrí que la IA era increíblemente potente para analizar documentos, estructurar información (generando fichas de personajes) y co-crear contenido. También descubrí sus límites cuando la parte visual no funcionó. Aunque el experimento no cumplió su objetivo, el aprendizaje fue inmenso. Había descubierto una dinámica de trabajo, un **diálogo de prueba, refinamiento y corrección**.

Y en un momento dado llegó la pregunta. _Si puede hacer todo esto con un texto de ficción ¿qué no podría hacer con una base de datos dentro de gvSIG desktop?"_.

Con esa idea en mente, mi primer impulso fue buscar un camino estructurado. Decidí que, para _"ir más rápido"_, lo mejor sería buscar formación. Revisé plataformas, analicé temarios y me encontré con una realidad frustrante. Los cursos, o se centraban en una "ingeniería de prompts" demasiado básica, 
o proponían proyectos de juguete, como implementar una tienda online o una app de tareas pendientes, que me recordaban a aquellos ejercicios académicos que todos hacíamos en las practicas. Reconozco que para un programador junior pueden ser un buen punto de partida, pero para mí, me parecían demasido simples, y no abordaban la complejidad de integrar IA en aplicaciones reales, o como usarla para ayudarme en trabajos de mas embergadura.

Pero también una revelación. Si los cursos no me daban la solución, tendría que encontrarla yo mismo, como tantas otras veces. Y el método ya lo había descubierto: la solución no estaba en un temario, sino en la **experimentación directa**.

Decidí que mi herramienta de aprendizaje sería la propia IA, aplicando la misma metodología de diálogo que había descubierto en mi proyecto personal.

## Más que un chat, una conversación

Así que, con esa decisión tomada, empecé a aplicar esta nueva forma de trabajar al prototipo de gvSIG que os conté en el primer artículo. En lugar de sumergirme en la documentación de la API de Gemini, mi primera acción fue abrir un chat y empezar a conversar, aplicando el mismo principio de diálogo que tan bien me había funcionado.

Esa forma de trabajar se convirtió en el pilar de todo el proyecto. Como habéis leído, el camino desde aquel prototipo hasta la solución final fue largo: implicó una reescritura completa a Java y chocar de frente contra el muro de los costes de las APIs. Sin embargo, lo que no cambió en todo ese viaje fue la dinámica de usar la IA como un **compañero de charlas técnicas** para validar ideas.

El ejemplo más claro de esta colaboración llegó mucho más tarde, cuando tuve que abordar la implementación del servidor MCP. Después de pedirle que analizara por un lado la especificación del protocolo y por otro mi propia librería para crear servidores HTTP, llegó el momento clave de la validación.


> **(Nota: Los diálogos que veréis son recreaciones didácticas de nuestras conversaciones. Para mayor claridad, he condensado y sintetizado el flujo real, eliminando pasos intermedios (como las peticiones explícitas para leer ficheros con wget o analizar directorios) y fusionando varias interacciones técnicas en un único ejemplo representativo. El objetivo es ilustrar el método de trabajo, no transcribir literalmente el log.**
> 
> **Yo:** "Oye, he leído esto sobre cómo funcionan los LLMs, ¿lo he entendido bien?"
>
> **IA:** "[...] un servidor MCP (Model Context Protocol) es una aplicación que expone herramientas y recursos a Gemini CLI..."
>
> **Yo:** "Por lo que he entendido, en el documento habla de como configurar un cliente de MCP en gemini cli ¿correcto?" 
>
> **IA:** "Correcto. El documento detalla cómo configurar Gemini CLI para que se conecte y utilice servidores MCP..."

Aquí fue donde descubrí el verdadero potencial. No se trataba sólo de que me diera código. Se trataba de que **validara mis ideas**. Diseñaba una versión inicial de un prompt para el _system prompt_ y se lo pasaba: 

_"¿Crees que esto es claro? ¿Le faltará algo al modelo para entenderlo?"_.

La IA se convirtió, desde el minuto uno, en mi **primer revisor de diseño**. Juntos, iteramos hasta dar con los prompts robustos y precisos que necesitaba el prototipo.

Fue una fase de **aprendizaje acelerado y co-creación**. No era yo programando con una herramienta, éramos dos dando forma a una idea.

## Escalando la confianza

Cuando decidí dar el salto a Java, que conté en el segundo artículo, no tuve que aprender a colaborar de nuevo. Sólo tenía que **aplicar la misma fórmula a una escala mayor**. Es de esta fase más compleja, la de la reescritura a Java y la posterior implementación del servidor MCP, de donde provienen la mayoría de los diálogos que se muestran, ya que lamentablemente no conservé registros de las conversaciones iniciales del prototipo.

El flujo ya estaba claro y se había convertido en un **bucle natural**:

1. **Yo definía la arquitectura**: Pensaba en las clases necesarias (SQLServiceAction, IteratorFormatter...), sus interfaces y cómo debían interactuar.

2. **Iniciaba un diálogo de validación**: Le exponía el diseño. _"Mira, quiero hacer esto así, ¿ves algún problema? ¿Se te ocurre una forma más eficiente?"_.

3. **La IA implementaba**: Una vez el diseño estaba claro, le pedía que generara el código para clases concretas y bien definidas.

    > **Yo:** "Necesito una clase que formatee un Iterator de claves primarias en una String para cláusulas SQL IN. Debe manejarse el truncamiento si la lista es muy larga. ¿Puedes generarla?"  
    > **IA:** "Claro. Te propongo una clase con un método estático `format()` que reciba el Iterator y un límite máximo. Devolverá una cadena con el formato '101', '102', '105'."  
    > **Yo:** "Vale, pero si la lista está vacía, que devuelva '(NULL)' para evitar errores en el SQL. ¿Puedes ajustarlo?"  
    >  
    > Tras un par de iteraciones como esta, y de comprobar que compilaba, la clase estaba lista.

4. **Yo revisaba y depuraba**: Probaba, compilaba y, sobre todo, **le pedía explicaciones**. 

   _"¿Por qué has hecho este cambio? Explícame esta parte"_.

   Muchas veces se equivocaba, y era mi labor detectarlo y guiarla para corregirlo.

Este ciclo **Diseño -> Validación -> Implementación -> Revisión** se repetía constantemente. No era una línea recta, era una espiral donde cada vuelta nos acercaba más a un código sólido y funcional. La velocidad era asombrosa porque **los posibles errores se atrapaban en las fases de diseño y validación**, no al final del proceso.

### El servidor MCP, la prueba de fuego

Llegados al punto que relaté en el cuarto artículo, con el muro de los costes derribado por `gemini-cli` y el protocolo MCP, la forma de trabajar ya la había adoptado como natural. No empecé pidiendo código, sino estableciendo el contexto y la dirección:

> **Yo:** 'Vamos a implementar el servidor MCP. Para ello, primero necesito que entiendas a fondo dos cosas: la especificación del protocolo, que te he proporcionado antes, y mi propia librería para crear servidores HTTP. ¿Puedes analizar las clases en esta carpeta y explicarme cómo encajarían ambas piezas?'
>
> **IA:** 'Entendido. He analizado tu librería. La arquitectura basada en `Command` y `CommandFactory` es una base excelente para implementar los endpoints `tools/list` y `tools/call` que requiere el protocolo MCP...'

A partir de ese punto de partida, el proceso para implementar cada pieza, que ya era familiar, fue idéntico:

1.  **Usé la IA como tutor:** “Explícame el protocolo MCP a fondo, sin capas de abstracción. ¿Qué mensajes se envían? ¿En qué formato?".

2.  **Diseñé y validé con ella:** Antes de escribir una línea de código, diseñé la estructura del servidor y se la pasé a mi compañero para una revisión rápida. “¿Ves coherente este enfoque para implementar las herramientas `show_table` o `get_viewport`?”.

    > **IA:** "Los comandos que faltarían por implementar para dar un soporte más completo son: `context/get`, `context/set`..."
    >
    > **Yo:** “No he encontrado ninguna referencia a comandos genéricos tipo ‘context/get'."
    >
    > **IA:** “Tienes toda la razón. Mis disculpas por la confusión. He re-leído la especificación y mi afirmación anterior fue una interpretación incorrecta.”

    Y este no fue un caso único. A lo largo de esa misma sesión de diseño, la IA cometió errores conceptuales similares en repetidas ocasiones. Por ejemplo, afirmó con seguridad la existencia de una sección llamada "Standard Tools" en la documentación que, tras mi insistencia y una doble verificación, resultó no existir. En otra ocasión, malinterpretó la relevancia de una convención de nomenclatura hasta que se le guio explícitamente.

    Este patrón de errores es la prueba más clara de la tesis de este artículo: la IA es un compañero para la **exploración de ideas** y un generador de primeros borradores increíblemente rápido, pero **no es una fuente de verdad absoluta**. La supervisión, el escepticismo y el conocimiento del dominio por parte del desarrollador no son opcionales, son el núcleo del proceso.

3.  **Implementamos juntos:** Con el diseño validado, nos pusimos manos a la obra. Yo orquestaba, y ella codificaba los detalles. Luego yo revisaba, como siempre.

La inversión inicial en Java puro y bien estructurado demostró su valor aquí. Pude reutilizar lógica de negocio ya probada y concentrarme en adaptarla al estándar MCP, con la IA acelerando la parte tediosa. Fue la culminación de todo el trabajo previo.

## Verdades incómodas y ventajas claras

Quiero ser muy claro: esto **no es magia**. Es **colaboración**, y como tal, requiere esfuerzo y criterio.

* **La IA es un compañero brillante, pero no es el piloto**. Se equivoca. A menudo. Su fuerza está en la implementación concreta, las explicaciones y la validación inicial. La arquitectura, la visión de conjunto y la revisión final **dependen al 100% de ti**.

* **La clave no es que codifique, sino el diálogo**. El poder real está en el **bucle de feedback constante**. Que yo valide su código es obvio. Que ella valide mis diseños y mis prompts es un multiplicador de productividad muy grande que evita callejones sin salida.

* **El resultado es una velocidad muy difícil de alcanzar solo**. Conseguimos una velocidad de desarrollo que me hubiera parecido ciencia ficción hace un año, pero con la solidez que da tener un segundo par de ojos (electrónicos, pero ojos al fin) revisando cada paso.

## Esto es solo el principio

Esta no es "la metodología correcta". Es la **forma que yo encontré** para colaborar de forma efectiva con una nueva herramienta. Os la cuento no para que la copiéis, sino para que **experimentéis y encontréis la vuestra**.

El futuro del desarrollo no consiste en que la IA nos reemplace. Consiste en que nosotros, los desarrolladores, aprendamos a dirigirla, a colaborar con ella y a amplificar nuestra capacidad para crear cosas mejores, más rápido.

Un saludo

_Y como apunte final, el propio proceso de dar forma a estas reflexiones ha sido, a su vez, un ejercicio de colaboración. Cada idea ha sido expuesta, validada y refinada a través del diálogo, en un bucle de feedback que ha pulido no solo el código del proyecto, sino también la historia que lo cuenta_.
