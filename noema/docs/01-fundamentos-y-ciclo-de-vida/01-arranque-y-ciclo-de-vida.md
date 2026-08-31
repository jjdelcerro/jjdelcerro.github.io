# Inicialización e inyección de dependencias

## 1. Filosofía de ensamblaje: inyección manual y ausencia de frameworks

Noema prescinde deliberadamente de frameworks de inyección de dependencias como Spring Boot o CDI. Esta decisión busca mantener la transparencia absoluta del flujo de ejecución, simplificar la depuración y evitar la sobrecarga de tiempo de arranque e inspección por reflexión en la JVM.

En un agente donde el ciclo de vida de los componentes es estrictamente secuencial (preparar rutas, inicializar logs, arrancar el motor de base de datos embebido, registrar herramientas y, finalmente, levantar el bucle de razonamiento), la inyección manual proporciona un control determinista. Para rastrear cómo se instancia y configura cualquier servicio, basta con seguir el código mediante navegación directa en el IDE.

El sistema se apoya en dos patrones complementarios:

1. **Inyección por constructor:** Los componentes del núcleo reciben sus dependencias estructurales (`AgentSettings`, `AgentPaths`, `AgentConsole`, `ConnectionSupplier`) en el momento de su instanciación.
2. **Localizador de servicios contextual:** La interfaz `Agent` actúa como contexto central de ejecución. Las herramientas y acciones reciben la instancia de `Agent` y obtienen los servicios que necesitan invocando `agent.getService("NombreDelServicio")`.

---

## 2. Puntos de entrada y entornos de ejecución

La clase `Main` actúa como selector de modo a partir de los argumentos pasados por línea de comandos:

```
java -jar noema-main.jar [opciones]
```

* **Modo TUI / Terminal interactiva (por defecto):** Si no se especifican parámetros, `Main` deriva la ejecución a `MainLanterna`. Inicializa una interfaz de terminal basada en ventanas mediante la librería Lanterna, con soporte de ratón, navegación por teclado, visor de logs filtrable y diálogo de configuración en árbol.
* **Modo GUI de escritorio (`--gui` o `--swing`):** Ejecuta `MainGUI`. Aplica el tema oscuro de FlatLaf, presenta el diálogo inicial de bienvenida (`WelcomePanel`) para seleccionar o crear el espacio de trabajo, y levanta la ventana de chat principal (`MainChatPanel`) en Swing.
* **Modo Consola / REPL clásico (`-c` o `--console`):** Ejecuta `MainConsole`. Inicializa un bucle interactivo de lectura y respuesta en terminal mediante JLine3, con soporte para edición multilínea (Alt+Enter) y comandos rápidos (como `/settings` o `/quit`).
* **Servidor Web embebido (paralelo):** Durante el proceso de arranque, independientemente de la interfaz elegida (Swing, Lanterna o consola), el sistema levanta automáticamente un servidor HTTP embebido con Javalin (`NoemaWebServer`) en el puerto configurado (`debug/web_port`, por defecto `8080`). Este servidor expone una API REST y un canal Server-Sent Events (SSE) para conectar clientes web o interfaces ligeras en el navegador.

---

## 3. Catálogo y registro de componentes: `AgentLocator` y `AgentManager`

Para evitar el escaneo dinámico de classpath en tiempo de ejecución, Noema centraliza el registro de todas sus capacidades en un catálogo explícito:

* **`AgentLocator`:** Singleton estático que expone el acceso global a la instancia de `AgentManager`.
* **`AgentManagerImpl`:** Implementación del gestor central. En su constructor registra de forma estática y ordenada:

1. **Factorías de operaciones de memoria proyectada:**
   * `PinnedTurnsOperationFactory`: fijación de directivas de skills activos.
   * `TrimmingOperationFactory`: podado de resultados de herramientas voluminosos.
   * `PendingAnnotationOperationFactory`: detección de lecturas de recursos sin consolidar.
   * `TemporalPerceptionOperationFactory`: inyección pasiva del tiempo transcurrido.

2. **Factorías de servicios del agente (`AgentServiceFactory`):**
   * `EmbeddingsServiceFactory`: motor local de embeddings multilingües ONNX.
   * `SensorsServiceFactory`: bus sensorial asíncrono y sistema nervioso autónomo.
   * `MemoryConsolidationServiceFactory`: consolidación narrativa de la memoria episódica.
   * `McpServiceFactory`: cliente para servidores locales Model Context Protocol.
   * `SchedulerServiceFactory`: planificación temporal y alarmas persistentes.
   * `EmailServiceFactory`: cliente IMAP/SMTP con filtrado por remitente.
   * `TelegramServiceFactory`: listener y efector de mensajería para Telegram.
   * `ReasoningServiceFactory`: orquestador del bucle de consciencia y LLM principal.

3. **Registro y factoría de subagentes:** Gestiona la carga de recetas declarativas en XML (`createSubagentDefinition`), la instanciación de trabajadores aislados (`createSubagent`) y el seguimiento de procesos activos en segundo plano (`registerSubagent`, `unregisterSubagent`).

---

## 4. Inicialización del entorno: la clase `BootUtils`

Antes de instanciar el agente, la clase de utilidad `BootUtils` prepara la infraestructura física mediante el método `init(AgentSettings settings)`:

```java
Agent agent = BootUtils.init(settings);
```

Este método ejecuta la siguiente secuencia de preparación:

1. **Configuración de logs:** Lee la ruta de almacenamiento desde `AgentPaths.getLogFolder()` y reconfigura Log4j2 en caliente para dirigir las salidas a `var/log/noema-agente.log` dentro del workspace activo.
2. **Consola web de H2:** Genera dinámicamente el archivo `.h2.server.properties` en `var/config/` y levanta el servidor web de administración de H2 en el puerto configurado (`debug/h2_webport`, por defecto `8082`), permitiendo inspeccionar las tablas en tiempo real desde un navegador.
3. **Proveedores de conexión JDBC:** Inicializa dos instancias de `ConnectionSupplier` que gestionan las conexiones hacia las bases de datos locales:
   * **Base de memoria (`memory`):** Almacena los turnos inmutables de la memoria episódica y los metadatos de las memorias consolidadas.
   * **Base de servicios (`service`):** Almacena el estado de los servicios auxiliares (como la tabla `SCHEDULER` de alarmas).
   * Ambas conexiones se configuran con el parámetro `;AUTO_SERVER=TRUE` para permitir el acceso simultáneo de la aplicación y la consola web de H2.
4. **Instanciación del agente:** Invoca a `AgentManager.createAgent(...)` inyectando las conexiones de base de datos, la configuración cargada y la consola activa.
5. **Arranque del servidor web:** Inicia `NoemaWebServer` para habilitar los endpoints REST (`/api/chat`, `/api/config`) y el canal SSE (`/api/console`).

---

## 5. Ciclo de vida y ensamblaje: `AgentImpl.start()` y `AgentImpl.stop()`

Una vez instanciado, el agente permanece inactivo hasta que se invoca explícitamente su método `start()`.

### Secuencia de arranque (`start`)

1. **Instanciación de servicios:** Itera sobre las factorías registradas en `AgentManager`. Si el agente cuenta con servicios compartidos inyectados previamente (como ocurre en los subagentes para reutilizar el modelo de embeddings en memoria), los vincula directamente; en caso contrario, invoca `serviceFactory.createService(this)`.
2. **Registro de sensores base:** Crea y registra en `SensorsService` el sensor fundamental `USER` (naturaleza `USER`, no silenciable), que canaliza las entradas del interlocutor humano.
3. **Descubrimiento e inyección de herramientas:** Evalúa qué servicios cumplen las condiciones de configuración para operar (`canStart()`). A aquellos que pueden arrancar, les solicita su lista de herramientas (`service.getTools()`) y las registra en el catálogo de `ReasoningService`.
4. **Encendido de servicios:** Llama al método `start()` de cada servicio registrado (el planificador lee sus alarmas pendientes, el motor de embeddings carga el modelo ONNX en RAM, y el servicio de razonamiento lanza el hilo del despachador de eventos).
5. **Registro del hook de apagado:** Añade un *ShutdownHook* a la JVM (`Runtime.getRuntime().addShutdownHook`) para asegurar que una señal de terminación del sistema operativo (`SIGINT`, `SIGTERM` o Ctrl+C) ejecute una parada ordenada.

### Secuencia de parada (`stop`)

1. **Desactivación de flags:** Marca el estado interno como no operativo (`running = false`).
2. **Detención de servicios propios:** Invoca `stop()` en cada servicio activo (omitiendo aquellos marcados como compartidos para no interferir con procesos padre). Esto provoca que el hilo `Noema-Event-Dispatcher` finalice su ciclo de forma limpia al terminar el evento en curso.
3. **Persistencia de estado:** Los agregados de memoria reciente y memoria proyectada se aseguran de que sus últimos estados queden volcados en disco (`recent_memory-{subchannel}.json` y `projected_memory_{subchannel}.json`).
4. **Cierre de conexiones:** Se liberan los recursos JDBC y se cierran los descriptores de archivos abiertos.

---

## 6. Procedimiento para añadir un nuevo servicio al agente

Para extender Noema con un nuevo servicio o integración externa, se debe seguir este flujo:

1. **Definir el contrato:** Crear la interfaz del servicio en `io.github.jjdelcerro.noema.lib` extendiendo de `AgentService`:
   ```java
   public interface ExternalSyncService extends AgentService {
       String NAME = "ExternalSync";
       void syncNow();
   }
   ```
2. **Implementar el servicio:** Crear la clase concreta en `io.github.jjdelcerro.noema.lib.impl.services...` implementando los métodos de ciclo de vida (`start`, `stop`, `canStart`, `isRunning`) y declarando sus herramientas asociadas en `getTools()`:
   ```java
   public class ExternalSyncServiceImpl implements ExternalSyncService {
       // Lógica de negocio, inicialización y herramientas
   }
   ```
3. **Crear la factoría:** Implementar `AgentServiceFactory` para validar los prerrequisitos de configuración en `settings.json` antes de permitir el arranque:
   ```java
   public class ExternalSyncServiceFactory implements AgentServiceFactory {
       @Override
       public String getName() {
           return ExternalSyncService.NAME;
       }

       @Override
       public AgentService createService(Agent agent) {
           return new ExternalSyncServiceImpl(this, agent);
       }

       @Override
       public boolean canStart(AgentSettings settings) {
           return StringUtils.isNotBlank(settings.getPropertyAsString("sync/server_url"));
       }
   }
   ```
4. **Registrar la factoría en el gestor:** Añadir la factoría en el constructor de `AgentManagerImpl`:
   ```java
   this.registerService(new ExternalSyncServiceFactory());
   ```
5. **Consumo desde otros componentes:** Una vez registrado, cualquier herramienta o módulo del agente puede localizar el servicio mediante el localizador central:
   ```java
   ExternalSyncService sync = (ExternalSyncService) agent.getService(ExternalSyncService.NAME);
   ```