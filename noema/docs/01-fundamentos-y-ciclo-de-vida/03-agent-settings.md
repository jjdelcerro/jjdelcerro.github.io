
# Configuración Jerárquica (`AgentSettings`)

## 1. Introducción: la configuración como árbol

La configuración de Noema no es una lista plana de pares clave-valor. Es un **árbol jerárquico** que refleja la estructura modular del agente. Esta decisión no es caprichosa: responde a la necesidad de agrupar lógicamente los parámetros que pertenecen a un mismo subsistema, permitiendo que el usuario y el propio agente naveguen por la configuración de forma intuitiva.

La jerarquía se materializa en el archivo `settings.json`, ubicado en el sandbox del agente (`var/config/settings.json`). Este archivo es el punto de entrada para cualquier ajuste del comportamiento del sistema: desde las credenciales de los proveedores LLM hasta las políticas de seguridad, pasando por los umbrales de compactación de memoria o las claves de API de servicios externos.

El sistema de configuración está diseñado para ser **recargable en caliente**. El usuario puede modificar `settings.json` (o utilizar la interfaz gráfica que genera dinámicamente los controles a partir de `settingsui.json`) y los cambios se aplican sin necesidad de reiniciar el agente, siempre que el servicio afectado implemente el mecanismo de recarga correspondiente (normalmente a través de acciones como `CHANGE_REASONING_PROVIDER` o `RELOAD_ACCESS_CONTROL`).

El corazón de este sistema es la clase `AgentSettings` y su implementación `AgentSettingsImpl`, que proporciona una API para leer, escribir y evaluar valores de configuración de forma segura y eficiente.

## 2. La estructura de `settings.json`

El archivo `settings.json` sigue una estructura de árbol donde cada nodo puede ser:

- **Un valor simple**: string, número o booleano.
- **Un objeto**: un contenedor de otros nodos (equivalente a un directorio).
- **Una lista**: una secuencia de valores simples o de objetos.
- **Una lista marcada**: una lista de elementos donde cada uno tiene un estado booleano (marcado/desmarcado), útil para activar o desactivar herramientas o módulos de identidad.

A continuación se muestra un fragmento del `settings.json` típico de Noema:

```json
{
  "reasoning": {
    "provider": {
      "url": "https://llm.chutes.ai/v1",
      "model_id": "{ \"model\": \"zai-org/GLM-4.7-FP8\", \"context\": 202000}",
      "api_key": null
    },
    "compaction_turns": 40,
    "compaction_tokens": 60000,
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
      "model_id": "deepseek-reasoner",
      "api_key": null
    }
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

Observaciones sobre la estructura:

- **Agrupación lógica**: los parámetros de `reasoning` están todos bajo una misma rama, lo que facilita la lectura y la edición.
- **Valores compuestos**: `model_id` puede ser un string simple o un objeto JSON (como en el ejemplo de GLM-4.7) para permitir parámetros adicionales (contexto, temperatura, etc.).
- **Listas marcadas**: `active_tools` es un objeto donde cada clave es el nombre técnico de una herramienta y su valor booleano indica si está activa. Internamente, `AgentSettings` lo trata como una `CheckedList`.
- **Listas de rutas**: `allowed_external_paths` es un array de strings que representan rutas de directorios externos permitidos. `AgentSettings` lo trata como una lista de `Path`.
- **Valores nulos**: `null` se usa para indicar que un parámetro no está definido (ej: `api_key`). El sistema lo interpreta como "no configurado".

El acceso a los valores se realiza mediante rutas separadas por `/`. Por ejemplo, `reasoning/provider/url` devuelve la URL del proveedor de razonamiento. Esta notación es consistente en toda la API de `AgentSettings`.

La estructura de `settings.json` no es fija: el usuario puede añadir nuevas ramas para servicios personalizados o para futuras extensiones. El sistema simplemente ignora las claves que no conoce, lo que permite una evolución gradual de la configuración sin romper la compatibilidad hacia atrás.


## 3. El modelo de datos interno (`AgentSettingsItem`)

El modelo de datos de la configuración no es un simple mapa de strings. Está diseñado como una jerarquía de objetos que refleja fielmente la estructura del árbol JSON, pero con un sistema de tipos enriquecido que permite manejar listas, rutas y elementos marcados de forma natural desde el código.

La raíz de esta jerarquía es la interfaz `AgentSettingsItem`, que actúa como un marcador común para todos los nodos de la configuración. A partir de ella, se definen cinco subtipos principales, cada uno con una responsabilidad concreta:

### 3.1. Los subtipos de `AgentSettingsItem`

**`AgentSettingsString`**  
Representa un valor simple (texto, número, booleano). Su implementación concreta es `AgentSettingsStringImpl`, que envuelve un `String` y lo expone mediante `getValue()`. Todos los valores primitivos del JSON se convierten a este tipo, incluyendo números y booleanos (como strings).

**`AgentSettingsGroup`**  
Representa un nodo del árbol que contiene otros nodos. Su implementación concreta es `AgentSettingsGroupImpl`, que mantiene un `Map<String, AgentSettingsItem>`. Este mapa es la base para navegar por la jerarquía mediante rutas como `reasoning/provider/url`. Un grupo puede contener cualquier combinación de los otros subtipos.

**`AgentSettingsList`**  
Representa una lista ordenada de elementos, donde cada elemento puede ser cualquier `AgentSettingsItem`. Su implementación concreta es `AgentSettingsListImpl`, que encapsula un `List<AgentSettingsItem>`. Es útil para listas de objetos complejos (por ejemplo, la lista de servidores MCP en `mcp/servers`).

**`AgentSettingsCheckedList`**  
Representa una lista de elementos donde cada uno tiene un estado booleano (marcado/desmarcado). Su implementación concreta es `AgentSettingsCheckedListImpl`, que mantiene una lista de objetos `CheckedItem` (cada uno con un `value` y un `checked`). Este tipo se usa para listas de activación, como el catálogo de herramientas (`reasoning/active_tools`) o los módulos de identidad (`reasoning/identity/core`).

**`AgentSettingsPaths`**  
Representa una lista de rutas de archivos o directorios. Su implementación concreta es `AgentSettingsPathsImpl`, que mantiene una lista de strings que se convierten a `Path` cuando se accede mediante `getValues()`. Este tipo se usa para listas de rutas, como `access_control/allowed_external_paths`.

### 3.2. Serialización y deserialización con Gson

El modelo de datos se serializa y deserializa a JSON utilizando Gson con un adaptador personalizado: `AgentSettingsItemDeserializer`. Este adaptador es el responsable de reconstruir el árbol de configuración a partir del JSON, decidiendo en tiempo de ejecución qué subtipo de `AgentSettingsItem` corresponde a cada elemento del JSON.

El proceso de deserialización sigue estas reglas:

- **Valores primitivos** (strings, números, booleanos) → se convierten a `AgentSettingsString`.
- **Arrays de objetos** → si el primer elemento tiene la propiedad `checked`, se deserializa como `AgentSettingsCheckedList`; si el primer elemento es un objeto JSON, se deserializa como `AgentSettingsList`; en caso contrario (array de strings), se deserializa como `AgentSettingsPaths`.
- **Objetos JSON** (mapas clave-valor) → se deserializan como `AgentSettingsGroup`, y sus hijos se procesan recursivamente con el mismo adaptador.

Este mecanismo permite que el archivo `settings.json` sea legible y editable manualmente, mientras que el sistema lo convierte automáticamente en un árbol de objetos tipados con el que es fácil trabajar desde el código.

### 3.3. La clase `AgentSettingsImpl` como raíz

La implementación concreta de `AgentSettings` es `AgentSettingsImpl`, que extiende de `AgentSettingsGroupImpl` (es decir, la raíz de la configuración es ella misma un grupo). Esto significa que el objeto raíz contiene un mapa de nodos que representan todas las ramas de la configuración.

`AgentSettingsImpl` añade funcionalidad específica:

- **Carga y guardado**: `load()` lee el archivo `settings.json` y deserializa su contenido en el árbol interno mediante el adaptador Gson. `save()` serializa el árbol actual y lo escribe en disco, manteniendo la estructura y el formato legible.
- **Gestión de la jerarquía de archivos**: `AgentSettingsImpl` mantiene una referencia a `AgentPaths`, lo que le permite saber dónde leer y escribir el archivo de configuración, así como resolver rutas de recursos auxiliares (como dominios externos).
- **Evaluación de expresiones**: el método `eval()` utiliza `ExpressionEvaluator` para interpretar expresiones lógicas en tiempo de ejecución, permitiendo que la UI reaccione dinámicamente a cambios en la configuración (ver punto 6).

### 3.4. Acceso a la configuración desde el código

El acceso a los valores de configuración se realiza mediante métodos de conveniencia que recorren el árbol de forma segura:

```java
// Obtener un valor simple
String url = settings.getPropertyAsString("reasoning/provider/url");

// Obtener una lista de rutas
List<Path> externalPaths = settings.getPropertyAsPaths("access_control/allowed_external_paths");

// Obtener una lista marcada
AgentSettingsCheckedList tools = settings.getPropertyAsCheckedList("reasoning/active_tools");
for (CheckedItem item : tools.getItems()) {
    if (item.isChecked()) {
        System.out.println("Herramienta activa: " + item.getValue());
    }
}

// Modificar un valor
settings.setProperty("reasoning/compaction_turns", "50");
settings.save();
```

Todos estos métodos devuelven `null` o valores por defecto si la ruta no existe, evitando que el código falle por configuraciones incompletas. Además, el método `getPropertyAsString` admite un valor por defecto, lo que facilita la gestión de parámetros opcionales.

### 3.5. Ventajas del modelo

- **Tipado fuerte**: cada tipo de nodo tiene métodos específicos, evitando conversiones manuales y errores de tipo.
- **Flexibilidad**: la jerarquía puede crecer o cambiar sin necesidad de modificar las clases existentes.
- **Legibilidad**: el archivo JSON es fácil de entender y editar, incluso por usuarios no técnicos.
- **Extensibilidad**: añadir un nuevo tipo de nodo (por ejemplo, `AgentSettingsSecret` para valores encriptados) es sencillo: basta con crear una nueva implementación de `AgentSettingsItem` y actualizar el deserializador.
- **Compatibilidad hacia atrás**: el sistema ignora claves desconocidas, permitiendo que versiones antiguas del código lean configuraciones más recientes sin fallar (y viceversa, dentro de lo razonable).


## 4. El sistema de configuración (`AgentSettings`)

La clase `AgentSettingsImpl` es la implementación concreta del sistema de configuración. Actúa como el punto de entrada para todas las operaciones sobre `settings.json`, proporcionando una API coherente para cargar, guardar, consultar y modificar la configuración jerárquica del agente.

### 4.1. Carga y guardado de la configuración

La configuración se persiste en el archivo `settings.json` dentro del sandbox del agente (`var/config/settings.json`). El sistema soporta dos modos de carga:

- **Carga inicial**: durante el arranque del agente, `AgentSettings.load()` lee el archivo desde disco y construye el árbol interno de `AgentSettingsItem`. Si el archivo no existe, se crea una configuración vacía y el agente procederá a desplegar los valores por defecto desde el JAR (a través de `setupSettings()`).

- **Recarga en caliente**: el usuario puede modificar el archivo manualmente o a través de la interfaz de configuración, y luego invocar `AgentSettings.load()` para que los cambios surtan efecto sin reiniciar el agente. No todos los servicios recargan automáticamente; algunos requieren una acción explícita (ej: `RELOAD_ACCESS_CONTROL`) para aplicar los nuevos valores.

El guardado (`save()`) escribe el árbol interno de vuelta a `settings.json` con formato JSON legible (pretty-printing). El proceso es atómico: primero se escribe en un archivo temporal (`settings.json.tmp`) y luego se renombra al destino final, evitando corrupción en caso de fallo durante la escritura.

### 4.2. Acceso a propiedades

El acceso a los valores se realiza mediante rutas separadas por `/`. La API proporciona métodos específicos para cada tipo de dato, evitando conversiones manuales y errores de tipo:

```java
// Valores simples
String url = settings.getPropertyAsString("reasoning/provider/url");
int turns = settings.getPropertyAsInt("reasoning/compaction_turns", 40);
boolean debug = settings.getPropertyAsBoolean("debug/enabled", false);

// Listas de rutas
List<Path> externalPaths = settings.getPropertyAsPaths("access_control/allowed_external_paths");

// Listas marcadas
AgentSettingsCheckedList tools = settings.getPropertyAsCheckedList("reasoning/active_tools");

// Grupos
AgentSettingsGroup providerGroup = settings.getPropertyGroup("reasoning/provider");
```

Si una ruta no existe, los métodos devuelven `null` (para strings y objetos) o el valor por defecto proporcionado (para tipos primitivos). Esto permite que el código funcione incluso con configuraciones parciales.

### 4.3. Manipulación de la configuración

La modificación de la configuración se realiza a través de métodos `setProperty` y `setChecked`:

```java
// Establecer un valor simple
settings.setProperty("reasoning/compaction_turns", "50");

// Establecer una lista de strings
settings.setProperty("access_control/allowed_external_paths", 
    List.of("/home/user/docs", "/mnt/data"));

// Marcar/desmarcar un elemento en una lista marcada
settings.setChecked("reasoning/active_tools", "shell_execute", true);

// Guardar los cambios en disco
settings.save();
```

El sistema mantiene la coherencia del árbol: al establecer un valor en una ruta que no existe, se crean automáticamente los grupos intermedios necesarios. Por ejemplo, `setProperty("a/b/c", "valor")` creará los grupos `a` y `a/b` si no existían.

### 4.4. Navegación por la jerarquía

El método `getProperty(String path)` devuelve el nodo `AgentSettingsItem` correspondiente a la ruta, permitiendo inspeccionar su tipo y contenido. Los métodos de conveniencia (`getPropertyAsString`, `getPropertyGroup`, etc.) son envoltorios que realizan la conversión y el manejo de nulos de forma segura.

Para recorrer la jerarquía, se puede obtener un grupo y luego iterar sobre sus claves:

```java
AgentSettingsGroup reasoning = settings.getPropertyGroup("reasoning");
for (String key : reasoning.getPropertyNames()) {
    AgentSettingsItem item = reasoning.getProperty(key);
    // Procesar cada nodo...
}
```

### 4.5. Evaluación dinámica de expresiones

El método `eval(String expression, Object defaultValue)` permite evaluar expresiones lógicas en tiempo de ejecución, utilizando el `ExpressionEvaluator` (ver punto 6). Esta funcionalidad es utilizada principalmente por la UI para habilitar o deshabilitar controles de forma reactiva.

```java
// Evaluar una expresión que depende de la configuración
boolean canWrite = (boolean) settings.eval(
    "getSetting('access_control/allow_disk_write') == 'true'", 
    false
);
```

El método admite un mapa de variables adicionales que se inyectan en el contexto de evaluación, permitiendo que las expresiones hagan referencia a valores dinámicos (ej: el nombre de una herramienta en `childEnabled`).

### 4.6. Relación con `AgentPaths` y `AgentActions`

- **`AgentPaths`**: proporciona la ubicación del archivo `settings.json` (a través de `getConfigFolder()`). `AgentSettingsImpl` recibe una referencia a `AgentPaths` en su constructor y la utiliza para localizar tanto la configuración local como la global (`~/.config/noema-agent`).

- **`AgentActions`**: los cambios en la configuración pueden disparar acciones mediante el sistema de acciones del agente. Por ejemplo, al modificar `reasoning/provider/url`, la UI invoca la acción `CHANGE_REASONING_PROVIDER`, que recarga el modelo de lenguaje en caliente. Esta integración permite que la configuración y el comportamiento del agente estén estrechamente acoplados, pero sin que `AgentSettings` dependa directamente de los servicios.

### 4.7. Gestión de la configuración global

Además del archivo local en el workspace, `AgentSettings` puede leer y escribir un archivo de configuración global en `~/.config/noema-agent/settings.json`. Este archivo contiene ajustes que se comparten entre distintos workspaces (por ejemplo, la lista de últimos workspaces utilizados). La clase `AgentSettingsImpl` mantiene un objeto `GlobalSettingsData` separado para gestionar estos valores, que se cargan y guardan de forma independiente.

Actualmente, la configuración global solo almacena metadatos de uso (historial de workspaces), pero podría extenderse en el futuro para incluir preferencias de usuario que no dependan del proyecto.


## 5. La generación dinámica de UI (`settingsui.json`)

Uno de los aspectos más singulares del sistema de configuración de Noema es su capacidad para generar interfaces de usuario de forma dinámica a partir de un descriptor JSON. Este enfoque permite que la configuración sea modificable a través de diferentes interfaces (Swing, Lanterna, Web) sin necesidad de codificar cada control manualmente.

### 5.1. El descriptor `settingsui.json`

El archivo `settingsui.json`, ubicado en `var/config/settingsui.json`, define la estructura de la interfaz de configuración. Es un árbol de nodos donde cada nodo representa un elemento de la interfaz (un menú, un campo de texto, un combo, etc.). La estructura refleja la jerarquía de la configuración (`settings.json`), pero añade metadatos sobre cómo debe presentarse y comportarse cada control.

Un fragmento típico de `settingsui.json` es el siguiente:

```json
{
  "type": "menu",
  "label": "Configuración del Agente",
  "domains": {
    "LLM_MODELS": "models.properties",
    "APIKEYS": "apikeys.properties"
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
          "type": "inputstring",
          "label": "Turnos para compactar historial",
          "variableName": "reasoning/compaction_turns"
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

### 5.2. Tipos de nodos en `settingsui.json`

Cada nodo del descriptor tiene una propiedad `type` que determina cómo se renderiza en la interfaz:

- **`menu`**: un contenedor que agrupa otros nodos. Se representa como un elemento colapsable o una sección en la UI. No tiene un control asociado, solo organiza la jerarquía.

- **`inputstring`**: un campo de texto para editar valores simples. Se vincula a una ruta de `settings.json` mediante `variableName`.

- **`combo`**: un combo desplegable (o selector) que permite elegir entre varias opciones. Las opciones pueden venir de un dominio externo (ver sección 5.3) o de una lista inline de `childs`.

- **`selectoption`**: similar a `combo`, pero se presenta como una lista de opciones seleccionables (en lugar de un desplegable).

- **`checkedlist`**: una lista de elementos con una casilla de verificación al lado. Cada elemento tiene un estado marcado/desmarcado. Se usa para listas de activación (herramientas, módulos de identidad, etc.).

- **`paths`**: una lista de rutas de archivos o directorios, con botones para añadir o eliminar elementos.

- **`action`**: un botón que dispara una acción del agente (ej: `OPEN_H2WEBCONSOLE`). No modifica configuración, solo ejecuta un comportamiento.

- **`value`**: un nodo hoja que representa una opción dentro de un `combo` o `selectoption`. Contiene `label` (lo que ve el usuario) y `value` (lo que se guarda en `settings.json`).

### 5.3. Dominios externos: carga de opciones desde `.properties`

Uno de los mecanismos más potentes de `settingsui.json` es la capacidad de referenciar **dominios externos** mediante la propiedad `domains`. Un dominio es un archivo `.properties` que contiene pares clave-valor, donde la clave es la etiqueta visible en la UI y el valor es el dato técnico que se guarda en `settings.json`.

En el ejemplo anterior, el dominio `LLM_MODELS` apunta al archivo `models.properties`. Este archivo contiene una lista de modelos de lenguaje disponibles:

```properties
DeepSeek_Chat=deepseek-chat
OpenRouter_GLM-4.5=z-ai/glm-4.5-air:free
Groq_Llama_3.3=llama-3.3-70b-versatile
```

Cuando la UI encuentra un nodo `combo` o `selectoption` cuyo `childs` es un nombre de dominio, carga automáticamente las opciones desde el archivo `.properties` correspondiente. Las claves se ordenan alfabéticamente y se presentan como opciones en la interfaz.

Este mecanismo permite que los desarrolladores (y los usuarios avanzados) añadan nuevas opciones sin modificar el código de la UI. Simplemente editan el archivo `.properties` y la interfaz refleja los cambios en el siguiente arranque o recarga.

### 5.4. Reactividad y expresiones (`childEnabled`)

Los nodos de la UI pueden ser reactivos: su estado de habilitado/deshabilitado puede depender de otras partes de la configuración. Esto se logra mediante la propiedad `childEnabled`, que contiene una expresión lógica evaluada por `ExpressionEvaluator` (ver punto 6).

En el ejemplo anterior:

```json
"childEnabled": "child == \"shell_execute\" ? getSetting(\"access_control/allow_shell_execution\") : true"
```

Esta expresión evalúa si el elemento actual (identificado por `child`) es la herramienta `shell_execute`. Si es así, su estado habilitado depende del valor de `access_control/allow_shell_execution`. Si no, está siempre habilitado (`true`).

Este mecanismo permite que la UI se ajuste dinámicamente a las políticas de seguridad u otras restricciones, sin necesidad de codificar lógica condicional en cada interfaz.

### 5.5. Integración con las implementaciones de UI

El descriptor `settingsui.json` es interpretado por cada implementación de la interfaz de usuario a través del contrato `AgentUISettings`:

- **Swing**: `AgentSwingSettingsImpl` recorre el árbol y genera paneles con los controles correspondientes (JTextField, JComboBox, JCheckBoxList, etc.). Utiliza `ExpressionEvaluator` para actualizar el estado habilitado de los controles en tiempo real.

- **Lanterna (TUI)**: `AgentLanternaSettingsImpl` hace lo mismo en el entorno de terminal, generando paneles con componentes de Lanterna y soporte para navegación por teclado.

- **Consola (CLI)**: `AgentConsoleSettingsImpl` interpreta el árbol de forma secuencial, presentando menús y solicitando entrada por teclado (una opción menos visual pero igualmente funcional).

- **Web**: `NoemaWebServer` expone el descriptor a través de una API REST (`/api/config/ui` y `/api/config/domains`), permitiendo que la SPA (Single Page Application) renderice la configuración en el navegador.

Esta separación garantiza que la lógica de configuración sea única y centralizada, mientras que la presentación se adapta al entorno de ejecución.

### 5.6. Ejemplo práctico: Añadir un nuevo parámetro de configuración

Supongamos que queremos añadir un nuevo parámetro `debug/verbose` para controlar el nivel de detalle de los logs. Los pasos serían:

1. **Definir el parámetro en `settings.json`** (puede hacerse manualmente o mediante la UI):
   ```json
   "debug": {
     "verbose": false
   }
   ```

2. **Añadir una entrada en `settingsui.json`** bajo el menú "Debug":
   ```json
   {
     "type": "combo",
     "label": "Nivel de verbosidad",
     "variableName": "debug/verbose",
     "childs": [
       {"type": "value", "label": "Bajo", "value": "false"},
       {"type": "value", "label": "Alto", "value": "true"}
     ]
   }
   ```

3. **Reiniciar o recargar la configuración**. La UI mostrará automáticamente el nuevo control.

4. **Usar el parámetro desde el código**:
   ```java
   boolean verbose = settings.getPropertyAsBoolean("debug/verbose", false);
   ```

Este flujo demuestra cómo la combinación de `settings.json`, `settingsui.json` y `AgentSettings` permite extender la configuración de forma ágil y sin tocar el código de la interfaz.


## 6. El evaluador de expresiones (`ExpressionEvaluator`)

El `ExpressionEvaluator` es un componente ligero que permite evaluar expresiones lógicas y aritméticas en tiempo de ejecución. Su propósito principal es dotar a la interfaz de configuración de reactividad: ciertos controles deben habilitarse o deshabilitarse en función del valor de otros parámetros de configuración. En lugar de codificar esta lógica en cada implementación de UI, Noema utiliza un pequeño motor de expresiones que interpreta reglas definidas en `settingsui.json`.

### 6.1. Propósito y contexto

El evaluador no es un lenguaje de propósito general. Está diseñado exclusivamente para soportar las necesidades de la configuración reactiva. Las expresiones se utilizan en:

- **`childEnabled`**: para determinar si un control de la UI debe estar habilitado o deshabilitado.
- **Evaluación dinámica de valores**: a través del método `eval()` de `AgentSettings`, para calcular valores en tiempo de ejecución.

El evaluador se invoca desde la UI cuando se renderiza un nodo de `settingsui.json` que contiene una propiedad `childEnabled`. También puede invocarse desde el código mediante `settings.eval(expression, defaultValue, contextVars)`.

### 6.2. Sintaxis y operadores

El evaluador soporta un subconjunto de operadores y construcciones, suficientes para cubrir los casos de uso de la UI. La gramática es similar a la de un lenguaje de scripting sencillo:

- **Operadores aritméticos**: `+`, `-`, `*`, `/` (para números y strings, con concatenación de strings).
- **Operadores de comparación**: `==`, `!=`, `>`, `<`, `>=`, `<=`.
- **Operadores lógicos**: `&&` (AND), `||` (OR), `!` (NOT).
- **Operador ternario**: `condición ? valor_si_verdadero : valor_si_falso`.
- **Agrupación**: paréntesis `()` para forzar prioridad.
- **Literales**: números, booleanos (`true`, `false`), strings (entre comillas dobles `"`), y `null`.
- **Variables**: referencias a variables del contexto (ej: `child`, `getSetting(...)`).
- **Funciones**: llamadas a funciones integradas (ej: `getSetting("...")`).

### 6.3. Funciones integradas

El evaluador proporciona un conjunto limitado de funciones integradas que pueden usarse en las expresiones:

- **`getSetting(path)`**: devuelve el valor de una ruta de configuración como string. Ej: `getSetting("access_control/allow_disk_write")`.
- **Otras funciones**: el sistema está diseñado para ser extensible, pero actualmente solo se utiliza `getSetting`. No hay funciones para operaciones matemáticas complejas, acceso a archivos, llamadas a APIs, etc.

### 6.4. Variables de contexto

Además de las funciones, el evaluador puede recibir un mapa de variables de contexto que se inyectan en el ámbito de evaluación. En el caso de `childEnabled`, la variable `child` se inyecta automáticamente con el nombre técnico del elemento que se está evaluando.

Ejemplo de expresión que usa `child` y `getSetting`:

```
child == "shell_execute" ? getSetting("access_control/allow_shell_execution") : true
```

Esta expresión evalúa si el elemento actual (identificado por `child`) es la herramienta `shell_execute`. Si es así, su estado habilitado depende del valor de `access_control/allow_shell_execution`; en caso contrario, está siempre habilitado (`true`).

### 6.5. Ejemplos prácticos

**Ejemplo 1: Habilitar un campo solo si otro tiene un valor concreto**

En `settingsui.json`, un campo de texto solo debería estar habilitado si el usuario ha seleccionado "personalizado" en un combo:

```json
{
  "type": "inputstring",
  "label": "URL personalizada",
  "variableName": "network/custom_url",
  "childEnabled": "getSetting('network/connection_mode') == 'custom'"
}
```

**Ejemplo 2: Habilitar una lista de herramientas según políticas de seguridad**

```json
{
  "type": "checkedlist",
  "label": "Capacidades del Agente",
  "variableName": "reasoning/active_tools",
  "childEnabled": "child == 'shell_execute' ? getSetting('access_control/allow_shell_execution') : true"
}
```

**Ejemplo 3: Evaluación dinámica desde el código**

```java
boolean canWrite = (boolean) settings.eval(
    "getSetting('access_control/allow_disk_write') == 'true'",
    false
);
```

**Ejemplo 4: Expresión ternaria anidada**

```json
"childEnabled": "child == 'web_search' ? (getSetting('access_control/allow_internet_access') == 'true') : (child == 'file_write' ? getSetting('access_control/allow_disk_write') : true)"
```

### 6.6. Implementación

El evaluador se implementa en la clase `ExpressionEvaluator`. Es un parser recursivo descendente escrito a medida, sin dependencias externas. El flujo de evaluación es:

1. **Análisis léxico y sintáctico**: el parser recorre la expresión carácter por carácter, identificando tokens (números, operadores, identificadores, strings, etc.).
2. **Evaluación de la expresión**: construye un árbol de sintaxis abstracta (AST) en memoria y lo evalúa de forma recursiva.
3. **Resolución de variables y funciones**: cuando encuentra un identificador, consulta primero el mapa de variables de contexto y luego las funciones integradas. Si no se resuelve, lanza una excepción.

El parser soporta la precedencia de operadores estándar (parentesis > multiplicación/división > suma/resta > comparaciones > AND > OR > ternario). La evaluación es perezosa: en operadores lógicos `&&` y `||`, la parte derecha solo se evalúa si es necesaria (cortocircuito).

### 6.7. Limitaciones

- **No es un lenguaje completo**: no soporta bucles, definición de funciones, ni acceso a recursos externos.
- **Sin validación estática**: las expresiones se validan en tiempo de ejecución. Si una expresión contiene un error (ej: una variable no definida), se lanza una excepción y el control se deshabilita (o se usa el valor por defecto).
- **No hay depuración**: no hay forma de inspeccionar el valor de las variables intermedias durante la evaluación (más allá de los logs de error).
- **Expresiones largas**: aunque se permite, las expresiones muy complejas pueden ser difíciles de leer y mantener. Se recomienda mantenerlas simples y usar funciones auxiliares si es necesario.

A pesar de estas limitaciones, el `ExpressionEvaluator` cumple su propósito de forma eficiente y ligera, sin añadir dependencias externas. Es una pieza clave para que la UI de configuración sea dinámica y reactiva sin necesidad de codificar lógica condicional en cada implementación.



## 7. Acciones y recarga en caliente

La configuración de Noema no es estática. Cuando el usuario modifica un parámetro a través de la interfaz, a menudo no basta con guardar el nuevo valor en `settings.json`; es necesario que el agente reaccione al cambio aplicándolo en caliente. Este mecanismo se implementa mediante el sistema de **acciones**, que asocia modificaciones de configuración con comportamientos concretos del agente.

### 7.1. El concepto de acción (`actionName`)

En `settingsui.json`, ciertos nodos pueden incluir una propiedad `actionName`. Esta propiedad contiene el nombre de una acción que debe ejecutarse cuando el valor asociado al nodo cambia. Las acciones son funciones registradas en el sistema `AgentActions`, que pueden realizar operaciones como recargar un servicio, reiniciar un modelo o refrescar una política de seguridad.

Ejemplo en `settingsui.json`:

```json
{
  "type": "combo",
  "label": "Seleccionar Modelo (razonamiento)",
  "variableName": "reasoning/provider/model_id",
  "actionName": "CHANGE_REASONING_MODEL"
}
```

Cuando el usuario selecciona un nuevo modelo, el sistema:

1. Guarda el nuevo valor en `settings.json` bajo `reasoning/provider/model_id`.
2. Invoca la acción `CHANGE_REASONING_MODEL` a través de `AgentActions.call()`.
3. El `ReasoningService` recarga el modelo de lenguaje con los nuevos parámetros.

### 7.2. Registro de acciones

Las acciones se registran durante el arranque del agente. Cada servicio que necesita reaccionar a cambios de configuración define sus propias acciones y las añade al sistema `AgentActions` mediante `addAction()`.

Algunas acciones predefinidas:

- **`CHANGE_REASONING_PROVIDER`**: recarga el modelo de razonamiento cuando cambia la URL o la API key.
- **`CHANGE_REASONING_MODEL`**: recarga el modelo de razonamiento cuando cambia el identificador del modelo.
- **`CHANGE_MEMORY_PROVIDER`**: recarga el modelo de compactación de memoria.
- **`CHANGE_MEMORY_MODEL`**: recarga el modelo de compactación de memoria.
- **`RELOAD_ACCESS_CONTROL`**: recarga las políticas de seguridad (sandbox, listas blancas/negras, flags).
- **`REFRESH_REASONING_TOOLS`**: sincroniza el estado de activación de las herramientas con la configuración.
- **`COMPACT_REASONING_SESSION`** / **`COMPACT_REASONING_FULL_SESSION`**: fuerzan una compactación de memoria (útil para depuración).
- **`OPEN_MODELS_EDITOR`**, **`OPEN_PROVIDERS_URL_EDITOR`**, **`OPEN_PROVIDERS_APIKEY_EDITOR`**: abren editores de texto para archivos de dominio (`.properties`).
- **`OPEN_H2WEBCONSOLE`**: abre la consola web de H2 en el navegador.
- **`DEBUG_DIALOG`**: muestra el panel de depuración interactivo.

### 7.3. Mecanismo de disparo

Cuando un nodo de `settingsui.json` con `actionName` cambia de valor, el flujo es el siguiente:

1. La UI (Swing, Lanterna, Web) detecta el cambio (ej: el usuario selecciona una opción en un combo).
2. La UI invoca `settings.setProperty(variableName, newValue)` para actualizar el valor en el árbol interno.
3. La UI invoca `settings.save()` para persistir el cambio en disco.
4. La UI invoca `agent.getActions().call(actionName, settings)`.
5. El método `call()` busca la acción registrada y ejecuta su método `perform(settings)`.
6. La acción puede, a su vez, modificar el estado del agente (ej: recargar un servicio, cambiar un flag).

### 7.4. Acciones sin cambio de configuración

No todas las acciones están asociadas a una variable de configuración. Algunas acciones son **autónomas**: no modifican `settings.json`, sino que ejecutan un comportamiento puntual. Estas acciones se representan en `settingsui.json` como nodos de tipo `action`:

```json
{
  "type": "action",
  "label": "Mostrar consola H2",
  "actionName": "OPEN_H2WEBCONSOLE"
}
```

Al hacer clic en el botón, la UI ejecuta la acción sin guardar ningún valor. Este tipo de acciones son útiles para tareas de mantenimiento o depuración que no requieren persistencia.

### 7.5. Integración con `AgentActions`

`AgentActions` es un componente del agente que mantiene un mapa de acciones registradas. Cada acción implementa la interfaz `AgentActions.AgentAction`:

```java
public interface AgentAction {
    boolean perform(AgentSettings settings);
    String getName();
    void set(String name, Object value);
    Object get(String name);
    Agent getAgent();
    void setAgent(Agent agent);
}
```

Las acciones pueden acceder al agente completo (a través de `getAgent()`) y a la configuración actual, lo que les permite realizar operaciones complejas como recargar servicios, modificar el estado de herramientas o incluso ejecutar comandos de depuración.

### 7.6. Ejemplo práctico: Añadir una acción personalizada

Supongamos que queremos añadir una acción que limpie la caché de documentos del agente. Los pasos serían:

1. **Definir la acción en el código**:
   ```java
   public class ClearCacheAction extends AbstractAgentAction {
       public ClearCacheAction() {
           super("CLEAR_DOCUMENT_CACHE");
       }
       
       @Override
       public boolean perform(AgentSettings settings) {
           Path cachePath = getAgent().getPaths().getCacheFolder().resolve("documents");
           FileUtils.deleteDirectory(cachePath.toFile());
           getAgent().getCurrentConsole().printSystemLog("Caché de documentos limpiada.");
           return true;
       }
   }
   ```

2. **Registrar la acción** en `AgentManagerImpl` (en el bloque de registro de acciones, o en el servicio correspondiente).

3. **Añadir la entrada en `settingsui.json`**:
   ```json
   {
     "type": "action",
     "label": "Limpiar caché de documentos",
     "actionName": "CLEAR_DOCUMENT_CACHE"
   }
   ```

4. **Reiniciar el agente** (o recargar la configuración). La nueva acción aparecerá en la interfaz y será ejecutable.

### 7.7. Limitaciones y consideraciones

- **No todas las acciones son recargables en caliente**: algunas acciones requieren que el agente se reinicie para surtir efecto completo (aunque se intenta minimizar este caso).
- **La recarga en caliente no es atómica**: si una acción falla, la configuración puede quedar en un estado inconsistente. Se recomienda que las acciones sean idempotentes y manejen errores de forma segura.
- **Las acciones no son transaccionales**: si una acción modifica múltiples servicios y uno falla, los cambios parciales pueden persistir. El desarrollador debe ser consciente de este riesgo y diseñar las acciones en consecuencia.
- **Las acciones están acopladas al agente**: no pueden ejecutarse sin una instancia de `Agent`. Esto es intencionado, ya que la mayoría de las acciones necesitan acceder a servicios o rutas del agente.

## 8. Relación con `AgentPaths`

La configuración de Noema no flota en el vacío; está firmemente anclada al sistema de archivos a través de `AgentPaths`. Esta relación es bidireccional: `AgentPaths` proporciona la ubicación física de los archivos de configuración, y `AgentSettings` utiliza esa información para leer, escribir y resolver recursos auxiliares.

### 8.1. Ubicación de la configuración

`AgentSettings` depende de `AgentPaths` para conocer la ubicación de `settings.json`. Durante la inicialización, `AgentPaths` proporciona la ruta `var/config/settings.json` a través del método `getConfigPath("settings.json")`. Esta ruta puede ser:

- **Local al workspace**: `workspace/.noema-agent/var/config/settings.json`. Es la ubicación por defecto y la que se utiliza para la configuración específica del proyecto.

- **Global**: `~/.config/noema-agent/var/config/settings.json`. Esta ubicación se utiliza para configuraciones que se comparten entre múltiples workspaces (actualmente solo el historial de workspaces recientes, aunque podría extenderse).

La resolución de rutas sigue el principio de **prioridad local**: si existe un archivo de configuración en el workspace, se utiliza ese. Si no, se busca en la configuración global. Esto permite que el usuario tenga una configuración base compartida y la sobrescriba localmente cuando sea necesario.

### 8.2. Resolución de recursos auxiliares

Además de `settings.json`, `AgentSettings` utiliza `AgentPaths` para localizar otros recursos que forman parte de la configuración:

- **Dominios externos**: los archivos `.properties` referenciados en `settingsui.json` (ej: `models.properties`, `providers_urls.properties`, `apikeys.properties`) se buscan a través de `AgentPaths.getConfigPath(nombre)`. Esto permite que los dominios puedan residir tanto en el workspace local como en la configuración global.

- **Prompts y plantillas**: los archivos Markdown que definen los prompts del sistema (ej: `reasoning-system.md`, `memory-compact.md`) también se resuelven mediante `AgentPaths`, siguiendo el mismo mecanismo de prioridad local.

- **Recursos de identidad y habilidades**: los archivos en `var/identity` y `var/skills` se cargan bajo demanda a través de `AgentPaths.getAgentPath()`, que combina la búsqueda local y global.

### 8.3. Integración en el arranque

El ciclo de vida típico durante el arranque del agente es:

1. **Creación de `AgentPaths`**: se instancia `AgentPaths` con la ruta del workspace seleccionado por el usuario.
2. **Creación de `AgentSettings`**: se instancia `AgentSettingsImpl` pasándole `AgentPaths`.
3. **Configuración inicial**: se invoca `settings.setupSettings(paths)`, que:
   - Despliega los recursos por defecto desde el JAR a la ubicación local (si no existen).
   - Carga la configuración desde `settings.json`.
4. **Carga de la configuración**: se invoca `settings.load()`, que lee el archivo desde disco y construye el árbol interno.
5. **Inicialización de servicios**: los servicios consultan `settings` para obtener sus parámetros y arrancan.

### 8.4. Recarga en caliente y `AgentPaths`

Cuando la configuración se recarga en caliente (ej: el usuario modifica `settings.json` manualmente y luego invoca `load()`), `AgentSettings` vuelve a leer el archivo desde la misma ubicación proporcionada por `AgentPaths`. Si el usuario ha movido o renombrado el archivo, la recarga fallará y se notificará el error.

`AgentPaths` no se actualiza durante la recarga en caliente; la ubicación de la configuración es fija durante toda la ejecución del agente. Esto es intencionado: cambiar la ubicación del workspace en tiempo de ejecución no está soportado y requeriría un reinicio completo.

### 8.5. Configuración global y workspaces

La configuración global (`~/.config/noema-agent/`) se gestiona de forma independiente. `AgentSettingsImpl` mantiene un objeto `GlobalSettingsData` que se serializa en un archivo separado (`settings.json` dentro de la carpeta global). Este archivo contiene:

- **`lastWorkspacesPaths`**: lista de rutas de workspaces utilizados recientemente.
- **`lastWorkspacePath`**: la última ruta de workspace seleccionada.

La configuración global se carga y guarda mediante métodos específicos (`getGlobalSettings()`, `saveGlobalSettings()`). A diferencia de la configuración local, la global no se recarga en caliente; los cambios requieren un reinicio del agente para reflejarse en la UI de selección de workspace.

### 8.6. Ejemplo práctico

Supongamos que un usuario quiere compartir la misma lista de modelos de lenguaje entre varios proyectos. Puede crear un archivo `models.properties` en `~/.config/noema-agent/var/config/models.properties` con la lista de modelos. Si un workspace no tiene un `models.properties` local, el sistema lo resolverá automáticamente desde la ubicación global.

Del mismo modo, un usuario puede querer tener una configuración específica para un proyecto (ej: una API key diferente). En ese caso, basta con sobrescribir el valor en el `settings.json` local; el sistema dará prioridad al local sobre el global.

### 8.7. Limitaciones

- **No hay sincronización automática** entre la configuración local y la global. Si un usuario modifica la global, los workspaces existentes no se actualizarán automáticamente (a menos que se recargue la configuración manualmente).
- **La configuración global es limitada**: actualmente solo almacena metadatos de uso. Para compartir configuraciones completas entre workspaces, el usuario debe copiar manualmente los archivos o utilizar enlaces simbólicos.
- **La resolución de recursos es de dos niveles**: local y global. No hay soporte para una jerarquía de más niveles (ej: proyecto > usuario > sistema). Esto es suficiente para los casos de uso actuales, pero podría ser una limitación en entornos más complejos.


## 9. Limitaciones y diseño deliberado

El sistema de configuración de Noema no aspira a ser un framework de propósito general. Es una herramienta diseñada para un caso de uso concreto —gestionar la configuración de un agente de IA local— y refleja las prioridades de ese contexto: simplicidad, transparencia y facilidad de depuración. Esta sección documenta las limitaciones conocidas y las decisiones de diseño que las justifican.

### 9.1. No es un sistema de configuración de propósito general

`AgentSettings` no es un sustituto de frameworks como Spring Cloud Config, etcd o Consul. No soporta:

- **Herencia o perfiles**: no hay conceptos de "entorno de desarrollo" vs "producción", ni perfiles que activen o desactiven bloques de configuración. La configuración es plana y global para el agente.

- **Validación de esquema**: no hay un esquema formal (JSON Schema) que valide la estructura de `settings.json`. Si un usuario introduce un valor de tipo incorrecto, el sistema puede fallar silenciosamente o lanzar excepciones en tiempo de ejecución.

- **Cifrado de valores sensibles**: las claves API y contraseñas se almacenan en texto plano en `settings.json`. La seguridad de estos datos depende de la confidencialidad del sistema de archivos. Noema no cifra estos valores.

- **Almacenamiento distribuido**: la configuración es local al workspace o al usuario. No hay soporte para configuraciones compartidas entre diferentes instancias del agente ni para sincronización con servicios remotos.

**Justificación**: estas características son innecesarias para el alcance de Noema. Añadirlas habría multiplicado la complejidad del sistema sin aportar un beneficio claro para su caso de uso principal. La transparencia (poder inspeccionar y editar `settings.json` con un editor de texto) es más valiosa que la sofisticación.

### 9.2. La estructura se da por válida

El sistema asume que `settings.json` tiene una estructura coherente. Si el archivo contiene JSON malformado o claves que no coinciden con la jerarquía esperada por los servicios, el comportamiento es impredecible. `AgentSettings` no intenta reparar ni normalizar la configuración; simplemente la deserializa y la expone tal como está.

**Justificación**: Noema está diseñado para ser operado por personas que entienden lo que hacen. La validación estricta habría añadido una capa de complejidad en el deserializador y en la UI, sin eliminar la posibilidad de errores humanos. Preferimos fallar rápido y visiblemente (una excepción en el log) que intentar adivinar lo que el usuario quería decir.

### 9.3. Recarga en caliente limitada

Aunque el sistema soporta recarga en caliente, no todos los cambios se aplican automáticamente. Algunos servicios requieren una acción explícita (ej: `CHANGE_REASONING_PROVIDER`) para recargar sus parámetros. Otros, como el propio `AgentSettings`, no se recargan automáticamente cuando el archivo cambia en disco; es necesario invocar `load()` manualmente (o desde la UI).

**Justificación**: la recarga automática de todos los cambios sería difícil de implementar de forma robusta (¿qué pasa si un servicio está en medio de una operación?). El enfoque actual —cambios explícitos y acciones— da al usuario control sobre cuándo se aplican los cambios, minimizando riesgos.

### 9.4. Expresiones limitadas

El `ExpressionEvaluator` (punto 6) no es un lenguaje de programación completo. Soporta un subconjunto de operadores y funciones, suficiente para las necesidades de reactividad de la UI, pero no para lógica compleja. No hay soporte para bucles, definición de funciones, ni acceso a recursos externos (ej: llamadas a API, lectura de archivos).

**Justificación**: la UI reactiva necesita expresiones simples como "habilita este campo si ese otro tiene un valor concreto". Extender el evaluador para soportar casos más complejos habría aumentado su tamaño y complejidad sin un beneficio claro, y podría haber introducido vulnerabilidades de seguridad (ej: inyección de código).

### 9.5. Dependencia de la codificación y formato

El archivo `settings.json` debe estar codificado en UTF-8. El sistema no maneja otras codificaciones. Además, el formato JSON es sensible a la estructura; una coma mal colocada o una llave faltante puede romper la carga.

**Justificación**: UTF-8 es el estándar de facto para archivos de configuración en sistemas modernos. JSON es un formato ampliamente conocido y soportado. Forzar su uso reduce la ambigüedad y facilita la interoperabilidad con herramientas externas.

### 9.6. No hay gestión de conflictos en entornos multiusuario

Noema está diseñado para un único usuario en una única máquina. Si dos usuarios editáramos simultáneamente `settings.json`, el sistema no detectaría conflictos ni resolvería condiciones de carrera.

**Justificación**: Noema es un agente de escritorio, no un servicio multiusuario. Este escenario está fuera del ámbito del proyecto.

### 9.7. La configuración global es minimalista

La configuración global (`~/.config/noema-agent/`) solo almacena metadatos de uso (historial de workspaces). No se utiliza para compartir parámetros de configuración entre workspaces, como modelos o API keys. Aunque técnicamente sería posible, no está implementado.

**Justificación**: la configuración global surgió como una necesidad para recordar el último workspace utilizado, no como un sistema de configuración compartida. Ampliarla para cubrir otros casos añadiría complejidad sin una demanda clara.

### 9.8. Ausencia de gestión de versiones

No hay un mecanismo para migrar la configuración entre versiones de Noema. Si una nueva versión introduce cambios en la estructura de `settings.json` (ej: renombra una clave o cambia el formato de un valor), el usuario debe actualizar manualmente su archivo.

**Justificación**: Noema es un proyecto de investigación en evolución. La compatibilidad hacia atrás es deseable, pero no siempre es posible sin ralentizar el desarrollo. Se prefiere documentar los cambios y dejar que los usuarios adapten su configuración en lugar de implementar un sistema de migraciones complejo.

---

A pesar de estas limitaciones, el sistema de configuración de Noema cumple su propósito de forma eficiente y transparente. La mayoría de los problemas se evitan con una buena documentación y una UI que guíe al usuario en la edición de parámetros. La simplicidad es una virtud cuando el objetivo es que el sistema sea comprensible y depurable.


## 10. Ejemplos prácticos

Esta sección recorre casos de uso concretos del sistema de configuración. Cada ejemplo es autocontenido y muestra cómo el usuario o el desarrollador interactúan con `AgentSettings`, `settingsui.json` y las acciones asociadas.

### 10.1. Definir un nuevo dominio de configuración

**Contexto**: queremos añadir una lista de servidores proxy a los que el agente pueda conectarse. Queremos que esta lista sea editable desde la UI y que se almacene en `settings.json`.

**Paso 1: Crear el archivo de dominio**

Creamos el archivo `proxies.properties` en `var/config/`:

```properties
# proxies.properties
Servidor_Corporativo=proxy.corp.local:8080
Servidor_Privado=10.0.0.5:3128
Servidor_Público=proxy.example.com:1080
```

**Paso 2: Registrar el dominio en `settingsui.json`**

Añadimos una entrada en el objeto `domains` del descriptor:

```json
"domains": {
  "LLM_MODELS": "models.properties",
  "PROXIES": "proxies.properties"
}
```

**Paso 3: Usar el dominio en un control de la UI**

Creamos un nuevo nodo en el menú correspondiente:

```json
{
  "type": "combo",
  "label": "Seleccionar servidor proxy",
  "variableName": "network/proxy",
  "childs": "PROXIES",
  "required": false
}
```

**Resultado**: la UI mostrará un combo con las opciones definidas en `proxies.properties`. Al seleccionar una, se guardará el valor en `settings.json` bajo `network/proxy`. Si el usuario añade una nueva línea al archivo `.properties`, el combo se actualizará automáticamente al recargar la configuración.

### 10.2. Añadir una nueva opción de configuración en la UI

**Contexto**: queremos añadir un parámetro `timeout` para las conexiones HTTP, que se almacene como número entero y sea editable desde la UI.

**Paso 1: Añadir el nodo en `settingsui.json`**

Bajo el menú "Red" (o un menú nuevo), añadimos un campo de entrada:

```json
{
  "type": "inputstring",
  "label": "Timeout de conexión (segundos)",
  "variableName": "network/http_timeout",
  "required": false,
  "actionName": "RELOAD_NETWORK_CONFIG"
}
```

**Paso 2: Usar el parámetro desde el código**

En un servicio o herramienta que necesite el timeout:

```java
int timeout = agent.getSettings().getPropertyAsInt("network/http_timeout", 30);
```

**Paso 3: Recargar la configuración (opcional)**

Si el servicio necesita aplicar el nuevo timeout sin reiniciar, se define la acción `RELOAD_NETWORK_CONFIG` en el servicio correspondiente. Al cambiar el valor en la UI, se dispara la acción y el servicio recarga sus parámetros.

### 10.3. Uso de `ExpressionEvaluator` para reactividad

**Contexto**: queremos que la opción de "ejecutar comandos shell" solo esté habilitada si el usuario ha permitido la ejecución de comandos en la sección de seguridad.

**Paso 1: Definir el control en `settingsui.json`**

```json
{
  "type": "checkedlist",
  "label": "Capacidades del Agente",
  "variableName": "reasoning/active_tools",
  "childs": "AVAILABLE_TOOLS",
  "childEnabled": "child == \"shell_execute\" ? getSetting(\"access_control/allow_shell_execution\") : true"
}
```

**Paso 2: El `ExpressionEvaluator` en acción**

Cuando la UI renderiza el `checkedlist`, evalúa `childEnabled` para cada elemento. Si `child` es `shell_execute`, la expresión devuelve el valor de `access_control/allow_shell_execution` (que puede ser `true` o `false`). Si el usuario cambia la política de seguridad, la UI actualiza automáticamente el estado habilitado del control.

**Paso 3: El `ExpressionEvaluator` con contexto adicional**

En el ejemplo anterior, la expresión hace referencia a `child`, que es el nombre técnico de la herramienta. La UI inyecta este valor en el contexto de evaluación. Para casos más complejos, se puede añadir más variables:

```json
"childEnabled": "child == \"file_write\" && getSetting(\"access_control/allow_disk_write\") == \"true\""
```

**Resultado**: la UI reacciona en tiempo real a cambios en otras partes de la configuración, sin necesidad de lógica condicional en el código de la interfaz.

### 10.4. Modificar un valor y disparar una acción

**Contexto**: cuando el usuario cambia el modelo de razonamiento, queremos que el agente recargue el modelo en caliente sin reiniciar.

**Paso 1: Definir el control en `settingsui.json`**

```json
{
  "type": "selectoption",
  "label": "Seleccionar Modelo (razonamiento)",
  "variableName": "reasoning/provider/model_id",
  "actionName": "CHANGE_REASONING_MODEL",
  "childs": "LLM_MODELS"
}
```

**Paso 2: Registrar la acción en el servicio**

En `ReasoningService`, durante el arranque, se registra la acción:

```java
agent.getActions().addAction(new AbstractAgentAction(agent, "CHANGE_REASONING_MODEL") {
    @Override
    public boolean perform(AgentSettings settings) {
        model = agent.createChatModel(ReasoningService.ID);
        return true;
    }
});
```

**Paso 3: Flujo de ejecución**

1. El usuario selecciona un nuevo modelo en la UI.
2. La UI guarda el valor en `settings.json` (bajo `reasoning/provider/model_id`).
3. La UI invoca `agent.getActions().call("CHANGE_REASONING_MODEL", settings)`.
4. La acción recarga el modelo de lenguaje con el nuevo identificador.
5. El agente continúa su ejecución con el nuevo modelo.

**Resultado**: el cambio es inmediato y no requiere reinicio. El usuario puede experimentar con diferentes modelos sin interrumpir la conversación.

### 10.5. Acceder a la configuración desde el código

**Contexto**: estamos desarrollando una nueva herramienta de red (`NetworkTool`) que necesita conocer la URL de la API y el timeout de conexión.

**Paso 1**: obtener la referencia a `AgentSettings` desde el agente:

```java
public class NetworkTool extends AbstractAgentTool {
    public NetworkTool(Agent agent) {
        super(agent);
    }

    @Override
    public String execute(String jsonArguments) {
        AgentSettings settings = agent.getSettings();
        String apiUrl = settings.getPropertyAsString("network/api_url", "https://default.example.com");
        int timeout = settings.getPropertyAsInt("network/http_timeout", 30);

        // Usar apiUrl y timeout para realizar la petición...
    }
}
```

**Paso 2**: permitir que el usuario configure estos parámetros desde la UI (ejemplo 10.2).

**Resultado**: la herramienta es configurable sin modificar el código. El usuario puede ajustar la URL o el timeout desde la interfaz, y la herramienta reflejará los cambios en la siguiente ejecución.

### 10.6. Usar `eval` para lógica condicional en tiempo de ejecución

**Contexto**: queremos que el agente decida si debe usar un modelo de razonamiento o de compactación para una tarea determinada, basándose en una expresión de configuración.

**Paso 1**: definimos una expresión en `settings.json`:

```json
{
  "reasoning": {
    "use_fallback_model": "{ getSetting('reasoning/provider/model_id') == 'deepseek-chat' ? true : false }"
  }
}
```

**Paso 2**: evaluamos la expresión desde el código:

```java
boolean useFallback = (boolean) settings.eval(
    settings.getPropertyAsString("reasoning/use_fallback_model", "false"),
    false
);
```

**Resultado**: el valor de `use_fallback_model` se calcula dinámicamente en tiempo de ejecución, basado en el modelo de razonamiento actual. Si el usuario cambia el modelo, el valor se actualiza automáticamente sin necesidad de modificar `settings.json` manualmente.

### 10.7. Compartir configuración entre workspaces

**Contexto**: un usuario trabaja en varios proyectos y quiere usar la misma lista de modelos de lenguaje en todos ellos.

**Paso 1**: Crear el archivo `models.properties` en `~/.config/noema-agent/var/config/models.properties` con la lista de modelos.

**Paso 2**: En cada workspace, el archivo `settingsui.json` referenciará el dominio `LLM_MODELS` (que apunta a `models.properties`). Si el workspace local no tiene un `models.properties`, el sistema resolverá la ruta a la configuración global.

**Paso 3**: El usuario puede sobrescribir el `models.properties` localmente en un workspace concreto si necesita una lista diferente para ese proyecto.

**Resultado**: la configuración se comparte por defecto, pero puede personalizarse localmente cuando sea necesario. El usuario no tiene que copiar y pegar listas en cada proyecto.
