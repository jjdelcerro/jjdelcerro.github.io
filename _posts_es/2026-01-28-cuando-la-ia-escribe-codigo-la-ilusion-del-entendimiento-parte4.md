---
layout: post
title: "Cuando la IA escribe código... la ilusión del entendimiento (parte 4)"
date: 2026-01-28
canonical_url: "https://jjdelcerro.github.io/es/blog/cuando-la-ia-escribe-codigo-la-ilusion-del-entendimiento-parte4/"
---  
El tercer caso y con el que acabo esta serie de "Cuando la IA genera codigo", me ocurrió hace apenas unas semanas, trabajando en mi prototipo de agente con una gestión de memoria *un tanto especial*. Esta vez, el origen del problema fue un error de diseño mío. En un intento de optimizar, decidí reutilizar el mismo artefacto que gestionaba la *"base de conocimientos"* (el historial consolidado) para gestionar también el *"historial vivo"* de la conversación en curso. Sobre el papel parecía que podría funcionar. En la práctica, fue una muy mala idea. Las responsabilidades se mezclaban y la lógica de gestión de la ventana de contexto se volvía inmanejable.

Al darme cuenta, se lo expliqué a Gemini. Le detallé por qué esa arquitectura era errónea y le pedí separar los conceptos. Su respuesta textual fue impecable: *“Entiendo perfectamente. No debemos acoplar la persistencia a largo plazo con el buffer de corto plazo por X e Y motivos”*. Le pedí que me explicase cómo lo iba a desacoplar, y me dio una respuesta que a grandes rasgos parecía correcta, así que le dije que lo implementase.

Me generó una nueva clase `Session`, con un par de métodos para persistir y restaurar la sesión, y dejó en una propiedad de la clase el array con los turnos. Y hasta ahí llegó. El array con los turnos era público y desde la clase `ConversationAgent` accedía directamente a él para cualquier operación. Los métodos `save` y `restore` recibían y devolvían un array con los turnos que luego asignaba desde fuera a la variable pública de la sesión. Vamos, **un desacato en cuanto a arquitectura** donde las dos clases habían quedado completamente entrelazadas sin un reparto de responsabilidades claro.

Lo más curioso, y a la vez peligroso, es que en este caso **funcionaba**. Rodaba la aplicación e iba. Pero me imaginaba a mí mismo tratando de evolucionar la maraña que había escrito el agente en unas semanas y me daba un pasmo.

Había entendido la teoría de mi explicación, pero fue incapaz de vencer la "gravedad" del código que ya estaba escrito. A cada paso que le señalaba el error él contestaba entenderlo, pero no era capaz de decidir qué responsabilidades debía tener cada clase. Al final acabé dejando un esqueleto con la clase que quería para la sesión y comentarios sobre cómo debía implementar cada método... y así conseguí que medio hiciese lo que quería.

Pero no acabaron ahí mis problemas. Ya estaban separadas las responsabilidades, pero ahora no iba. Para mantener la estructura de datos le sugerí que usase una lista y un diccionario. Solo con una de las dos cosas no se podía implementar lo que le pedía. Cuando parecía entender para qué tenía que usar la lista... solo usaba la lista, y no iba. Cuando parecía entender para qué necesitaba el diccionario rehacía la clase entera y solo usaba el diccionario, y no iba. La estructura de la clase se asemejaba mucho a muchas implementaciones que podía encontrar en la web. **Pero solo se asemejaba mucho.** Una diferencia sutil de concepto hacía que no terminase de encajar en un patrón claro. Unas veces se decantaba por una implementación y otras por otra, y ninguna era válida.

Al final acabé implementando lo que estaba mal de la clase... y no le volví a dejar que la tocase. Si la tocaba, deshacía mi código y volvía a dejar una implementación que no iba.

A bote pronto podrías pensar que se trataba de un proyecto grande, con muchas clases y relaciones entre ellas. No era así. Estamos hablando de un proyecto con 7 clases Java y, para el caso que me ocupaba, solo estaban involucradas 4 de las 7. La arquitectura no es lo suyo. No le dejes tomar decisiones de arquitectura en tus proyectos; no lo va a hacer bien.

Este episodio me dejó una sensación distinta a la de las pruebas anteriores. No era solo que la IA no supiera integrar un protocolo o gestionar un estado asíncrono. Aquí, la IA parecía haber entendido perfectamente mi explicación teórica, y aún así fue incapaz de traducir esa comprensión en una estructura de código coherente. La brecha no estaba en la sintaxis, ni siquiera en la lógica de un algoritmo; estaba en algo más abstracto: en la capacidad de diseñar. Era como si hubiera aprobado el examen de arquitectura de software con nota, pero suspendido en la práctica. ¿Cómo era posible? Para responder, hay que dejar de mirar el código y empezar a mirar el mecanismo que lo genera.

## La mecánica de la simulación

Para entender por qué ocurre esto hay que dejar de mirar el código que genera y empezar a mirar el mecanismo que lo produce.

Lo que ocurre cuando un LLM como Gemini explica con claridad por qué una arquitectura es errónea, para luego ser incapaz de implementar la alternativa correcta, no es una contradicción. Es la consecuencia inevitable de su naturaleza. Los modelos de lenguaje no entienden en el sentido en que un programador entiende un sistema; simulan comprensión a través del uso del lenguaje. Y esa simulación es, en realidad, un modelo lingüístico y relacional de alto nivel sobre el concepto.

El LLM ha sido entrenado en una cantidad astronómica de documentación técnica donde se definen principios como el 'acoplamiento', la 'separación de responsabilidades' o el 'patrón de diseño'. Cuando le pedimos que explique por qué falló, no está razonando sobre el sistema concreto; está realizando un proceso de mapeo narrativo:

* Reconocimiento de patrones: Identifica los tokens clave ('acoplamiento', 'responsabilidades', 'Session', 'ConversationAgent'). En su memoria, estos términos están vinculados por una gravedad estadística inmensa a un tema narrativo: 'los principios de diseño de software'.

* Síntesis explicativa: Su tarea ya no es diagnosticar un fallo de diseño en un sistema vivo, sino articular la explicación que ya existe en la literatura técnica. Su valor es mapear nuestra experiencia concreta al marco conceptual general que ha leído millones de veces.

* Contraste de modelos (Texto vs. Sistema): Lo más fascinante es que puede contrastar dos patrones lingüísticos: el código que acaba de generar y la teoría que dice que ese código es erróneo. Al yuxtaponerlos, genera una tesis que explica el fallo.

La paradoja es que un LLM puede generar una explicación perfecta de por qué los LLMs no pueden comprender ciertos problemas, simplemente porque ha leído muchas descripciones de esos fallos escritas por humanos que sí los entendían. Puede escribir un documento persuasivo sobre sus propios límites porque está operando desde su mayor fortaleza: la síntesis de narrativas humanas preexistentes.

Sin embargo, en cuanto pasamos de la narrativa a la resolución de un problema nuevo que requiere inferencia causal y toma de decisiones de diseño... la simulación se desvanece. Porque la IA no tiene un modelo mental del sistema, solo tiene un modelo lingüístico de las conversaciones sobre sistemas.

## La clave está en la naturaleza del problema

El caso de la clase Session no es una anomalía. Es la manifestación clara de un patrón que he visto repetirse una y otra vez. Los LLMs tropiezan sistemáticamente en los mismos tipos de problemas. No es cuestión de lenguaje, de framework o de lo bien que escribas el prompt. Es la naturaleza del problema la que los vuelve irresolubles. Y esa naturaleza la he clasificado en tres categorías:

1. Desarrollos que involucran la evolución de estados en tiempo de ejecución.

   Aquí está el núcleo de la prueba LSP4J y también del stale closure en React. El LLM ve el código estático (texto), pero no "simula" mentalmente cómo cambia el estado a lo largo del tiempo: inicializaciones, notificaciones asíncronas, condiciones de carrera, ciclos de vida de objetos externos... Cuando el problema requiere razonar sobre "qué pasa en el runtime después de X evento", el modelo aplica patrones estadísticos que no encajan, porque no tiene un modelo causal dinámico.

2. Desarrollos que "se parecen mucho" a algo visto millones de veces, pero no son exactamente eso.

   Este es un fallo clásico de over-generalización / "weight" del entrenamiento. En el ejemplo de la clase `Session` (con el mapa de turnos y el borrado de rangos), el problema se parece muchísimo a miles de ejemplos de listas + mapas + reindexación que ha visto. El "empuje estadístico" lo lleva a una solución incorrecta porque el detalle sutil (reconstruir después del clear, preservar identidad de objetos, offset preciso) no es lo suficientemente frecuente o diferenciado en el entrenamiento. Es un "parecido peligroso" en el que el modelo cree que sabe, pero aplica el patrón equivocado.

3. Desarrollos en los que hay que tomar decisiones arquitectónicas propias de la solución.

   Aquí entra la elección de diseño minimalista vs sobreingeniería, la separación de capas (protocolo vs semántica), o decidir si algo necesita una clase nueva o se resuelve en el método existente. El LLM tiende a patrones comunes (más clases, más abstracciones, más boilerplate) porque eso es lo que ve más en repositorios públicos. Cuando la mejor solución es "quedarse en una clase simple y reconstruir el mapa después del clear", falla en priorizar simplicidad y contexto específico del dominio.

Seguramente habrá muchos tipos de problema que no son capaces de resolver, yo dejo aquí mi granito de arena con estos tres.

La discusión pública sobre *LLMs+programación* suele polarizarse en dos bandos simplones:

* *Bando hype*. "Ya resuelven proyectos enteros, complejidad no es problema".
* *Bando escéptico genérico*. "Fallan en tareas complejas/grandes/reales/arquitectura, siempre necesitas humano in the loop".

Mi posición es más precisa y sutil. *Pueden resolver cosas objetivamente complejas* con muy poco o ningún "humano en el bucle", *siempre que el problema no caiga en esas tres categorías*.

Cuando se acercan a ellas, el éxito y la autonomía se desploma. Cuando se mantienen lejos, funcionan sorprendentemente bien. La frontera no es cuantitativa (tamaño, líneas, abstracciones), sino cualitativa.


