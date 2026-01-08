---
layout: post
title: "Cómo el código mata al misterio matemático en los Transformers"
date: 2026-01-08
canonical_url: "https://jjdelcerro.github.io/es/blog/como-el-codigo-mata-al-misterio-matematico-en-los-transformers/"
---  
*Por qué los Transformers prefieren el orden al caos sin que nadie se lo pida... spoiler, sí se lo han pedido.*

Llevo unos días viendo algunos articulos relacionados con un *paper* reciente de Google y la CMU titulado *"Deep sequence models tend to memorize geometrically; it is unclear why"*, arXiv 2510.26745 (Los modelos de secuencia profunda tienden a memorizar geométricamente; no está claro por qué).

Si leéis los titulares que circulan por ahí, parece que hemos encontrado el Santo Grial. Se habla de que los modelos "sintetizan espontáneamente una memoria geométrica", que "no solo memorizan, sino que construyen geometría" o incluso se insinúa que estamos ante los primeros chispazos de una consciencia que ordena el mundo por voluntad propia.

Me fui al PDF original. Me costó, porque el inglés académico y yo tenemos una relación de respeto mutuo pero distante, y porque mis matemáticas son las de un ingeniero que lleva 30 años picando piedra, no las de un investigador teórico. Pero al leerlo, mi intuición saltó enseguida.

Donde ellos ven un "misterio" (*it is unclear why*), yo solo vi un algoritmo haciendo exactamente lo que se le ha programado para hacer. No vi magia. Vi un mecanismo de optimización siguiendo la ley del mínimo esfuerzo.

### Mi intuición inicial

El planteamiento del estudio es el siguiente: entrenan a un Transformer con datos que son hechos atómicos, tipo "A conecta con B", "B conecta con C". No le dan el mapa completo, solo las conexiones locales. La teoría académica clásica dice que, como estos modelos tienen miles de millones de parámetros (memoria de sobra), lo más "vago" sería memorizar cada par en un cajón separado. Algo así como una tabla *hash* gigante. Sin relación entre A y C.

La sorpresa para los investigadores es que el modelo no hace eso. En lugar de guardar los datos en cajones aislados, los ordena en el espacio vectorial. Coloca A, luego B y luego C en una línea. Crea una geometría.

Para mí, la sorpresa fue que ellos se sorprendieran.

Si yo diseño un "aparato" (una red neuronal) cuyo mecanismo fundamental para saber si ha acertado es medir la similitud entre vectores (producto escalar), y le digo que A tiene que parecerse a B, y que B tiene que parecerse a C... ¿qué otra cosa va a pasar? Si ato tres piedras con gomas elásticas y tiro de ellas, se van a alinear. No porque las piedras sepan geometría, sino porque es la única forma física de aliviar la tensión de la goma.

### Cuerdas elásticas y mínima energía

Para entender por qué pasa esto no hay que mirar la "mente" de la IA, hay que mirar la física del código.

El algoritmo de *Backpropagation* funciona propagando el error hacia atrás. Básicamente, es un mecanismo de tensión. Para visualizarlo, imaginad que los conceptos (A, B, C) son cajas pesadas en el suelo de un almacén, y que el algoritmo es un operario que tiene que conectarlas usando gomas elásticas. Se le dan las siguiente ordenes:

* Orden 1: "A conecta con B". El operario ata una goma entre la caja A y la caja B. La goma se tensa y, por pura física, arrastra ambas cajas hasta que quedan pegadas.
* Orden 2: "B conecta con C". El operario ata una goma entre la caja B y la C. Al tensarse, esta goma tira de C hacia B... ¡pero también tira de B hacia C!

Aquí está la clave mecánica. Como la caja B está en medio, atada a ambas, actúa como un eslabón. Al mover B para acercarla a C, la caja A (que ya estaba atada a B) se viene detrás "de regalo".

El resultado final inevitable es que las cajas se ordenan formando un tren ($A-B-C$). El sistema busca el estado de mínima tensión. Mantenerlas alineadas es "más barato" computacionalmente para el optimizador que estirar las gomas en direcciones opuestas para mantenerlas separadas. Lo que el *paper* llama "geometría" es simplemente la forma que adoptan los datos cuando dejas que la tensión del gradiente los organice con el mínimo esfuerzo.

Al igual que las gomas elásticas prefieren rectas a curvas retorcidas, el gradiente prefiere funciones de onda de baja frecuencia (suaves) a las de alta frecuencia (ruido). Es lo que en el paper denominan 'sesgo espectral'."

Este 'arrastre' hacia el orden no es una opción entre muchas. Es la consecuencia física inevitable del mecanismo. Pero para entender por qué esta tendencia es tan poderosa, y por qué los modelos nunca eligen las soluciones caóticas que teóricamente podrían existir, tenemos que cambiar de escala. Pasemos de mirar las gomas que tiran de cajas individuales a observar el paisaje completo por donde se mueve el sistema. Imaginemos ahora el entrenamiento no como un taller de cajas y gomas, sino como una bola que rueda por una cordillera.


### Cuando el informático mató a los millones de agujeros

Aquí es donde se produce la desconexión entre la teoría académica y la ingeniería real. Para entenderlo, imaginad el entrenamiento de una IA como si soltáramos una bola en la cima de una cordillera montañosa. El objetivo es que la bola ruede hasta llegar al punto más bajo posible (el valle del error cero).

El matemático mira el mapa topográfico de esa montaña (**la fórmula del error**) y se lleva las manos a la cabeza. Dice: "¡Cuidado! Este terreno está lleno de millones de agujeros irregulares, grietas y pozos donde la bola podría quedarse atascada". Esos "agujeros" representan las soluciones desordenadas. Configuraciones donde el modelo memoriza los datos sin orden ni geometría. Matemáticamente, esos agujeros existen y son soluciones válidas (tienen error cero). Por eso al investigador le parece un misterio que la bola nunca caiga en ellos y siempre termine en el valle ancho y ordenado de la geometría.

Pero entonces llega el informático, mira el **código** y dice: "Tranquilo, la bola no va a caer en los agujeros porque no rueda libre. Va sobre raíles".

Para verlo más claro, reduzcamos el problema a su esencia más simple. Imaginad que queremos resolver matemáticamente
Os pongo un ejemplo de código que ilustra cómo el algoritmo elimina esos agujeros teóricos. Imaginad el problema matemático de encontrar dos números que sumen 10 ($x + y = 10$).

El matemático os dirá que el espacio de soluciones es infinito y caótico: $(5,5)$, $(1,9)$, $(100, -90)$... Cualquiera de esos "agujeros" es válido.

Pero si yo escribo este código para resolverlo partiendo de cero (que es como se inicializan las redes):

```python
x = 0; y = 0
while (x + y < 10):
    x += 0.1
    y += 0.1
```

El resultado **siempre** será $(5,5)$.
¿Podría haber sido $(1,9)$ matemáticamente? Sí. ¿Informáticamente? Imposible. El algoritmo de incremento simétrico actúa como los raíles de nuestra bola. **Mata los millones de agujeros teóricos** y obliga al sistema a converger en la solución más simétrica y ordenada.

Eso es lo que llaman "Regularización Implícita". No es que el modelo decida mágicamente ser geométrico. Es que el código de entrenamiento, al aplicar gradientes simétricos sobre pesos inicializados a cero, hace físicamente imposible que nuestra bola descarrile hacia las soluciones caóticas que tanto preocupan a los teóricos. El paper demuestra que estos raíles son tan robustos que la geometría emerge incluso en los modelos más simples y desnudos, confirmando que el orden no depende de la complejidad de la red, sino de la simple inercia del algoritmo.


### La geometría no es magia

Que esto no sea magia no significa que no sea útil. Al contrario. Entender que el "aparato" tiende a generar geometría por defecto valida una forma de diseñar sistemas. Si alimentamos al modelo con datos que tienen una estructura lógica clara (transitividad, jerarquías), no necesitamos programar las reglas explícitamente. La propia fricción del entrenamiento va a generar ese "mapa" por nosotros. Es una característica gratuita del optimizador.

Esta inercia geométrica es un arma de doble filo. El mecanismo de arrastre es ciego; no tiene criterio de verdad, solo de minimización de error. Si alimentamos al modelo con datos ruidosos, incoherentes o simples coincidencias, el algoritmo aplicará la misma fuerza bruta para intentar ordenarlos. Fabricará una estructura geométrica sólida y convincente a partir de ruido puro, creando falsas relaciones causales simplemente porque esa es la única forma que conoce de reducir la tensión matemática entre los datos. Esta es la esencia del mecanismo físico que subyace a las llamadas 'alucinaciones' de los LLMs. La necesidad imperiosa del algoritmo de crear coherencia geométrica donde solo hay coincidencias estadísticas.


### Conclusión

No hay fantasmas en la máquina. Lo que hay es física computacional bien entendida.

La "memoria geométrica" no es una propiedad emergente de una consciencia artificial, es la consecuencia inevitable de un algoritmo que busca el camino de menor resistencia. Los investigadores de Google tienen razón en sus datos, pero su narrativa de "misterio" ignora que, a veces, la implementación impone restricciones que la teoría pura no ve.

Para quienes trabajamos pegados al código, esto es un recordatorio de que la implementación nunca es neutra. Las herramientas que elegimos, un optimizador, una inicialización o una función de pérdida, toman decisiones arquitectónicas por nosotros, moldeando el resultado final tanto o más que la teoría matemática subyacente. Quizás el verdadero desafío no sea buscar misterios en la "caja negra", sino entender mejor la física de los raíles que nosotros mismos hemos colocado.


