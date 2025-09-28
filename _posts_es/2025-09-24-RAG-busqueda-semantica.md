---
layout: post
title: "RAG y búsqueda semántica"
date: 2025-09-24
canonical_url: "https://www.linkedin.com/posts/joaquin-jose-del-cerro-murciano-3573b31a4_hola-a-todos-%C3%BAltimamente-veo-una-y-otra-activity-7376347677405470720-SutS?utm_source=share&utm_medium=member_desktop&rcm=ACoAAC_BtTMBVyeFFZIfuOS1qN3ugMQgBdQ623s"
---

Hola a todos,
Últimamente, veo una y otra vez el término "similitud semántica" asociado a la tecnología RAG. Lo encontramos en frases como:
* "Se seleccionan los documentos más similares semanticamente"
* "RAG introduce un paso adicional de búsqueda semántica"
* "Búsquedas basadas en similitud semántica"

Pero, ¿qué es RAG en realidad? Si acudimos al artículo que acuñó el término se describe como un marco que aumenta un modelo generativo con un componente de recuperación de información externa. [1]

La definición no especifica cómo se recupera esa información. Los métodos de recuperación más comunes hoy en día no se basan en un entendimiento semántico real. Utilizan búsqueda vectorial, un método estadístico increíblemente potente que va mucho más allá de la simple coincidencia de palabras.

Esta técnica es tan eficaz que el resultado puede darnos la ilusión de entendimiento; pero es fundamental no confundir la simulación con la realidad. No hay una verdadera "búsqueda semántica". No hay una verdadera búsqueda basada en conceptos. Solo tenemos una búsqueda por proximidad matemática en un espacio vectorial.

Y que conste, estas líneas no entra a valorar si de estos métodos estadísticos puede "emerger" el conocimiento o no. Ese es otro debate, fascinante y complejo. Mi punto es más concreto: la responsabilidad de describir con precisión la tecnología que tenemos hoy.

Hoy en día se suele usar el término "semántico" de forma muy laxa. Corremos el riesgo de alejarnos de entender dónde está realmente la tecnología hoy. Nos hace creer que ya hemos resuelto problemas del "entendimiento", que aún están muy lejos de solucionarse.

No me molesta que un desarrollador diga en una charla 'búsqueda semántica'.
Me molesta que un divulgador lo presente como un hecho técnico sin aclarar que es una metáfora.
Si enseñas, debes nombrar los límites. Si formas mentes, no las confundas.
La precisión es respeto a quienes confían en ti.

Un saludo a todos.

Joaquín

[1] Lewis, P., et al. Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks.
