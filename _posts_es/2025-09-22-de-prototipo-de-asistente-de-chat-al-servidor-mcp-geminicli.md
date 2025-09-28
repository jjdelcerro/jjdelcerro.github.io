---
layout: post
title: "De prototipo de asistente de chat al servidor MCP y gemini-cli"
date: 2025-09-22
canonical_url: "https://blog.gvsig.org/2025/09/22/de-prototipo-de-asistente-de-chat-a-servidor-mcp-y-gemini-cli/"
---


En el artículo anterior, lo dejé justo en el momento de la revelación: la conexión inesperada entre una herramienta de línea de comandos, `gemini-cli`, y un protocolo llamado MCP era l respuesta al problema de distribución que casi acaba con el proyecto. Hoy, no vamos a revivir esa búsqueda, sino a remangarnos para construir la solución. Os mostraré en detalle qué son estas piezas y cómo, apoyándome en todo el trabajo previo, encajaron para dar vida a una solución robusta y, por fin, distribuible.

#### **Desmitificando las Piezas del Puzle**

La solución no vino de una única tecnología mágica, sino de la perfecta simbiosis de dos componentes clave que resolvieron, cada uno, una parte fundamental del problema.

**`gemini-cli`: El puente inteligente**

Al principio, `gemini-cli` era para mí una simple herramienta de productividad. Sin embargo, resultó ser la pieza angular de la solución por dos motivos cruciales:

1.  **El Solucionador de Costes:** Su generoso plan gratuito, con hasta 1000 peticiones diarias al modelo Flash, eliminaba por completo la barrera económica y el riesgo del "pago por uso" descontrolado. De repente, los usuarios podían experimentar con la herramienta sin miedo a facturas inesperadas y sin el calvario de registrar una tarjeta de crédito.
2.  **El Intermediario Técnico:** Su soporte nativo para MCP era el eslabón perdido. `gemini-cli` actuaría como un *proxy* local inteligente: por un lado, se comunicaría con la potente API de Gemini en la nube, gestionando la autenticación y los costes; por el otro, hablaría un lenguaje estándar y limpio (MCP) con mi aplicación local.

**MCP: El Lenguaje Común**

Si `gemini-cli` era el puente, el Model Context Protocol (MCP) eran los planos de construcción. Para un desarrollador, su belleza radica en su simplicidad. Es un estándar abierto que define cómo un cliente de IA (como `gemini-cli`) puede descubrir y utilizar un conjunto de herramientas locales (como las que viven dentro de gvSIG desktop).

Técnicamente, MCP es un protocolo basado en JSON-RPC. La implementación de referencia de gemini-cli se comunica a través de la entrada y salida estándar (STDIO), lo que permite lanzar una herramienta como un subproceso. Sin embargo, gemini-cli también soporta la conexión a un servidor MCP a través de un endpoint HTTP.

Para una aplicación de escritorio como gvSIG, que ya está en ejecución y no es lanzada desde la terminal, el enfoque HTTP era mucho más lógico y desacoplado. Me permitía levantar un servidor ligero dentro de la propia aplicación, un patrón que ya había utilizado en el pasado. Así, en lugar de lidiar con subprocesos y STDIO, la comunicación se establecía con una simple petición de red local, algo robusto y fácil de depurar.

El protocolo se basa en tres comandos principales: `initialize` (para establecer la conexión), `tools/list` (para que mi servidor anuncie sus herramientas) y `tools/call` (para que `gemini-cli` pida ejecutar una de ellas).



### La Configuración y su Verificación

El primer paso es indicarle a `gemini-cli` que, además de hablar con la API de Google, debe buscar herramientas en un servidor local. Esto se hace añadiendo un bloque de configuración en su fichero `settings.json`.

La configuración es tan simple como esto:

```json
{
  "mcpServers": {
    "gvSIG_desktop": {
      "httpUrl": "http://127.0.0.1:8091/tools",
      "timeout": 600000,
      "trust": true
    }
  }
}
```

Una vez guardado el fichero, podemos verificar que `gemini-cli` ha establecido la conexión correctamente. Al arrancar la herramienta, podemos usar el comando interno `/mcp` para listar los servidores MCP a los que está conectado y las herramientas a las que tiene acceso. El resultado confirma que todo está en orden.

![Muestra dos ventanas, una con gemini-cli y otra con la aplicacion gvSIG desktop. En la aplicacion gvSIG desktop se ve como gemini se ha conectado. En la consola se ha ejecutado el comando "/mcp" y muestra a que herramientas de la aplicacion tiene acceso](/assets/images/2025-09-22-de-prototipo-de-asistente-de-chat-al-servidor-mcp-geminicli/articulo4_init2.png)

_Tras configurar el `settings.json`, el comando `/mcp` nos confirma que `gemini-cli` ha detectado y se ha conectado con éxito a nuestro servidor `gvSIG_desktop`_.

#### **La Implementación: El Momento de la Convergencia**

Gracias a la decisión de reescribir todo en Java puro que os conté en el segundo artículo, tenía una base de código robusta y modular, lista para la acción. Implementar el servidor MCP fue sorprendentemente rápido, porque me di cuenta de que, sin saberlo, ya había construido una versión "artesanal" del mismo concepto.

**De un conjunto de herramientas propio a un estándar abierto**

La migración fue un momento "eureka". Mi framework de "procesadores" del prototipo Java era, en esencia, una implementación privada de la misma idea que MCP estandarizaba. Solo tenía que traducir mis definiciones de herramientas al formato oficial.

Por ejemplo, así definía la herramienta para mostrar tablas en el prototipo original de Jython, dentro del fichero sql_processor.py, como un simple texto de ejemplo en el system prompt:

```python
# ANTES: La herramienta se "programaba" en el prompt
u"""
== Consultas de tipo 'sql' ==
  Utilizaras este tipo de respuesta para cualquier consulta que involucre la creacion de una consulta SQL...
  Debe incluir un campo 'sql' con la sentencia SQL...
  Ejemplo: 
  {
    "type": "sql",
    "sql": "SELECT ...",
    "title": "Empleados por departamento",
    "esValorEscalar": false
  }
"""
```
Con MCP, la misma herramienta se define ahora en `ShowTableCommandFactory.java` con un esquema JSON formal y preciso. Pasamos de la ambigüedad de un ejemplo a la rigidez de un contrato de API:


```java
private static final JsonObject TOOL_INPUT_SCHEMA = Json.createObjectBuilder()
    .add("type", "object")
    .add("properties", Json.createObjectBuilder()
        .add("query", Json.createObjectBuilder()
            .add("type", "string")
            .add("description", "The SQL query to execute.")
            .build())
        .add("title", Json.createObjectBuilder()
            .add("type", "string")
            .add("description", "A descriptive name for the result...")
            .build())
    )
    .add("required", Json.createArrayBuilder().add("query").add("title"))
    .build();
```
Pasamos de la ambigüedad de pedirle a un LLM que siguiera un ejemplo en texto, a la precisión de ofrecerle un esquema formal. El LLM ya no adivina; pregunta y cumple.

**El Gran Payoff: Reutilización Máxima del Código Java**

Y aquí es donde la decisión estratégica que conté en el segundo artículo —abandonar el prototipo en Jython para reescribir todo en Java puro— se reveló como la mejor inversión de tiempo del proyecto.

Toda la lógica de negocio para ejecutar las consultas (conectar a la base de datos, procesar los placeholders, ejecutar el SQL y manejar el resultado) ya estaba encapsulada y probada en mi prototipo de asistente de chat impulsado por IA en java.

Al construir el servidor MCP, la implementación de una herramienta como show_table fue trivial.  El nuevo comando simplemente actúa como un orquestador que delega toda la lógica de negocio en las clases que ya habíamos desarrollado y depurado semanas antes.

El flujo es un ejemplo claro del patrón "Adaptador". Así es como se ve el "pegamento" que une el mundo MCP con la lógica original:

1. El Servidor MCP recibe la llamada y la delega en el comando específico:

    ```java
    // Fichero: .../commands/tools/ToolsCommand.java

    private Object tools_call(JsonObject params) throws Exception {
        String toolName = params.getString("name"); // ej: "show_table"
        JsonObject toolArguments = params.getJsonObject("arguments");

        // Busca el comando registrado con ese nombre
        MCPCommand targetCommand = (MCPCommand) this.getServer().getCommand(toolName);

        // Invoca la lógica del comando específico
        return mcpTargetCommand.call(toolArguments);
    }
    ```

2. El comando específico (ShowTableCommand) no hace nada más que invocar la lógica del prototipo original:

    ```java
    // El comando MCP se convierte en un simple orquestador que
    // invoca la lógica de ejecución que ya habíamos desarrollado.
    // (Fragmento simplificado de ShowTableCommand.java)
    @Override
    public Object call(JsonObject params) throws Exception {
        // ... extraer parámetros del JSON ...
        String query = params.getString("query");
        String modelid = params.getString("data_model_id");
        String title = params.getString("title");

        try {
            // ...y los usa para instanciar y ejecutar la misma lógica
            // que ya habíamos desarrollado en el chat de Java.        ShowTableAction action = new ShowTableAction(
                applicationServices, modelid, title, query, placeholders
            );
            action.actionPerformed(null); // Se ejecuta la lógica reutilizada
            
            return this.createResponseContents("Se han presentado los datos al usuario");
        } catch (Exception ex) {
            return this.createErrorResponseContents(ex.getMessage());
        }
    }
    ```

Como se puede ver, no tuve que reescribir la lógica para conectar a la base de datos, procesar placeholders o mostrar la tabla. El nuevo servidor MCP era una capa delgada que se apoyaba sobre los cimientos sólidos que ya había construido. La inversión en una base de código bien estructurada me permitió adoptar el estándar MCP en cuestión de días, no de semanas.


![Muestra dos ventanas, una con gemini-cli y otra con la aplicacion gvSIG desktop. El usuario ha solicitado que se muestren los soportes de acero. El LLM interpreta la peticion y acaba mostransolo en una ventana de la aplicacion](/assets/images/2025-09-22-de-prototipo-de-asistente-de-chat-al-servidor-mcp-geminicli/articulo4_mostrar-soportes4.png)

_El trabajo previo dando sus frutos. La imagen captura el flujo completo: una pregunta en lenguaje natural en gemini-cli (arriba), el razonamiento de la IA que culmina en la llamada a la herramienta show_table (abajo), y la aparición del resultado final directamente en una ventana de gvSIG_. 

He manipulado la imagen de la consola, eliminando texto para que se pueda ver el razonamiento completo en la captura de pantalla.

#### **El Resultado Final: Una Solución Completa**

Con el servidor MCP implementado, el flujo para un usuario final se volvió elegante y simple.

![Diagrama de bloques mostrando el flujo entre el usuario, gemini CLI y gvSIG desktop](/assets/images/2025-09-22-de-prototipo-de-asistente-de-chat-al-servidor-mcp-geminicli/articulo4_diagrama1.png)

_Diagrama de bloques mostrando el flujo entre el usuario, gemini CLI y gvSIG desktop_

La experiencia de usuario final ahora consiste en:

1.  Instalar `gemini-cli` (un simple comando).
2.  Configurarlo con un pequeño archivo para que apunte a nuestro servidor local.
3.  Abrir gvSIG, lanzar el chat y empezar a conversar, aprovechando las 1000 peticiones gratuitas diarias.

![Muestra dos ventanas, una con gemini-cli y otra con la aplicacion gvSIG desktop. El usuario ha solicitado que se muestren los soportes de acero. El LLM interpreta la peticion y acaba mostransolo en una ventana de la aplicacion](/assets/images/2025-09-22-de-prototipo-de-asistente-de-chat-al-servidor-mcp-geminicli/articulo4_mostrar-diagrama4.png)

_La solución final en acción. Una petición compleja en lenguaje natural se traduce en un diagrama ERD generado y visualizado directamente en la aplicación. Potente, contextual y, por fin, accesible_.

#### **Reflexión final y lecciones aprendidas**

Este viaje, lleno de frustraciones y descubrimientos, me enseñó lecciones muy valiosas que van más allá del código:

1.  **La distribución puede matar al mejor prototipo:** La mayor batalla no fue contra la complejidad técnica, sino contra los modelos de negocio de las APIs. Una herramienta que nadie puede usar es solo un experimento personal.
2.  **Los estándares son soluciones, no teoría:** MCP no era un concepto académico; era la respuesta precisa y práctica al muro contra el que me había chocado durante meses.
3.  **La intuición a menudo converge con los estándares:** Desarrollar mi propio protocolo de herramientas me preparó perfectamente para adoptar MCP cuando lo encontré, porque ya había resuelto los mismos problemas a una escala menor.
4.  **Una base de código bien estructurada es tu mejor aliado:** La decisión de reescribir el prototipo a Java y encapsular la lógica de negocio fue la inversión que nos permitió adoptar la solución final con una agilidad asombrosa cuando apareció la oportunidad.

Espero que esta serie de artículos os haya resultado útil, no solo como un tutorial técnico, sino como el relato real de un viaje de desarrollo.

*¿Y vosotros? ¿Habéis enfrentado problemas de distribución o costes con vuestras herramientas? ¿Cómo los resolvisteis?*

>
> P.D.: El mundo de la IA no se detiene. Justo cuando terminaba de escribir esta serie de articulos, ha surgido una nueva plataforma que podría cambiar las reglas del juego en cuanto a los costes, permitiéndonos retomar la visión original de un asistente totalmente integrado en gvSIG desktop. Pero esa... es una historia, que si se materializa, será para otro día.
>
