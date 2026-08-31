# Configuración jerárquica (`AgentSettings`)

## 1. La configuración como árbol

La configuración de Noema no es una lista plana de pares clave-valor. Es un **árbol jerárquico** que refleja la estructura modular del agente. Esta decisión responde a la necesidad de agrupar lógicamente los parámetros que pertenecen a un mismo subsistema, permitiendo que el usuario y los componentes del agente naveguen por la configuración de forma predecible.

La jerarquía del proyecto se materializa en el archivo `settings.json`, ubicado en el sandbox del agente (`.noema-agent/var/config/settings.json`). Este archivo es el punto de entrada para cualquier ajuste operativo del sistema: desde las credenciales y modelos de los proveedores LLM hasta las políticas de seguridad en disco, pasando por los umbrales de consolidación de memoria o la definición de servidores MCP locales.

El sistema de configuración está diseñado para ser **recargable en caliente**. El usuario puede modificar `settings.json` directamente o utilizar las interfaces de usuario (generadas dinámicamente a partir de `settingsui.json`) y aplicar los cambios sin reiniciar el proceso del agente, apoyándose en el sistema de acciones del núcleo (`AgentActions`).

---

## 2. Estructura de `settings.json`

El archivo `settings.json` organiza sus ramas en objetos, valores primitivos y listas estructuradas:

```json
{
  "reasoning": {
    "provider": {
      "url": "https://llm.chutes.ai/v1",
      "model_id": "{ \"model\": \"zai-org/GLM-4.7-FP8\", \"context\": 202000}",
      "api_key": null
    },
    "consolidation_turn": 40,
    "consolidation_tokens": 60000,
    "active_tools": {
      "web_search": false,
      "file_write": false,
      "shell_execute": false
    },
    "identity": {
      "core": {
        "01_stack_tecnico": true,
        "02_filosofia": false
      }
    }
  },
  "memory": {
    "provider": {
      "url": "https://api.deepseek.com/v1",
      "model_id": "{ \"model\": \"deepseek-reasoner\", \"context\": 128000 }",
      "api_key": null
    }
  },
  "mcp": {
    "servers": [
      {
        "name": "gvsig_desktop",
        "type": "http",
        "url": "http://127.0.0.1:8091/tools",
        "mode": "READ"
      }
    ]
  },
  "email": {
    "imap_host": null,
    "smtp_host": null,
    "user": null,
    "password": null,
    "authorized_sender": null
  },
  "telegram": {
    "chat_id": null,
    "api_key": null
  },
  "websearch": {
    "brave_api_key": null,
    "tavily_api_key": null
  },
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
}
```

### Características estructurales

* **Rutas unificadas:** El acceso a los valores se realiza mediante rutas delimitadas por barras (`/`), como `reasoning/provider/url` o `access_control/allow_disk_write`.
* **Valores complejos en strings:** Propiedades como `model_id` pueden almacenar strings simples (`"deepseek-reasoner"`) o cadenas JSON que encapsulan metadatos técnicos adicionales (tamaño de contexto, temperatura, flags de razonamiento).
* **Listas marcadas (`CheckedList`):** Nodos como `active_tools` e `identity/core` almacenan mapas clave-booleano que el sistema interpreta como listas de selección múltiple.
* **Listas de objetos complejos:** Nodos como `mcp/servers` almacenan arrays de objetos JSON heterogéneos deserializados como listas estructuradas.

## 3. Modelo de datos interno (`AgentSettingsItem`)

La representación interna de la configuración se modela mediante una jerarquía de clases fuertemente tipada bajo la interfaz base `AgentSettingsItem`:

```
                    ┌───────────────────┐
                    │ AgentSettingsItem │
                    └─────────▲─────────┘
                              │
     ┌────────────────────────┴─┬───────────────────┬─────────────────────┬─────────────────────┐
     │                          │                   │                     │                     │
┌────┴──────────────┐ ┌──────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐ ┌────────────────────┐
│AgentSettingsString│ │AgentSettingsGroup│ │AgentSettingsList│ │ AgentSettingsCheckedList│ │ AgentSettingsPaths │
└───────────────────┘ └──────────────────┘ └─────────────────┘ └─────────────────────────┘ └────────────────────┘
```

### Subtipos de nodo

1. **`AgentSettingsString` (`AgentSettingsStringImpl`):** Representa un valor primitivo (texto, número, booleano) expuesto a través de `getValue()`.
2. **`AgentSettingsGroup` (`AgentSettingsGroupImpl`):** Contenedor de nodos hijo accesible mediante un mapa concurrente (`Map<String, AgentSettingsItem>`). Permite navegar por la jerarquía resolviendo rutas compuestas (`a/b/c`).
3. **`AgentSettingsList` (`AgentSettingsListImpl`):** Lista ordenada de elementos `AgentSettingsItem`. Permite iterar sobre colecciones de objetos complejos, como la lista de servidores en `mcp/servers`.
4. **`AgentSettingsCheckedList` (`AgentSettingsCheckedListImpl`):** Lista de elementos donde cada uno contiene un valor textual (`value`) y un estado booleano (`checked`). Se utiliza en el catálogo de herramientas y en los módulos de identidad.
5. **`AgentSettingsPaths` (`AgentSettingsPathsImpl`):** Lista de rutas de archivos o directorios. Almacena internamente cadenas de texto y las convierte a instancias `Path` mediante `getValues()`.

### Deserialización polimórfica con Gson

La reconstrucción del árbol desde JSON se apoya en `AgentSettingsItemDeserializer`:

* Si el elemento es un primitivo JSON $\rightarrow$ Se instancia `AgentSettingsStringImpl`.
* Si el elemento es un array JSON:
  * Si el primer elemento contiene la propiedad `checked` $\rightarrow$ Se instancia `AgentSettingsCheckedListImpl`.
  * Si el primer elemento es un objeto JSON $\rightarrow$ Se instancia `AgentSettingsListImpl`.
  * En cualquier otro caso $\rightarrow$ Se instancia `AgentSettingsPathsImpl` (array de rutas/strings).
* Si el elemento es un objeto JSON $\rightarrow$ Se instancia `AgentSettingsGroupImpl` y se deserializan recursivamente sus miembros.


## 4. El sistema de configuración (`AgentSettingsImpl`)

`AgentSettingsImpl` es la clase raíz del subsistema. Extiende de `AgentSettingsGroupImpl` e implementa la interfaz `AgentSettings`.

### Operaciones principales

* **`load()`:** Resuelve la ruta `var/config/settings.json` mediante `AgentPaths.getConfigPath()` y deserializa el mapa completo de nodos en memoria.
* **`save()`:** Serializa el mapa de items actual en disco con formato legible (pretty-printing). La escritura se realiza en un archivo temporal (`settings.json.tmp`) antes de aplicar un reemplazo atómico sobre `settings.json`.
* **Consultas tipadas con valor por defecto:**
  ```java
  String url = settings.getPropertyAsString("reasoning/provider/url", "http://localhost:11434");
  int turns = settings.getPropertyAsInt("reasoning/consolidation_turn", 40);
  boolean allowWrite = settings.getPropertyAsBoolean("access_control/allow_disk_write", false);
  List<Path> paths = settings.getPropertyAsPaths("access_control/allowed_external_paths");
  AgentSettingsCheckedList tools = settings.getPropertyAsCheckedList("reasoning/active_tools");
  ```
* **Mutación de propiedades:**
  ```java
  settings.setProperty("reasoning/consolidation_turn", "50");
  settings.setChecked("reasoning/active_tools", "file_write", true);
  settings.save();
  ```
  Al invocar `setProperty()`, si los grupos intermedios no existen en el árbol, el sistema los crea automáticamente.

### Gestión de la configuración global cruzada

A diferencia del `settings.json` del proyecto (ubicado en `var/config/`), `AgentSettingsImpl` mantiene un canal independiente para los ajustes globales del usuario en `~/.config/noema-agent/settings.json`.

Este archivo raíz se gestiona a través de la estructura interna `GlobalSettingsData` y no almacena parámetros operativos de agentes, sino el registro histórico de espacios de trabajo:
* `lastWorkspacePath`: Último espacio de trabajo abierto.
* `lastWorkspacesPaths`: Lista ordenada de todos los workspaces utilizados recientemente.


## 5. Generación dinámica de interfaces (`settingsui.json`)

Para evitar el acoplamiento entre la lógica de negocio y las vistas gráficas, Noema genera sus formularios de configuración de manera dinámica a partir del descriptor `settingsui.json`.

```
                    settingsui.json
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
     Swing UI        Lanterna TUI        Web UI
 (AgentSwingSettings) (AgentLanternaSettings) (config-ui.js + REST)
```

### Descriptor de interfaz

```json
{
  "type": "menu",
  "label": "Configuracion del Agente",
  "domains": {
    "LLM_MODELS": "models.properties",
    "LLM_PROVIDERS_URL": "providers_urls.properties",
    "APIKEYS": "apikeys.properties",
    "AVAILABLE_TOOLS": "available_tools.properties",
    "IDENTITY_CORE": "identity_core.properties"
  },
  "childs": [
    {
      "type": "menu",
      "label": "Servicio de razonamiento",
      "childs": [
        {
          "type": "combo",
          "childs": "LLM_MODELS",
          "label": "Seleccionar Modelo (razonamiento)",
          "variableName": "reasoning/provider/model_id",
          "actionName": "CHANGE_REASONING_MODEL",
          "required": true
        },
        {
          "type": "checkedlist",
          "label": "Capacidades del Agente",
          "variableName": "reasoning/active_tools",
          "actionName": "REFRESH_REASONING_TOOLS",
          "childs": "AVAILABLE_TOOLS",
          "childEnabled": "child == \"shell_execute\" ? getSetting(\"access_control/allow_shell_execution\") : true"
        }
      ]
    }
  ]
}
```

### Tipos de nodo de interfaz

* **`menu`:** Agrupador estructural (carpeta en el árbol de navegación).
* **`inputstring`:** Campo de edición de texto vinculado a un `variableName`.
* **`combo` / `selectoption`:** Desplegable o selector de opciones alimentado por un dominio externo o una lista inline de valores.
* **`checkedlist`:** Lista de selección múltiple con casillas de verificación.
* **`paths`:** Panel gestor de listas de rutas con botones de adición y borrado.
* **`action`:** Botón disparador de una acción del agente (ej. `OPEN_H2WEBCONSOLE`).
* **`value`:** Opción concreta (par etiqueta/valor) dentro de un selector.

### Dominios externos (`.properties`)

La propiedad `domains` permite desacoplar los catálogos de opciones del archivo de interfaz. Cuando un control referencia un dominio (como `"childs": "LLM_MODELS"`), el sistema busca el archivo `models.properties` (primero en el workspace y luego en la configuración global) y genera dinámicamente las opciones ordenadas alfabéticamente por su etiqueta.

### Comportamiento según el entorno de presentación

* **Swing (`AgentSwingSettingsImpl`):** Construye un `JTree` a la izquierda y despliega los formularios a la derecha con componentes Swing estándar (`JTextField`, `JComboBox`, `JList`).
* **Lanterna (`AgentLanternaSettingsImpl`):** Construye una lista de navegación modal y formularios interactivos en modo texto.
* **Web (`NoemaWebServer` + `config-ui.js`):** Descarga el árbol vía `GET /api/config/ui` y los dominios vía `GET /api/config/domains/{name}`. 
  * *Comportamiento de acciones:* Los nodos de tipo `action` que requieren un entorno de escritorio nativo (como abrir un editor gráfico de texto) se marcan con la clase CSS `action-disabled` y quedan deshabilitados en el navegador con el aviso *"No soportado en la interfaz web"*.

---

## 6. El evaluador de expresiones (`ExpressionEvaluator`)

Para que los formularios sean reactivos sin codificar dependencias en Java ni en JavaScript, el sistema utiliza `ExpressionEvaluator`, un intérprete recursivo descendente que evalúa reglas lógicas en tiempo de ejecución.

### Sintaxis soportada

* **Operadores lógicos y de comparación:** `&&`, `||`, `!`, `==`, `!=`, `>`, `<`, `>=`, `<=`.
* **Operador ternario:** `condicion ? valor_si_cierto : valor_si_falso`.
* **Aritmética y concatenación:** `+`, `-`, `*`, `/`.
* **Literales:** Strings entre comillas dobles (`"..."`), números, booleanos (`true`, `false`) y `null`.
* **Funciones integradas:** `getSetting(path)` (obtiene el valor actual de una propiedad de configuración).

### Reglas condicionales con `childEnabled`

La propiedad `childEnabled` en un nodo de interfaz define si un control debe estar habilitado o bloqueado en función de otras opciones:

```json
"childEnabled": "child == \"shell_execute\" ? getSetting(\"access_control/allow_shell_execution\") : ((child == \"web_search\" || child == \"web_get_content\") ? getSetting(\"access_control/allow_internet_access\") : true)"
```

Durante la evaluación, el sistema inyecta en el contexto la variable `child` con el identificador técnico del elemento evaluado.

### Resolución remota por lotes en el entorno Web

En el cliente web, para evitar duplicar el motor de expresiones en JavaScript y mantener la coherencia de cálculo, el navegador realiza una petición batch a `NoemaWebServer`:

```
POST /api/config/multivalue
[
  {
    "path": "reasoning/active_tools/shell_execute/__enabled",
    "defaultValue": true,
    "enabledExpression": "child == \"shell_execute\" ? getSetting(\"access_control/allow_shell_execution\") : true",
    "context": { "child": "shell_execute" }
  }
]
```

El servidor ejecuta `agent.getSettings().eval(...)` con las variables de contexto suministradas y devuelve un mapa JSON con los estados booleanos resultantes, permitiendo que la interfaz web actualice el estado de los checkboxes de forma reactiva.


## 7. Acciones y recarga en caliente

Cuando un parámetro de configuración se modifica, la interfaz no solo actualiza `settings.json`, sino que puede disparar un comportamiento asociado en el agente mediante la propiedad `actionName`.

### Ciclo de vida de una acción de configuración

1. El usuario modifica un valor en el formulario (ej. selecciona un nuevo modelo de razonamiento).
2. La vista actualiza el árbol en memoria (`setProperty`) y lo guarda en disco (`save()`).
3. La vista invoca `agent.getActions().call(actionName, settings)`.
4. La acción registrada localiza el servicio afectado y reconfigura sus instancias en caliente.

### Acciones del sistema registradas

* `CHANGE_REASONING_PROVIDER` / `CHANGE_REASONING_MODEL`: Recrea el `ChatModel` de `ReasoningServiceImpl`.
* `CHANGE_MEMORY_PROVIDER` / `CHANGE_MEMORY_MODEL`: Recrea el `ChatModel` de `MemoryConsolidationServiceImpl`.
* `RELOAD_ACCESS_CONTROL`: Vuelve a cargar las listas blancas, negras y flags de seguridad en `AgentAccessControlImpl`.
* `REFRESH_REASONING_TOOLS`: Sincroniza el mapa interno de herramientas activas en `ReasoningServiceImpl` con la lista `reasoning/active_tools`.
* `CONSOLIDATE_REASONING_SESSION` / `CONSOLIDATE_REASONING_FULL_SESSION`: Dispara consolidaciones manuales del historial activo.
* `OPEN_MODELS_EDITOR`, `OPEN_PROVIDERS_URL_EDITOR`, `OPEN_PROVIDERS_APIKEY_EDITOR`: Abre diálogos con resaltado de sintaxis para editar archivos `.properties` locales.
* `OPEN_H2WEBCONSOLE`: Abre el navegador del sistema apuntando a la consola web de H2.
* `DEBUG_DIALOG`: Abre el panel interactivo MVEL para inspección del estado de los servicios.


## 8. Límites del diseño

* **Persistencia local exclusiva:** `AgentSettings` no está diseñado como un gestor de configuración distribuido; no implementa replicación ni sincronización remota sobre red.
* **Almacenamiento de credenciales en texto plano:** Las claves de API y contraseñas residen en el archivo `settings.json` o en los archivos `.properties` locales sin cifrado adicional, delegando la confidencialidad en los permisos del sistema de archivos.
* **Evaluador de expresiones acotado:** `ExpressionEvaluator` no admite bucles, asignación de variables ni llamadas a métodos de la JVM arbitrarios; su alcance se limita estrictamente a expresiones de decisión en vistas.
* **Sin esquema JSON formal:** La validación de tipos se realiza durante la deserialización de Gson y en las llamadas de consumo de cada servicio, sin aplicar un validador de esquema externo (JSON Schema).
