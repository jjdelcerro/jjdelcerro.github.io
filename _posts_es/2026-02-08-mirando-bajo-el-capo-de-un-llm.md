---
layout: post
title: "Mirando bajo el capó de un LLM"
date: 2026-02-08
canonical_url: "https://jjdelcerro.github.io/es/blog/mirando-bajo-el-capo-de-un-llm/"
---
A menudo, cuando intentamos explicar cómo funciona un LLM, caemos en abstracciones sobre "redes neuronales" que suenan demasiado biológicas, o en simplificaciones excesivas sobre "la siguiente palabra más probable". Ambas son ciertas, pero ninguna explica *qué* está pasando ahí dentro cuando la máquina parece entender un doble sentido.

Vamos a ver si puedo transmitir lo que he entendido que hay debajo de esa "apariencia de pensar", de esa forma de generar una respuesta a una "texto" nuestro que tienen los LLMs.

## La habitación 

Lo primero que vamos a hacer es fijar un marco en el que situar las "cosas". Imaginemos una habitación de base cuadrada con forma de cubo. Elegimos una esquina de la habitación en el suelo. Las aristas de la habitación que salen de esa esquina van a representar nuestro eje de coordenadas. Dos ejes corren por el suelo, y otro se extiende hasta el techo. 

Cada uno de esos ejes va a representar un concepto, elegiremos tres conceptos. Uno representara lo "financiero", dinero, economía... Otro representará lo "mobiliario", mesas, sillas, sofás, muebles en general. Y el otro representará "naturaleza", aire libre, parques, ríos. 

Tendremos tres ejes:

*   Eje financiero (Dinero, economía).
*   Eje mobiliario (Objetos para sentarse, muebles).
*   Eje naturaleza (Aire libre, parques).

<p align="center">
  <img src="/assets/images/mirando-bajo-el-capo-de-un-llm/cubo-vacio-v1.png" alt="Nuestra habitación vacía"><br>
  Nuestra habitación vacía
</p>

Pondremos el concepto "financiero" a lo largo de uno de los lados de la habitación. Cuanto más cerca de la esquina que elegimos como nuestro punto de referencia menos "financiero" será y cuanto más alejado más "financiero". Situaremos en el otro lado que corre junto al suelo el concepto "naturaleza", y al igual que con "financiero" cuanto más cerca de la esquina menos "mobiliario" será y cuanto más lejos más. Por último situaremos el concepto de "mobiliario" en el lado de la pared que corre de nuestra esquina hacia el techo.

## Las "cosas" en la habitación 

Una vez tenemos nuestra "habitación" vamos a meter dentro "cosas". Tenemos unas pequeñas bolas en las que podemos meter palabras y dejarlas flotando dentro de la habitación. Vamos a colocar unas cuantas bolas en la habitación, con algunas palabras "dinero", "silla" y "árbol".

La bola "dinero" estará fuertemente ligada al nuestro eje financiero, en rojo, así que la situaremos a lo largo del eje rojo, muy separada de nuestra esquina. Más alejada más "financiero". La bola "silla", estará fuertemente ligada al eje "mobiliario", así que la situaremos a lo largo de este, muy alejada de nuestra esquina. Y lo mismo haremos con la bola "árbol".

Ya tenemos situadas tres "palabras":

* "dinero", muy "financiero".
* "silla", muy "mobiliario".
* "árbol", muy "naturaleza".

<p align="center">
  <img src="/assets/images/mirando-bajo-el-capo-de-un-llm/cubo-dinero-silla-arbol-v1.png" alt="Nuestra habitación con dinero, silla y árbol"><br>
  Nuestra habitación con "dinero", "silla" y "árbol"
</p>

Vamos a situar un par más:

* "ingresar", bastante "financiero".
* "transacción", bastante "financiero".

<p align="center">
  <img src="/assets/images/mirando-bajo-el-capo-de-un-llm/cubo-dinero-silla-arbol-transaccion-ingresar-v1.png" alt="Nuestra habitación con dinero, silla, árbol, ingresar y transacción"><br>
  Nuestra habitación con "dinero", "silla", "árbol", "ingresar" y "transacción"
</p>

Y vamos a añadir una palabra más... "banco". Uhm... pero banco es "especial", puede significar varias cosas. Puede referirse a una  entidad bancaria o a un banco de sentarse. Tendremos que situarlo a mitad camino de financiero, y a mitad camino de mobiliario... y podría estar relacionado con el concepto "naturaleza", puede estar relacionado con un banco en el parque. Uf! Lo situaremos a mitad de cada uno de estos ejes, flotando más o menos en el centro de nuestra habitación.

<p align="center">
  <img src="/assets/images/mirando-bajo-el-capo-de-un-llm/cubo-dinero-silla-arbol-transaccion-ingresar-banco-v1.png" alt="Nuestra habitación con dinero, silla, árbol, ingresar, transacción y banco"><br>
  Nuestra habitación con "dinero", "silla", "árbol", "ingresar", "transacción" y "banco".
</p>

Y ahora mismo uno puede preguntarse... **¿Y que tendrá que ver todo esto con un LLM?**

Esto que hemos construido es, en miniatura, el corazón de un LLM. Nuestra habitación de 3 dimensiones es un espacio de embeddings. En un modelo real la 'habitación' no tiene 3 dimensiones, sino miles, diez mil o más dimensiones. Y en lugar de 6 bolas, hay cientos de miles de palabras, tokens, cada uno con su posición única y fija en este espacio hiperdimensional. Esta disposición no es aleatoria; es el resultado del 'pre-entrenamiento', un proceso masivo en el que el modelo ha aprendido las relaciones básicas del lenguaje a partir de billones de palabras.

Ya tenemos nuestro mapa mental, de conceptos y cómo se sitúan nuestras palabras en ese espacio de conceptos. Ahora bien ¿Que nos indican nuestras palabras en la habitación?

Cuanto más cerca esté una palabra de otra, una bola de otra en la habitación, más íntimamente estarán relacionadas conceptualmente. Que "transacción" e "ingreso" estén cerca nos dice que conceptualmente están muy relacionadas. Qué "árbol" esté muy lejos de "dinero" nos indica que conceptualmente no tienen nada que ver. Como la distancia entre "banco" y "dinero" no es muy grande, nos indica que tienen algo que ver, pero no demasiado. La distancia entre las bolas, las palabras, nos indica la relación semántica que hay entre ellas.

Bien, ahora mismo, tenemos la base, pero nos falta suministrar el conocimiento. Para darle conocimiento, tendremos que "entrenar" nuestro micro-LLM, y que aprenda.

## Cómo entrenamos a nuestro LLM

Ahora que nuestro LLM tiene su 'mapa del mundo' básico (los embeddings del pre-entrenamiento), podemos 'entrenarlo' para una tarea específica. Esto a menudo se llama ajuste fino o fine-tuning.
    
En un primer momento podríamos pensar que entrenar nuestro LLM puede consistir en ir acercando unas bolas a otras. Si le quiero enseñar que en mi contexto "banco" suele referirse más a una entidad financiera que a un banco del parque, podríamos pensar que lo suyo es que "mueva" la bola de "banco" para acercarla al eje "financiero". Pero no, no funciona así. Nuestra habitación es estática. Las bolas no se mueven, el entrenamiento hace otra cosa.

Imaginemos, que tenemos una serie de textos con los que queremos entrenar a nuestro LLM para que aprenda de ellos. Y entre esos textos tenemos la frase *"Fui al banco a ingresar dinero"*. Cogeremos las bolas "banco", "ingresar" y "dinero" y veremos cómo de cerca están unas de otras. "banco" está bastante lejos de las otras dos, y en este contexto debería estar cerca de ellas. No muevo "banco" o "dinero", voy a alargar el eje financiero, con lo que "ingresar" y "dinero" se acercaran, y voy a encoger el eje "naturaleza" y "mobiliario" con lo que "banco" se alejara de esos conceptos. No he movido las palabras, he estirado y encogido los ejes para que "banco" esté más cerca de "financiero" que de los otros dos. Así que cojo los valores con los que he escalado los ejes y me los guardo asociados a cada eje.


<p align="center">
  <img src="/assets/images/mirando-bajo-el-capo-de-un-llm/cubo-dinero-silla-arbol-transaccion-ingresar-banco-filetuning1-v1.png" alt="Deformación de la habitación durante el entrenamiento"><br>
  Deformación de la habitación durante el entrenamiento
</p>

Cada vez que entra un texto nuevo se activarán las bolas que aparecen en ese texto, haciendo que los ejes a los que estén asociados apliquen el escalado a nuestra habitación. Si el resultado es que las bolas de la frase están cerca, se da por bueno. Si las bolas de nuestra frase no están cerca, se modifica el factor de escala de los ejes para acercarlas. Y el proceso se va repitiendo con todos los textos con los que queremos entrenar a nuestro LLM. 

Este proceso de calcular cómo hay que ajustar la escala de los ejes que se va haciendo con cada texto de entrenamiento es lo que se llama "*backpropagation*" o "*gradiente*".

Al final, cada eje tendrá unos "pesos" específicos del texto con el que lo hemos entrenado que usaremos para escalar nuestro espacio cuando se activen bolas que están cerca de esos ejes. Estos pesos que se han calculado para cada eje en el momento del entrenamiento se graban a fuego en el modelo y ya no cambiarán más una vez terminada la fase de entrenamiento.


## ¿Que pasa cuando le preguntamos a nuestro LLM?

Hemos visto ya como "pre-entrenamos", construyendo nuestro habitación, y como "entrenamos", ajustando los pesos de los ejes, a nuestro LLM. Ahora nos queda saber cómo podemos recuperar ese conocimiento que adquirimos durante el entrenamiento.

Ahora le pregunto a mi LLM *"¿Donde hice la transacción?"*. ¿Que pasa por dentro?

El modelo toma cada palabra de nuestra pregunta y activa sus correspondientes "bolas" en la habitación. La presencia de "transacción" actúa como una señal 
de activación en el eje financiero y hace que se apliquen los pesos de ese eje. El modelo ha centrado su atención en el eje financiero.

En un instante, el espacio de nuestra habitación cambia. La habitación se transforma en un largo pasillo que se adentra en la dirección de lo financiero. En este nuevo espacio deformado:

* "dinero" e "ingresar" están ahora cerca.
* La bola "banco", que antes flotaba en un centro ambiguo, es arrastrada por la deformación hacia la zona financiera. Su distancia a "transacción" se ha reducido.
* "silla" y "árbol", en cambio, quedan aplastadas contra la pared lejana, casi irrelevantes para el cálculo.

<p align="center">
  <img src="/assets/images/mirando-bajo-el-capo-de-un-llm/cubo-dinero-silla-arbol-transaccion-ingresar-banco-inferencia1-v1.png" alt="Deformación de la habitación en la inferencia"><br>
  Deformación de la habitación en la inferencia
</p>

El modelo no se detiene. Su tarea es encontrar, en este espacio deformado por el contexto, la palabra que geométricamente "encaja" a continuación. Realiza un cálculo de proximidad. ¿Qué bolas están ahora más cerca del "punto de atención" creado por la frase? La más prominente es "banco" (en su sentido financiero).

Así, la respuesta comienza a generarse: "En el banco..."

El proceso no para ahí. La palabra "banco" se añade al contexto, lo que provoca una nueva deformación del espacio (otra ronda de atención), que a su vez hace que la siguiente palabra más probable sea, por ejemplo, "financiero" o "ayer". Y así, paso a paso, se compone la respuesta.

El modelo no ha "pensado" en entidades bancarias. No ha recuperado un hecho de una base de datos. Simplemente, la geometría de su espacio interno, entrenada con millones de textos, ha sido deformada por la pregunta de tal forma que la trayectoria más natural a través de ese paisaje conduce, inevitablemente, a una secuencia de palabras que nosotros interpretamos como una respuesta lógica.


## Del cubo a la hipermatriz

Esta explicación visual funciona para entender la intuición, pero no debemos dejar de prestar atención a los planos reales.

**He hecho trampa**.

No hay 3 ejes. En un LLM, *Large Language Model*, pueden haber más de 12.000 dimensiones.

No hay 6 palabras. Hay un vocabulario de más de 50.000 tokens.

¿Para qué sirven tantas dimensiones?

Con 3 ejes podríamos separar un árbol de un billete. Con 12.000 dimensiones, un LLM puede crear un eje para el tono irónico, otro para la estructura de una receta de cocina, otro para la ambigüedad legal en una cláusula y miles más para conceptos que ni siquiera tenemos palabras para definir. Esa es su potencia, mapear la complejidad del lenguaje en un hiperespacio donde todo matiz tiene su lugar.

Cuando decimos que el espacio se estira o se encoge, en realidad hablamos de operaciones con matrices gigantescas que aplican deformaciones más complejas que un simple escalado. Esas "bolas" son en realidad vectores de embedding. Listas de 12.000 números que definen la posición de cada token. Los "pesos" que calibramos en el entrenamiento son los millones de parámetros dentro de las matrices que forman el mecanismo de atención.

En resumen, la pregunta no deforma nuestro hipercubo. Lo que hace es multiplicar un vector por matrices de parámetros entrenadas, proyectándose y rotando una y otra vez a través de capas del espacio, hasta que la posición resultante señale a la siguiente palabra más coherente.

## Cálculo, no magia

Entender este proceso es fundamental para rebajar el hype y empezar a trabajar con estas herramientas con los pies en la tierra.

Cuando un LLM te sorprende con una respuesta que parece demostrar "entendimiento profundo" o "sentido común", recuerda la habitación. No es que haya desarrollado consciencia o lógica. Lo que ha hecho es encontrar una correlación estadística en un espacio de 12.000 dimensiones. Ha logrado deformar ese hiperespacio de tal forma que acerca conceptos que, en nuestra realidad tridimensional y causal, parecen conectados por la razón, pero que en el modelo solo están unidos por patrones de proximidad vectorial aprendidos.

No razona. Calcula. No infiere. Navega por un paisaje geométrico que se remodela con cada palabra que escribes. No piensa. Sigue la trayectoria más probable en un universo numérico de distancias y ángulos.

Y eso, aunque no sea magia, es una obra de ingeniería matemática fascinante.

---

**El Laboratorio**

Para generar las imágenes he preparado una pequeña simulación interactiva donde puedes jugar con esta "habitación", activar y desactivar las palabras, y mover tú mismo el deslizador de "Atención Financiera" para ver cómo la deformación del espacio altera las distancias entre conceptos. No pretende ser estricto, solo una herramienta para ilustrar el articulo.

 [Entrar a la Habitación (Simulación 3D)](https://jjdelcerro.github.io/lab/habitacion-llm/index.html)

Nota: El código fuente de la visualización también está disponible para los curiosos.
