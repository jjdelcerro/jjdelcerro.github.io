---
layout: post
title: "La importancia de describir correctamente las 'herramientas' a un LLM."
date: 2025-09-29
canonical_url: "https://blog.gvsig.org/2025/09/29/la-importancia-de-describir-correctamente-las-herramientas-a-un-llm/"
---  

En mi serie de artículos sobre la creación de un asistente para gvSIG Desktop, explore el viaje desde el prototipo hasta una solución distribuible. Hoy quiero hacer un acercamiento en un aspecto que resultó ser crucial: el arte, o ciencia, de describir las herramientas para que un LLM pueda usarlas de forma eficaz.

A la hora de describir las herramientas que tiene disponible un LLM, bien porque has hecho un cliente que las expone o porque has implementado o vas a implementar un servidor MCP, la descripción es una pieza clave para que el LLM pueda usarlas de forma adecuada.

### Herramientas disponibles en el servidor MCP de gvSIG Desktop

Aquí os dejo la descripción de las herramientas que expone el servidor MCP que implementé para gvSIG Desktop.

#### **get_application_context**

- **Description:**

  Returns essential information about the gvSIG Desktop application environment, its document-oriented nature (Views, Tables, Layouts), and key concepts.
  
  **GENERAL GUIDELINES FOR QUERY INTERPRETATION**:
  The user may refer to data entities using natural language (e.g., 'show me the supports'). Assume that nouns in the user's query may correspond to tables in the data model. Your primary task is to map these user terms to the actual table names available in the schema. If a term is ambiguous, use get_data_model_schema to explore the available tables before informing the user that the information is not available.
    
  **CRITICAL: Call this tool first, before any other tool, to understand the operational context.**
  
- **Parameters:**

  - Esta herramienta no tiene parámetros

---

#### **get_data_models**

- **Description:**

  Returns a list of available data models.
  
  Use this tool FIRST when the user asks about database structure (tables, columns, schema) or when you need to know which data models are available.
  If only one data model exists, you can use its ID directly without asking the user.
  
  For data queries (COUNT, SELECT, WHERE), you do NOT need to call this tool first if you already know the appropriate data model from context.
  
- **Parameters:**

  - Esta herramienta no tiene parámetros

---

#### **get_data_model_schema**

- **Description:**

  Returns the complete DDL schema for a specified data model, including table structures, columns, relationships, and data dictionaries.
  
  Use this tool ONLY when you need to understand the database structure (available tables, their columns, relationships, etc.). This is useful for planning queries or explaining the database design to the user. Once you have the schema, retain it in your context for multiple queries.
  
  **USER INTENT GUIDANCE**:
  When the user asks to query, filter, or visualize data related to a specific concept (e.g., 'supports', 'plates', 'incidents'), and you are not certain if it corresponds to a table, you MUST use this tool (get_data_model_schema) first. By examining the schema, you can confirm the existence of a table (like "SUPPORTS") and identify its relevant columns (like "MODELO"), before attempting to construct a query with query_table or show_table.
    
- **Parameters:**

  - **data_model_id** (`string`, required): The ID of the data model.
  - **include_datadicts** (`boolean`, optional): Whether to include data dictionaries in the schema. Defaults to true.

---

#### **get_view_bbox**

- **Description:**

  Returns the WKT of the bounding box of the active View document.
  
  Use this to get the coordinates of the area the user is currently looking at on the map.
  
- **Parameters:**

  - Esta herramienta no tiene parámetros

---

#### **get_view_projection**

- **Description:**

  Returns the SRID (Spatial Reference Identifier) of the active View document's projection.
  
  Use this to understand the coordinate system of the map the user is currently seeing.
  
- **Parameters:**

  - Esta herramienta no tiene parámetros

---

#### **query_table**

- **Description:**
  Executes a SQL query and returns the full result set as a JSON array directly to the LLM's context.

  **CRITICAL USAGE RULES:**
  
  1.  **A `LIMIT` clause is mandatory in your query.** Queries without a `LIMIT` clause will be rejected. The maximum allowed limit is 100.
  2.  This tool is ONLY for fetching small lists of categories, lookup values, or small aggregated results needed for subsequent tool calls (e.g., to build a chart).
  3.  For queries that might return large amounts of data for user visualization, you MUST use the `show_table` tool instead.

  **DYNAMIC PLACEHOLDERS:**
  Dynamic placeholders are markers replaced just before executing the SQL query with contextual values. They have a format of `${COMPONENT.PROPERTY}`, and are case insensitive.
  Available placeholders are:
  
  *   `${CURRENTVIEW.BBOX}` which is replaced by the bounding box of the active View.
  *   `${CURRENTVIEW.SRID}` which is replaced by the SRID of the active View.
  *   `${<TABLE>.SELECTION}` where `<TABLE>` must be the name of a table in the data model, and is replaced by the list of primary keys of the table of the selected elements separated by ",". If the list exceeds a "reasonable limit" it will be replaced by NULL. If the primary keys of the table are of character type, they will be properly quoted. This value is appropriate to be used in an IN clause of a WHERE.

  All used placeholders need to be declared in the 'placeholders' parameter.

  Restrictions (must not be used in):
  
  *   Identifiers (tables/columns/aliases)
  *   Non-SELECT statements
  *   Dangerous functions
  
  They are allowed in:
  
  - As literals in column declarations: `SELECT '${CURRENTVIEW.SRID}' AS srid`
  - In WHERE statements:
  
    - Filters by the View area: `SELECT * FROM SUPPORTS WHERE ST_Within(GEOMETRY, ST_GeomFromText('${CURRENTVIEW.BBOX}'))`
    - Filters by the selection of a layer: `SELECT * FROM SUPPORTS WHERE ID IN (${SUPPORTS.SELECTION})`

  **CRITICAL BEHAVIORAL RULES:**
  
  1.  NEVER show or explain the SQL query to the user in your response
  2.  Describe your actions in natural language only (e.g., 'Searching for steel plates...')
  3.  Present results concisely without technical details
  4.  If you encounter categorized values without a data dictionary, DO NOT invent values, 
      inform the user and suggest providing the data dictionary information via text response

  Examples:
  
  - SAY: 'I'll find the inventory count for steel materials'
  - AVOID: 'Executing: SELECT COUNT(*) FROM materials WHERE type = 'steel''

  **QUERY CONSTRUCTION RULES:**
  
  1.  Prefer JOIN operations over subqueries when possible
  2.  Use double quotes when referring to identifiers (field or table names)
  3.  Apply case-insensitive LIKE operators for string comparisons by default
  4.  NEVER include database schemas in queries (use `table` not `schema.table`)
  5.  Use standard SQL-92 syntax ONLY
  6.  Use ONLY spatial functions from 'SQL/MM Part 3: Spatial (2016)' and 'OGC SFS 1.2.1 (2011)'
  7.  STRICTLY PROHIBITED: DBMS-specific extensions (PostGIS, Oracle Spatial, etc.)
  8.  Avoid any non-standard SQL syntax
  9.  Limit results to 100 rows to ensure performance.

  **CATEGORIZED FIELD HANDLING:**
  
  1.  For categorized fields, perform case-insensitive comparison by converting to uppercase
  2.  If a data dictionary exists, use exact match (=) with the foreign key value
  
     Example: `WHERE material = 'ALUMINUM'` (not `WHERE material LIKE '%aluminum%'`)

  **ABOUT SCHEMA RETRIEVAL:**
  
  You do NOT need to call `get_data_model_schema` before using this tool unless you need schema information to construct your query. If you already know the table structure from previous interactions, proceed directly with your query.
  
- **Parameters:**

  - **data_model_id** (`string`, required): The ID of the data model to query.
  - **query** (`string`, required): The SQL query to execute. Must include a LIMIT clause and return a small result set.
  - **placeholders** (`array` of `string`, optional): Optional list of placeholders to replace in the query.

---

#### **query_value**

- **Description:**
  Execute an SQL query that returns a scalar value. The query will return a single column from a single row.
  
  Note:
    In the original description, this tool shares the same sections as `query_table`:
    
    * DYNAMIC PLACEHOLDERS, 
    * CRITICAL BEHAVIORAL RULES, 
    * CATEGORIZED FIELD HANDLING
    * ABOUT SCHEMA RETRIEVAL 
    * QUERY CONSTRUCTION RULES, but with a limit of 100 rows.
  
- **Parameters:**

  - **data_model_id** (`string`, required): The ID of the data model to query.
  - **query** (`string`, required): The SQL query to execute.
  - **title** (`string`, required): A descriptive name for the result returned by the query. This value will be used as the label or identifier for the scalar data obtained.
  - **placeholders** (`array` of `string`, optional): Optional list of placeholders to replace in the query.

---

#### **set_selection**

- **Description:**

  Executes a query to get IDs and sets the selection on the corresponding layer.

  Note:
    In the original description, this tool shares the same sections as `query_table`:
    
    * DYNAMIC PLACEHOLDERS, 
    * CRITICAL BEHAVIORAL RULES, 
    * CATEGORIZED FIELD HANDLING
    * ABOUT SCHEMA RETRIEVAL 
    * QUERY CONSTRUCTION RULES, but with a limit of 10000 rows.
  
- **Parameters:**

  - **data_model_id** (`string`, required): The ID of the data model containing the table.
  - **table_name** (`string`, required): The name of the table to apply the selection to.
  - **query** (`string`, required): The SQL query to execute. It must return a single column of primary keys for the specified table.

---

#### **set_view_bbox**

- **Description:**

  Zooms the active View document to the specified bounding box.
  Use this when the user asks to focus or zoom the map to a specific area, like the location of selected items.
  
- **Parameters:**

  - **bbox_wkt** (`string`, required): The WKT (Well-Known Text) representation of the bounding box to zoom to.

---

#### **set_view_center**

- **Description:**
  Centers the active View document on the specified point.
  Use this when the user asks to center the map on a specific coordinate or feature.

- **Parameters:**

  - **point_wkt** (`string`, required): The WKT (Well-Known Text) representation of the point to center the view on.

---

#### **show_diagram**
- **Description:**
  Displays a diagram in the application using either Mermaid or PlantUML syntax. This tool returns no data to the LLM.

  **DATA GATHERING FOR CHARTS:**
  
  This tool requires the complete diagram code as a string. For charts (Pie, Bar, etc.), this means you need a set of data points (e.g., labels and their corresponding numeric values).
  If this data is not directly available, you must use the `query_value` tool to gather it. This may involve calling `query_value` multiple times, once for each data point needed for the chart, and then assembling the results into the final diagram code.

  **Scenario A: Aggregating by Categories from a Dictionary**
  
  Use this pattern when the user asks for a breakdown by a categorized field.
  
  1.  **Identify Categories:** Use `get_data_model_schema` to find the dictionary table and its possible values (e.g., `SOPORTES_MATERIALES`).
  2.  **Query per Category:** For each category value, call `query_value` to get its count (e.g., `SELECT COUNT(*) FROM "SOPORTES" WHERE "MATERIAL" = 'STRIATED_ALUMINUM'`).
  3.  **Assemble and Call:** Collect all results and build the Mermaid code for `show_diagram`.

  **Scenario B: Comparing Different, Unrelated Values**
  
  Use this pattern when the user wants to compare distinct metrics.
  
  1.  **Identify Metrics:** Understand the different values the user wants to compare (e.g., 'total number of supports' vs 'total number of plates').
  2.  **Query per Metric:** Call `query_value` for each metric (e.g., `SELECT COUNT(*) FROM "SOPORTES"` for the first, and `SELECT COUNT(*) FROM "PLACAS"` for the second).
  3.  **Assemble and Call:** Collect the results and build the diagram code (e.g., a pie chart comparing the two counts).

  The key principle is to use `query_value` as a building block to fetch the individual numbers required by the chart.

  **SUPPORTED DIAGRAM TYPES:**
  
  - PlantUML: Entity Relationship (ERD), Sequence, Use Case, Class, Activity, Component diagrams
  - Mermaid: Pie, Bar, Line, XY (scatter) charts ONLY

  **IMPORTANT RESTRICTIONS:**
  
  -   ONLY the diagram types listed above are supported
  -   Unsupported diagram types will cause execution errors
  -   Diagram code must contain only ASCII characters (no accents or special characters)
  -   The application automatically detects the diagram type from the content
  
- **Parameters:**

  - **diagram_code** (`string`, required): The complete diagram definition in either Mermaid or PlantUML syntax.
  - **title** (`string`, required): A descriptive title for the diagram that will be displayed to the user.

---

#### **show_table**

- **Description:**
  Executes an SQL query and displays results in the application. This tool returns no data to the LLM.

  Note:
    In the original description, this tool shares the same sections as `query_table`:
    
    * DYNAMIC PLACEHOLDERS, 
    * CRITICAL BEHAVIORAL RULES, 
    * CATEGORIZED FIELD HANDLING
    * ABOUT SCHEMA RETRIEVAL 
    * QUERY CONSTRUCTION RULES, but with a limit of 2000 rows.
  
- **Parameters:**

  - **data_model_id** (`string`, required): The ID of the data model to query.
  - **query** (`string`, required): The SQL query to execute.
  - **title** (`string`, required): A descriptive name for the result returned by the query. This value will be used as the label or identifier for the data set obtained.
  - **placeholders** (`array` of `string`, optional): Optional list of placeholders to replace in the query.

### Sobre las notas en algunas de las descripciones
  
Algunas herramientas comparten parte de la descripción. Para ponérosla aquí, he hecho referencia a la herramienta descrita con anterioridad que tenía esas descripciones, pero es muy importante entender que eso lo he hecho de cara a clarificar y reducir esta documentación para ser leída por una persona. Para un LLM es más adecuado repetir en cada herramienta su descripción completa, y no ir referenciando a la documentación de otras herramientas.

Cada definición de herramienta debe ser un "manual de instrucciones" completo y autocontenido.

* Con descripciones completas, cuando el LLM evalúa usar `show_table`, tiene toda la información que necesita ahí mismo. Las reglas de SQL, el manejo de placeholders, las reglas de comportamiento, etc. El camino desde la intención del usuario hasta la generación de la llamada a la herramienta es directo y claro.

* Con descripciones referenciales, cuando el modelo evalúa `show_table`, lee "las reglas son las mismas que en `query_table`". Ahora, el modelo debe realizar un paso mental adicional:

    * Pausar su razonamiento sobre `show_table`.
    * Buscar en el contexto la definición de `query_table`.
    * Leer y procesar las reglas de `query_table`.
    * Volver a su razonamiento sobre `show_table` y aplicar esas reglas, recordando la excepción del LIMIT de 2000 filas.


Cada paso adicional en una cadena de razonamiento es un punto potencial de fallo. La aproximación referencial, aunque apropiada para una persona, introduce varios riesgos para el LLM:

* Ambigüedad: El modelo podría confundirse sobre qué secciones exactas se comparten.
* Olvido: Podría "olvidar" la excepción específica (como el LIMIT diferente) después de haber hecho la referencia.
* Error al referenciar: Podría buscar la información en la herramienta equivocada si hay varias referencias cruzadas.

Al repetir la información se elimina por completo esta carga cognitiva extra y estos puntos de fallo. La instrucción es explícita, inequívoca y no requiere que el modelo "salte" por el contexto para ensamblar las reglas.

Si bien es cierto que la repetición consume más tokens, el coste de una llamada fallida a la herramienta es mucho mayor.

Resumiendo, **mantén las descripciones completas y explícitas en la definición de cada herramienta que expones al LLM**.

### Tener buenas descripciones de herramientas puede ser la diferencia

Tener una buena descripción de las herramientas puede ser determinante a la hora de que el LLM pueda llevar a cabo las tareas que le pedimos o no. Incluso, puede hacer que modelos menos capaces puedan hacer cosas que sin ellas solo podríamos hacer con modelos más "potentes". Evidentemente para tareas simples, puede no tener mucha relevancia; pero marca una diferencia crucial cuando lo que le pedimos se complica.

Por ejemplo. Vamos a suponer que tenemos a "Gemini CLI" conectado al servidor MCP de gvSIG Desktop, y le preguntamos:

__Genera un diagrama de barras con los soportes por tipo de material.__

Puede parecer una consulta "complicada" para un LLM, pero con las descripciones de herramientas que acabamos de ver, el LLM no improvisa; construye un plan de ejecución metódico que sería algo así:

**El plan de acción:**

1.  **Fase de Orientación y Descubrimiento:**

    *   **Entender el entorno:** La primera tarea del LLM es orientarse. Invoca a la herramienta `get_application_context` que le proporciona el marco general de gvSIG Desktop.
    *   **Identificar Modelos de Datos:** El usuario habla de "soportes", así que el LLM necesita saber en qué contexto de datos se encuentra. Invoca a `get_data_models` para listar los modelos de datos disponibles. El resultado le proporciona el `data_model_id` necesario para todas las operaciones futuras.

2.  **Fase de Análisis del Esquema:**

    *   **Mapear la Realidad:** Antes de poder contar nada, necesita entender la estructura. ¿Existe una tabla "soportes"? ¿Cómo se llama la columna del material? ¿Es un campo de texto libre o un valor categorizado? La única forma de responder a estas preguntas es ejecutando la herramienta `get_data_model_schema` y analizar el DDL. Al hacerlo descubre:
    
        *   Existe una tabla llamada `"SOPORTES"`.
        *   Contiene una columna llamada `"MATERIAL"`.
        *   Revisa la descripción del campo `"MATERIAL"` y ve que sus valores no son de texto libre, sino que provienen de un diccionario de datos. Esto activa una regla de comportamiento específica.

3.  **Recopilación de Datos Guiada por Instrucciones:**

    *   **Seguir el Manual para Gráficos:** Ahora debe generar el diagrama. Consulta la descripción de la herramienta `show_diagram` y lee la sección **"DATA GATHERING FOR CHARTS"**, específicamente el **"Escenario A: Aggregating by Categories from a Dictionary"**. Las instrucciones son explícitas:
    
        1.  *Identificar Categorías:* Gracias al paso anterior, ya sabe que `"MATERIAL"` es un campo categorizado. Revisa el diccionario de datos asociado en el esquema y extrae la lista de posibles valores: 'GALVANIZED\_STEEL', 'PLASTIC', 'WOOD', 'STRIATED\_ALUMINUM'.
        2.  *Query per Category:* La instrucción me obliga a invocar `query_value` *múltiples veces*, una por cada categoría.

4.  **Ensamblaje y Visualización:**

    *   **Construir y Presentar:** El LLM ha recopilado todos los datos necesarios en pares de etiqueta-valor (Material: Recuento). Ahora, construye el código Mermaid para un diagrama de barras.
    *   Finalmente, ejecuta `show_diagram` con ese código y el título "Soportes por tipo de material" para mostrar el resultado al usuario.

Es crucial entender que, aunque este plan parece una secuencia lineal, el paso de 'Recopilación de Datos' es en realidad un proceso iterativo de diálogo entre el LLM y el servidor. El modelo no obtiene todos los datos de una vez, sino que pregunta activamente por el recuento de cada categoría, una por una, ensamblando pacientemente el conjunto de datos final antes de poder generar el gráfico. Esta capacidad para ejecutar un plan de múltiples pasos es una consecuencia directa de tener instrucciones claras.
    
Aunque no es directo obtener el diagrama, gracias a las descripciones de las herramientas que tiene a su disposición, es capaz de elaborar un plan y seguirlo para conseguir lo que el usuario le ha solicitado. E incluso el modelo flash es capaz de seguir estas instrucciones.

Ahora bien, simplemente reduciendo algo las instrucciones, como por ejemplo eliminando la sección "DATA GATHERING FOR CHARTS" de la herramienta `show_diagram` es suficiente para que el modelo ya no sea capaz de elaborar ese plan de ejecución, y tanto el flash como el pro dejan de ser capaces de responder a la pregunta del usuario. E incluso con esa sección ahí, si reducimos las instrucciones eliminando la sección "ABOUT SCHEMA RETRIEVAL" o simplemente el punto "1. Prefer JOIN operations over subqueries when possible" de "QUERY CONSTRUCTION RULES", el modelo flash dejará de poder responder a la petición del usuario. El pro seguirá pudiendo responder aunque en ocasiones se liará y fallará igualmente.

La descripción de las herramientas es crítica, no solo las describe, sino que guía al LLM a la hora de usarlas, a veces con instrucciones como:

"If this data is not directly available, you must use the `query_value` tool to gather it. This may involve calling `query_value` multiple times, once for each data point needed for the chart, and then assembling the results into the final diagram code"

O

"For categorized fields, perform case-insensitive comparison by converting to uppercase"

Otras simplemente son una mejor descripción de lo que realiza la herramienta.

Dicho esto, es importante tener en cuenta que una cosa es describir bien una herramienta, y otra ser redundante a la hora de describirla. Hay que evitar ser redundante en las descripciones de las herramientas. Poner una frase que describa algo, y luego otra que vuelva a describir lo mismo de otra forma puede ser contraproducente, ya que puede llevar a errores de comprensión por parte del LLM. 

Bueno, y hasta aquí con esta pequeña reflexión acerca de la importancia de las descripciones de nuestras herramientas.

Un saludo
Joaquín
