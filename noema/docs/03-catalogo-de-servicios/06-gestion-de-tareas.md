
# Servicio de gestión de tareas (`TaskService`)

> Nota:  
> Actualmente esto es solo una idea a implementar.
>

## 1. Introducción y propósito: externalizando la memoria de trabajo

### 1.1. El límite de la planificación en contexto (*Context Rot*)

Los modelos de lenguaje operan bajo una restricción fundamental: su ventana de contexto es finita y su capacidad de atención se degrada progresivamente a medida que el historial se llena de tokens (*lost in the middle* y *context rot*). Cuando un agente se enfrenta a un objetivo complejo de ingeniería (como refactorizar varios módulos, migrar una base de datos o indexar un árbol extenso de archivos), la estrategia ingenua de confiar en que el LLM mantenga el plan completo de pasos "en su cabeza" (dentro del prompt conversacional) colapsa con rapidez.

A lo largo de decenas de turnos interactivos, la acumulación de salidas de herramientas, logs y respuestas intermedias diluye la atención del modelo. El plan inicial se desplaza hacia las zonas frías del contexto, provocando que el agente olvide qué subtareas ha completado, repita operaciones ya realizadas o salte arbitrariamente a conclusiones prematuras sin haber satisfecho los prerrequisitos técnicos. 

Intentar resolver esto inyectando el plan completo de tareas en el prompt de sistema en cada turno resulta contraproducente: consume una cuota fija de tokens y satura la atención con estados estáticos que no son relevantes en cada paso atómico del razonamiento.

### 1.2. Contención del "sesgo agéntico" y la compulsión ejecutiva

Los LLMs modernos, fuertemente alineados mediante aprendizaje por refuerzo (RLHF) para ser resolutivos, presentan un marcado **sesgo agéntico**: ante una instrucción del usuario o un problema técnico evidente, su impulso probabilístico masivo es *actuar de inmediato*. Tienden a escribir código, modificar archivos o invocar herramientas destructivas en el primer turno, saltándose la fase de análisis estructural.

En Noema, la experiencia empírica ha demostrado que las prohibiciones directas en lenguaje natural (*"No modifiques nada todavía"*) fracasan frente a la gravedad semántica del modelo. La única forma efectiva de contener esta hiperactividad es **rediseñar el terreno de juego** (*construir valles de menor resistencia*):
* Ofrecer una herramienta explícita para registrar el plan (`task_add`).
* Definir en las directivas de identidad que el éxito de la tarea reside en descomponer el problema y verificar dependencias antes de tocar el sistema de archivos.

El subsistema de tareas no es, por tanto, una simple utilidad de conveniencia; es un **mecanismo de contención y encauzamiento cognitivo**. Transforma la ansiedad ejecutiva del modelo en un proceso deliberado de planificación previa.

### 1.3. La lista de tareas como artefacto neuro-simbólico

Para evitar tanto la saturación de contexto como las alucinaciones de seguimiento, Noema adopta una aproximación neuro-simbólica: **la memoria de trabajo del plan se externaliza fuera de la ventana de atención del LLM y se delega en un motor determinista**.

El modelo de lenguaje (componente neuronal) se encarga de la percepción, el desglose conceptual del problema y la toma de decisiones puntuales. El estado de las tareas, sus identificadores únicos, sus dependencias jerárquicas (`dependsOn`, `parentId`) y sus transiciones de estado (`pending` $\rightarrow$ `running` $\rightarrow$ `done`) se confían a una base de datos relacional H2 gestionada por código Java determinista (componente simbólico).

Bajo este paradigma:
1. El LLM no memoriza las tareas; las consulta bajo demanda mediante filtros precisos (`task_list(status: "pending")`).
2. El contexto conversacional se mantiene limpio y centrado exclusivamente en el paso actual.
3. Si el contexto activo sufre una consolidación narrativa o el agente se reinicia, el estado del plan de trabajo permanece inmutable y consultable en disco.


## 2. Arquitectura del servicio y modelo de datos

El subsistema de gestión de tareas se implementa a través de `TaskServiceImpl`, un componente que hereda de `AgentService` y cuyo ciclo de vida es gestionado por `TaskServiceFactory`. Para garantizar que el estado de las tareas sobreviva a los reinicios del agente y a las consolidaciones de la memoria episódica, la persistencia se delega en la base de datos de servicios (`service.mv.db`), separando físicamente la memoria de planificación de la memoria de la conversación.

### 2.1. Modelo de Persistencia (Esquema de Base de Datos)

Durante la fase de inicialización (`start()`), el servicio utiliza su `ConnectionSupplier` para garantizar la existencia de la tabla `TASKS` en H2. El esquema relacional está diseñado para soportar jerarquías (subtareas) y grafos dirigidos (dependencias):

```sql
CREATE TABLE IF NOT EXISTS TASKS (
    id VARCHAR(50) PRIMARY KEY,       -- Identificador único (ej: 'TASK-001')
    title VARCHAR(255) NOT NULL,      -- Título corto y descriptivo
    description CLOB,                 -- Detalle completo de la tarea
    status VARCHAR(20) NOT NULL,      -- Estado actual de la máquina de estados
    parent_id VARCHAR(50),            -- Referencia recursiva a la tarea padre (opcional)
    depends_on CLOB,                  -- Array JSON con IDs de tareas bloqueantes
    surface CLOB,                     -- Objeto JSON con metadatos para UI (ej: diagramas DAG)
    progress_text VARCHAR(255),       -- Texto descriptivo del avance ("Compilando módulo X...")
    progress_percent INT,             -- Porcentaje de completitud (0-100)
    job_id VARCHAR(50),               -- Enlace opcional a un Subagente en ejecución
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### 2.2. Máquina de Estados

Cada tarea transita por una máquina de estados estricta, validada a nivel de servicio. Los estados permitidos y su semántica son:

*   **`pending`**: Estado inicial. La tarea está registrada pero no ha comenzado.
*   **`running`**: La tarea está actualmente en ejecución por el agente o por un subagente delegado (`job_id`).
*   **`done`**: La tarea ha finalizado con éxito.
*   **`blocked`**: La tarea no puede avanzar. El servicio aplicará validaciones semánticas: si una tarea *A* depende de una tarea *B* (`dependsOn`), *A* debería considerarse `blocked` (o el servicio advertirá al intentarlo) hasta que *B* alcance el estado `done`.
*   **`failed`**: La ejecución de la tarea ha fallado y requiere intervención o replanificación.

### 2.3. Contrato del API (`TaskService`)

Para mantener una arquitectura limpia, las herramientas (`AgentTool`) que se exponen al LLM actuarán como **"Thin Proxies"** (adaptadores ligeros). Su única responsabilidad será parsear el JSON de los argumentos entrantes, invocar los métodos del `TaskService`, y formatear la salida en texto/Markdown. 

Toda la lógica de negocio (validación de IDs, comprobación de dependencias circulares, gestión de transacciones H2) residirá en la interfaz Java del servicio:

```java
/**
 * Servicio de gestión de memoria de trabajo a largo plazo (Planificación).
 * 
 * NOTA ARQUITECTÓNICA: La existencia de este servicio y sus herramientas
 * correspondientes NO garantiza su uso por parte del LLM. Este componente 
 * está fuertemente acoplado a la directiva de identidad definida en 
 * 'var/identity/core/03_task_management.md'. Sin la inyección de dicho 
 * prompt de sistema, el modelo ignorará la planificación externa y recaerá 
 * en su sesgo de ejecución inmediata.
 */
public interface TaskService extends AgentService {

    String NAME = "TaskService";

    /**
     * Estados posibles por los que transita una tarea.
     */
    enum TaskStatus {
        PENDING("pending"),
        RUNNING("running"),
        DONE("done"),
        BLOCKED("blocked"),
        FAILED("failed");

        private final String value;

        Status(String value) {
            this.value = value;
        }

        public String getValue() {
            return value;
        }

        public static Status fromString(String text) {
            if (text == null || text.isBlank()) {
                return PENDING;
            }
            for (Status s : Status.values()) {
                if (s.value.equalsIgnoreCase(text.trim())) {
                    return s;
                }
            }
            return PENDING;
        }
    }
    
    /**
    * Contrato que representa una unidad de planificación (Tarea) dentro de 
    * la memoria de trabajo persistente del agente.
    * 
    * Sigue el patrón de entidad de dominio inmutable en lectura: cualquier cambio
    * de estado o actualización debe canalizarse a través de los métodos de mutación
    * de {@link TaskService}.
    */
    public interface Task {

        /**
        * Identificador único de la tarea (ej: "TASK-001").
        */
        String getId();

        /**
        * Título corto y descriptivo de la acción a realizar.
        */
        String getTitle();

        /**
        * Descripción detallada, contexto o especificación técnica (opcional).
        */
        String getDescription();

        /**
        * Estado actual en la máquina de estados.
        */
        TaskStatus getStatus();

        /**
        * Identificador de la tarea padre si forma parte de un desglose jerárquico,
        * o {@code null} si es una tarea raíz.
        */
        String getParentId();

        /**
        * Lista inmutable de identificadores de tareas que deben estar en estado
        * {@link Status#DONE} antes de que esta tarea pueda transicionar a {@link Status#RUNNING}.
        */
        List<String> getDependsOn();

        /**
        * Identificador del subagente (o proceso en segundo plano) asignado a la
        * ejecución de esta tarea, o {@code null} si la ejecuta el agente principal.
        */
        String getJobId();

        /**
        * Información sobre el progreso actual de la tarea.
        */
        int getProgress();

        /**
        * Documento estructurado en JSON para renderizado de componentes visuales
        * en la interfaz de usuario (ej: diagramas DAG, tablas de datos).
        */
        String getSurface();

        LocalDateTime getCreatedAt();

        LocalDateTime getUpdatedAt();

        /**
        * Indica si la tarea se encuentra en un estado terminal (éxito o fallo).
        */
        default boolean isCompleted() {
            return getStatus() == Status.DONE || getStatus() == Status.FAILED;
        }

        /**
        * Indica si la tarea tiene dependencias declaradas.
        */
        default boolean hasDependencies() {
            List<String> deps = getDependsOn();
            return deps != null && !deps.isEmpty();
        }

        /**
        * Formatea la tarea en una única línea de texto Markdown para ser consumida
        * de forma densa y eficiente por la herramienta {@code task_list}.
        * 
        * Ejemplo de salida:
        * {@code - [running] TASK-05 (progreso: 60%, job: 42): Refactorizar capa DAL }
        */
        String toSummaryLine();
    }
    
    /**
     * Crea una nueva tarea en estado 'pending'.
     * @param title Título corto (requerido).
     * @param description Descripción detallada (opcional).
     * @param parentId ID de la tarea padre para crear jerarquías (opcional).
     * @param dependsOn Lista de IDs de tareas de las que depende (opcional).
     * @param surface Metadatos en formato JSON string para renderizado UI (opcional).
     * @return El ID de la tarea generada (ej: "TASK-42").
     */
    String addTask(String title, String description, String parentId, 
                   List<String> dependsOn, String surface);

    /**
     * Actualiza uno o varios campos de una tarea existente.
     * @param id ID de la tarea a actualizar (requerido).
     * @param updates Mapa con los campos a modificar (ej: "status" -> "running", "progress_percent" -> 50).
     * @return true si se actualizó correctamente.
     * @throws TaskNotFoundException si el ID no existe en H2.
     * @throws InvalidTaskStateException si se intenta una transición de estado ilegal 
     *         (ej: pasar a 'running' si una dependencia sigue en 'pending').
     */
    boolean updateTask(String id, Map<String, Object> updates) throws Exception;

    /**
     * Elimina una tarea individual.
     * @param id ID de la tarea.
     * @return true si se eliminó, false si no existía.
     */
    boolean deleteTask(String id);

    /**
     * Elimina en bloque todas las tareas cuyo estado sea 'done' o 'failed'.
     * Utilizado para operaciones de mantenimiento (autolimpieza).
     * @return El número de tareas eliminadas.
     */
    int clearCompletedTasks();

    /**
     * Recupera una lista paginada y filtrada de tareas.
     * @param filter preficate usado para filtrar las tareas a devolver.
     * @return Lista de objetos Task con la información de las tareas.
     */
    Collection<Task> listTasks(Predicate<Task> filter);
    
    /**
     * Método de utilidad para introspección del servicio.
     * @return Número total de tareas en estado 'done' o 'failed'.
     */
    int countCompletedTasks();
    
    Task getTask(String taskid);
}
```

> Nota:  
> Habria que valorar la adecuado de que listTask devuelba una collecion al vuelo 
> en lugar de cargarla toda en memoria.
>


### 2.4. Integración semántica del campo `job_id`

Aunque el servicio es una base de datos genérica de tareas, el campo `job_id` posee una semántica específica dentro del ecosistema Noema. Está diseñado como un puente de sincronización con `SubagentImpl`. 

Cuando el LLM decide paralelizar un trabajo utilizando la herramienta `launch_subagent`, obtiene como respuesta un identificador (ej: ID del subagente en segundo plano). A través de un `updateTask`, el LLM puede inyectar ese ID en el campo `job_id` de una tarea que pase a estado `running`. Esto establece un enlace simbólico en la base de datos que, en iteraciones futuras, permitirá al orquestador interceptar la finalización del subagente y actualizar automáticamente el estado de la tarea vinculada a `done` o `failed`, liberando al hilo principal de tener que hacer un seguimiento manual.

## 3. El catálogo de herramientas (Efectores y Sensores)

Para que el LLM pueda interactuar con el `TaskService`, debemos exponer las capacidades de la base de datos a través de herramientas estandarizadas (`AgentTool`). Estas herramientas actuarán como **"Thin Proxies"**: no contendrán lógica de negocio, limitándose a parsear el JSON de los argumentos, invocar al servicio y serializar la respuesta.

### 3.1. Gestión de modos y confirmación humana (El paradigma `MODE_READ`)

En la arquitectura de seguridad de Noema (`AgentAccessControl`), el modo `MODE_WRITE` está diseñado para proteger recursos externos críticos (archivos del proyecto, configuración, repositorios). Si marcásemos las herramientas de creación y actualización de tareas como `MODE_WRITE`, el agente solicitaría confirmación humana para *cada paso de su planificación*, destruyendo por completo su autonomía y frustrando la experiencia del usuario.

Por tanto, al igual que ocurre con `annotate_observation` (que escribe en la memoria episódica H2 pero se declara como `MODE_READ`), **todas las herramientas de gestión de tareas se declararán como `MODE_READ`**. Modifican el estado interno del agente (la base de datos H2 de servicios), pero no alteran el entorno del sistema operativo ni el código fuente, por lo que son seguras para ejecutarse de forma desatendida. En cuanto a la categorización semántica, su `getType()` será `AgentTool.TYPE_OPERATIONAL`.

### 3.2. Herramientas de Mutación (Efectores)

Estas herramientas permiten al modelo alterar el grafo de planificación.

*   **`task_add` (`TaskAddTool`)**
    *   *Propósito:* Inyecta una nueva tarea en el sistema con estado `pending`.
    *   *Parámetros del Spec:* `title` (requerido), `description`, `parentId`, `dependsOn` (array), `surface`.
    *   *Ejecución:* Parsea los argumentos y llama a `taskService.addTask(...)`. Devuelve un JSON confirmando la creación y el `id` asignado, lo cual es fundamental para que el LLM pueda encadenar dependencias en el mismo turno.

*   **`task_update` (`TaskUpdateTool`)**
    *   *Propósito:* Actualiza el estado o metadatos de una tarea (ej: transición de `pending` a `running` o `done`, actualización de porcentaje en `progress`, o inyección de un `jobId` al delegar en un subagente).
    *   *Parámetros del Spec:* `id` (requerido), `title`, `status`, `description`, `parentId`, `dependsOn`, `surface`, `progress`, `jobId`.
    *   *Ejecución:* Llama a `taskService.updateTask(...)`. El servicio validará si la transición de estado es lícita antes de aplicar el cambio.

*   **`task_delete` (`TaskDeleteTool`)**
    *   *Propósito:* Elimina una tarea individual (por ejemplo, si el LLM replantea su estrategia y un paso ya no es necesario).
    *   *Parámetros del Spec:* `id` (requerido).

*   **`clear_completed` (`TaskClearCompletedTool`)**
    *   *Propósito:* Herramienta de mantenimiento en bloque para eliminar todas las tareas en estado `done` o `failed`.
    *   *Parámetros del Spec:* `confirm` (booleano). Si no se envía a `true`, la herramienta devuelve un aviso con el recuento de tareas que se van a borrar para evitar purgas accidentales.


### 3.3. Herramienta de Consulta (Sensor): El reto de la Paginación

La consulta del plan de trabajo presenta un riesgo arquitectónico grave: si un proyecto a largo plazo acumula 200 tareas, volcar la lista completa en formato JSON/Markdown destruiría la ventana de contexto del LLM y desencadenaría podas agresivas (`TrimmingOperation`).

Para evitarlo, la herramienta de consulta hereda de la infraestructura de paginación del agente:

*   **`task_list` (`TaskListTool` extiende de `AbstractPaginatedAgentTool`)**
    *   *Propósito:* Proporcionar una vista estructurada de la memoria de trabajo.
    *   *Parámetros del Spec:* 
        *   `status` (string, opcional): Filtra por estado.
        *   `limit` (integer, opcional): Default a 20.
        *   `offset` (integer, opcional): Default a 0.
        *   `includeCompleted` (boolean, opcional): Default a `false` (enfoca la atención del modelo solo en lo pendiente/activo).
    *   *Ejecución y Paginación:* 
        1. La herramienta consulta a `taskService.listTasks(...)`.
        2. Formatea la lista en Markdown denso pero legible: `- [running] TASK-05: Refactorizar capa de persistencia (jobId: async_88)`.
        3. A través de la lógica de `AbstractPaginatedAgentTool`, el resultado se escribe en un archivo temporal (`var/tmp/tasks_<uuid>.out`).
        4. Al LLM se le devuelve únicamente la cabecera del protocolo, las primeras líneas correspondientes al `limit`, y el crucial `HINT`:
           ```
           STATUS: ok
           EMPTY: false
           LINE_RANGE: 0-19
           TOTAL_LINES: 85
           HINT: To read the next block, call 'read_paginated_resource' with args: {"resource_id": "tmp://tasks_1234.out", "offset": 20, "limit": 20}
           ---
           - [running] TASK-01...
           ```
    *   *Beneficio:* El LLM recupera solo la fracción del plan que necesita en ese instante, preservando sus tokens para el razonamiento de la tarea activa.


> Nota:   
> Añadir tool getTask
>
    
## 4. Integración cognitiva: Memoria Proyectada y autolimpieza

A medida que el agente completa fases de un proyecto, la base de datos de tareas acumulará inevitablemente registros en estado `done` o `failed`. Aunque la herramienta `task_list` filtra por defecto las tareas completadas, una acumulación masiva de registros históricos en la base de datos es ineficiente y contamina la memoria de trabajo a largo plazo.

Para evitar que el usuario tenga que ordenarle al agente "limpia tus tareas", dotaremos al sistema de un mecanismo de **propiocepción y autolimpieza**. El orquestador avisará pasivamente al LLM cuando su "escritorio" esté desordenado.

### 4.1. La Operación `TaskCleanupOperation`

Aprovechando el *pipeline* de la Memoria Proyectada (`ProjectedMemory`), crearemos una nueva operación llamada `TaskCleanupOperation`. Esta clase implementará la interfaz `ProjectedMemoryOperation` y se ejecutará en cada turno de la conversación justo antes de enviar el contexto al modelo.

**Características técnicas de la operación:**
*   **Prioridad:** Baja (ej. `25`), de modo que se ejecute después de `TrimmingOperation` y `PendingAnnotationOperation`.
*   **Estado persistente:** Mantendrá en su JSON de estado una variable `lastNotifiedTurn` para evitar enviar el aviso en cada interacción (evitando saturar o molestar al LLM de forma constante).
*   **Acoplamiento:** La operación recibirá una referencia directa al `TaskService` en su constructor, permitiéndole consultar la base de datos sin fricción.

### 4.2. Lógica de activación e inyección efímera

En su método `process(...)`, la operación ejecutará la siguiente evaluación:

1.  **Evaluación de intervalo:** Comprueba el turno actual (`memory.getLastInteractionTurn()`). Si `turnoActual - lastNotifiedTurn < 10` (intervalo de gracia), la operación aborta silenciosamente.
2.  **Evaluación de umbral:** Consulta al servicio mediante `taskService.countCompletedTasks()`. Si el número de tareas en estado `done` o `failed` supera un umbral predefinido (por ejemplo, 10 tareas).
3.  **Generación de la notificación:** Si ambas condiciones se cumplen, la operación añade el siguiente mensaje a la lista de `notifications` efímeras del pipeline:

```text
[RECORDATORIO DEL SISTEMA: Mantenimiento de tareas]
Tu base de datos de tareas contiene actualmente X registros en estado 'done' o 'failed'. 
Una lista de tareas saturada dificulta la trazabilidad de los proyectos activos.
Considera utilizar la herramienta 'clear_completed' para limpiar los registros obsoletos, 
o 'task_delete' si deseas hacer una purga manual.
```

4.  **Actualización de estado:** Se actualiza `lastNotifiedTurn` con el turno actual y se persiste el estado de la operación.

Al igual que ocurre con otras notificaciones de la Memoria Proyectada, este mensaje se inyectará al final del contexto simulando un evento de `pool_event`. El LLM lo leerá como una señal natural de su propio sistema nervioso y, gracias al sesgo agéntico que ya posee, es altamente probable que en su siguiente iteración invoque `clear_completed` de forma proactiva, manteniendo el sistema limpio sin intervención humana.

### 4.3. Registro dinámico (Módulo autocontenido)

Para mantener la arquitectura limpia y evitar que el núcleo de Noema (`AgentManagerImpl`) se acople a un servicio específico, la inyección de esta operación no se hará en el constructor global. 

La fábrica y la operación residirán en el mismo paquete que el servicio (ej. `io.github.jjdelcerro.noema.lib.impl.services.tasks.operations`). Será el propio `TaskServiceImpl` quien, durante su ciclo de arranque, "conecte" su sensor al cerebro del agente:

```java
@Override
public void start() {
    // 1. Inicializar BD H2 para tareas...
    // 2. Levantar el servicio...
    
    // 3. Registrar el "pepito grillo" en la memoria proyectada del agente
    AgentLocator.getAgentManager().registerProjectedMemoryOperation(
        new TaskCleanupOperationFactory(this)
    );
    
    this.running = true;
}
```

Este diseño asegura **alta cohesión**: si el usuario desactiva el servicio de tareas o si el módulo se elimina, el agente arranca sin errores de dependencias rotas y la operación de limpieza desaparece automáticamente del pipeline de memoria.


## 5. Protocolo operativo: forzando la "gravedad semántica"

Como quedó demostrado en los experimentos que dieron forma a la arquitectura de Noema, **dotar a un LLM de herramientas no garantiza que las use**. Si exponemos el `TaskService` sin alterar el contexto fundacional del agente, el modelo sucumbirá a su sesgo agéntico natural: ante un problema complejo (ej. "migra el módulo de base de datos"), intentará resolverlo modificando código inmediatamente, ignorando por completo las herramientas de planificación.

Para alterar este comportamiento, no debemos usar prohibiciones frágiles (*"No ejecutes código sin planificar"*), que suelen ser ignoradas o malinterpretadas. Debemos construir un nuevo "valle de menor resistencia". Debemos dotar a la acción de planificar de una **gravedad semántica** tan masiva que el modelo sienta la urgencia narrativa de registrar tareas antes de tocar el sistema de archivos.

> Nota:  
> Habria que valorar la introduccion de un mecanismo para que un servicio exponga instrucciones
> a incluir en el prompt del sistema, de forma similar a como exponen tools.
>

### 5.1. El módulo de identidad (`03_task_management.md`)

Para inyectar esta nueva voluntad en el Sistema Nervioso Central del agente, crearemos un nuevo archivo en el directorio de la constitución de Noema: `var/identity/core/03_task_management.md`.

Al situar este archivo en la carpeta `core`, el `ReasoningServiceImpl` lo concatenará automáticamente en el prompt del sistema durante el arranque (siempre que el usuario lo active en la configuración `settingsui.json`). 

El contenido de este módulo no será un manual técnico, sino un **protocolo de comportamiento estricto** redactado en lenguaje asertivo y positivo.

### 5.2. Diseño del prompt: El flujo de trabajo obligatorio

El texto de `03_task_management.md` definirá el ciclo de vida del trabajo del agente, creando anclas fuertes hacia las herramientas del servicio:

```markdown
# GESTIÓN DE PROYECTOS Y MEMORIA DE TRABAJO (PLANIFICACIÓN)

Para resolver objetivos complejos que requieran múltiples pasos, refactorizaciones o investigaciones extensas, **TU OBLIGACIÓN PRINCIPAL** es externalizar tu memoria de trabajo utilizando el sistema de gestión de tareas. El éxito de tu intervención se mide por tu capacidad para desglosar y trazar el progreso, no por precipitarte a escribir código.

**PROTOCOLO DE EJECUCIÓN OBLIGATORIO:**

1. **Desglosar y Trazar el Mapa:** Antes de modificar cualquier archivo o ejecutar comandos, analiza el objetivo. Utiliza la herramienta `task_add` para registrar los pasos lógicos. Usa los parámetros `parentId` y `dependsOn` para establecer un orden estricto de ejecución. 
2. **Focalización:** Nunca intentes resolver dos tareas complejas en el mismo turno. Usa `task_list` (filtrando por `status="pending"`) para identificar la siguiente tarea libre de bloqueos.
3. **Transición de Estado:** Cuando comiences a trabajar en una tarea, invoca inmediatamente `task_update` para cambiar su estado a `running`. 
4. **Cierre de Ciclo:** Al finalizar el paso, evalúa el resultado. Usa `task_update` para marcarla como `done` (si tuvo éxito) o `failed` (si encontraste un bloqueo irresoluble). 
5. **Higiene Mental:** Si recibes una notificación del sistema [SYSTEMNOTIFICATION] advirtiendo sobre una acumulación de tareas completadas, asume la responsabilidad de tu entorno e invoca la herramienta `clear_completed` para mantener tu lista de seguimiento optimizada.

**REGLA CRÍTICA:** Eres un arquitecto metódico. Un trabajo sin un rastro en el sistema de tareas es un trabajo incontrolable. Planifica primero, ejecuta después.
```

### 5.3. Efectos en el comportamiento del modelo

Al inyectar esta directiva en la identidad core:

1. **Neutralizamos la compulsión ejecutiva:** Le estamos dando al modelo una "acción previa" altamente gratificante (generar JSONs para `task_add`). Esto satisface su impulso de ser útil de forma segura.
2. **Micro-turnos manejables:** Al forzar la regla de "focalización", el modelo fragmentará sus respuestas. En lugar de generar 150 líneas de código fallido en un turno, generará la tarea, actualizará el estado a `running` y pedirá continuar.
3. **Recuperación ante pérdida de contexto:** Si el contexto se satura y se produce una consolidación de memoria (el paso a `ConsolidateMemory`), el modelo no perderá el hilo de en qué punto de la migración o desarrollo se encontraba. Simplemente ejecutará `task_list` en su siguiente iteración, leerá la base de datos externa H2 y continuará exactamente por donde iba.


## 6. (Opcional/Avanzado) Sincronización asíncrona con Subagentes

El verdadero poder de un agente autónomo no reside solo en hacer el trabajo, sino en **delegarlo**. Noema ya cuenta con la capacidad de lanzar trabajadores especializados en segundo plano mediante la herramienta `launch_subagent` (que instancia un `SubagentImpl`). Sin embargo, coordinar el estado de esos trabajadores asíncronos con el plan de trabajo principal presenta un desafío cognitivo para el LLM.

### 6.1. El problema del *Polling* cognitivo

Si el LLM delega una tarea de larga duración (ej: *"Indexar un repositorio de código"*), no puede quedarse bloqueado esperando. Tampoco es eficiente que el LLM gaste turnos y tokens preguntando constantemente: *"¿Ha terminado ya el subagente?"* (*polling*). 

Necesitamos que la base de datos de tareas y los procesos en segundo plano se comuniquen directamente, permitiendo que el estado de la planificación se actualice "por debajo", sin requerir la atención constante del Sistema Nervioso Central.

### 6.2. El flujo de delegación (Visión del LLM)

Para resolver esto, el campo `jobId` de la tabla `TASKS` actúa como el enlace relacional entre la tarea conceptual y el proceso físico en la JVM. El flujo de interacción que el LLM (guiado por su prompt de identidad) debe ejecutar es el siguiente:

1.  **Creación de la tarea:** El LLM invoca `task_add(title: "Indexar repositorio")` y obtiene el ID `TASK-05`.
2.  **Lanzamiento del trabajador:** El LLM invoca `launch_subagent(subagent_name: "document_indexer", params: {...})`. La herramienta devuelve un JSON indicando que el trabajador se ha iniciado y le asigna un identificador, por ejemplo: `subagent_id: 42`.
3.  **Vinculación:** El LLM invoca `task_update(id: "TASK-05", status: "running", jobId: "42")`. 

A partir de este momento, el LLM puede olvidarse de la tarea. El registro `TASK-05` queda vinculado formalmente al subagente `42`.

### 6.3. Intercepción y actualización automática (Visión del código Java)

La sincronización real ocurre a nivel de código, en la capa de orquestación, aprovechando el ciclo de vida ya existente en `SubagentImpl`.

Actualmente, cuando el hilo en segundo plano de un subagente termina (sea por éxito o por excepción), ejecuta un bloque `finally` donde inyecta un evento en el `SensorsService` del agente padre (`SYSTEMNOTIFICATION`). Ampliaremos este bloque para que interactúe silenciosamente con el `TaskService`:

```java
// Fragmento conceptual dentro del hilo (workerThread) en SubagentImpl.java
finally {
    // 1. Desregistro del sistema
    AgentLocator.getAgentManager().unregisterSubagent(SubagentImpl.this);
    
    // 2. NUEVO: Actualización silenciosa de la base de datos de tareas
    TaskService taskService = (TaskService) parent.getService(TaskService.NAME);
    if (taskService != null) {
        String finalStatus = (t == null) ? "done" : "failed";
        taskService.updateTaskStatusByJobId(String.valueOf(subagentId), finalStatus);
    }
    
    // 3. Notificación al LLM principal
    String notification = String.format(
        "El subagente '%s' (ID: %d) ha finalizado con éxito.", subagentName, subagentId
    );
    parent.putEvent(SYSTEMNOTIFICATION_SENSOR_NAME, originSubchannel, 
                    "SUBAGENT_COMPLETED", PRIORITY_NORMAL, notification);
}
```

*Nota arquitectónica:* Se añadirá un método interno `updateTaskStatusByJobId(String jobId, String status)` en la interfaz Java del `TaskService` que no estará expuesto como `AgentTool`, ya que es de uso exclusivo interno del sistema.

### 6.4. El resultado: Autonomía real y notificaciones contextualizadas

Gracias a esta integración, cuando el subagente termina, ocurren dos cosas casi simultáneas:
1. El `TaskService` transiciona automáticamente `TASK-05` a estado `done`.
2. El LLM recibe la notificación efímera de que el subagente `42` ha terminado.

Cuando el LLM recibe la notificación, no necesita preguntar qué estaba haciendo ese subagente. Al consultar su lista de tareas (`task_list`), verá inmediatamente que el estado de su planificación se ha actualizado correctamente. Las dependencias que estuvieran bloqueadas (`blocked`) aguardando a `TASK-05` ahora podrán ser retomadas en el siguiente ciclo de razonamiento.

Hemos logrado que el agente externalice no solo la memoria de sus planes, sino también el **seguimiento de la ejecución asíncrona**, acercando a Noema un paso más hacia la autonomía operativa real.


    