# Seguridad y control de acceso (`AgentAccessControl`)

## 1. El marco de contención del agente

Noema tiene capacidad para leer y escribir archivos, ejecutar comandos en el sistema operativo, procesar scripts en la JVM y conectarse a servicios externos en red. Esta autonomía operativa introduce riesgos evidentes: un fallo del modelo, una alucinación o una inyección de prompt podrían causar modificaciones no deseadas sobre el sistema de archivos o comprometer la privacidad del entorno de desarrollo.

Para gobernar este comportamiento, el agente incorpora un subsistema de control de acceso centralizado en la clase `AgentAccessControlImpl`. Su responsabilidad es doble:

1. **Definir qué operaciones están permitidas** evaluando las políticas de configuración y el modo declarado por cada herramienta.
2. **Interponer un mecanismo de confirmación humana síncrono** antes de permitir cualquier acción con efectos secundarios o destructivos.

El diseño asume una premisa pragmática: la seguridad no consiste en bloquear la capacidad de acción del agente, sino en garantizar que cada operación potencialmente destructiva pase por la supervisión explícita del usuario o por un entorno de ejecución estrictamente aislado.


## 2. Modelo de permisos y modos de operación

Cada herramienta (`AgentTool`) declara de forma obligatoria su naturaleza técnica mediante el método `getMode()`:

* **`MODE_READ` (1):** Operaciones de solo lectura e introspección (leer archivos, consultar el catálogo de sensores, buscar en el historial de memoria). Se consideran seguras y no requieren confirmación humana.
* **`MODE_WRITE` (2):** Operaciones que modifican el sistema de archivos (escribir o sobrescribir ficheros, aplicar parches diff, crear directorios o alterar la configuración).
* **`MODE_WEB` (3):** Peticiones de red e Internet (búsquedas en la web, descargas de URLs).
* **`MODE_EXECUTION` (4):** Ejecución de procesos en el shell del sistema operativo (`shell_execute`).
* **`MODE_SCRIPTING` (5):** Ejecución de código Groovy embebido en la JVM (`execute_script`).

Estos modos se evalúan contra las políticas globales definidas en `settings.json` bajo la sección `access_control`:

```json
"access_control": {
  "humanConfirmationRequired": true,
  "allow_disk_write": false,
  "allow_shell_execution": false,
  "allow_internet_access": false,
  "enable_rcs_backup": true,
  "enable_firejail": false,
  "allowed_external_paths": [],
  "nom_writable_paths": null,
  "nom_readable_paths": null
}
```

El método `isToolAllowed(AgentTool tool)` evalúa estas directivas antes de que el motor de razonamiento intente ejecutar una herramienta: si una herramienta requiere escritura en disco y `allow_disk_write` es `false`, la ejecución se deniega inmediatamente sin llegar a consultar al LLM.


## 3. El sandbox de archivos

El acceso al sistema de archivos se canaliza a través del método `resolvePath(String rawPath, AccessMode mode)` en `AgentAccessControlImpl`. El proceso de validación aplica los siguientes filtros:

```
[Ruta solicitada]
        │
        ▼
1. Resolución y normalización (toRealPath)
        │
        ▼
2. ¿Está en lista de lectura prohibida (nom_readable_paths)? ──► SÍ ──► [SecurityException]
        │ NO
        ▼
3. ¿Está bajo workspaceFolder o en allowed_external_paths? ───► NO ──► [SecurityException]
        │ SÍ
        ▼
4. Si el modo es ESCRITURA:
   ├── ¿Termina en ',jv'? (Backup RCS) ────────────────────────► SÍ ──► [SecurityException]
   ├── ¿Contiene '/.git/'? (Control de versiones) ─────────────► SÍ ──► [SecurityException]
   ├── ¿Está dentro de '/.claude/skills/'? (Directivas base) ──► SÍ ──► [SecurityException]
   └── ¿Está en lista de solo lectura (nom_writable_paths)? ───► SÍ ──► [SecurityException]
        │ NO
        ▼
   [Ruta validada]
```

### Reglas duras de protección

1. **Protección del núcleo del agente:** Durante la inicialización, `AgentImpl` añade automáticamente la carpeta interna `.noema-agent` a `nomReadablePaths`. Las herramientas estándar del LLM (`file_read`, `file_write`, `file_grep`) tienen prohibido acceder directamente a las bases de datos H2 o a los archivos internos de sesión.
2. **Protección de manuales y habilidades (`.claude/skills/`):** El sistema deniega cualquier intento de escritura sobre archivos ubicados en `.claude/skills/`, garantizando que el agente no pueda modificar o corromper sus propios protocolos operativos.
3. **Inmutabilidad de los historiales de respaldo (`,jv`):** Los archivos de versión de JavaRCS son de solo lectura; el LLM puede consultar su historial (`file_history`), pero no puede alterarlos directamente.
4. **Protección de repositorios Git (`.git/`):** Se bloquea la escritura dentro del árbol de metadatos de Git para evitar la corrupción del control de versiones del proyecto anfitrión.

---

## 4. Confirmación humana y supervisión interactiva

Cuando una herramienta declara un modo distinto de `MODE_READ` (`MODE_WRITE`, `MODE_EXECUTION`, `MODE_WEB` o `MODE_SCRIPTING`) y la directiva `humanConfirmationRequired` está activa, `ReasoningServiceImpl` detiene el flujo de ejecución e invoca `AgentConsole.confirm()`:

```java
if (tool.getMode() != AgentTool.MODE_READ && agent.getAccessControl().isHumanConfirmationRequired()) {
    boolean authorized = console.confirm(
        String.format("El agente quiere ejecutar la herramienta: %s\nArgumentos: %s\n¿Autorizar?", toolName, args)
    );
    if (!authorized) {
        return "Ejecución de herramienta denegada por el usuario.";
    }
}
```

* **Bloqueo síncrono:** La llamada detiene el hilo `Noema-Event-Dispatcher`. En Swing, presenta un diálogo modal sobre la ventana activa; en Lanterna, una ventana emergente de confirmación; en JLine, un prompt interactivo `(s/n)` en la terminal.
* **Modo desatendido en subagentes:** En `SubagentImpl`, la seguridad se reconfigura para entornos no interactivos: `humanConfirmationRequired` se establece en `false` y `SubagentConsole` auto-aprueba las operaciones registrando un evento `CONFIRM:AUTO_APPROVED` en el archivo de log correspondiente (`subagent_*.log`).

---

## 5. Respaldo automático con JavaRCS

Para evitar la pérdida irreversible de código ante ediciones defectuosas del modelo, las herramientas de modificación (`file_write`, `file_patch`, `file_search_and_replace` y la fachada `agent.fs.write` en scripts Groovy) realizan un **check-in automático** antes de aplicar cambios sobre un archivo preexistente:

```java
if (Files.exists(filePath) && accessControl.isEnabledRCSBackup()) {
    RCSManager rcsManager = RCSLocator.getRCSManager();
    CheckinOptions options = rcsManager.createCheckinOptions(filePath);
    options.setAuthor(reasoningService.getModelName());
    options.setInit(true);
    RCSCommand<CheckinOptions> ci = rcsManager.create(options);
    ci.execute(options);
}
```

Este proceso genera un archivo de historial (con sufijo `,jv`) en el mismo directorio. Si el modelo introduce un error lógico o borra contenido crítico:
* El agente o el usuario pueden inspeccionar las revisiones con `file_history`.
* Se puede restaurar una versión anterior exacta mediante `file_recovery`.

---

## 6. Seguridad en la ejecución de código y comandos

Noema implementa dos estrategias diferenciadas según el entorno de ejecución:

### Aislamiento en el shell del sistema (`shell_execute`)

* **Supervisión por pasos de tiempo:** El proceso lanzado se supervisa en intervalos de 30 segundos (`WAIT_STEP_SECONDS`). Si el comando no finaliza, el sistema pausa y pregunta al usuario si desea mantenerlo en ejecución o destruirlo forzosamente.
* **Sandbox con Firejail:** Si `enable_firejail` está activo y el binario `firejail` está presente en el sistema operativo, el comando se ejecuta encapsulado:
  ```bash
  firejail --quiet --private="<workspace>/.noema-agent/home" \
           --whitelist="<workspace>" \
           --blacklist="<workspace>/.noema-agent/var/lib" \
           -- bash -c "<comando>"
  ```
  Esto confina el directorio home a un entorno efímero (`var/home`), restringe el acceso a la raíz del proyecto y oculta las bases de datos de la memoria episódica.

### Sandbox en memoria para scripts Groovy (`ScriptExecuteTool`)

Los scripts ejecutados mediante el motor embebido de Groovy no interactúan libremente con el runtime de Java; están sujetos a un doble filtro de seguridad:

1. **`SecureASTCustomizer`:** Inspecciona el árbol sintáctico (AST) antes de compilar y prohíbe explícitamente:
   * Acceso a `java.lang.System`, `java.lang.Runtime` y `java.lang.ProcessBuilder`.
   * Uso de reflexión (`java.lang.reflect.*`) y llamadas dinámicas (`java.lang.invoke.*`).
2. **`TimedInterrupt`:** Inyecta comprobaciones de tiempo en el bytecode para abortar la ejecución si supera los 30 segundos, impidiendo bucles infinitos.
3. **I/O intermediado:** Los scripts no tienen acceso directo a `java.io.File`; cualquier lectura o escritura debe realizarse mediante las fachadas de contexto (`agent.fs`), que validan cada ruta contra `AgentAccessControl`.

---

## 7. Control de acceso a la red y prevención de SSRF

El acceso a recursos externos (`web_search`, `web_get_content` y `agent.web`) se valida a través de `isAccessible(URI url)`:

```java
@Override
public boolean isAccessible(URI url) {
    if (!isAllowedInternetAccess()) {
        return false;
    }
    String lower = url.toString().toLowerCase();
    return !(lower.contains("localhost") || lower.contains("127.0.0.1") || lower.contains("192.168."));
}
```

* **Bloqueo global:** Si `allow_internet_access` es `false`, se deniega cualquier petición HTTP saliente.
* **Protección contra SSRF (Server-Side Request Forgery):** Se bloquea el acceso a direcciones de loopback local (`localhost`, `127.0.0.1`) y segmentos de red local privada (`192.168.*`), impidiendo que el LLM acceda a servicios internos de la máquina anfitriona (como la consola H2 en el puerto 8082).

---

## 8. Auditoría de reglas de configuración

Durante el arranque o tras ejecutar la acción `RELOAD_ACCESS_CONTROL`, `AgentAccessControlImpl.validateRules()` analiza las listas configuradas en `settings.json` para detectar inconsistencias:

* **Rutas aisladas:** Advierte si hay rutas en `nom_writable_paths` o `nom_readable_paths` ubicadas fuera del workspace que no hayan sido añadidas a `allowed_external_paths` (ya que el sandbox las bloqueará por defecto).
* **Rutas redundantes:** Señala rutas dentro del workspace declaradas innecesariamente en `allowed_external_paths`.
* **Solapamientos de políticas:** Identifica si una ruta está simultáneamente en `nom_readable_paths` (bloqueo total) y `nom_writable_paths` (solo lectura), recordando que prevalecerá el bloqueo total.

---

## 9. Límites del diseño

* **Monousuario:** No existe un modelo de permisos basado en roles de usuario; el sistema asume un único operador local frente a la máquina.
* **Filtrado de red básico:** El control de red opera por exclusión de rangos locales comunes; no implementa una lista blanca estricta de dominios ni inspección profunda de tráfico.
* **Dependencia de utilidades externas para aislamiento total del shell:** El sandboxing a nivel de sistema operativo para comandos Bash depende de la disponibilidad de `firejail` en el sistema anfitrión Linux. En su ausencia, el comando se ejecuta con los permisos del usuario que lanzó la JVM.
