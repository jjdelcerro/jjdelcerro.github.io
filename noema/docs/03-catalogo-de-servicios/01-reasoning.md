# `ReasoningService`: el orquestador del agente

## 1. Propósito y responsabilidad

El `ReasoningService` es el núcleo de control del agente Noema. Si el sistema sensorial (`SensorsService`) es su percepción del entorno, y la memoria (episódica, compactada, reciente y proyectada) es su capacidad de recordar y organizar el conocimiento, el `ReasoningService` es el centro que integra ambas, toma decisiones, ejecuta acciones y mantiene la continuidad de la conversación.

Su responsabilidad principal es orquestar un **bucle perpetuo de consciencia**: un hilo dedicado que nunca se detiene (salvo cuando el agente se apaga) y que constantemente espera estímulos —mensajes del usuario, notificaciones de Telegram, correos entrantes, alarmas programadas o el simple paso del tiempo— para procesarlos. Cada estímulo desencadena una o varias rondas de razonamiento, durante las cuales el servicio construye el contexto (combinando el prompt de sistema, la memoria compactada, la memoria reciente y las transformaciones de la memoria proyectada), consulta al modelo de lenguaje, ejecuta las herramientas que este solicite y registra cada paso en la memoria episódica.

Para cumplir esta función, el `ReasoningService` integra y coordina varios subsistemas:

- **El modelo de lenguaje (`ChatModel`)**: el proveedor de razonamiento, configurable en caliente (proveedor, URL, clave, modelo) mediante acciones que el propio agente puede ejecutar.
- **La memoria reciente (`RecentMemory`)**: la memoria de trabajo que contiene los mensajes de la sesión activa.
- **La memoria compactada (`CompactedMemory`)**: la narrativa destilada del pasado, inyectada en el contexto para proporcionar memoria a largo plazo.
- **La memoria proyectada (`ProjectedMemory`)**: la vista efímera que realmente ve el LLM en cada turno, después de aplicar transformaciones (poda, notificaciones, fijación).
- **El catálogo de herramientas (`AgentTool`)**: todas las capacidades que el agente puede invocar (lectura de archivos, ejecución de comandos, búsquedas web, etc.), registradas y filtradas por activación.
- **La persistencia (`EpisodicMemory`)**: el repositorio inmutable donde se almacenan los turnos y las memorias compactadas.
- **La compactación (`MemoryCompactionService`)**: el servicio encargado de generar nuevas memorias compactadas cuando la memoria reciente alcanza un umbral.

A diferencia de otros componentes, el `ReasoningService` no expone una API pública extensa. Su interfaz se limita a permitir añadir herramientas, consultar su estado, activarlas o desactivarlas, y recuperar métricas sobre el tamaño del contexto. La mayor parte de su funcionalidad es interna y está encapsulada en el bucle `eventDispatcher` y en la colaboración con los subsistemas de memoria.

En el contexto global de Noema, el `ReasoningService` es el componente que dota al agente de **continuidad conversacional** (no olvida lo que acaba de decir), **capacidad de acción** (puede tocar el mundo real a través de herramientas) y **autonomía** (procesa estímulos sin intervención humana, salvo cuando la seguridad lo exige). Su diseño busca un equilibrio pragmático entre la potencia de los modelos de lenguaje actuales y las restricciones de un entorno de escritorio local, sin depender de infraestructuras cloud ni servicios externos más allá de las APIs de los propios LLMs.

## 2. Ciclo de vida del servicio

El ciclo de vida del `ReasoningService` está gobernado por los métodos `start()` y `stop()`, que son invocados por el agente (`AgentImpl`) cuando este arranca o se detiene.

**Arranque (`start()`)**:

1. **Instalación de recursos**: el servicio despliega en el sandbox del agente los archivos necesarios para su funcionamiento: el prompt de sistema base (`reasoning-system.md`), los módulos de identidad (`core`), los índices de referencia del entorno (`environ`) y la lista de habilidades (`skills`). Estos recursos se almacenan en `var/config/prompts/` y `var/identity/`, y son la materia prima con la que se construirá la personalidad del agente.

2. **Registro de acciones**: el servicio añade al sistema de acciones del agente (`AgentActions`) los comportamientos que permiten modificar la configuración del modelo en caliente, forzar compactaciones o recargar herramientas:
   - `CHANGE_REASONING_PROVIDER`: se dispara cuando el usuario cambia la URL o la API key del proveedor de razonamiento.
   - `CHANGE_REASONING_MODEL`: se dispara cuando el usuario cambia el identificador del modelo de razonamiento.
   - `COMPACT_REASONING_SESSION`: compacta aproximadamente el 50% más antiguo del historial de la sesión (acción de depuración).
   - `COMPACT_REASONING_FULL_SESSION`: compacta todo el historial consolidado (acción de depuración).
   - `REFRESH_REASONING_TOOLS`: recarga el estado de activación de las herramientas desde la configuración, permitiendo habilitar o deshabilitar capacidades sin reiniciar el agente.

3. **Sincronización de herramientas**: se invoca a `refresh_available_tools()` para que el estado de activación de cada herramienta (definido en la configuración del usuario bajo `reasoning/active_tools`) se refleje en el mapa interno `availableTools`. Las herramientas que no aparecen en la configuración conservan su estado por defecto (definido por `isAvailableByDefault()`).

4. **Creación del modelo de lenguaje**: se construye la instancia de `ChatModel` a partir de los parámetros de conexión (URL, API key, identificador del modelo) almacenados en la configuración del agente bajo `reasoning/provider/`. Este modelo será el motor de razonamiento para toda la sesión. Si los parámetros cambian durante la ejecución, las acciones `CHANGE_REASONING_*` recrearán el modelo.

5. **Lanzamiento del hilo de eventos**: se crea un hilo de plataforma (no virtual) con el nombre `Noema-Event-Dispatcher` y se pone en marcha ejecutando el método `eventDispatcher()`. Este hilo se convierte en el corazón del agente: mientras el servicio está activo, nunca se detiene y consume eventos de `SensorsService` para procesarlos.

Una vez completados estos pasos, el flag `running` se establece a `true` y el servicio imprime en la consola el nombre del modelo de lenguaje que está utilizando.

**Parada (`stop()`)**:

El método `stop()` simplemente establece el flag `running` a `false`. No interrumpe el hilo de eventos ni fuerza una salida inmediata. El propio bucle del `eventDispatcher` está diseñado para comprobar `running` en cada iteración; en el momento en que la condición deja de cumplirse, el hilo abandona el bucle y finaliza de forma natural. Esto garantiza que cualquier evento que se estuviera procesando en ese momento se complete antes de la parada, evitando estados intermedios o corrupción de la sesión.

La persistencia de la memoria reciente y proyectada no depende del `stop()`; se guardan en disco tras cada modificación (en `RecentMemory.save()` y `ProjectedMemory.save()`). Por tanto, aunque el agente se detenga abruptamente, la última versión persistida de la sesión es siempre la anterior a la operación que se estaba ejecutando. El mecanismo de escritura atómica (archivo temporal + movimiento) asegura que nunca se quede un archivo parcialmente escrito.


## 3. El bucle de eventos (`eventDispatcher`)

El método `eventDispatcher` es el corazón del `ReasoningService`. Es un bucle infinito que se ejecuta en su propio hilo desde el momento en que el servicio arranca hasta que se detiene. Su función es consumir eventos de `SensorsService` y procesarlos, orquestando todas las rondas de razonamiento y ejecución de herramientas necesarias para cerrar cada turno.

**Estructura general del bucle**

El bucle se organiza en torno a un único punto de bloqueo: la llamada a `sensors.getEvent()`. Mientras no haya estímulos que atender, el hilo permanece en espera, consumiendo recursos mínimos. Cuando llega un evento, el flujo se desencadena y no se detiene hasta que se ha completado el procesamiento completo de ese estímulo, incluyendo todas las rondas de razonamiento y ejecución de herramientas que sean necesarias. El bucle solo comprueba la bandera `running` al inicio de cada iteración, lo que permite una parada ordenada sin interrumpir el procesamiento de un turno a mitad.

**Espera de eventos**

El bucle comienza con una llamada a `sensors.getEvent()`. Este método pertenece a `SensorsService` y actúa como la puerta de entrada de todos los estímulos externos: mensajes del usuario, notificaciones de Telegram, correos entrantes, alarmas programadas, e incluso el paso del tiempo (a través de un sensor de reloj interno). La implementación de `getEvent()` está diseñada para ser bloqueante; si no hay eventos disponibles, el hilo se duerme hasta que el `SensorsService` recibe un nuevo estímulo y lo notifica mediante `sensorLock.notifyAll()`. El evento devuelto no es un dato crudo, sino un objeto `ConsumableSensorEvent` que ya sabe cómo transformarse en mensajes de LangChain4j.

**Inyección del evento en la memoria reciente**

Una vez obtenido el evento, el `eventDispatcher` toma una decisión basada en su naturaleza:

- **Eventos de usuario (`SensorEventUser`)**: representan la intervención directa del interlocutor humano. El evento se convierte en un `UserMessage` (el tipo de mensaje estándar que el modelo espera cuando alguien le habla) y se añade directamente a la memoria reciente mediante `recentMemory.add()`. No hay simulación ni capas de indirección; desde la perspectiva del modelo, es como si el usuario hubiera escrito su mensaje en el chat.

- **Eventos del entorno (el resto de naturalezas sensoriales)**: para estímulos que no provienen de la interacción directa del usuario, el evento ya está diseñado para saber cómo presentarse ante el modelo. A través de sus métodos `getChatMessage()` y `getResponseMessage()`, el evento sabe qué par de mensajes debe inyectar en la memoria reciente para que el modelo perciba el estímulo como si hubiera sido generado por una acción propia del agente. El `eventDispatcher` añade ambos mensajes en orden: primero `event.getChatMessage()` (un `AiMessage` que simula una llamada a `pool_event`), y luego `event.getResponseMessage()` (un `ToolExecutionResultMessage` con el contenido del estímulo). De esta forma, cuando el modelo recibe el contexto, encuentra en su historial una secuencia coherente que simula que él mismo consultó sus sensores.

Tras inyectar el evento en la memoria reciente, se persiste un `Turn` de tipo `tool_execution` (para eventos del entorno) o `chat` (para eventos de usuario) que documenta el estímulo recibido. Este turno se almacena en la memoria episódica global, asociado al `subchannel` del evento como una etiqueta que permite organizar y filtrar los turnos, pero sin aislar el conocimiento entre canales. La persistencia temprana del turno de observación garantiza la trazabilidad.

**El bucle interno: procesamiento hasta cerrar el turno**

Una vez que el estímulo está en la memoria reciente, comienza el bucle interno. Su objetivo es alcanzar un estado en el que el modelo haya generado una respuesta de texto (no una llamada a herramienta) y se pueda considerar que el turno actual ha terminado. Cada iteración del bucle interno sigue estos pasos:

1. **Construcción del contexto**: se invoca a `projectedMemory.getMessages(recentMemory, activeCompactedMemory, getBaseSystemPrompt())`. Este método devuelve la lista de mensajes final que se enviará al LLM, aplicando las operaciones del pipeline de la memoria proyectada (poda, fijación, notificaciones). El contexto incluye el prompt de sistema, la memoria compactada más reciente (si existe), y todos los mensajes acumulados en la memoria reciente.

2. **Consulta al modelo**: con el contexto construido y la lista de herramientas activas (generada a partir de `availableTools`), se llama a `model.generate(messages, toolSpecifications, abort)`. El modelo devuelve una respuesta que puede ser de dos tipos: texto plano, o una o más solicitudes de ejecución de herramientas.

3. **Manejo de herramientas**: si el modelo solicita ejecutar herramientas, el `eventDispatcher` itera sobre cada solicitud. Para cada una, busca la herramienta en `availableTools`, verifica que esté activa y permitida por `AgentAccessControl`, y si el modo de la herramienta es `MODE_WRITE`, `MODE_EXECUTION` o `MODE_WEB`, solicita confirmación al usuario mediante `AgentConsole.confirm()`. Si el usuario deniega, la ejecución se aborta. Si se autoriza, se invoca `tool.execute(jsonArguments)` de forma síncrona, bloqueando el hilo hasta que retorna. El resultado se convierte en un `ToolExecutionResultMessage` que se añade a la memoria reciente, y se persiste un `Turn` de tipo `tool_execution` (o `lookup_turn` si la herramienta es de memoria) en la memoria episódica global. El `subchannel` del evento en curso se registra en el turno como una etiqueta que permite contextualizar su origen, pero el conocimiento adquirido queda disponible para cualquier canal que lo necesite. Tras ejecutar todas las herramientas, el bucle interno continúa para que el modelo reciba los resultados en la siguiente iteración.

4. **Manejo de la respuesta textual**: si el modelo responde con texto (y no hay solicitudes de herramientas pendientes), se ha alcanzado el final del turno. El texto se muestra en la consola mediante `AgentConsole.printModelResponse()`, se persiste un `Turn` de tipo `chat` con la respuesta, y se añade el mensaje a la memoria reciente (aunque ya se añadió cuando se recibió la respuesta del modelo). El flag `turnFinished` se establece a `true` y se sale del bucle interno.

5. **Reintentos por herramientas no formalizadas**: hay un caso especial contemplado cuando el modelo devuelve `FinishReason.TOOL_EXECUTION` pero no hay solicitudes de herramientas en la respuesta. Esto puede ocurrir con algunos modelos que anuncian que van a usar una herramienta pero no la formalizan correctamente. En ese caso, el bucle inyecta un mensaje de usuario con el texto "(reintenta la llamada a la herramienta sin ninguna explicación)" y continúa, incrementando un contador de reintentos. Si se superan tres reintentos, se aborta el turno con una excepción.

Es importante destacar que, aunque el `eventDispatcher` opera sobre las memorias reciente, compactada y proyectada del `subchannel` correspondiente, la memoria episódica es compartida por todos los canales. Esto significa que el conocimiento adquirido en una conversación está disponible para todas las demás, y que el `subchannel` actúa únicamente como una etiqueta organizativa que permite al agente filtrar y contextualizar los turnos, pero no como un mecanismo de aislamiento.

**Persistencia al final del turno**

Tras salir del bucle interno, el `eventDispatcher` actualiza el estado persistente de la memoria proyectada (`projectedMemory.save()`) y de la memoria reciente (`recentMemory.save()`). Esto asegura que, en caso de reinicio, tanto el historial de mensajes como el estado de las operaciones (skills activos, recordatorios, etc.) se conserven.

**Compactación al final del turno**

Una vez que el bucle interno ha terminado, el `eventDispatcher` evalúa si la memoria reciente necesita compactación mediante `recentMemory.needCompaction()`. Este método compara el número de turnos únicos acumulados con un umbral configurable (por defecto 40). Si se ha superado el umbral, se invoca a `performCompaction()`, que inicia el proceso de consolidación de la memoria a largo plazo (descrito en la sección 6).

**Manejo de errores y callback final**

El bucle principal está envuelto en un bloque `try-finally` que captura cualquier excepción no manejada (incluyendo `Throwable`). Si ocurre un error crítico, se registra en el log, se muestra un mensaje de error en la consola y el bucle continúa. La filosofía es que el agente debe seguir funcionando incluso ante fallos inesperados, sin colapsar. Finalmente, si el evento que se procesó tenía asociado un callback (`event.getCallback()`), se invoca al finalizar, pasándole el texto de la respuesta final del LLM (si existe). Esto permite que los componentes externos que inyectaron el evento (por ejemplo, una interfaz de usuario) reaccionen cuando el agente ha terminado de procesarlo.

## 4. Construcción del contexto

La construcción del contexto es el paso crítico que precede a cada consulta al modelo. El `ReasoningService` no ensambla el contexto directamente; delega esta responsabilidad en `ProjectedMemory`, que aplica las transformaciones necesarias para optimizar la ventana de atención del LLM.

El flujo de construcción se inicia en el bucle interno del `eventDispatcher`, justo antes de llamar a `model.generate()`. El servicio obtiene tres elementos:

1. **El prompt de sistema**: generado por `getBaseSystemPrompt()`. Este prompt incluye la identidad del agente (construida a partir de los módulos `core` activos), los índices de referencia del entorno (archivos `.ref.md` en `environ`), y las directrices operativas definidas en `reasoning-system.md`. El prompt se construye dinámicamente en cada consulta para reflejar cambios en la configuración (activación/desactivación de módulos de identidad). El resultado se cachea en `lastestSystemPrompt` para evitar reconstrucciones innecesarias en sucesivas iteraciones del mismo turno.

2. **La memoria compactada activa**: obtenida mediante `episodicMemory.getLatestCompactedMemory(subchannel)`. Si existe, su contenido textual se inyecta como un bloque de sistema en el contexto, precedido por un encabezado que indica el momento de la última compactación. El prompt del sistema incluye directrices específicas sobre cómo interpretar este bloque (la "Directiva anti-alucinación" y la "Interpretación de la información recuperada"), que obligan al modelo a utilizar `lookup_turn` para resolver las citas `{cite:ID}`.

3. **La memoria reciente**: los mensajes de la sesión activa (`recentMemory.getMessages()`). Esta lista contiene el historial inmediato desde la última compactación, incluyendo los mensajes del usuario, las respuestas del modelo y los resultados de herramientas.

Con estos tres elementos, el `ReasoningService` invoca `projectedMemory.getMessages(recentMemory, compactedMemory, systemPrompt)`. Este método orquesta el pipeline de operaciones de la memoria proyectada (ver `050-memoria-proyectada.md`) para producir la lista final de mensajes que se enviará al LLM. El pipeline aplica transformaciones como:

- Fijación de mensajes de skills activos (`PinnedTurnsOperation`).
- Podado de resultados de herramientas largos (`TrimmingOperation`).
- Inyección de avisos de anotaciones pendientes (`PendingAnnotationOperation`).
- Percepción temporal pasiva (`TemporalPerceptionOperation`).

El `ReasoningService` no conoce los detalles de estas operaciones; simplemente recibe la lista de mensajes ya transformada y lista para el modelo. Esta separación de responsabilidades mantiene al orquestador centrado en el flujo de control, mientras que la lógica de optimización del contexto reside en la memoria proyectada.

El contexto resultante se pasa al método `model.generate()`, que ejecuta la inferencia del LLM. Si durante la proyección se han generado notificaciones efímeras, estas ya se han inyectado en la lista de mensajes mediante el mecanismo de simulación de `pool_event` (descrito en `ProjectedMemory`). El modelo recibe así un contexto que combina la historia consolidada, la interacción reciente y las señales proactivas del sistema, todo ello optimizado para preservar su atención.

## 5. El prompt del sistema

### 5.1. Propósito y construcción

El prompt del sistema no es un texto estático ni un mero prefacio a la conversación. Es la instrucción operativa que define el rol, las reglas y las capacidades del agente. Su contenido condiciona directamente el comportamiento del modelo en cada turno: cómo interpreta su propia memoria, cómo debe gestionar las citas, cómo debe contextualizar la información recuperada, y cómo debe priorizar la verificación frente a la invención.

El prompt se construye dinámicamente en cada consulta a través del método `getBaseSystemPrompt()`, aunque el resultado se cachea en `lastestSystemPrompt` para evitar reconstrucciones innecesarias durante el mismo turno. La construcción combina varias fuentes:

1. **El archivo base `reasoning-system.md`**: contiene las instrucciones fundamentales del agente, incluyendo el protocolo de acceso a la memoria, la directiva anti-alucinación y las reglas de interpretación temporal.

2. **Los módulos de identidad `core`**: son archivos Markdown en `var/identity/core/` que definen la "constitución" del agente (metodologías, principios técnicos, normas de comportamiento). Solo se incluyen aquellos módulos que el usuario tiene activados en la configuración (`reasoning/identity/core` como `CheckedList`).

3. **Los índices de referencia del entorno `environ`**: son archivos `.ref.md` ligeros en `var/identity/environ/` que actúan como índices de conocimiento denso. Estos índices informan al modelo de la existencia de información detallada sobre el usuario (biografía, proyectos, intereses), pero no cargan el contenido completo. El modelo debe usar `consult_environ` para recuperar el detalle cuando sea relevante.

El prompt resultante se escribe en `var/tmp/reasoning-system-prompt.md` para facilitar la depuración, permitiendo al desarrollador inspeccionar exactamente qué instrucciones está recibiendo el modelo en cada momento.

### 5.2. Gestión de citas: el protocolo de acceso a la memoria

El prompt define un protocolo estricto para que el modelo acceda a su propio historial, distinguiendo dos situaciones:

- **Cita explícita (`{cite:ID}`)**: cuando el modelo encuentra una referencia a un turno específico en la memoria compactada, debe usar `lookup_turn` con ese ID para recuperar el contenido exacto y su contexto inmediato. Esta directriz evita que el modelo intente recordar de memoria o invente detalles cuando existe una fuente verificable.

- **Intuición sin cita**: cuando el modelo tiene la sensación de haber hablado antes de un tema, pero no hay una cita explícita, debe usar `search_full_history` para buscar por similitud semántica en toda la memoria episódica. Esta directriz le permite encontrar información que intuye que conoce, sin necesidad de una referencia exacta.

El protocolo garantiza que el modelo no utilice `search_full_history` cuando ya tiene una cita disponible, y que no invente información cuando existe una referencia a la que puede acceder. El prompt también incluye una regla que prohíbe al modelo responder de memoria si hay una cita disponible: está obligado a ejecutar `lookup_turn` para extraer el dato original antes de formular su respuesta.

### 5.3. Directiva anti-alucinación

La directiva anti-alucinación es una instrucción explícita en el prompt que obliga al modelo a verificar cualquier información que tenga una cita asociada. Esta directiva es la que convierte la trazabilidad (las citas `{cite:ID}` en la memoria compactada) en un mecanismo activo de control, no en una anotación pasiva.

Su finalidad es doble:

- **Prevenir la invención**: el modelo no puede inventar detalles sobre un tema si existe un turno original que los documenta. Si ve una cita, debe consultarla antes de responder.

- **Mantener la coherencia**: al obligar al modelo a consultar la fuente original, se asegura que la información presentada sea la misma que se discutió en su momento, sin distorsiones ni reinterpretaciones.

La directiva se complementa con la validación de citas que realiza `MemoryCompactionService` (que convierte las citas inválidas en `{badcite:ID}`), creando un sistema de doble verificación: el servicio garantiza que las citas sean válidas, y el prompt garantiza que el modelo las utilice.

### 5.4. Interpretación de la información recuperada

El prompt instruye al modelo sobre cómo interpretar la información que recupera de una cita, especialmente en relación con su antigüedad. La directriz le pide que:

- **Contextualice temporalmente**: debe indicar cuándo ocurrió la conversación original ("en una conversación de hace X semanas...", "hace aproximadamente un año mencionaste...").

- **Evalúe la vigencia**: debe considerar si la información es aplicable al contexto actual. Si es muy antigua, debe advertir que el mundo o los supuestos pueden haber cambiado.

- **No confunda temporalidades**: la información de conversaciones pasadas pertenece a ese contexto histórico, no al diálogo actual. No debe presentar datos antiguos como si fueran decisiones recientes.

La finalidad de esta directriz es evitar que el modelo presente información obsoleta como vigente, y que el usuario reciba respuestas que reflejen correctamente la evolución del proyecto o de las decisiones tomadas a lo largo del tiempo.

### 5.5. Relación con la memoria compactada

El prompt del sistema y la memoria compactada están diseñados para funcionar en tándem:

- La **memoria compactada** proporciona el contenido narrativo (Resumen + El Viaje) con citas `{cite:ID}` incrustadas en el texto.

- El **prompt del sistema** proporciona las reglas para interpretar esas citas: cuándo usar `lookup_turn`, cómo contextualizar la información recuperada, y la obligación de verificar antes de responder.

Este acoplamiento es lo que garantiza que la trazabilidad no sea solo un mecanismo técnico (una cita que apunta a un turno), sino una **práctica operativa** que el modelo sigue en cada interacción. Sin las directrices del prompt, el modelo podría ignorar las citas o tratarlas como meras anotaciones sin valor verificador. Sin la memoria compactada, el prompt no tendría citas a las que aplicar sus reglas.

El resultado es que el modelo opera con una memoria a largo plazo que es densa en contenido, ligera en espacio, y completamente trazable hasta sus fuentes originales, todo ello guiado por las instrucciones del prompt.


## 6. Gestión de herramientas

Las herramientas (`AgentTool`) son el mecanismo mediante el cual el agente trasciende la conversación y actúa sobre el mundo: lee y escribe archivos, ejecuta comandos, consulta APIs externas, envía correos o programa alarmas. El `ReasoningService` actúa como el gestor de estas capacidades, manteniendo un catálogo actualizado, sincronizando su estado con la configuración del usuario, y orquestando su ejecución cuando el modelo las solicita.

**Registro y catálogo de herramientas**

Durante el arranque, el `ReasoningService` invoca a `getTools()` sobre cada servicio registrado (por ejemplo, `MemoryCompactionService` proporciona `lookup_turn`, `search_full_history` y `annotate_observation`). Cada herramienta se instancia y se añade al mapa `availableTools` mediante `addTool()`. El mapa asocia el nombre técnico de la herramienta con un objeto `AvailableAgentTool`, que contiene la herramienta y un flag `active`. La activación inicial se define por `isAvailableByDefault()`, pero posteriormente se sincroniza con la configuración del usuario.

**Sincronización con la configuración**

El estado de activación no es estático. El usuario puede habilitar o deshabilitar herramientas a través de la interfaz de configuración, lo que se almacena en `settings.json` bajo `reasoning/active_tools`. El método `refresh_available_tools()` sincroniza el mapa `availableTools` con esta configuración: recorre la lista persistida y ajusta el flag `active` para cada herramienta que aparece. Las herramientas que no figuran en la configuración conservan su estado por defecto. Esta sincronización se ejecuta durante el arranque y también cuando se dispara la acción `REFRESH_REASONING_TOOLS`, permitiendo cambios en caliente.

**Exposición al modelo**

Cuando el `eventDispatcher` construye el contexto (a través de `projectedMemory.getMessages()`), necesita proporcionar una lista de especificaciones de herramientas (`ToolSpecification`) que el modelo puede invocar. Esta lista se genera a partir del mapa `availableTools`, filtrando:

- Las herramientas que están activas (`active == true`).
- Las herramientas que están permitidas por `AgentAccessControl` (según las políticas globales de escritura, ejecución o acceso a internet).

Cada herramienta genera su propia especificación mediante `getSpecification()`, que devuelve un objeto con el nombre, la descripción y el esquema JSON de sus parámetros. LangChain4j serializa estas especificaciones en el formato esperado por el proveedor LLM (ej: function calling de OpenAI).

**Ejecución de herramientas**

Cuando el modelo responde con solicitudes de ejecución (`ToolExecutionRequest`), el `eventDispatcher` invoca `executeTool()`, que sigue esta secuencia:

1. **Localización**: busca la herramienta en `availableTools` por su nombre. Si no existe, devuelve un mensaje de error.

2. **Validación de seguridad**: si la herramienta tiene un modo distinto de `MODE_READ` (es decir, `MODE_WRITE`, `MODE_EXECUTION` o `MODE_WEB`), y el control de acceso requiere confirmación humana (`isHumanConfirmationRequired()`), se solicita autorización al usuario mediante `AgentConsole.confirm()`. El mensaje incluye el nombre de la herramienta y los argumentos. Si el usuario deniega, se devuelve un mensaje de error que el modelo recibe como resultado de la llamada.

3. **Ejecución**: si la validación supera, se invoca `tool.execute(jsonArguments)`. La ejecución es síncrona y bloquea el hilo del `eventDispatcher`. Esto es intencionado: el agente no debe procesar nuevos estímulos mientras realiza una acción que puede ser costosa o modificar el estado del sistema.

4. **Registro del resultado**: el texto devuelto por la herramienta se convierte en un `ToolExecutionResultMessage` que se añade a la memoria reciente. Se persiste un `Turn` cuyo `contenttype` depende del tipo de herramienta: `tool_execution` para herramientas operativas, `lookup_turn` para herramientas de memoria (`TYPE_MEMORY`), y `annotation` para `annotate_observation`. Esta distinción influye en la posterior compactación narrativa, ya que los turnos de tipo `lookup_turn` se tratan como "recuerdos" durante la generación de la memoria compactada.

**Herramientas de memoria: un caso particular**

Las herramientas de tipo `TYPE_MEMORY` (como `lookup_turn` y `search_full_history`) no modifican el estado externo, sino que recuperan información de la propia base de datos de la conversación. El `ReasoningService` las trata de forma especial solo en un aspecto: cuando se persiste su turno, se asigna `contenttype = lookup_turn`. Esto permite a `MemoryCompactionService` interpretar correctamente estos turnos durante la compactación, tratándolos como "flashbacks" y no como eventos nuevos.

**Fijación de mensajes**

Algunas herramientas declaran `shouldPin() == true` (ej: `activate_skill`). Cuando se ejecutan, su par de mensajes (llamada + resultado) se fija en `PinnedTurnsOperation` y se reinyecta en el contexto tras cada compactación. Esto garantiza que la activación del skill permanezca visible para el modelo. El método `getPinnedNotificationMessage()` de la herramienta proporciona el mensaje de recordatorio que se emite periódicamente mientras el skill está activo.

**Ciclo de vida de las herramientas**

Las herramientas no tienen estado propio que persista entre invocaciones (salvo que ellas mismas gestionen su propia persistencia). Cada ejecución es independiente y recibe todos los parámetros necesarios en la llamada. Esto simplifica el modelo de concurrencia y evita efectos secundarios no deseados entre distintas rondas de razonamiento. La única excepción son las herramientas que modifican el sistema de archivos: sus efectos persisten, pero el `ReasoningService` no guarda ningún estado adicional sobre ellas. La responsabilidad de mantener la coherencia recae en la propia herramienta, que utiliza el sistema RCS integrado para mantener un historial de cambios y que invoca a `AgentAccessControl` para validar el acceso a los recursos.

**Relación con la memoria reciente**

El `ReasoningService` no mantiene un registro de qué herramientas se han ejecutado en cada turno más allá de los mensajes almacenados en la memoria reciente. La trazabilidad se delega en la memoria: los `ToolExecutionResultMessage` en la memoria reciente contienen los resultados compleltos, y los turnos persistidos en `EpisodicMemory` registran la ejecución. Si una herramienta se ejecuta y su resultado se poda mediante `TrimmingOperation`, el mensaje permanece integro en la memoria reciente y en la proyectada conserva la cabecera (incluyendo el `RESOURCE_ID`), permitiendo que `PendingAnnotationOperation` detecte recursos sin anotar incluso después de la poda.

## 7. Compactación de memoria

La compactación es el mecanismo mediante el cual el agente transforma información de la memoria de trabajo en conocimiento consolidado, preservando la esencia de la conversación mientras reduce el espacio que ocupa en la ventana de contexto. Responde a tres necesidades simultáneas: gestionar la ventana de contexto para evitar que se sature, consolidar el conocimiento extrayendo las ideas clave y el proceso de descubrimiento que las generó, y mantener la atención del LLM enfocada evitando que se disperse por turnos con información irrelevante. La compactación no se limita a descartar datos; es un proceso de destilación que genera una narrativa coherente con referencias `{cite:ID}` a los turnos originales, permitiendo al agente recuperar el detalle exacto cuando lo necesita. El detalle del proceso de generación (prompt, validación de citas, modos de funcionamiento) se describe en el documento de [`MemoryCompactionService`](02-memory-compaction.md).


**Cuándo se dispara la compactación**

La compactación se evalúa al final de cada turno, después de que el modelo haya entregado una respuesta textual y se haya cerrado la interacción. El `eventDispatcher` invoca `recentMemory.needCompaction()`, que devuelve `true` si el número de turnos únicos acumulados en la memoria reciente supera un umbral configurable. Este umbral se almacena en la configuración bajo `reasoning/compaction_turns`, con un valor por defecto de 40 turnos. La elección de un umbral basado en número de turnos (y no en tokens estimados) es una simplificación deliberada, suficiente para la mayoría de los casos de uso.

**El proceso de compactación**

Cuando se cumple la condición, el `eventDispatcher` invoca al método privado `performCompaction()`, que ejecuta la siguiente secuencia:

1. **Obtención de marcas**: se recuperan dos marcas de la memoria reciente mediante `getOldestMark()` (el mensaje consolidado más antiguo) y `getCompactMark()` (aproximadamente la mitad de la sesión, ajustada para no romper un turno por la mitad). Si alguna de estas marcas es `null`, el proceso aborta.

2. **Recuperación de turnos**: con los identificadores de turno de ambas marcas, se consulta a `EpisodicMemory.getTurnsByIds(subchannel, first, last)` para obtener todos los turnos comprendidos en ese rango, filtrando por el `subchannel` correspondiente. La lista incluye turnos de usuario, ejecuciones de herramientas y respuestas del modelo. Es importante destacar que estos turnos se recuperan de la memoria episódica global, que contiene el historial completo de todos los canales; el filtro por `subchannel` permite aislar solo los turnos de la conversación que se está compactando, pero todos ellos residen en la misma fuente de verdad compartida.

3. **Generación de la nueva memoria compactada**: se invoca a `MemoryCompactionService.compact(subchannel, activeCompactedMemory, compactTurns)`. Este servicio utiliza un LLM (configurable independientemente) para generar un nuevo `CompactedMemory` que integra la información del `CompactedMemory` anterior (si existe) y los nuevos turnos. El resultado contiene dos secciones: "Resumen" (ejecutivo y factual) y "El Viaje" (narrativa cronológica con citas `{cite:ID}`). El `CompactedMemory` generado se etiqueta con el `subchannel` correspondiente, pero el conocimiento que contiene pasa a formar parte de la memoria episódica global y está disponible para cualquier canal que lo necesite. El servicio se encarga de validar las citas para evitar alucinaciones.

4. **Persistencia**: el nuevo `CompactedMemory` se persiste en `EpisodicMemory` mediante `add(compactedMemory)`. Esto guarda los metadatos en la tabla H2 y escribe el contenido textual en un archivo `.md` dentro de `var/lib/compactedmemory/`.

5. **Limpieza de la memoria reciente**: se invoca `recentMemory.remove(mark1, mark2)` para eliminar los mensajes compactados. La operación es atómica desde la perspectiva de la sesión: una vez ejecutada, los mensajes compactados desaparecen y no volverán a formar parte del contexto.

6. **Actualización del puntero activo**: `activeCompactedMemory` se actualiza al nuevo `CompactedMemory` para que futuras proyecciones lo incluyan en lugar del anterior.

**Integración con la memoria proyectada**

Una vez generado un nuevo `CompactedMemory` para un `subchannel`, este se convierte en la memoria compactada activa para ese canal. La próxima vez que se construya el contexto para ese canal (en la siguiente proyección), `ProjectedMemory` incluirá el nuevo checkpoint como un bloque de sistema. Para otros canales, su memoria compactada activa permanece inalterada, pero el conocimiento que contiene el nuevo `CompactedMemory` está disponible en la memoria episódica global si el agente necesita recuperarlo mediante búsqueda semántica o consulta directa.

Es importante destacar que, aunque la compactación se ejecuta sobre un `subchannel` concreto y genera un `CompactedMemory` etiquetado con ese canal, el conocimiento destilado reside en la memoria episódica global. Esto significa que el resumen generado para una conversación puede ser relevante para otra: si el usuario B pregunta sobre algo que se discutió en el canal A, el agente puede recuperar esa información mediante búsqueda en la memoria episódica global. El `subchannel` no aísla el conocimiento; solo organiza los turnos para que el agente pueda contextualizar su origen.

**Compactación bloqueante**

La compactación ocurre dentro del mismo hilo del `eventDispatcher`, bloqueando el procesamiento de nuevos eventos mientras se realiza. Esto es una decisión de diseño deliberada: compactar es parte del procesamiento del turno que acaba de terminar, y no deben llegar nuevos estímulos hasta que la memoria esté consolidada. Si la compactación es costosa (varias llamadas al LLM), el agente puede pausarse durante varios segundos, pero esto ocurre solo ocasionalmente.

**Acciones de depuración**

Además de la compactación automática, el servicio expone dos acciones que permiten forzar la compactación manualmente:

- `COMPACT_REASONING_SESSION`: compacta aproximadamente el 50% más antiguo del historial de la sesión, utilizando el punto de corte estándar (`getCompactMark()`). Útil para liberar contexto sin compactar toda la historia.

- `COMPACT_REASONING_FULL_SESSION`: compacta todos los turnos consolidados desde el más antiguo hasta el más reciente (`getOldestMark()` y `getNewestMark()`). Genera un único `CompactedMemory` que abarca toda la historia, útil para depuración o para liberar memoria de trabajo por completo.

Ambas acciones están disponibles en el menú de depuración de la interfaz de configuración.


## 8. Soporte multi-canal (`subchannel`)


El `ReasoningService` está diseñado para gestionar múltiples conversaciones en paralelo, cada una con su propio contexto activo (memoria reciente, compactada y proyectada). Este soporte multi-canal se materializa a través del concepto de `subchannel`, un identificador que permite organizar y filtrar los turnos de cada conversación, pero que **no aísla el conocimiento**. La memoria episódica es global para todos los canales; el `subchannel` es una etiqueta que contextualiza el origen de cada turno, no un contenedor que separe el conocimiento adquirido. Esto significa que el agente puede responder a preguntas de un usuario B sobre información que ha aprendido en una conversación con el usuario A, porque todo el conocimiento reside en la misma fuente de verdad compartida.

**Identificación del canal activo**

Cada evento que llega al `eventDispatcher` lleva asociado un `subchannel` (obtenido de `event.getSubchannel()`). Este identificador se utiliza para seleccionar las instancias de memoria correspondientes a ese canal. El método `getCurrentSubchannel()` devuelve el subchannel del evento que se está procesando actualmente, y se utiliza en todo el ciclo de vida del turno para garantizar que las operaciones de lectura y escritura de memoria se realicen sobre el canal correcto.

**Almacenamiento de memorias por canal**

El `ReasoningService` mantiene tres mapas internos que asocian cada `subchannel` con su respectiva instancia de memoria:

- **Memorias recientes** (`Map<String, RecentMemory> recentMemories`): cada canal tiene su propia `RecentMemory`, que contiene los mensajes de la sesión activa y el mapa de trazabilidad `turnOfMessage`. El archivo de persistencia de cada canal es independiente (`recent_memory-{subchannel}.json`).

- **Memorias compactadas activas** (`Map<String, CompactedMemory> activeCompactedMemories`): cada canal mantiene un puntero al último `CompactedMemory` generado, que se utiliza para inyectar la memoria a largo plazo en el contexto de las proyecciones de ese canal.

- **Memorias proyectadas** (`Map<String, ProjectedMemory> projectedMemories`): cada canal tiene su propia `ProjectedMemory`, que mantiene el estado persistente de las operaciones del pipeline (`PinnedTurnsOperation`, `TemporalPerceptionOperation`, etc.) de forma independiente. El archivo de persistencia es `projected_memory-{subchannel}.json`.

**Inicialización y acceso a las memorias**

Cuando el servicio recibe un evento de un `subchannel` que aún no tiene memorias asociadas, las crea bajo demanda:

- `getRecentMemory(subchannel)`: crea una nueva `RecentMemory` si no existe.
- `getActiveCompactedMemory(subchannel)`: obtiene el último `CompactedMemory` de `EpisodicMemory` para ese canal (o `null` si no hay ninguno) y lo almacena en el mapa.
- `getProjectedMemory(subchannel)`: crea una nueva `ProjectedMemory` si no existe, restaurando su estado desde el archivo de persistencia.

Todas estas memorias son independientes entre canales; las operaciones de compactación, poda y proyección se realizan sobre la instancia correspondiente al canal del evento que se está procesando. Esto permite al agente mantener conversaciones simultaneas, sin perder el enfoque en cada una de ellas, mientras el conocimiento de todas las conversaciones queda registrado en la memoria episodica.

**Enrutamiento de eventos**

Cuando el `eventDispatcher` recibe un evento, extrae su `subchannel` y lo utiliza para obtener las memorias correspondientes. Todo el procesamiento del turno (inyección del evento, construcción del contexto, ejecución de herramientas, compactación) se realiza sobre las memorias de ese canal. Los eventos de usuario (`SensorEventUser`) también llevan un `subchannel`, que normalmente se asigna desde la interfaz de usuario que origina el mensaje.

**Persistencia independiente**

Cada canal persiste su estado de forma independiente. Los archivos de memoria reciente y proyectada llevan el nombre del `subchannel` en su nombre de archivo (`recent_memory-{subchannel}.json`, `projected_memory-{subchannel}.json`). La base de datos H2 también incluye el `subchannel` en las tablas `episodicmemory` y `compactedmemory`, lo que permite diferenciar con quien estaba conversando cuando adquirio ese conocimiento.

## 9. Métricas y depuración

El `ReasoningService` proporciona un conjunto de métodos y mecanismos que permiten monitorizar el estado interno del agente y facilitar la depuración de su comportamiento. Estas capacidades son esenciales para entender cómo se está utilizando el contexto, identificar posibles cuellos de botella y diagnosticar problemas en la interacción con el LLM.

**Estimación de tokens**

El servicio expone tres métodos de estimación que permiten calcular el consumo de tokens del contexto antes de enviarlo al modelo:

- **`estimateSystemPromptTokenCount(subchannel)`**: estima el número de tokens que ocupará el prompt de sistema (generado por `getBaseSystemPrompt()`) para un canal dado. Esta estimación se realiza utilizando el `TokenCountEstimator` de LangChain4j (por defecto, `OpenAiTokenCountEstimator` con modelo `gpt-4o`). El prompt de sistema se envuelve en una lista de mensajes y se estima su tamaño, proporcionando una métrica del overhead fijo que el agente añade a cada consulta.

- **`estimateToolsTokenCount(subchannel)`**: estima el número de tokens que ocuparán las especificaciones de herramientas activas (`ToolSpecification`) cuando se serialicen en la llamada al modelo. Para cada herramienta activa y permitida por `AgentAccessControl`, se serializa su especificación a texto y se estima el número de tokens. Se añade un overhead fijo por herramienta (15 tokens) para cubrir la estructura de la llamada.

- **`estimateMessagesTokenCount(subchannel)`**: estima el número de tokens que ocuparán los mensajes de la memoria reciente proyectada (incluyendo las transformaciones del pipeline). Este método obtiene la proyección actual mediante `projectedMemory.getMessages(recentMemory, activeCompactedMemory, systemPrompt)` y estima el tamaño de la lista de mensajes resultante.

Estas tres estimaciones se suman para proporcionar una visión aproximada del total de tokens que consumirá la próxima consulta al modelo. La UI del agente (Swing, Lanterna, Web) muestra esta información en tiempo real, permitiendo al usuario monitorizar el uso del contexto y anticipar posibles saturaciones.

**Volcado de contexto para depuración**

Durante la construcción del contexto, `ProjectedMemory` escribe un volcado de la proyección final en un archivo JSON dentro de `var/tmp/`. El nombre del archivo sigue el patrón `context-{subchannel}-{timestamp}.json`, donde `timestamp` es la marca de tiempo en formato ISO. Este volcado contiene la lista completa de mensajes que se enviarán al LLM, serializados en el formato de LangChain4j (con adaptadores Gson para `ChatMessage` y `Content`).

Este mecanismo es fundamental para depurar problemas de contexto: permite inspeccionar exactamente qué está viendo el modelo en cada turno, incluyendo el prompt de sistema, la memoria compactada, los mensajes recientes y las transformaciones aplicadas por el pipeline (poda, notificaciones, fijación). Los archivos se acumulan en `var/tmp/` y pueden ser eliminados manualmente; no hay una política de rotación automática.

**Acciones forzadas de compactación**

Además de la compactación automática (disparada por `needCompaction()`), el servicio expone dos acciones de depuración que permiten forzar la compactación manualmente:

- **`COMPACT_REASONING_SESSION`**: compacta aproximadamente el 50% más antiguo del historial de la sesión, utilizando el punto de corte estándar (`RecentMemory.getCompactMark()`). Esta acción es útil para liberar contexto sin compactar toda la historia, permitiendo al usuario o al desarrollador evaluar el impacto de la compactación en el comportamiento del modelo.

- **`COMPACT_REASONING_FULL_SESSION`**: compacta todos los turnos consolidados desde el más antiguo hasta el más reciente (`getOldestMark()` y `getNewestMark()`). Genera un único `CompactedMemory` que abarca toda la historia, forzando una compactación total que puede ser útil para depurar la memoria a largo plazo o para reiniciar el estado de la memoria reciente desde cero.

Ambas acciones están disponibles en el menú de depuración de la interfaz de configuración y se ejecutan a través de `AgentActions.call()`.

**Monitorización en tiempo real**

La UI del agente muestra en su barra de estado información en tiempo real sobre el estado del `ReasoningService`:

- **Modelo activo**: el identificador del modelo de lenguaje que se está utilizando (`model.getParameters().modelId()`).
- **Turnos acumulados**: el número de turnos únicos en la memoria reciente (`recentMemory.getTurnsCount()`).
- **Tokens estimados**: el total de tokens estimados para la próxima consulta (suma de las tres estimaciones anteriores) y el límite de contexto del modelo (`model.getContextSize()`).

Esta información se actualiza al final de cada turno (en `updateMetadata()`) y se utiliza para que el usuario pueda anticipar cuándo se disparará la compactación y cómo está evolucionando el consumo de contexto.

**Depuración avanzada con el panel de depuración**

El `ReasoningService` también se integra con el panel de depuración interactivo (accesible mediante la acción `DEBUG_DIALOG`). Este panel, basado en MVEL (un motor de expresiones), permite inspeccionar y modificar el estado interno del servicio en tiempo real. El contexto de evaluación incluye:

- `self`: la instancia del `ReasoningService` actual.
- `agent`: la instancia del agente.
- `agentManager`: el `AgentManager` global.

Desde el panel, el desarrollador puede, por ejemplo, consultar el contenido de la memoria reciente (`self.getRecentMemory("default").getMessages()`), forzar una compactación (`self.performCompaction()`), o inspeccionar el estado de las herramientas (`self.getAvailableTools()`). Esto proporciona una capacidad de depuración sin precedentes para entender el comportamiento interno del agente en tiempo real.


## 10. Limitaciones conocidas

El `ReasoningService` es el resultado de un proceso iterativo de diseño, donde cada decisión ha buscado un equilibrio entre funcionalidad, simplicidad y robustez. Como en cualquier sistema complejo, algunas de esas decisiones introducen limitaciones que merecen ser documentadas explícitamente.

**Modelo de un solo hilo**

El `eventDispatcher` se ejecuta en un único hilo de plataforma, procesando los eventos de forma secuencial y bloqueante. Esta arquitectura elimina complejidades de concurrencia (no hay condiciones de carrera, no hay necesidad de sincronización), pero implica que la ejecución de herramientas lentas (búsquedas web, comandos shell largos) bloquea todo el agente. Durante ese tiempo, no se atienden nuevos eventos. En la práctica, esto rara vez es un problema porque el agente no puede hacer dos cosas a la vez, pero podría serlo si se implementaran herramientas de larga duración que requirieran procesamiento en paralelo. El código incluye un comentario sobre la posibilidad de lanzar `shell_execute` en un hilo aparte, pero actualmente no está implementado.

**Compactación basada en número de turnos**

El umbral de compactación se mide en número de turnos (40 por defecto), no en tokens estimados. Medir tokens requeriría estimar el tamaño de cada mensaje antes de compactar, lo que añade complejidad y llamadas adicionales al modelo. El número de turnos es una aproximacion razonablemente bueno para la longitud de la conversación, pero tiene limitaciones: conversaciones con herramientas no paginadas que devuelven grandes volúmenes de texto pueden saturar la ventana de contexto mucho antes de alcanzar los 40 turnos. Por el contrario, conversaciones muy largas pero con mensajes muy cortos podrían acumular muchos más turnos antes de necesitar compactación. El código tiene comentarios sobre la posibilidad de combinar ambos criterios, pero no está implementado.

**La simulación de `pool_event` y el TODO pendiente**

Los eventos del entorno se inyectan en la memoria reciente mediante un par de mensajes que simulan una llamada a la herramienta `pool_event`. Esto mantiene la coherencia del historial desde la perspectiva del modelo, pero el código contiene un `TODO` que advierte de un posible fallo cuando el primer mensaje que se envía al LLM es una llamada simulada a `pool_event`. En ciertas condiciones (probablemente relacionadas con la inicialización del modelo o con la ausencia de un mensaje de usuario previo), esta llamada podría fallar. No se ha reproducido sistemáticamente, pero la advertencia permanece pendiente de investigación.

**Reintentos de herramientas no formalizadas**

Cuando el modelo devuelve `FinishReason.TOOL_EXECUTION` pero no hay solicitudes de herramientas en la respuesta, el bucle inyecta un mensaje de usuario que pide reintentar la llamada, con un límite de tres intentos. Es un parche pragmático para mantener la conversación fluyendo, pero no resuelve la causa raíz. Depende de que el modelo entienda el mensaje de reintento, lo que no siempre ocurre. Un enfoque más robusto requeriría un análisis más fino del formato de respuesta del modelo, pero actualmente no está implementado.

**Uso de hilos de plataforma en lugar de virtuales**

El `eventDispatcher` se ejecuta en un hilo de plataforma (`Thread.ofPlatform()`), no en un hilo virtual (`Thread.ofVirtual()`). Inicialmente se utilizaron hilos virtuales, pero se encontraron problemas durante la depuración (posiblemente relacionados con la integración con Swing o con el propio depurador). Se revirtió a hilos de plataforma para estabilidad. Dado que solo hay un hilo principal, la ventaja de los hilos virtuales en este contexto es marginal, pero si en el futuro se introdujeran múltiples hilos de procesamiento, habría que reconsiderar esta elección.

**Confirmación humana bloqueante**

La confirmación a través de `AgentConsole.confirm()` es bloqueante. Mientras el usuario decide, el agente no procesa nuevos eventos. Esto es correcto desde la perspectiva de seguridad, pero puede ser frustrante si el usuario tarda en responder. No hay un mecanismo de timeout que permita al agente continuar después de un tiempo de espera. En entornos headless o automatizados, esto puede ser problemático.

**Prompt de sistema reconstruido en cada consulta**

`getBaseSystemPrompt()` se invoca cada vez que se construye el contexto, aunque el resultado se cachea en `lastestSystemPrompt`. La reconstrucción tiene un costo pequeño (concatenación de cadenas, lectura de archivos), pero podría optimizarse si el prompt no cambia frecuentemente. Actualmente, se reconstruye para reflejar cambios en la configuración de identidad (activación/desactivación de módulos).

**Ausencia de monitorización de tokens en tiempo real**

El servicio estima el tamaño del contexto (`estimateMessagesTokenCount()`, `estimateToolsTokenCount()`), pero no utiliza esta información para decisiones en tiempo real (por ejemplo, para compactar antes de que el contexto exceda un límite). La estimación de tokens es una operación que implica llamar al modelo de lenguaje (LangChain4j proporciona métodos para ello, pero internamente pueden requerir tokenizadores específicos). Hacerlo en cada iteración añadiría overhead, y el límite de contexto de los modelos actuales es lo suficientemente grande (128K o 1M tokens) como para que el umbral de 40 turnos sea un límite más restrictivo en la práctica. Sin embargo, con modelos de ventana pequeña (8K tokens) o herramientas que devuelven grandes cantidades de texto, esta estrategia puede fallar.


**No hay timeout para la generación del modelo**

Actualmente, la llamada a `model.generate()` no tiene un timeout global. Si el modelo tarda mucho en responder (por ejemplo, por problemas de red o saturación del proveedor), el hilo del `eventDispatcher` se bloquea indefinidamente. El código incluye un mecanismo de *stall detection* que emite warnings si no hay eventos del stream durante un tiempo, pero no interrumpe la llamada. Esto podría dejar al agente colgado si el proveedor LLM no responde.
