
# Documentación Técnica de Noema

## ¿Qué es Noema?

Noema es un **laboratorio de arquitectura** para agentes de IA autónomos. Es una prueba de concepto funcional diseñada para explorar cómo construir un asistente conversacional que pueda operar de forma continuada durante meses, manteniendo una única línea temporal de interacción sin perder el hilo ni degradar su razonamiento.

A diferencia de los sistemas de chat convencionales, Noema no se concibe como un "ejecutor de tareas" ni como un chatbot con herramientas. Su verdadero propósito es actuar como un **motor de aprendizaje continuo** construido alrededor de un modelo de lenguaje que no puede aprender por sí mismo. El sistema gestiona el ciclo de vida de la información: recibe datos del entorno, los transforma en conocimiento y decide qué entra y qué sale del espacio de consciencia del LLM para que este pueda operar indefinidamente sin que su atención se degrade.

El proyecto prioriza la ejecución local, la ligereza y el control explícito de recursos. No depende de infraestructuras en la nube ni de frameworks de inyección de dependencias; se ejecuta con Java 25, una base de datos H2 embebida y una interfaz que puede ser gráfica (Swing), de terminal (Lanterna) o línea de comandos (JLine3). El resultado es un agente portátil, inspeccionable y que puede funcionar en cualquier máquina con una JVM.

## ¿Qué problema resuelve?

Los modelos de lenguaje actuales son entidades estáticas: sus pesos neuronales están congelados en el momento del entrenamiento. No pueden aprender de la interacción. El único espacio donde están "vivos" y son conscientes del contexto es su ventana de atención. Pero esa ventana es frágil: la atención del modelo se degrada mucho antes de que se llene (el fenómeno *lost in the middle* o *context rot*), y meter más datos no mejora el razonamiento, lo empeora.

Noema aborda este problema desde una perspectiva estructural, no estadística. En lugar de intentar agrandar la ventana de contexto o recurrir a un RAG fragmentario, el sistema organiza la información en **cuatro estratos de memoria** que gestionan el conocimiento a lo largo del tiempo:

1. **Memoria episódica**: el registro inmutable de todo lo que ha ocurrido.
2. **Memoria consolidada**: una narrativa destilada ("El Viaje") que preserva la intencionalidad y la trazabilidad, generada periódicamente por un LLM.
3. **Memoria reciente**: la memoria de trabajo que se envía al modelo en cada turno.
4. **Memoria proyectada**: la vista dinámica que realmente ve el LLM, donde se ocultan datos brutos ya procesados y se inyectan notificaciones efímeras.

Este diseño permite que el modelo opere siempre con un contexto limpio y relevante, sin perder la capacidad de recuperar detalles exactos del pasado cuando los necesita. El conocimiento no se pierde, sino que se destila y se reorganiza. Las tareas que el agente realiza, leer archivos, generar código, responder preguntas, no son el fin del sistema, sino un **subproducto** de este motor de conocimiento persistente. Lo que hace que Noema sea útil no es que el modelo sepa hacer muchas cosas, sino que el sistema recuerda el contexto de un proyecto durante meses, evitando que el usuario tenga que reexplicar los antecedentes en cada interacción.


## Fundamentos y Ciclo de Vida

Este bloque cubre los pilares sobre los que se asienta el agente: cómo se arranca, cómo se organiza el sistema de archivos y cómo se controla el acceso a los recursos. Es el punto de partida para entender la arquitectura de Noema.

* **[Arranque y ciclo de vida](./docs/01-fundamentos-y-ciclo-de-vida/01-arranque-y-ciclo-de-vida.md)**: Inyección de dependencias manual, papel de `AgentManager`, `BootUtils` y el ciclo `start`/`stop` del agente.

* **[Jerarquía de archivos](./docs/01-fundamentos-y-ciclo-de-vida/02-agent-paths.md)**: el sandbox `AgentPaths`, la resolución dual (local vs global)

* **[Configuración](./docs/01-fundamentos-y-ciclo-de-vida/03-agent-settings.md)**: la configuración jerárquica con `AgentSettings`, y la generación dinámica de interfaces con `ExpressionEvaluator` y `settingsui.json`.

* **[Seguridad y control de acceso](./docs/01-fundamentos-y-ciclo-de-vida/04-seguridad-y-control-de-acceso.md)**: `AgentAccessControl`, sandbox de disco, listas blancas y negras, confirmación humana, RCS automático y sandbox de comandos con Firejail.


## El Sistema de Memoria (Las 4 Capas)

El corazón de Noema. Este bloque describe cómo se organiza la memoria para evitar la degradación del contexto y garantizar la continuidad a largo plazo. Cada capa tiene una función específica y se integra con las demás para formar un sistema de memoria híbrido y determinista.

* **[Visión general del modelo de memoria](./docs/02-el-sistema-de-memoria/010-vision-general-de-modelo-de-memoria.md)**: El problema del contexto finito y la estrategia de Noema: memoria episódica, consolidada, reciente y proyectada.
* **[Memoria episódica (`EpisodicMemory`)](./docs/02-el-sistema-de-memoria/020-memoria-episodica.md)**: Inmutabilidad de `Turn`, tabla H2, política de truncado de resultados pesados y búsqueda semántica con embeddings.
* **[Memoria consolidada (`ConsolidateMemory`)](./docs/02-el-sistema-de-memoria/030-memoria-consolidada.md)**: El `CheckPoint`, persistencia híbrida (BD + `.md`), estructura dual (Resumen + El Viaje) y trazabilidad con `{cite:ID}`.
* **[Memoria reciente (`RecentMemory`)](./docs/02-el-sistema-de-memoria/040-memoria-reciente.md)**: Ventana activa de sesión, backfill de `turnId`, gestión de límites atómicos y condición de consolidacion.
* **[Memoria proyectada (`ProjectedMemory`)](./docs/02-el-sistema-de-memoria/050-memoria-proyectada.md)**: El pipeline de operaciones efímeras que construye la vista final para el LLM.


## Catálogo de Servicios

Los servicios son los módulos funcionales que el agente activa durante su ejecución. Cada uno tiene un ciclo de vida, una configuración propia y un conjunto de herramientas asociadas. Este bloque cubre los servicios fundamentales del sistema.

* **[`ReasoningService`](./docs/03-catalogo-de-servicios/01-reasoning.md)**: El orquestador principal: bucle de consciencia `eventDispatcher`, gestión del contexto, ejecución de herramientas y coordinación de la memoria.
* **[`MemoryConsolidationService`](./docs/03-catalogo-de-servicios/02-memory-consolidation.md)**: La consolidación narrativa: generación de `ConsolidateMemory` a partir de turnos, validación de citas y uso de LLM específico.
* **[`SensorsService`](./docs/03-catalogo-de-servicios/03-sensors.md)**: El sistema nervioso autónomo: gestión de eventos asíncronos, naturalezas sensoriales, arbitraje cronológico y persistencia.
* **[`EmbeddingsService`](./docs/03-catalogo-de-servicios/05-embeddings.md)**: Vectorización local con ONNX, similitud coseno, búsqueda top-K y serialización BLOB.
* **[`SchedulerService`](./docs/03-catalogo-de-servicios/04-scheduler.md)**: Planificación temporal persistente con Natty, cola de alarmas y emisión de eventos.
* **Servicios de integración (Telegram, Email, MCP)**: Puentes con el mundo exterior: escucha de mensajes, correos y protocolo MCP.

## Subsistemas de Ejecución y Capacidades

Este bloque agrupa los mecanismos que extienden lo que el modelo puede hacer dentro del bucle de razonamiento: desde las herramientas básicas hasta los subagentes y el motor de scripting.

* **[Herramientas base y paginación](./docs/04-subsistemas-de-ejecucion-y-capacidades/01-herramientas-base-y-paginacion.md)**: Contrato `AgentTool`, modos de seguridad, ciclo de vida de una herramienta, `AbstractPaginatedAgentTool`, URIs simbólicas y protocolo `HINT`.
* **[Subagentes (`Subagent`)](./docs/04-subsistemas-de-ejecucion-y-capacidades/02-subagentes.md)**: Definiciones XML, workspaces aislados, ejecución en dos fases y lanzamiento asíncrono.
* **[Habilidades procedimentales (`Skill`)](./docs/04-subsistemas-de-ejecucion-y-capacidades/03-skills.md)**: Catálogo en `.claude/skills`, ciclo de vida (activación, recordatorios, desactivación) y scripts auxiliares.
* **[Motor de scripting (`ScriptExecuteTool`)](./docs/04-subsistemas-de-ejecucion-y-capacidades/04-scripting.md)**: Entorno Groovy embebido, sandbox seguro, iteradores streaming y módulos del `ScriptContext`.

## Capa de Presentación e Interfaces

Cómo interactúa el usuario con Noema a través del contrato `AgentConsole`. Este bloque cubre tanto las interfaces locales (Swing, TUI, CLI) como el servidor web embebido con eventos SSE.

* **[El contrato `AgentConsole` y la comunicación Core-UI](./docs/05-capa-de-presentacion-e-interfaces/00-contrato-agentconsole-y-comunicacion.md)**: Inversión de dependencias, flujo UI → Núcleo (`putUsersMessage` + callback), flujo Núcleo → UI (`print*`), confirmaciones síncronas y generación dinámica de UI de configuración.
* **[Interfaz Swing (GUI)](./docs/05-capa-de-presentacion-e-interfaces/01-swing.md)**: Ventana principal, burbujas de chat con Markdown, paneles de configuración y diálogos modales.
* **[Interfaz Lanterna (TUI)](./docs/05-capa-de-presentacion-e-interfaces/02-tui.md)**: Entorno de terminal con múltiples ventanas, historial coloreado y soporte de ratón.
* **[Servidor Web y SSE (`NoemaWebServer`)](./docs/05-capa-de-presentacion-e-interfaces/03-web.md)**: Javalin embebido, API REST (`/api/chat`, `/api/config`) y canal de eventos en tiempo real (`/api/console`).
