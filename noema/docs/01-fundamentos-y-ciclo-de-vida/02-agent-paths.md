# Gestión de rutas (`AgentPaths`)

## 1. El sistema de archivos como estado

Noema adopta una postura transparente respecto a la persistencia: el sistema de
archivos local es el depositario principal del estado del agente. La
configuración, la memoria episódica, la memoria consolidada, las sesiones de
trabajo por canal, los logs, las cachés y los volcados de depuración se
almacenan como archivos planos o bases de datos relacionales embebidas (H2)
dentro de un directorio acotado.

La interfaz AgentPaths actúa como el sistema de coordenadas de este entorno y
define dos niveles de anclaje:

1.  La sede de estado local (workspaceFolder):
    Es el directorio principal asignado al agente, donde se aloja la carpeta
    oculta .noema-agent con toda su infraestructura de datos y configuración
    activa. Actúa, además, como el directorio base predeterminado para resolver
    rutas relativas en las herramientas de archivo.
2.  Alcance operativo extensible (multi-directorio):
    Estar anclado a un workspaceFolder no restringe el radio de acción del
    agente a esa única carpeta. A través de la configuración de listas blancas
    (access_control/allowed_external_paths) o mediante la invocación
    programática de AgentAccessControl.addAllowedPath(), el agente puede recibir
    autorización explícita para leer, buscar, escribir o parchear archivos en
    múltiples repositorios, árboles de código o rutas externas del sistema de
    ficheros de forma simultánea dentro de una misma sesión activa.
3.  Resolución de configuración global (~/.config/noema-agent):
    De forma complementaria, el sistema permite que ciertos recursos comunes
    (como listas de modelos, claves de API, recetas de subagentes o habilidades
    compartidas) residan en el directorio personal del usuario y sean accesibles
    desde cualquier espacio de trabajo que no los sobrescriba localmente.

Esta estructura convierte al agente en un sistema portátil e inspeccionable:
todo su estado interno puede consultarse, respaldarse o depurarse directamente
con las herramientas estándar del sistema operativo (grep, diff, editores de
texto), manteniendo siempre un límite de seguridad estricto sobre las rutas del
disco a las que tiene permiso para acceder.

## 2. Topología del entorno de trabajo

El espacio de trabajo se organiza bajo dos raíces principales: el directorio del proyecto (`workspaceFolder`) y el directorio de configuración global del usuario (`~/.config/noema-agent`). Dentro del proyecto se crea la carpeta oculta `.noema-agent`, que aloja la siguiente estructura física:

```
<workspace>/
├── .noema-agent/
│   ├── home/                  # Home virtual para sandboxing con Firejail
│   └── var/
│       ├── config/            # Configuración, dominios y prompts
│       │   ├── prompts/       # Prompts del sistema (reasoning, memory, etc.)
│       │   ├── settings.json  # Configuración jerárquica activa
│       │   └── *.properties   # Dominios externos (modelos, URLs, claves)
│       ├── lib/               # Estado persistente del agente
│       │   ├── memory.mv.db   # BD H2: EpisodicMemory y metadatos de consolidación
│       │   ├── service.mv.db  # BD H2: Servicios auxiliares (Scheduler, etc.)
│       │   ├── sensors.json   # Memento del estado sensorial y estadísticas
│       │   ├── recent_memory-<subchannel>.json     # Memoria de trabajo activa
│       │   ├── projected_memory_<subchannel>.json  # Estado de la memoria proyectada
│       │   ├── consolidatememory/                  # Crónicas narrativas (.md)
│       │   └── turns.csv      # Log secuencial de turnos para depuración
│       ├── cache/             # Datos derivados regenerables
│       │   └── file_extract_text/  # Textos extraídos de binarios (PDF/DOCX)
│       ├── tmp/               # Salidas temporales y volcados volátiles
│       │   ├── out_*.out      # Salidas capturadas de shell_execute
│       │   ├── script_*.out   # Salidas de scripts Groovy
│       │   ├── subagent_*     # Espacios de trabajo aislados de subagentes
│       │   ├── subagent_*.log # Logs de ejecución de subagentes en segundo plano
│       │   └── context-*.json # Volcados de contexto proyectado
│       └── log/               # Registros del sistema
│           └── noema-agente.log # Salida rotativa de Log4j2
```

### Métodos de acceso a rutas en `AgentPaths`

* **`getWorkspaceFolder()`:** Devuelve la ruta absoluta normalizada de la raíz del proyecto.
* **`getAgentFolder()`:** Devuelve `<workspace>/.noema-agent`.
* **`getConfigFolder()`:** Devuelve `<workspace>/.noema-agent/var/config`.
* **`getDataFolder()`:** Devuelve `<workspace>/.noema-agent/var/lib`.
* **`getCacheFolder()`:** Devuelve `<workspace>/.noema-agent/var/cache`.
* **`getTempFolder()`:** Devuelve `<workspace>/.noema-agent/var/tmp`.
* **`getLogFolder()`:** Devuelve `<workspace>/.noema-agent/var/log`.
* **`getSandboxHomeFolder()`:** Devuelve `<workspace>/.noema-agent/home`.
* **`getGlobalConfigFolder()`:** Devuelve `~/.config/noema-agent`.

## 3. Ciclo de vida del espacio de trabajo

La creación y mantenimiento de la jerarquía de archivos se rige por un flujo determinista:

1. **Inicialización (`setupHierarchy`):** Cuando se selecciona o abre un espacio de trabajo, `AgentPathsImpl.setupHierarchy()` crea físicamente todos los directorios requeridos mediante `Files.createDirectories()`. Esta operación es idempotente: si las carpetas ya existen, no altera su contenido.
2. **Inmutabilidad estructural:** Durante la sesión del agente, la estructura de carpetas permanece fija. Los servicios crean, leen y eliminan archivos dentro de sus ubicaciones designadas, pero la topología base no cambia.
3. **Persistencia entre sesiones:** Al detener el agente, el contenido del directorio `.noema-agent` se conserva íntegro. El agente puede cerrarse y reanudarse en cualquier momento manteniendo intacta su memoria episódica, sus sesiones de trabajo por canal y sus estadísticas sensoriales.
4. **Relocalización:** Si el usuario mueve la carpeta del proyecto a otra ruta del disco, el agente puede reanudar la ejecución sin pérdida de datos, ya que todas las rutas internas se resuelven de forma relativa a la raíz del espacio de trabajo activo y los identificadores de memoria son numéricos o simbólicos.


## 4. Resolución dual de recursos: local frente a global

Para evitar la duplicación de archivos comunes (como definiciones de modelos, prompts base o habilidades) entre múltiples proyectos, `AgentPaths` implementa un mecanismo de resolución en dos niveles:

```
[Búsqueda de recurso]
        │
        ▼
¿Existe en <workspace>/.noema-agent/<recurso>?
   ├── SÍ ──► Usa la versión local del proyecto
   └── NO ──► ¿Existe en ~/.config/noema-agent/<recurso>?
                 ├── SÍ ──► Usa la versión global
                 └── NO ──► Retorna la ruta local (para creación)
```

Este comportamiento se implementa en los siguientes métodos:

* **`getAgentPath(String name)`:** Resuelve una ruta relativa dentro del árbol del agente. Comprueba primero si existe en `.noema-agent/<name>`; si no existe, comprueba si está presente en `~/.config/noema-agent/<name>`. Si no existe en ninguno, retorna la ruta local por defecto.
* **`getConfigPath(String name)`:** Especializado para archivos de configuración. Busca primero en `.noema-agent/var/config/<name>` y, como alternativa, en `~/.config/noema-agent/var/config/<name>`.
* **`listAgentPath(String name)`:** Devuelve la unión de todos los archivos encontrados en la carpeta especificada tanto a nivel local como global. Se utiliza para descubrir catálogos dinámicos (como recetas de subagentes en `var/subagents/` o módulos de identidad en `var/identity/environ/`).

## 5. Aislamiento de rutas en subagentes (`SubagentPaths`)

Cuando el agente lanza un subagente trabajador (mediante `launch_subagent` o `execute_script`), este requiere un entorno de ejecución completamente aislado para evitar colisiones de estado o sobreescritura accidental de datos del agente padre.

La clase interna estática `SubagentPaths` (dentro de `SubagentImpl`) especializa `AgentPathsImpl` con una regla de contención:

* **Redirección de la configuración global:** `SubagentPaths` sobrescribe `getGlobalConfigFolder()` para que apunte a `var/globalconfig` dentro de su propio espacio de trabajo temporal (ubicado en `var/tmp/subagent_*`).

```java
@Override
public Path getGlobalConfigFolder() {
    if (getAgentFolder() == null) {
        return null;
    }
    return getAgentFolder().resolve(Path.of("var", "globalconfig"));
}
```

Esta modificación garantiza que el subagente no pueda leer ni modificar la configuración global del usuario (`~/.config/noema-agent`), confinando todas sus operaciones de configuración, bases de datos H2 y temporales al directorio efímero asignado, el cual se destruye automáticamente al concluir su tarea.


## 6. Persistencia y seguridad del entorno de trabajo

`AgentPaths` trabaja de forma coordinada con el subsistema de control de acceso (`AgentAccessControl`):

* **Raíz del sandbox:** `getWorkspaceFolder()` define el límite geográfico por defecto para todas las herramientas de lectura y escritura (`file_read`, `file_write`, `file_patch`, `file_grep`). Cualquier intento de acceder a rutas fuera de esta raíz es bloqueado a menos que la ruta figure explícitamente en la lista blanca `access_control/allowed_external_paths`.
* **Protección del núcleo del agente:** Durante el arranque, `AgentImpl` añade automáticamente el directorio `.noema-agent` a la lista de rutas no legibles (`nomReadablePaths`) para las herramientas convencionales del LLM, impidiendo que el modelo modifique sus propias bases de datos o archivos de configuración mediante herramientas de archivo estándar.
* **Escrituras atómicas:** Los servicios que vuelcan estado (`RecentMemory`, `ProjectedMemory`, `SensorsService`, `AgentSettings`) utilizan `getTempFolder()` o la misma carpeta de destino para generar archivos `.tmp` antes de realizar un reemplazo atómico (`StandardCopyOption.ATOMIC_MOVE`), evitando la corrupción de datos ante paradas abruptas.
* **Aislamiento en ejecución de shell:** `getSandboxHomeFolder()` proporciona la ruta que se asigna como directorio *home* privado cuando se ejecutan comandos a través de `firejail` en `ShellExecuteTool`, manteniendo aislado el entorno del usuario.

## 7. Integración con los subsistemas de Noema

Cada componente del agente utiliza `AgentPaths` para ubicar sus datos:

| Subsistema / Clase | Método utilizado | Función / Archivos |
| :--- | :--- | :--- |
| **`EpisodicMemoryImpl`** | `getDataFolder()` | Almacena `memory.mv.db`, `turns.csv` y la carpeta `consolidatememory/`. |
| **`RecentMemoryImpl`** | `getDataFolder()` | Persiste `recent_memory-<subchannel>.json` por cada canal activo. |
| **`ProjectedMemoryImpl`** | `getDataFolder()` / `getTempFolder()` | Persiste `projected_memory_<subchannel>.json` y vuelca volcados de depuración `context-*.json`. |
| **`SensorsServiceImpl`** | `getDataFolder()` | Persiste el estado de colas y estadísticas en `sensors.json`. |
| **`SchedulerServiceImpl`** | `getDataFolder()` | Inicializa la tabla `SCHEDULER` en la base de datos `service.mv.db`. |
| **`FileExtractTextTool`** | `getCacheFolder()` | Almacena en caché textos extraídos bajo `var/cache/file_extract_text/<hash>.txt`. |
| **`ShellExecuteTool`** | `getTempFolder()` / `getSandboxHomeFolder()` | Guarda salidas en `var/tmp/out_*.out` y aísla el entorno en `home/`. |
| **`ScriptExecuteTool`** | `getTempFolder()` | Guarda salidas paginadas de scripts en `var/tmp/script_*.out`. |
| **`BootUtils`** | `getConfigFolder()` / `getLogFolder()` | Genera `.h2.server.properties` y reconfigura Log4j2 hacia `var/log/`. |
| **`NoemaWebServer`** | `getConfigFolder()` | Lee `settingsui.json` y archivos `.properties` para la API REST de configuración. |


## 8. Límites del diseño

* **Acceso estrictamente local:** `AgentPaths` no implementa abstracciones para sistemas de archivos remotos o distribuidos (NFS, S3). Las operaciones son directas sobre el sistema de archivos del sistema operativo anfitrión.
* **Sin expansión de variables de entorno:** Las rutas configuradas se interpretan de forma literal; no se realiza expansión automática de variables tipo `$HOME` o `~` dentro de las cadenas de configuración.
* **Gestión de ciclo de vida en temporales delegada:** `AgentPaths` proporciona las rutas a `var/tmp` y `var/cache`, pero la política de limpieza y expiración de archivos huérfanos recae en las herramientas y servicios que los generan (mediante mapas LRU o borrado explícito al cerrar procesos).
