---
layout: post
title: "Cuando la IA programa... el bug que el LLM no ve (parte 3)"
date: 2026-01-11
canonical_url: "https://jjdelcerro.github.io/es/blog/cuando-la-ia-escribe-codigo-el-bug-que-el-llm-no-ve-parte-3/"
--- 
En las dos primeras partes de esta serie (donde analizamos por qué la IA no programa y vimos las pruebas realizadas), nos centramos en el diagnóstico. Ahora voy a pasar a comentar sobre un fallo real en un entorno web.

A finales del año pasado, nos encargaron una tarea aparentemente rutinaria de añadir una funcionalidad en el frontend de aplicación web de la empresa. La solicitud era concreta, implementar una lista de capas seleccionables para la leyenda de un mapa, y el stack, JavaScript con React y django, uno de los más populares y documentados.

Para mi compañero y para mí, este encargo supuso un cambio brusco de contexto. Nuestra zona de confort, y nuestra experiencia en las últimas dos décadas, está en el desarrollo de aplicaciones de escritorio con Java. Nuestro conocimiento de JavaScript es "arqueológico", y de React, no mucho mas alla del nombre. Era el caso ideal para tirar de IA para que nos ayudara con el encargo. Dos desarrolladores senior con conocimientos de arquitectura de software, pero sin la sintaxis específica de JS con React.

Así que tiramos de IA para convertirla en nuestro traductor. Le entregamos el código, le explicamos el objetivo y confiamos en que generaría la solución. Y lo hizo. El código que nos devolvió era limpio, utilizaba los hooks de React de forma aparentemente correcta y se integraba "sin errores" en el código base. Había escrito un componente con `useState`, `useEffect` y `useCallback`. Todo parecía en orden.

Hasta que lo ejecutamos.

El fallo no fue estridente, no había excepciones en consola ni se rompía la aplicación, fue mas bien insidioso y silencioso. A veces la lista no aparecía. Otras los checkboxes no respondían. El estado de la interfaz parecía vivir en una realidad a parte de la lógica del código. La IA había escrito un **bug de cierre obsoleto** (*stale closure*), un error clásico y sutil en la gestión de estado de React.

Este es el punto de partida de este análisis. La herramienta diseñada para suplir nuestra falta de conocimiento específico **generó un problema que ella misma no podía diagnosticar ni resolver**. El código era sintácticamente impecable, pero semánticamente roto. Y eso nos obligó a hacer lo que la IA no puede, entender el sistema, formar un modelo mental de su ejecución y dirigir la corrección.

Lo que sigue no es una queja sobre React, ni una lección de sus hooks. Es un caso de estudio sobre el abismo que separa la generación de "texto probable" de la comprensión de un sistema dinámico. Un abismo que los programadores sabemos cruzar, y que los modelos de lenguaje no pueden.

## El espejismo del código correcto

Antes de empezar la sesión con "Gemini CLI" lanzamos unos cuantos `grep` en la consola para localizar donde podía estar el codigo a tocar y luego les echamos un vistazo con el editor. Necesitábamos saber qué ficheros tocaban el UI de impresión y dónde residía la lógica que debíamos alterar.

Una vez identificados los módulos iniciamos sesión con "Gemini CLI". Empezamos estableciendo el contexto. Le explicamos, a grandes rasgos, qué hace la aplicación a nivel de usuario, cuál era el objetivo funcional de los cambios y le describimos la estructura del proyecto, subproyectos, tecnologías y herramientas de construcción. Para validar que nos habia entendido le pedimos que examinara el código y nos confirmara si su "visión" coincidía con nuestra descripción. Su análisis fue correcto. Identificó los módulos y nos explicó su funcionamiento. Con esa base común le pedimos un plan de acción. Una explicación sin código de qué pasos habría que dar para implementar la lista de capas seleccionables en el dialogo de impresión. El plan tenia buen aspecto y se veía coherente con la arquitectura que habiamos visto. Asi que le dijimos que tirase adelante, "Aplica el plan".

El código generado tenía buena pinta. Desplegamos y probamos. No funcionaba. La interfaz se presentaba correctamente pero la interacción era errática. Le describimos el comportamiento, adjuntamos capturas de pantalla de la aplicación y esperamos su diagnóstico. La IA sugirió cambios, modificaciones menores en la lógica de eventos que nos parecieron sensatas. Le dijimos que las aplicara. Volvimos a desplegar. Volvimos a probar. Seguía sin ir.

Entramos en un bucle de prueba y error. Iteración tras iteración, probabamos, describiamos el problema y el modelo proponía y aplicaba tras explicarnoslos parches sintácticamente válidos que no resolvían el problema de fondo. Decidimos intervenir poniendo puntos de ruptura en el navegador, inspeccionando variables en tiempo de ejecución y comentando los hallazgos con el modelo. Pero seguíamos dando vueltas en círculo. La IA estaba "parcheando síntomas", no arreglando el sistema.

Fue el momento de parar. Nos dimos cuenta de que estábamos delegando el entendimiento del problema en una herramienta que no *entendía* lo que pasaba por debajo.

Cambiamos radicalmente de estrategia. Nosotros no sabíamos React y la IA no sabía depurar su propio código. Asi que teníamos que ser nosotros quienes aprendiéramos lo necesario para auditarla. Le pedimos que dejara de generar código y actuara como documentalista. *"Genera un documento en Markdown explicando las principales funcionalidades y hooks de React que has utilizado en esta solución"*. Nos costo un poco, era muy insistente a la hora de aplicar cambios en el codigo, y demasiado esquematica a la hora de genrar documentación.

Nos pusimos a leer. Buscábamos entender el ciclo de vida y la gestión de memoria. Al leer sobre `useCallback` y ver que usaba *closures*, conceptos que ya conociamos empezaron a encajar con la terminología web. Volvimos al código generado. Allí estaba. Faltaba una dependencia. Un par de variables críticas no estaban en el array de dependencias del `useCallback`.

— *Aquí falta algo* —le comentamos a la IA, señalando la línea específica—. *¿No deberían estar estas variables en las dependencias para que la función vea los cambios?*

La respuesta fue inmediata: *"Efectivamente, tienes razón. Faltan esas dependencias"* y añadió las variables sin que llegasemos a pedirselo.

Desplegamos. Probamos. Funcionó a la primera.

Aún realizamos un par de iteraciones más entre los "tres" para pulir detalles, pero el problema real, el que nos había tenido dando vueltas, no lo resolvió la capacidad generativa del LLM ni el cliente con capacidades agenticas que estabamos usando. Lo resolvió nuestra capacidad para detenernos, construir un modelo mental del funcionamiento y señalar el error lógico que el LLM no podía ver.

### La brecha conceptual

El error del *stale closure* es revelador porque no es un fallo de sintaxis, sino de *semántica operativa*. Para entenderlo, un desarrollador debe construir mentalmente un modelo de ejecución. Una pila de llamadas, un heap de memoria, el flujo del ciclo de eventos y el concepto de *closure*.

La IA, por el contrario, opera en un plano puramente textual y estadístico. Ve `useCallback` y reconoce un patrón. Suele ir seguido de una función y un array. Ha "internalizado" que el array a menudo contiene nombres de variables. Lo que no ha internalizado, porque no puede, es el *porqué* conceptual de ese array. Para la IA, `[layers, legendLayers]` es una secuencia probable de tokens que a menudo aparece después de ciertas palabras clave. Para un programador, esa misma línea es una declaración de dependencias funcionales: "recrea esta función sólo si `layers` o `legendLayers` cambian su referencia, porque su lógica interna depende de sus valores".

Esta es la brecha fundamental:

*   *El dominio de la IA es el texto estático.* Su éxito se mide por la coherencia lingüística y la adherencia a patrones estructurales observados en su entrenamiento. Puede generar una función que *parezca* manejar estado, porque ha visto miles de ejemplos de código que lo hacen.
*   *El dominio del programador es el sistema dinámico.* Nuestro éxito se mide por el comportamiento correcto del programa a lo largo del tiempo. Entendemos que el código no es sólo texto. Es una especificación. Un `useCallback` no es una mera invocación a una API, es una instrucción para React sobre cuándo romper y reconstruir una *closure*.

Cuando la IA omitió `layers` y `legendLayers` del array de dependencias, no cometió un "error" en su propio paradigma. Simplemente, la probabilidad de que esos tokens fueran los cruciales en ese contexto específico no superó su umbral estadístico. No había un modelo de "dependencia causal" contra el cual contrastar su salida.

Nosotros aunque desconocíamos la API específica de React, poseemos un modelo mental transferible al problema actual de la *gestión de estado y el ciclo de vida*. Conceptos como "acoplamiento temporal", "observador de datos" o "invariante de estado" son universales para un programador. 

Al leer la documentación que la IA misma nos generó sobre *closures* y *hooks*, no estábamos aprendiendo React desde cero. Estábamos *mapeando* esos nuevos términos (`useEffect`, `useCallback`) a conceptos que ya controlabamos (subscriptores a eventos, closures o inyección de dependencias). Por eso pudimos diagnosticar el problema. El comportamiento errático del estado era la manifestación de un viejo conocido, una variable capturada en un contexto que ya no estaba sincronizada en el contexto actual. La solución no fue aprender un "truco de React", sino aplicar un *principio universal*. Si una *closure* depende de un dato variable para su lógica, esa dependencia debe ser declarada explícitamente en su contrato de creación.

La IA generó el texto del síntoma. Nosotros aportamos el modelo mental para el diagnóstico. Esa es la colaboración real y la limitación estructural que este caso deja al descubierto.

Y aquí es donde se desmonta el argumento simplista de "eso te lo arregla un Linter". Es cierto que un entorno de desarrollo con análisis estático configurado podría haber marcado esa línea en "amarillo". Pero la IA no nos sugirió instalarlo (no fue entrenada para eso), ni ella misma lo usó para validar su salida (no sabíamos que podíamos o debíamos instruirla para ello). Y lo más importante: para nosotros, sin el modelo mental de por qué ese array es vital, esa hipotética advertencia habría sido ruido visual en un código que no terminábamos de entender. La herramienta te avisa, pero solo el conocimiento te permite entender el aviso. El desconocimiento por nuestra parte de que un lint podía detectar el problema, no invalida la reflexión sobre la incapacidad de la IA para detectar este tipo de problemas que requieren comprensión del modelo en tiempo de ejecución.


### El programador y el aprendiz

El episodio del *stale closure* no demuestra que la IA sea inútil, sino que redefine radicalmente su papel útil. No es un reemplazo del programador, sino una herramienta de productividad con un dominio de aplicación muy específico. La dinámica real que se reveló es la del **programador y el aprendiz**.

Una vez que comprendimos la naturaleza del problema nuestra interacción con la IA cambió por completo. Dejamos de pedirle "arregla esto" para darle instrucciones precisas y acotadas: *"Añade `layers` y `legendLayers` al array de dependencias del `useCallback` en la función `processLayerForPrint`"*. En ese momento, la IA ejecutó su función ideal y actuó como un *traductor de alta velocidad* y un *autocompletado contextual avanzado*. Convertía una intención arquitectónica clara, formulada en lenguaje natural, en la sintaxis correcta específica de React.

Nuestro valor como programadores no estuvo en escribir esa línea de código, sino en *llegar a la conclusión de que esa línea era necesaria*. Ese proceso requirió:

1.  *Aislamiento del problema:* Observar el comportamiento errático y descartar causas hasta identificar que era un problema de estado, no de pintado.
2.  *Formulación de hipótesis:* Sospechar, basándonos en el concepto universal de *closure*, que una función estaba capturando una versión obsoleta de las variables.
3.  *Verificación y diagnóstico:* Analizar el código generado por la IA y el flujo de datos para identificar qué dependencias faltaban en el contrato de la función.
4.  *Definición de la solución:* Traducir el diagnóstico conceptual ("necesita reaccionar a cambios en X e Y") en una instrucción técnica concreta para la IA.

La IA no pudo realizar ninguno de estos cuatro pasos por sí sola. No puede observar el comportamiento de la aplicación en ejecución, no formula hipótesis causales, no razona sobre invariantes de estado y, por tanto, no puede definir soluciones arquitectónicas. Su rol se limitó en la fase final a *implementación sintáctica*.

Este es el desmontaje de la promesa de que la IA "programa". Esta promesa se basa en confundir la implementación sintáctica (que puede acelerar el desarrollo) con la programacion de software (que hoy por hoy no puede reemplazar). No éramos "tontos" por tardar mas de un día en algo que un especialista en React hace en horas. Éramos *programadores aplicando un método universal a un dominio nuevo*, y la IA fue una herramienta dentro de ese método. La especialización, las horas de vuelo en un stack concreto, sigue siendo un multiplicador de productividad insustituible. Y la IA no las eliminas pero permite al especialista operar con una velocidad aún mayor.

La lección para los programadores, sean juniors o seniors, es clara. *Invierte en construir modelos sólidos de cómo funcionan los sistemas, estado, gestión de memoria y arquitectura*. Esa es la base desde la que podrás dirigir a la IA de forma efectiva y detectar cuándo te está dando un código elegante pero roto. Sin esa base, no estás programando con IA, estarás operando una máquina probabilística, y el resultado será tan robusto como un castillo de naipes.

No se trata de rechazar la IA. Hay que *redoblar la apuesta por los fundamentos*. La especialización técnica profunda, la comprensión de los principios atemporales de la computación y la capacidad de depurar y modelar mentalmente sistemas complejos son más valiosas que nunca. Son lo que nos convierte en pilotos efectivos de estas nuevas y poderosas herramientas.

La IA no programa. Genera código. Código que a veces compila, a veces hasta parece elegante. Pero programar es otra cosa. Es entender el sistema vivo, anticipar sus estados futuros, diagnosticar por qué un closure se queda obsoleto aunque la sintaxis sea perfecta. Eso lo hacemos nosotros, los programadores. Y mientras la IA no pueda construir ese modelo mental dinámico, seguirá siendo una herramienta de escritura rápida… no un programador.


