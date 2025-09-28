---
layout: post
title: "De chat a asistente, creando un conjunto de herramientas contextuales para gvSIG desktop"
date: 2025-09-15
canonical_url: "https://blog.gvsig.org/2025/09/15/de-chat-a-asistente-creando-un-conjunto-de-herramientas-contextuales-para-gvsig-desktop/"
---


# De chat a asistente, creando un conjunto de herramientas contextuales para gvSIG desktop

En el artículo anterior, os conté cómo un prototipo de unos pocos dias nos permitió chatear con una IA desde gvSIG. La prueba de concepto funcionaba, pero como os adelanté, me enfrentaba a un muro: los costes de la API. Antes de poder solucionar el problema del coste, necesitaba que la herramienta fuera tan útil, tan indispensable, que mereciera la pena luchar por ella.

Tenía que dejar de ser un simple chat para convertirse en un verdadero asistente que entendiera el contexto de gvSIG desktop. La pregunta clave era _¿cómo hacer que el asistente entendiera no solo el "qué" le preguntaba, sino también el "dónde" estaba mirando en el mapa y "sobre qué" estaba trabajando?_

## Una base sólida, la reescritura estratégica a Java

El prototipo en Jython fue genial para validar la idea en unos pocos dias, pero para construir un conjunto de herramientas complejo y, sobre todo, mantenible y robusto, necesitaba volver a mi terreno, Java.

Esta decisión no fue un simple detalle técnico, sino un paso estratégico. Reescribir la lógica en Java me permitió integrarla mucho mejor con el código base existente de gvSIG desktop, mejorar el rendimiento y sentar las bases para todo lo que vino después. Fue la decisión que convirtió un "experimento" en un proyecto de ingeniería serio.

## La arquitectura de herramientas contextuales, enseñándole a "ver"

Los límites del primer prototipo eran evidentes:

1.  **Sin contexto espacial**: No sabía qué capas estaban activas o qué zona del mapa veíamos.
2.  **Respuestas estáticas**: No podía reaccionar a cambios en la selección o en la vista.
3.  **Sin integración real con la UI**: Los resultados vivían y morían con la ventana de chat.

La solución fue diseñar una arquitectura de herramientas que pudiera inyectar contexto dinámico en las consultas.


### El concepto de "placeholders" dinámicos

La idea principal fue utilizar **placeholders dinámicos** en el prompt. En lugar de pedirle al LLM un SQL final, le enseñé a generar plantillas de consulta con marcas especiales que la aplicación reemplazaría con información del contexto en tiempo real.

Por ejemplo, una de las reglas clave que introduje en el *system prompt* fue:

> Si el usuario pregunta por elementos "visibles" o "en la vista actual", debes generar una consulta SQL que incluya la cláusula `WHERE ST_Within(geometria, ST_GeomFromText('{{CurrentView.bbox}}'))`.

El LLM aprendió a generar el SQL con esa marca, y la lógica encapsulada en la clase `SQLServiceAction`, se encargaba de sustituirla por el valor real justo antes de ejecutar la consulta. El método `process_sql` que implementé era capaz de manejar no solo el contexto espacial, sino también el contexto de los datos seleccionados por el usuario:

```java
// Código real del método process_sql en la clase SQLServiceAction.java

protected String process_sql(String sql, List<String> sql_placeholders) {
    if (sql_placeholders == null || sql_placeholders.isEmpty()) {
        return sql;
    }
    for (String sql_placeholder : sql_placeholders) {
        if (StringUtils.isBlank(sql_placeholder)) {
            continue;
        }

        // Extrae el nombre del placeholder, ej: "SOPORTES.selection" o "CurrentView.bbox"
        String name = StringUtils.removeStart(sql_placeholder, "{{");
        name = StringUtils.removeEnd(name, "}}");

        // CASO 1: El placeholder pide la selección actual de una tabla
        if (StringUtils.endsWithIgnoreCase(name, ".selection")) {
            String table = StringUtils.removeEndIgnoreCase(name, ".selection");
            
            // Llama a los servicios de la app para obtener los IDs de la selección
            // y los formatea como una lista para SQL (ej: '101, 102, 105')
            IteratorFormatter selection = IteratorFormatter.format(
                this.appServices.getSelectionPks(dataModel, table), 
                MAX_SELECCION_SIZE_REPRESENTACION
            );
            
            // Reemplaza el placeholder con la lista de IDs
            sql = StringUtils.replaceIgnoreCase(sql, sql_placeholder, 
                StringUtils.defaultIfBlank(selection.getFormattedString(), "(NULL)")
            );

        // CASO 2: El placeholder pide información del contexto de la vista
        } else {
            switch (name.toLowerCase()) {
                case "currentview.bbox":
                    sql = StringUtils.replaceIgnoreCase(sql, sql_placeholder, this.appServices.getCurrentViewBbox());
                    break;
                case "currentview.srid":
                    sql = StringUtils.replaceIgnoreCase(sql, sql_placeholder, this.appServices.getCurrentViewSrid());
                    break;
            }
        }
    }
    return sql;
}
```

Este enfoque era increíblemente potente. El LLM podía ahora generar consultas contextuales muy complejas. Por ejemplo, si el usuario seleccionaba varios modelos de soporte en una tabla y luego preguntaba "muéstrame las placas de estos modelos", la IA podía generar una consulta como esta:

`SELECT * FROM PLACAS WHERE MODELO IN ({{SOPORTES.selection}})`

Y la aplicación, al ejecutarla, reemplazaría `{{SOPORTES.selection}}` por la lista real de IDs seleccionados. La IA generaba la intención (`qué` hacer) y la aplicación aportaba el contexto completo (`dónde` y `sobre qué` hacerlo). La colaboración era total.

## La Arquitectura de servicios y su catálogo

Con esta arquitectura de placeholders como base, el siguiente paso fue formalizarla en un conjunto de **"servicios"** o herramientas bien definidas. Cada una se especializaría en un tipo de acción, respondiendo a un JSON estructurado que el LLM ahora podía generar con total conocimiento del contexto.

La clave para que este sistema fuera organizado y escalable fue definir un "contrato" común en Java que todas las herramientas debían cumplir. Creé una interfaz llamada `ChatAgentService`. Cualquier nueva capacidad que quisiera añadir al asistente simplemente tenía que implementar esta interfaz.

```java
// Fichero: .../spi/ChatAgentService.java

public interface ChatAgentService {
    // Devuelve el identificador único de la herramienta (ej: "sql")
    String getName();

    // Devuelve la descripción para el system prompt del LLM
    String getFullDescrition();

    // Contiene la lógica principal de la herramienta
    ChatAgentServiceResponse process(ChatAgentSessionSPI session, ChatAgentAIResponse response);
}
```

El "cerebro" que orquestaba todo era un método enrutador en la clase `ChatAgentSessionImpl`. Su lógica era simple: recibir la respuesta del LLM, inspeccionar el campo "type" del JSON, y delegar el trabajo en el ChatAgentService correspondiente.

```java
// Fichero: .../impl/ChatAgentSessionImpl.java

@Override
public ChatAgentService.ChatAgentServiceResponse send(String userMessage) {
    // 1. Se envía el mensaje al LLM y se obtiene su respuesta
    String llmResponseText = this.aiClient.send(history, systemInstructions, userMessage);
    
    // 2. Se parsea la respuesta para extraer el bloque JSON
    ChatAgentAIResponseImpl response = new ChatAgentAIResponseImpl(llmResponseText);
    JsonObject responseJson = response.getJson();

    if (responseJson == null) {
        return new ChatAgentServiceResponseImpl().setText(response.getText());
    }

    // 3. Se lee el campo "type" para decidir qué herramienta usar
    String serviceName = responseJson.getString("type", TextService.SERVICE_ID);
    ChatAgentService service = this.getService(serviceName);

    // 4. Se invoca el método process() de la herramienta seleccionada
    return service.process(this, response);
}
```

Ahora que hemos visto la arquitectura y el enrutador que la gestiona, veamos algunos ejemplos de las "órdenes" (JSONs) que el LLM aprendió a generar para cada herramienta.

1. Herramienta de consulta SQL mejorada

    La herramienta SQL original ahora podía entender el contexto. El LLM aprendió a incluir los placeholders que necesitaba en su respuesta JSON.

    ```json
    {
    "type": "sql",
    "sql": "SELECT count(*) FROM accidentes WHERE ST_Within(geom, ST_GeomFromText('{{CurrentView.bbox}}')) AND gravedad = 'alta'",
    "title": "Accidentes graves en la vista actual",
    "sql_placeholders": ["{{CurrentView.bbox}}"]
    }
    ```

2. Herramienta de vista (viewport)

    Esta herramienta permitía al usuario controlar la _Vista_ en lenguaje natural, pidiendo acciones como hacer zoom a una zona o ajustar en encuadre la _Vista_.

    ```json
    {
    "type": "viewport",
    "action": "zoom_to",
    "geometry": "POLYGON((...))"
    }
    ```

3. Herramienta de selección

    Una de las más potentes, permitía realizar selecciones complejas sobre las capas usando lenguaje natural.

    ```json
    {
    "type": "selection",
    "layer": "carreteras",
    "query": "SELECT * FROM carreteras WHERE tipo = 'autonómica'"
    }
    ```

## Un ejemplo de uso

Con estas herramientas, los flujos de trabajo se volvieron increíblemente fluidos.

**Consulta con contexto espacial:**

![Un usuario preguntando por las reservas visibles en el mapa y obteniendo una tabla con los resultados filtrados espacialmente](/assets/images/de-chat-a-asistente/articulo2_contexto-espacial1.png)

_El asistente demuestra su comprensión del contexto espacial. La pregunta "¿Cuántas reservas se ven en la vista actual?" se traduce en una consulta que utiliza el BBOX del mapa para filtrar los resultados._


## Desafíos técnicos y soluciones

Construir este sistema presentó desafíos interesantes que requerían soluciones robustas.

1. Ejecución diferida: el contexto del "ahora"

   Si el LLM genera una consulta con `{{CurrentView.bbox}}`, ¿qué pasa si el usuario mueve el mapa antes de hacer clic en el botón para ejecutarla? La consulta usaría el BBOX antiguo.

   Implementé un sistema de **ejecución diferida**. En lugar de ejecutar la acción inmediatamente, generaba un botón integrado en el chat que guardaba la *plantilla* de la acción. Al hacer clic, la aplicación leía el contexto *actual* (el nuevo BBOX) y rellenaba los placeholders justo antes de la ejecución. Esto garantizaba que las acciones siempre fueran relevantes.

2. Fiabilidad y robustez: evitando la ambigüedad en los placeholders

   ¿Qué pasaría si un usuario buscara un texto que, por casualidad, contuviera los caracteres `{{...}}`? Podría confundir al sistema de reemplazo y provocar un comportamiento inesperado.

   La solución fue diseñar un sistema de **declaración explícita**. Obligué al LLM a que, en su respuesta JSON, no solo incluyera la plantilla SQL, sino también una lista con los nombres exactos de los placeholders que había decidido usar.

    ```json
    {
    "type": "sql",
    "sql": "SELECT count(*) FROM accidentes WHERE ST_Within(geom, ST_GeomFromText('{{CurrentView.bbox}}'))",
    "title": "Accidentes en la vista actual",
    "sql_placeholders": ["{{CurrentView.bbox}}"]
    }
    ```

La clave de la robustez está en cómo el código de la aplicación procesa esta respuesta. En lugar de buscar ciegamente cualquier patrón `{{...}}` en el SQL, la lógica primero extrae la lista `sql_placeholders` y solo después la pasa al método `process_sql` que vimos antes.

Este es un fragmento de la clase `SqlService.java` que orquesta este proceso:

```java
// Fragmento de la clase SqlService.java del prototipo

@Override
public ChatAgentServiceResponse process(ChatAgentSessionSPI session, ChatAgentAIResponse response) {
    // ...
    
    // 1. Se extrae la lista de placeholders declarada por el LLM
    List<String> sql_placeholders = session.getSQLPlaceholders(
        response.getJson(), 
        "sql_placeholders"
    );
    String sql_query = response.getJson().getString("sql", null);
    String title = response.getJson().getString("title", "Resultado");

    // 2. Se crea una acción y se le pasan tanto el SQL como la lista de placeholders
    SQLServiceAction action = new SQLServiceAction(
        session,
        title,
        sql_query,
        sql_placeholders // Solo se procesarán los placeholders de esta lista
    );
    
    // ... se configura la acción y se devuelve la respuesta ...
}
```

El método `process_sql` que vimos en el punto anterior **solo itera sobre la lista `sql_placeholders` declarada**. Si un texto en el SQL parece un placeholder pero no está en esa lista, es ignorado por completo. Esto evita cualquier reemplazo accidental y garantiza que la aplicación solo modifica el SQL de la forma exacta que el LLM pretendía, haciendo el sistema mucho más predecible y seguro.

## Resultados, una herramienta que merecía la pena

El resultado fue un asistente genuinamente útil. La capacidad de entender el contexto espacial y reaccionar a las acciones del usuario lo elevó de "juguete interesante" a una herramienta de productividad real.

![Una conversación de varios turnos donde un usuario refina una consulta sobre señales horizontales, pidiendo agrupaciones, sumas y ordenaciones, hasta obtener la tabla de datos deseada.](/assets/images/de-chat-a-asistente/articulo2_conclusion1.png)

_De "juguete interesante" a herramienta de productividad. Esta captura muestra un flujo de trabajo conversacional completo, donde el asistente mantiene el contexto a lo largo de varias peticiones para refinar progresivamente el análisis de datos._

Ahora sí, tenía algo por lo que valía la pena luchar. La herramienta era demasiado buena para dejarla morir por un problema de costes. Pero el problema seguía ahí, más grande e inminente que nunca.

En el próximo artículo, veremos la búsqueda de una solución a este problema, un viaje que me llevó por servidores locales, presupuestos de hardware y, finalmente, al descubrimiento de una herramienta y un protocolo que cambió el enfoque que habia estado teniendo, _gemini CLI_, y el **Model Context Protocol (MCP)**.

Un saludo

