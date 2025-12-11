---
layout: post
title: "Agentes de IA y la inyección de observaciones proactivas en clientes de chat"
date: 2025-12-11
canonical_url: "https://blog.gvsig.org/2025/12/09/agentes-de-ia-y-la-inyeccion-de-observaciones-proactivas-en-clientes-de-chat/"
---  
Hola,
llevo un tiempo dándole vueltas a una pregunta: ¿cómo diseñamos agentes que no solo respondan a preguntas, sino que sean capaces de reaccionar a cambios en su entorno?

Piensa en un agente de DevOps que debe reaccionar a una caída de servidor, o en un sistema de análisis que necesita alertar sobre una anomalía en tiempo real. En todos estos casos, esperar a que el usuario pregunte '¿hay algún problema?' llega demasiado tarde. La proactividad deja de ser una mejora para convertirse en un requisito funcional.

Los protocolos actuales no están diseñados para que el entorno __hable primero__. Este artículo explora ese vacío conceptual y propone un patrón de diseño para superarlo.

## ¿Qué es un agente? Del ejecutor de tareas al sistema proactivo

En un artículo anterior exploré la confusión que rodea al término 'agente'. De aquel análisis surgió una distinción práctica basada en el comportamiento:

Un **ejecutor de tareas** opera bajo demanda: el usuario inicia una instrucción, el sistema ejecuta un ciclo de razonamiento y acción, y devuelve una respuesta. Es una herramienta sofisticada, pero esencialmente reactiva.

Un **agente proactivo**, en cambio, necesita capacidad de respuesta automatizada. No se limita a ejecutar lo que se le pide, sino que puede reaccionar a eventos del entorno sin una instrucción explícita para cada acción.

La proactividad que propongo no es la capacidad de definir fines, sino la de detectar condiciones preconfiguradas y reaccionar a ellas dentro de un marco de objetivos establecido por el usuario. Estamos diseñando mecanismos para que un agente pueda decir "detecté este cambio, ¿debo actuar?", no para que decida por sí mismo qué cambios le importan.

## El vacío en los protocolos actuales

Al examinar el ecosistema técnico actual, he encontrado una ausencia importante. Las APIs de los LLMs (OpenAI, Gemini, Anthropic) se basan en un modelo de comunicación síncrono y por turnos. No hay un canal definido para que el cliente inicie la comunicación para informar de un evento externo.

Nos enfrentamos a un problema de diseño sistémico. Al igual que ocurre con las APIs de recuperación de datos (RAG) que nos encierran en la búsqueda por similitud, las APIs de chat nos encierran en un ciclo de pura reacción.

Los frameworks de agentes (LangChain, AutoGen, CrewAI) en su diseño estándar tampoco resuelven este problema fundamental. Son excelentes orquestadores de bucles reactivos, pero su arquitectura asume que el LLM es siempre el que inicia la interacción con el entorno a traves de las herramientas.

A nivel de investigación, existen aproximaciones a agentes dirigidos por eventos en dominios específicos como robótica o entornos de simulación. Sin embargo, estas soluciones no se han trasladado al stack principal de desarrollo con LLMs, donde el paradigma reactivo sigue siendo dominante. Esta desconexión entre la teoría y la práctica cotidiana refuerza me hace pensar que estoy ante un problema de arquitectura.

## Diseñando la observación proactiva

Extender estos protocolos implica pelear en tres frentes simultáneos. El primero es de pura fontanería. Hay que mantener la **integridad** del protocolo. Inyectar información externa choca frontalmente con unas APIs que exigen una secuencia estricta de roles. Incluso si logramos 'hackear' el protocolo de forma elegante, nos topamos con la **seguridad**. Necesitamos garantías de que el evento es real y no una inyección maliciosa. Y no olvidemos el **coste** cognitivo. Bombardear al modelo con eventos consume tokens y fragmenta su atención.

Ante este escenario, la tentación inmediata es recurrir al polling tradicional o a bucles externos de inyección de prompts. Pero eso no es diseño; es fuerza bruta. Necesitamos una arquitectura que respete el flujo conversacional sin convertir el historial del chat en un vertedero de logs del sistema

## Patrón de diseño pool_event()

La solución conceptual más robusta que encontré es lo que llamo el patrón `pool_event()`. Se trata de manipular el protocolo de forma inteligente pero respetuosa. Un "agente" no es solo el LLM. Es el sistema completo. Cerebro (LLM) + Cuerpo (Cliente) + Sentidos (Herramientas). La proactividad emerge de la coordinación de estas tres piezas.

El cliente orquesta el proceso siguiendo esta lógica:

1.  **Definición de un gancho.** Se declara una herramienta "ficticia" `pool_event()` en la especificación. Semánticamente, el LLM la interpreta como su canal para consultar novedades.
2.  **Monitorización silenciosa.** El cliente observa el entorno (logs, sensores, temporizadores). Mientras no ocurre nada, permanece en segundo plano.
3.  **Inyección contextual.** Al detectar un evento relevante, el cliente no interrumpe al modelo. En su lugar, **modifica el historial de conversación** insertando dos mensajes consecutivos. Una llamada de herramienta simulada del LLM a `pool_event()`, seguida de la respuesta de la herramienta con el dato real.
4.  **Procesamiento natural.** Este historial modificado se envía al LLM. El modelo ve que "acaba de solicitar" eventos y ha recibido uno, por lo que reacciona de forma natural integrando esa información en su siguiente ciclo de razonamiento.

Lo elegante de esta arquitectura es que convierte la proactividad en una ilusión de reactividad. No necesitamos romper el protocolo `model` → `tool` → `model`, simplemente simulamos que el paso intermedio ya ocurrió. Es seguro (solo el cliente inyecta roles), es estándar y, lo más importante, es semánticamente coherente para el modelo.


## Qué tipo de proactividad conseguimos (y qué tipo NO)

Hay que ser honestos con las fronteras del diseño. No estamos construyendo un sistema de **reflejos instintivos**, sino uno de **percepción y razonamiento**.

La diferencia radica en la **latencia de ciclo**. El cliente puede detectar un evento en milisegundos, pero el LLM solo lo procesará cuando termine su ciclo de pensamiento actual. Si el agente está ocupado, el evento espera. Esto descarta el uso de este patrón para control en tiempo real estricto (como pilotar un dron), pero lo hace ideal para tareas de supervisión, análisis y asistencia donde unos segundos de retraso son aceptables.

Por otro lado, el cliente deja de ser un simple canal para convertirse en un **filtro de atención**. Esto no es una limitación técnica, sino una característica de seguridad. Un torrente de datos sin filtrar saturaría la ventana de contexto en minutos. El cliente debe actuar como un orquestador y filtro, usando una cola centralizada para priorizar qué eventos merecen interrumpir al "cerebro" y cuáles son simple ruido de fondo.

## Hacia arquitecturas más autónomas

Este patrón de diseño, aunque aparentemente simple, representa un salto conceptual importante. Transforma un sistema reactivo en uno capaz de percibir y reaccionar de forma autónoma a estímulos del entorno.

Este patrón establece las bases para una nueva capacidad. Que el entorno pueda iniciar ciclos de razonamiento. El entorno no es solo un conjunto de datos a consultar, sino una fuente activa de estímulos que pueden y deben iniciar ciclos de razonamiento. El siguiente reto será gestionar la sobrecarga sensorial que esto genera.

El reto ahora es experimentar con estos diseños en proyectos concretos. La proactividad bien calibrada podría ser el siguiente paso evolutivo en la utilidad práctica de los agentes de IA. Abrir los ojos al entorno está muy bien… hasta que descubres que ahora tienes que aprender a parpadear.


Un saludo.
