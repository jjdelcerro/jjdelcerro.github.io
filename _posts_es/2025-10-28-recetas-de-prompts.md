---
layout: post
title: "Más allá del prompt perfecto. Formando desarrolladores, no operadores de IA"
date: 28-10-2025
canonical_url: "https://jjdelcerro.github.io/es/blog/recetas-de-prompts/"
--- 
Hola a todos.
Últimamente, las redes sociales y las plataformas de prompts se han llenado de una especie de mercado mágico. Un sitio como Promptfy promete cientos de "recetas listas para usar" que, con solo copiar y pegar, resuelven problemas complejos de IA. Y no hablemos de LinkedIn o X, donde un post con un "prompt infalible" para generar código Python acumula likes como si fuera "el santo grial". Entiendo el atractivo.En un mundo donde se valora cada vez mas el producir mas en menos tiempo ¿quién no querría un atajo directo a la productividad?

Pero aquí va mi preocupación, surgida de años observando cómo se integran las herramientas en el flujo de desarrollo. ¿Y si estos atajos están formando operadores de IA en lugar de desarrolladores reales? Especialmente para los juniors, que entran en este ecosistema con ojos brillantes pero sin el bagaje para cuestionar. Copiar un prompt puede ser un salvavidas temporal. El problema surge cuando se convierte en muleta permanente. Puedes estamparte profesionalmente al primer tropiezo con un caso no cubierto por la receta.

## La habilidad que no se desarrolla

Imaginad a un cocinero que sigue una receta al pie de la letra. Con ingredientes frescos y el horno a punto, sale un plato decente. Ahora, cambiad el aceite por mantequilla rancia o el horno se apaga a mitad. ¿Qué hace? Si solo sabe recitar pasos, está perdido. Ese es el junior que copia prompts. Un cocinero eficiente en condiciones ideales, pero sin el instinto de un chef para improvisar.

El problema es que, con el tiempo, dejas de entrenar tus habilidades que de verdad importan

- La descomposición del problema. Un prompt efectivo no nace de la nada. Requiere traducir un requisito ambiguo del mundo real en instrucciones precisas. Copiar salta este paso. El junior no aprende a fraccionar el problema en capas. Contexto, restricciones, salida esperada.

- El pensamiento crítico ante la caja negra. Los LLMs son potentes, pero alucinan. Un prompt copiado genera código SQL que parece perfecto... hasta que en producción falla por una validación omitida. Sin el hábito de cuestionar, "¿Por qué el modelo eligió este JOIN? ¿Qué asume sobre el esquema?", el desarrollador acepta la salida como verdad absoluta. No desarrolla esa intuición que salva proyectos.

- La iteración como diálogo. La creación de un prompt tendria que ser un diálogo iterativo con el modelo. Empiezas con una versión cruda. Ves la respuesta. Ajustas el contexto. Corriges sesgos. Ahi es donde ocurre el aprendizaje real y entiendes las manías del modelo. Copiar es saltarse el ensayo-error. Quieres jugar la final sin el entrenamiento.

- El modelo mental del LLM. Al final, no se trata solo de prompts. Se trata de mapear el "porqué" del comportamiento del modelo, sus sesgos en datos geográficos para un SIG, o cómo maneja ambigüedades en español técnico. Sin esto, el junior corre el riesgo de quedar anclado en la superficie sin ver la estructura debajo.

He visto esto antes. Recordad el salto de C a Java. El Garbage Collector abstrajo la gestión de memoria. Juniors producían código rápido sin malloc ni free. Pero el senior que diagnostica un OutOfMemoryError en un sistema con millones de objetos sabe que el conocimiento fundamental no se abstrae. Las recetas de prompts son el nuevo GC. Aceleran el 80% fácil. En el 20% duro te dejan expuesto.

## Hacia la ingeniería de prompts real

No pido renunciar a las recetas. Úsalas como punto de partida, no como destino. La alternativa es tratar el prompting como ingeniería. Tenemos que diseñar instrucciones, no solo escribirlas. Os detallo mi proceso.

Cuando me enfrento a un problema, lo primero no es escribir el prompt. Diseño la pregunta que lo genera.

- **Paso 1: La meta-pregunta.** Antes de pedirle al LLM que resuelva tu problema, pídele que te ayude a formularlo. Por ejemplo: "Ayúdame a estructurar una petición clara para depurar un OutOfMemory en un plugin Java de gvSIG desktop. Incluye contexto sobre el heap, posibles fugas y salida en JSON para automatizar." Esto obliga a descomponer: ¿Qué sabes? ¿Qué asumes? ¿Qué verificas? Es como un pair programming con el modelo, pero tú diriges.

- **Paso 2: La validación cruzada.** Una vez armado el borrador, somételo a escrutinio. Copia el prompt en otro LLM, Gemini a Claude, DeepSeek o viceversa, y pide: "Analiza esta instrucción. ¿Qué ambigüedades ves? ¿Qué sesgos introduce? Sugiere refinamientos." Es la revisión de código para prompts. Detecta fallos tempranos, como suposiciones culturales en datos GIS valencianos que un modelo global puede ignorar.

- **Paso 3: La síntesis del arquitecto.** Con feedback en mano, tú decides. Integra, descarta, ajusta. Añade reglas explícitas: "Siempre valida la salida contra el esquema PostgreSQL." O fuerza formato: "Responde solo en JSON, sin prosa." Aquí el humano brilla. Eres el director que orquesta la salida para que encaje en tu sistema real.

Prueba esto en un problema pequeño. Verás cómo el "baile" revela capas que una receta ignora. Y, de paso, construyes ese mapa mental que te hace senior.

## Formemos arquitectos, no recaderos

La productividad no nace de una biblioteca de prompts copiados. Nace de saber construir el prompt adecuado para un problema nuevo. Ese es el valor que justifica tu asiento en la mesa de seniors.

A los mentores y seniors. No demos pescados envueltos en prompts bonitos. Enseñemos a pescar. Con meta-preguntas, validaciones y síntesis. Guiemos a los juniors hacia la maestría, no la dependencia.

A los juniors. Resistid la tentación del atajo. El camino lento de entender el "porqué" de una instrucción os hará infinitamente más valiosos que el que solo copia y pega. Preguntad, iterad, cuestionad. El LLM es herramienta. Vosotros, arquitectos.

Al final, el objetivo no es coleccionar respuestas. Es dominar el arte de hacer preguntas.

Si os resuena, probad el método en vuestro próximo reto. Y contadme en los comentarios ¿habéis caído en la trampa de las recetas? ¿Qué os sacó de ahí?

Un saludo


