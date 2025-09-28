---
layout: post
title: "La odisea de la distribución: el muro de los costes y los callejones sin salida"
date: 2025-09-18
canonical_url: "https://blog.gvsig.org/2025/09/18/la-odisea-de-la-distribucion-el-muro-de-los-costes-y-los-callejones-sin-salida/"
---

En los artículos anteriores de esta serie, conté cómo construimos un asistente de IA para gvSIG desktop, pasando de un simple chat a un potente conjunto de herramientas contextuales. Teníamos un prototipo que funcionaba y que era genuinamente útil. Pero, como os adelanté, me enfrentaba a un problema que no era de código, sino del mundo real ¿cómo podía compartirlo sin que nadie se arruinara?

Hoy os voy a contar la historia de esa lucha. Una odisea a través de laberintos de precios, hardware prohibitivo y software que casi derrite mi ordenador. Es la historia de todos los callejones sin salida que exploré antes de encontrar una luz al final del túnel.

## La Pesadilla: costes

La euforia del prototipo funcional se topó con la cruda realidad. Cada una de esas respuestas "mágicas" era una llamada a una API, y cada llamada tenía un coste. Esto no era un problema técnico, sino una pesadilla logística. Empecé a evaluar mis opciones, y cada camino me llevaba a un muro.

Mi búsqueda no era solo de algo "gratuito", sino de un modelo predecible y sostenible. Buscaba un plan asequible, con un coste fijo o con limitaciones de uso razonables que evitaran sorpresas. Lo que encontré fue desolador:

*   **No existían planes de bajo coste predecibles.** Casi todos los proveedores operaban con un modelo de "pago por uso".
*   **Los "periodos de prueba gratuitos" eran una trampa.** El plan de Gemini, por ejemplo, te ofrecía un saldo inicial, pero exigía registrar una tarjeta de crédito desde el primer día. Pasado el periodo de prueba, se convertía automáticamente en un sistema de pago por uso. La idea de que un usuario "se emocionara" usando la herramienta y generara una factura descontrolada era un riesgo inasumible, tanto para él como para mí.
*   **La barrera de entrada era psicológica y administrativa.** Pedirle a un usuario que pasara por un proceso de registro, entendiera los modelos de coste y asociara su tarjeta de crédito solo para probar un "experimento" era, sencillamente, un disparate.

Y que no parezca que esta conclusión fue inmediata. Antes de darme por vencido, me lancé a un viaje por las páginas de precios de los principales proveedores: Google, OpenAI, Anthropic, DeepSeek, xAI... Fue un verdadero rompecabezas. Cada proveedor hablaba un dialecto diferente de "coste". Navegar por sus tablas de precios era una misión casi imposible para mi caso de uso.

Tenía que comparar el concepto de "token" entre modelos que los medían de forma distinta, con precios diferentes para los tokens de entrada (lo que yo preguntaba) y los de salida (lo que la IA respondía). Era como intentar comparar el consumo de un coche midiendo uno en "litros por kilómetro" y otro en "galones por hora", sin una tabla de conversión clara. El panorama era un laberinto de jerga técnica diseñada para empresas con equipos financieros, no para un desarrollador que solo quería saber "¿cuánto me costará esto al mes si 100 usuarios lo usan de forma moderada?".

Después de horas de análisis, la conclusión fue demoledora. El ecosistema de APIs de IA no estaba pensado para mi necesidad.

| Opción | Análisis / Realidad | Veredicto |
| :--- | :--- | :--- |
| **Yo asumo los costes de la API** | La experiencia para el usuario sería perfecta, pero para mí era económicamente inviable. Un pequeño grupo de usuarios activos podría generar una factura de cientos de euros. | Imposible. |
| **El usuario registra su propia API Key** | Esto me liberaba de los costes, pero creaba una barrera de entrada insalvable. Nadie iba a pasar por ese calvario administrativo y de riesgo económico. | Inaceptable. |
| **Buscar un proveedor con un plan sostenible** | Simplemente, no existía. El mercado estaba dominado por el pago por uso, un modelo diseñado para empresas, no para distribuir herramientas a una comunidad de usuarios. | Fracaso. |

Y que no se malinterprete, mi búsqueda no era de algo 'gratuito', sino de un modelo predecible y sostenible. Estaría encantado de pagar una tarifa plana razonable, un coste fijo mensual que me permitiera ofrecer la herramienta a mis usuarios de confianza como una inversión controlada. Pero esa opción, simplemente, no existía. El mercado estaba dominado por el 'pago por uso', un modelo diseñado para empresas con presupuestos elásticos, no para un desarrollador que necesita distribuir una herramienta de software libre sin miedo a la bancarrota.

Había creado una herramienta potente que, en la práctica, no podía compartir con nadie. Estaba completamente atascado.

## La búsqueda desesperada de alternativas

Decidido a no rendirme, me embarqué en la que parecía la solución más lógica: si no puedo usar una API externa, traeré la IA a casa. Mi objetivo era ejecutar los modelos de lenguaje (LLMs) directamente en la máquina del usuario. La teoría era impecable; la práctica fue un desastre memorable.

#### Intento 1: La IA local y el fracaso del software

Mi primera incursión fue con LM Studio. La experiencia fue... corta y aterradora. A los diez minutos de las primeras pruebas, mi equipo de desarrollo se congeló por completo. Tras cinco minutos mirando una pantalla inerte esperando a ver si revivia, no me quedó más remedio que recurrir al último recurso: el botón de apagado físico. Días después, lo intenté de nuevo con más cuidado, pero el resultado fue el mismo: todo el sistema, hasta el cursor, empezó a moverse a cámara lenta. Alternativa descartada.

Mi siguiente parada fue Ollama. ¡Al menos no me dejó el ordenador frito! Confiado, empecé a probar modelos. Los grandes (32B) eran desesperadamente lentos. Los pequeños (4B) se movían, así que lo integré en mi prototipo desarrollando un cliente compatible OpenAI, que es lo que soporta ollama, y empecé a probar.

¡Ay, dios mío! Fue como hablar con alguien con amnesia severa. El problema era el **tamaño de contexto**. El modelo apenas tenía un contexto de 32000 tokens (y algunos modelos solo de 15000 tokens) , y solo mi *system prompt* inicial ya ocupaba casi todo ese espacio. A la que yo le decía algo, el modelo empezaba a "olvidar" las instrucciones, la estructura de la base de datos o las reglas para generar JSON. Probé con DeepSeek, Gemma, Llama... el patrón era siempre el mismo: el modelo que no se quedaba corto de contexto, se moría de lentitud. El sueño de la IA local se había desvanecido.

#### Intento 2: El Servidor Casero y el Muro del Hardware

Con la vía del software local cerrada, decidi abordarlo desde otro punto. Si mi equipo no podía, quizás un servidor dedicado en casa sí podría. Pero esto abrió una nueva caja de Pandora. Mi primera pregunta fue tan simple como aterradora: ¿Y qué hardware necesito para esto?

Empecé a buscar. Los foros y artículos solo hablaban de un tipo de hardware: las GPUs de NVIDIA. Nombres como RTX 3090, RTX 4090, H100 o A100 aparecían por todas partes. Cuando busqué sus precios, casi me caigo de la silla. Las RTX se movían en un rango de precios prohibitivo para un proyecto personal, y las H100/A100... bueno, de esas es mejor no mirar el precio para no deprimirse. A esto, por supuesto, había que sumarle el coste de un equipo adecuado para albergarlas.

El proyecto parecía muerto de nuevo, pero la curiosidad me pudo. ¿Por qué NVIDIA? ¿Qué tenían esas GPUs que las hacía tan indispensables? Me sumergí en foros, artículos técnicos y vídeos de YouTube, en un viaje que me llevó de vuelta a los fundamentos del hardware. Poco a poco, empecé a entender las claves. Descubrí una distinción fundamental: no es lo mismo **entrenar** un LLM, que requiere una potencia de cálculo masiva, que **ejecutarlo**, "inferencia", para dar servicio a unos pocos usuarios. Mis necesidades estaban en el segundo grupo.

Eso me dio un hilo de esperanza. Para lo que yo necesitaba, no me hacía falta una RTX de miles de euros. Si sabes cómo funciona un ordenador, esa pieza de hardware que hace andar nuestro software, existen soluciones mucho más económicas.

Descubrí el fascinante mundo de las APUs de AMD, como los Ryzen 7 8700G. Estos chips son pequeñas maravillas que integran CPU, GPU y una NPU (Unidad de Procesamiento Neuronal) en una sola pieza. Su gran ventaja es que la GPU no tiene memoria dedicada, sino que utiliza la RAM del sistema. Si a esto le unes dos módulos de 32GB de RAM DDR5 de baja latencia (CL30), se convierte en un pequeño monstruo para ejecutar modelos de IA, con un coste muy inferior al de las soluciones basadas en RTX.

Hacía años que no me bajaba a un nivel tan profundo de análisis de hardware. Tuve que volver a repasar por qué es crítico usar dos módulos de RAM en lugar de uno (para aprovechar el acceso en paralelo del doble canal) o por qué la latencia CL30 era la ideal para las características de esa CPU. Ademas de entender cómo se cargan las capas de un LLM en la memoria de la GPU.

El resumen de esta odisea fue que, tras horas de investigación, di con una configuración de hardware óptima y de "bajo coste" que, probablemente, me permitiría ejecutar los modelos con una velocidad aceptable. Pero incluso esa solución, la más barata y eficiente que pude diseñar, seguía siendo una inversión demasiado grande para mi presupuesto en un proyecto personal.

Había encontrado una solución técnicamente elegante, pero económicamente inalcanzable. El proyecto volvía, una vez más, a estar en un callejón sin salida.

## Punto de inflexión. La llave estaba en mi "caja de herramientas"

Estaba desmoralizado. Mi proyecto de _asistente de chat impulsado por IA_ estaba aparcado y acumulando polvo. Había chocado contra tantos muros que lo di por un _"experimento interesante pero fallido"_. Así que desvié mi atención hacia herramientas más prácticas.

Por aquel entonces, para trabajar habíamos empezado a usar `gemini-cli`, un nuevo agente de línea de comandos que acababa de salir. Su principal atractivo era el modelo de uso: hasta 1000 peticiones diarias gratuitas con el modelo Flash. Era perfecto para integrarlo en nuestro día a día como asistente de programación. Lo usaba para lo práctico: repasar código, documentar y depurar. El modelo Flash iba bastante bien para las tareas rutinarias; para los errores más complejos, tiraba del modelo Pro, aunque su acceso era más limitado.

La IA había inundado mi YouTube con docenas de vídeos que te contaban esta o aquella maravilla sobre `gemini-cli`: "resume tus PDFs", "genera imágenes"... Era el "Ubik" ;) del momento, y costaba distinguir el contenido de valor del ruido hasta que ya te habías tragado medio vídeo. 

Un día, entre la marabunta de vídeos, acabé en uno que mencionaba de pasada que `gemini-cli` podía funcionar como un **"cliente MCP"**. La sigla no me dijo nada. No le di mayor importancia. No entendí qué significaba, y la idea quedó flotando en mi subconsciente durante varios días. Hasta que unas noches, mas tarde, leyendo sobre arquitecturas de IA, la primera pieza encajó. *"Si gvSIG desktop actuase como un servidor MCP, podría acceder a él desde `gemini-cli`. ¡Qué chulo!."* Era solo una idea curiosa mas. Lo apunté por algun sitio en la cabeza, un experimento para un fin de semana, pero nada más. No era la solución a mi problema de distribución.

Y entonces, un poco más tarde, pensando en ello, llegó el verdadero cataclismo. La segunda y la tercera pieza cayeron en su sitio. Y conecte los puntos con una linea uno a uno:

1.  gvSIG puede ser un **servidor MCP**.
2.  `gemini-cli` es un **cliente MCP**.
3.  `gemini-cli`... **¡es de uso gratuito y gestiona la API key por el usuario!**

Eso significaba que... cualquier persona con `gemini-cli` instalado podría usar todas las herramientas que yo había construido en mi `cliente-ai`... **¡sin ningún coste, sin registrarse en ninguna parte, sin dar su tarjeta de crédito!**

**¡OH!**

Ese fue el momento. No fue un destello de genialidad, sino la lenta conexión de ideas dispersas que, de repente, formaron una solución perfecta al problema que me había atormentado durante semanas. Había encontrado la llave.

La transición de mi _asistente de chat impulsado por IA_ a un servidor MCP fue asombrosamente rápida, apenas unos días. Pero no empecé de cero. Por un lado, tenía toda la lógica de los "procesadores" de mi prototipo. Y por otro, la experiencia de años en gvSIG desktop, donde ya había implementado pequeños servidores HTTP para interactuar con otras aplicaciones. Rescaté parte de ese código, lo uní al protocolo MCP y las piezas encajaron casi sin esfuerzo.

En el próximo artículo de esta serie, os contaré qué es exactamente el MCP y cómo, apoyándome en todo el trabajo previo, construí el servidor que finalmente dio vida a este proyecto.
