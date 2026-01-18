---
layout: post
title: "No, la ia no programa... (parte 2) las pruebas realizadas"
date: 2026-01-18
canonical_url: "https://jjdelcerro.github.io/es/blog/no-la-ia-no-programa-parte2-las-pruebas-realizadas/"
---  
En En [el artículo anterior](https://jjdelcerro.github.io/es/blog/no-la-ia-no-programa-y-los-que-te-dicen-lo-contrario-te-estan-vendiendo-humo/) denuncié la sobreventa de las capacidades de programación de la IA. Dije que los modelos generan texto que parece código, pero no programan. Este documento es el registro de las pruebas que hice.

Andaba desde hacía tiempo con un proyecto personal. Un servidor MCP para que Gemini CLI pudiera navegar código Java como en un IDE. Mis intentos, primero con las librerías de Maven y luego con `jdt-ls`, usando el propio Gemini CLI como ayudante, no habían llegado a ninguna parte. Lo tenía aparcado.

Entonces, a finales de año, llega el enésimo video proclamando las capacidades revolucionarias de Gemini 3.0 Flash en programación. "¿En serio?". Decidí probar con él a ver si por fin avanzaba. No me paré a diseñar un prompt perfecto, fui tirando del hilo en la conversación. Ajustando sobre la marcha. Y al final, nada. Cero.

Ahí fue cuando el cabreo personal se mezcló con la curiosidad técnica. Ya no era solo frustración por mi bloqueo, sino la irritación de ver cómo se vendía humo a gran escala. La pregunta se volvió obvia: ¿es solo este LLM o todos cojean de la misma pata? ¿Hay realmente algo sustancial detrás de tanto bombo o es solo una bola de nieve?

Tomé los fragmentos que parecían relevantes de mi conversación fallida con Gemini 3.0 Flash, construí un prompt y me dediqué a probarlo de forma sistemática. Uno a uno, en el orden que indico en este documento, con los modelos más sonados del momento. No era un experimento de laboratorio; era una comprobación visceral: **¿puede alguno de vosotros resolver esto de verdad?**

El resultado fue uniforme e inequívoco. Ninguno de los modelos generó un código que cumpliera con lo que esperaba. Esa es la conclusión que dio origen al artículo anterior, "[No, la IA no programa. Y los que te dicen lo contrario te están vendiendo humo](https://jjdelcerro.github.io/es/blog/no-la-ia-no-programa-y-los-que-te-dicen-lo-contrario-te-estan-vendiendo-humo/)". La siguiente tabla resume el resultado de cada uno.

| Modelo | Turnos hasta compilar | ¿Ejecución funcional? | Error principal / Observación clave |
| :--- | :---: | :---: | :--- |
| **Claude 4.5 Opus** | 3 | No | Lógica de inicialización o consulta incorrecta. |
| **GLM 4.7** | 7 (con ayuda) | No | Confusión con números de línea en errores. |
| **Qwen 3 Coder** | 7 | No | Falla en tiempo de ejecución (runtime). |
| **DeepSeek-V3.2** | 5 (con ayuda) | No | Entró en bucle con errores básicos. No usó búsqueda web. |
| **Gemini 3.0 Flash** | 3 | No | Fallo lógico silencioso (no devuelve resultados). |
| **ChatGPT** | 3 | No | Fallo lógico silencioso (no devuelve resultados). |
| **Grok 4.1** | 6 | No | Error en tiempo de ejecución `"Unsupported notification method"`. |
| **Kimi K2** | 3 | No | Fallo lógico silencioso (no devuelve resultados). |
| **MiniMax M2.1** | >10 (con ayuda) | No | Se atascó severamente en tipos genéricos de LSP4J. |

**Análisis de los resultados:**

1.  **Eficacia nula:** La tasa de éxito fue del **0%** (0/9). Lograr una compilación limpia no se correlacionó con la funcionalidad. Modelos como Gemini 3 Flash, ChatGPT y Kimi K2 fueron rápidos en conseguir código que compilaba, pero este era inútil al no realizar la tarea requerida.

2.  **Naturaleza de los errores:** Los fallos no fueron sintácticos, sino de **lógica, integración y manejo de estado**. El patrón común fue la incapacidad para modelar correctamente el ciclo de vida de la conexión con `jdt-ls` y el flujo de llamadas asíncronas del protocolo LSP.

3.  **Resiliencia y "razonamiento":** Modelos como DeepSeek o GLM mostraron dificultades para corregir errores de compilación básicos sin intervención. MiniMax M2.1, a pesar de su especialización declarada en código, requirió la mayor cantidad de intervenciones y no superó los mismos obstáculos conceptuales que los demás.

En conclusión, desde el modelo más rápido hasta el más especializado, todos fracasaron en el mismo punto esencial: **traducir una especificación de alto nivel en una implementación correcta de un sistema externo con estado y protocolo complejo.**

Es vital hacer una distinción aquí. Estos resultados no niegan la utilidad de la IA como asistente de productividad para determindas tareas, snippets autocontenidos o explicaciones de código, donde a menudo brilla. Lo que desmienten es la capacidad de razonamiento sistémico autónomo. La prueba demuestra que escalar de 'generar una función' a 'integrar un sistema con estado' no es una cuestión de cantidad de código, sino una barrera cognitiva que estos modelos aún no han cruzado.

Si esta conclusión te basta, saber que nueve de los modelos más avanzados fallaron estrepitosamente en un problema real, puedes quedarte con ella. El resto de este artículo documenta el proceso, el análisis del código generado y las razones arquitectónicas de este fracaso colectivo, dirigido a quien quiera entender el cómo y el por qué detrás del qué.

El resto del artículo esta estructurado en las siguientes secciones:
*   Cómo se ejecutaron las pruebas
*   Análisis cualitativo por modelo
*   Patrones de fracaso técnico, el código generado
*   Arquetipos de incompetencia, el modelo frente a la promesa
*   El prompt completo y su construcción
*   La escala de un proyecto real.
*   Contraste entre la promesa y la evidencia


### 2. Cómo se ejecutaron las pruebas

El objetivo se convirtió en medir la capacidad práctica de los modelos para resolver un problema de integración de sistemas, no su conocimiento sintáctico. Para ello, se definió un protocolo estricto y reproducible.

**2.1. Entorno técnico y premisas**

-   **Lenguaje y herramientas:** Todas las pruebas se ejecutaron en un proyecto **Java 21** gestionado con **Apache Maven** en **NetBeans 25**.
-   **Dependencias:** El proyecto incluía las librerías `org.eclipse.lsp4j` y `org.eclipse.lsp4j.jsonrpc` en versión 0.24.0.
-   **Servidor externo:** Se utilizó una instalación local de `jdt-language-server-latest`. Las rutas al ejecutable, configuración y datos se proporcionaron en el prompt.
-   **Proyecto de prueba:** El workspace a analizar fue un plugin real de gvSIG Desktop.

**2.2. Modelos evaluados**

Probé con nueve de los modelos más avanzados y publicitados disponibles a finales de diciembre de 2025, accediendo a ellos a través de sus interfaces web oficiales de chat:

1.  Claude 4.5 Opus (claude.ai)
2.  GLM 4.7 (ChatGLM)
3.  Qwen 3 Coder (QWen)
4.  DeepSeek-V3.2 (con capacidad de búsqueda web habilitada)
5.  Gemini 3.0 Flash (Google AI Studio)
6.  ChatGPT (No se exactamente la versión que utilice ya que el interface web no lo indica)
7.  Grok 4.1 (xAI)
8.  Kimi K2 (Moonshot AI)
9.  MiniMax M2.1 *(Este modelo se lanzó tras la redacción inicial del artículo anterior. Lo incluí en una ronda de pruebas posterior, aplicando el mismo protocolo).*

**2.3. Protocolo de prueba iterativo**

Para cada modelo seguí este ciclo hasta alcanzar un resultado definitivo:

1.  **Inicialización:** Se creaba una nueva clase Java vacía en el proyecto.
2.  **Prompt inicial:** Se proporcionaba la descripción completa de la tarea (el prompt que figura en la sección "El prompt completo y su construcción"), adaptando solo el nombre de la clase a generar (p.ej., `MainClaude`, `MainMiniMax`).
3.  **Generación y compilación:** El código generado por el modelo se copiaba y pegaba en la clase, y se intentaba compilar en NetBeans.
4.  **Iteración por errores:**

    *   Si la compilación fallaba, la **salida de error completa de la consola de NetBeans** se copiaba y pegaba en el chat, solicitando una corrección.
    *   Este paso se repetía hasta obtener una compilación limpia o hasta que el modelo entraba en un bucle de corrección sin progreso.
    *   En algunos casos puntuales (ej: MiniMax M2.1), se ofreció una pista concreta para desbloquear un error recurrente.

5.  **Ejecución y verificación:** Una vez lograda la compilación, se ejecutaba el programa. Se consideraba un éxito únicamente si el programa **inicializaba correctamente la conexión con `jdt-ls`, esperaba a su preparación y devolvía los resultados de búsqueda esperados**.

**2.4. Criterios de evaluación**

-   **Éxito:** Cumplir todos los requisitos funcionales descritos en el prompt.
-   **Fracaso:** Cualquier otro resultado, incluyendo: código que no compila (aún tras iteraciones), código que compila pero lanza excepciones en tiempo de ejecución, o código que se ejecuta silenciosamente sin producir el resultado correcto.

### 3. Análisis cualitativo por modelo

Esta sección recoge, en el orden en que se realizaron las pruebas, las observaciones clave y el resultado final para cada uno de los nueve modelos evaluados.

*   Claude 4.5 Opus (web)

    *   *Turnos hasta compilar:* 3.
    *   *Proceso:* En los dos primeros turnos generó código con errores de compilación y/o que no cumplía lo solicitado.
    *   *Resultado final:* El código, una vez libre de errores de compilación, falló al ejecutarse.
    *   *Análisis del código generado*:

        *   *Arquetipo:* El "Over-Engineer" Inteligente
        *   *Enfoque:* Es la implementación que más intentó parecer "real". En lugar de un simple `Thread.sleep()`, crea una `ProgressLanguageClient` compleja con lógica de estado (`AtomicBoolean`, `ConcurrentHashMap`).
        *   *Mecanismo de espera:* Intenta parsear los mensajes del log buscando "READY_INDICATORS" ("Finished loading", "Build completed", etc.). Es una aproximación frágil (si el servidor cambia el texto de log, falla), pero demuestra una intención de resolver el problema de la asíncronía.
        *   *Valoración:* Es código denso y complejo. Probablemente falló porque el JDT-LS no emitió *exactamente* las frases que esperaba o porque la lógica de `scheduleReadyCheck` con el `CompletableFuture` tuvo una condición de carrera. Demuestra capacidad, pero poco pragmatismo.


*   GLM 4.7 (web)

    *   *Turnos hasta compilar:* 7 (5 turnos propios + 2 tras ayuda).
    *   *Proceso:* Tras 5 turnos de compilación y corrección, se le ofrecí ayuda señalando el problema concreto en que se había "enganchado". Aún así, necesitó 2 turnos más para generar código sin errores. Mostró dificultad para identificar la línea del error a partir solo del número de línea.
    *   *Resultado final:* Con una corrección manual menor, ejecutó sin excepciones, pero **no encontró la referencia pedida**.
    *   *Análisis del código generado*:

        *   *Arquetipo:* El "Junior Naive"
        *   *Enfoque:* La solución más básica posible. Usa un `Thread.sleep(5000)` a pies juntillas.
        *   *Arquitectura:* Implementa `LanguageClient` en la clase principal. Es código de libro de texto, muy estándar.
        *   *Valoración:* No hay ingenio aquí. Simplemente asume que 5 segundos son suficientes para que un proyecto real de Maven se indexe. Esto garantiza el fallo en proyectos medianos o grandes, confirmando la falta de modelo mental sobre los tiempos de indexación.

*   Qwen 3 Coder (web)

    *   *Turnos hasta compilar:* 7.
    *   *Proceso:* Iteración larga para resolver errores de compilación.
    *   *Resultado final:* El código compiló, pero al ejecutarlo falló. Aun así **el código parecía muy prometedor** en esta primera fase de pruebas.

*   DeepSeek-V3.2 (web, con búsqueda)

    *   *Turnos hasta compilar:* 5 (3 turnos propios + 2 con ayuda).
    *   *Proceso:* Tras 3 turnos se quedó enganchado en un bucle de corrección sobre un par de errores "tontos". Con una pista concreta, corrigió el primero y solicitó verificar la signatura de unos métodos, algo que no hizo por sí mismo a pesar de tener capacidad de búsqueda. Con una segunda pista, corrigió el segundo error. Se notó que era **mucho más lento** que el resto y que se confundía con los números de línea de los errores.
    *   *Resultado final:* El código compiló, pero falló al ejecutarse.
    *   *Análisis del código generado*:

        *   *Arquetipo:* El "Enterprise Enredado"
        *   *Enfoque:* Síndrome de "Enterprise Java" en una clase de 50 líneas. Usa `CountDownLatch`, `AtomicBoolean`, `AtomicInteger`, `CompletableFuture.runAsync`...
        *   *Valoración:* Trata de manejar la inicialización con una máquina de estado demasiado compleja. Es un ejemplo claro de "sobre-ingeniería por falta de comprensión".
   
*   Gemini 3.0 Flash (Google AI Studio)

    *   *Turnos hasta compilar:* 3.
    *   *Proceso:* Las correcciones fueron rápidas y directas, sin dar la sensación de ir dando vueltas.
    *   *Resultado final:* La ejecución no lanzó errores, pero **no ofreció los resultados de búsqueda esperados** (no encontró nada).
    *   *Análisis del código generado*:

        *   *Arquetipo:* El "Asistente Parcheado"
        *   *Enfoque:* Código limpio y estándar. Implementa `notifyProgress` correctamente.
        *   *Mecanismo de espera:* También usa un `Thread.sleep(2000)` tras el `initialized()`. Demasiado optimista.
        *   *Valoración:* Es el código más limpio de los que usan espera pasiva. Su fallo es conceptual: cree que el handshake del protocolo LSP equivale a la preparación de los datos del workspace, lo cual es falso en JDT-LS.
   
*   ChatGPT (web)

    *   *Turnos hasta compilar:* 3.
    *   *Proceso:* Comportamiento similar a Gemini: correcciones rápidas y directas.
    *   *Resultado final:* Comportamiento idéntico a Gemini: sin errores en ejecución, pero **sin resultados de búsqueda**.
    *   *Análisis del código generado*:

        *   *Arquetipo:* El "Idiomático Vacío"
        *   *Enfoque:* Código muy limpio, bien estructurado en clases (`JdtProgressClient` interna), separando responsabilidades.
        *   *Mecanismo de espera:* **Inexistente.** Realiza la llamada `initialize()`, `initialized()` y salta directamente a `symbol()`. Confía ciegamente en que el `CompletableFuture` del `initialize` devuelve el control solo cuando todo está listo.
        *   *Valoración:* Es el código más bonito de todos, arquitectónicamente hablando. Y por eso es el más peligroso. Al ser sintácticamente perfecto, genera confianza, pero contiene el fallo lógico más grave de todos: la condición de carrera absoluta con el indexador. Es la definición de "texto que parece código" pero que no modela la realidad del sistema externo.
   
*   Grok 4.1 (web)

    *   *Turnos hasta compilar:* 6.
    *   *Proceso:* Correcciones rápidas y directas.
    *   *Resultado final:* La ejecución no dio error, pero tampoco ofreció resultados. Mostró un mensaje específico: **`"Unsupported notification method: language/status"`**.
    *   *Análisis del código generado*:

        *   *Arquetipo:* El "Pragmático Sucio"
        *   **Enfoque:** Usa una aproximación de "timeout de inactividad". Mide el `lastActivity` del log y espera 30 segundos de silencio antes de asumir que ha terminado.
        *   **La "solución improvisada":** El uso de reflexión (`Method getLastActivityMethod = client.getClass().getMethod("getLastActivity");`) para acceder al estado del cliente anónimo desde el `main` es **horroroso**. Es una clara señal de que el modelo se peleó con el ámbito de las variables (scope) en las clases anónimas y buscó una salida lateral poco ortodoxa.
        *   **Valoración:** Funcionalmente, la idea de "esperar a que se callen los logs" no es mala para un script rápido, pero el código es técnico y feo. El error de "Unsupported notification method", que probablemente vino por una mala gestión del proxy LSP4J o un fallo en el `toString()` del mensaje de log.
       
*   Kimi K2 (web, con búsqueda y "pesar")

    *   *Turnos hasta compilar:* 3.
    *   *Proceso:* Correcciones rápidas y directas.
    *   *Resultado final:* La ejecución no dio error, pero **no ofreció resultados de búsqueda**.

*   MiniMax M2.1

    *   *Turnos hasta compilar:* 10-12 (con ayuda significativa).
    *   *Proceso:* Se lió con los métodos del interface `LanguageClient`. Tras proporcionarle el fuente, sorteó ese problema en un par de turnos. Luego se atascó con un problema específico del **sistema de tipos de Java**: la inferencia y compatibilidad de `wildcards` genéricos (`? extends SymbolInformation`). El modelo generaba código que el IDE marcaba como erróneo, y al aplicarle las correcciones sugeridas, surgían nuevos errores de incompatibilidad en cascada. El problema se centraba en la signatura de los métodos que usan `Either` con listas de tipos genéricos:

        ```java
        // Código generado por el modelo (falla):
        CompletableFuture<Either<List<SymbolInformation>, List<WorkspaceSymbol>>> symbolFuture = ...;

        // Corrección sugerida por el IDE (crea nuevos problemas):
        CompletableFuture<Either<List<? extends SymbolInformation>, List<? extends WorkspaceSymbol>>> symbolFuture = ...;
        ```
   
    *   *Resultado final:* Tras una lucha extensa, se obtuvo un código de unos 25Kb que compilaba, pero **fallaba en ejecución**. A pesar de los problemas, dio una buena impresión de solidez durante el proceso, lo que resultó en una **ilusión de competencia** especialmente peligrosa: un modelo que parece entender y ser robusto, pero que se derrumba ante la complejidad real del sistema de tipos.
   
   
### 4. Patrones de fracaso técnico, el código generado

El análisis individual de cada modelo revela que, detrás de los nueve fracasos particulares, se esconden *patrones de comportamiento recurrentes y predecibles*. Estos no son errores aleatorios de sintaxis, sino aproximaciones sistemáticamente erróneas a problemas fundamentales de la ingeniería de software. Agrupar los intentos fallidos por estos patrones expone las limitaciones estructurales en el "modelo mental" que los LLMs aplican a sistemas con estado, tiempo y protocolos.

A continuación, se desglosan los cuatro patrones principales observados, su manifestación en el código y la razón arquitectónica por la que estaban condenados al fracaso desde su concepción.


*   Patrón 1: La espera mágica (gestión del tiempo ingenua)

    *Modelos representativos:* GLM 4.7, Gemini 3.0 Flash.

    *El anti-patrón.* Asumir que sistemas asíncronos complejos -como un servidor de lenguaje que debe indexar un proyecto completo- se preparan en un **tiempo fijo, predecible y universal**.

    *Manifestación en el código.* El uso de `Thread.sleep(5000);` o `Thread.sleep(2000);` como única estrategia de sincronización, insertado entre la inicialización y la primera consulta.

    *Por qué falla en un sistema real.* Un proyecto profesional con miles de archivos y dependencias Maven puede tardar desde unos segundos hasta varios minutos en indexarse, dependiendo de factores imposibles de predecir (caché, red, complejidad). Un *delay* fijo garantiza uno de estos dos escenarios: o bien el programa espera inútilmente (si el tiempo es mayor al necesario), o -lo que es peor- ejecuta consultas sobre un sistema incompleto (si el tiempo es menor). Es **programación basada en la esperanza**, no en la observación o la señalización del estado.

    *Lo que revela.* El modelo carece de un concepto operativo de **"evento"**, "señal de *readiness*" o "máquina de estados". Su comprensión se limita a secuencias temporales lineales, no a sistemas reactivos.

*   Patrón 2: La negación de la realidad (ejecución inmediata)

    *Modelos representativos:* ChatGPT, Qwen 3 Coder.

    *El anti-patrón.* Operar bajo la suposición de que el handshake del protocolo (`initialize()` → `initialized()`) implica que **todos los subsistemas del servidor están listos y operativos al instante**.

    *Manifestación en el código.* Realizar la llamada a `workspace/symbol` inmediatamente después de notificar `initialized()`, sin ningún mecanismo de espera o verificación intermedia.

    *Por qué falla en un sistema real.* En servidores como `jdt-ls`, la conexión del protocolo LSP y la carga/índice del *workspace* son procesos **desacoplados**. El primero es rápido; el segundo, pesado y asíncrono. Este patrón confunde el "protocolo operativo" con el "estado operacional" del backend. El resultado es una **condición de carrera garantizada**: la consulta se ejecuta contra un índice vacío, devolviendo resultados nulos o incompletos de forma silenciosa.

    *Lo que revela.* El modelo no distingue entre **comunicación** y **cómputo**. Asume que la disponibilidad de una interfaz (el protocolo LSP) implica la disponibilidad de su implementación (el índice de código), una falacia común en el diseño de sistemas distribuidos.

*   Patrón 3: La ingeniería del caos (complejidad frágil)

    *Modelos representativos:* Claude 4.5 Opus, MiniMax M2.1, Kimi K2.

    *El anti-patrón.* Reconocer la complejidad del problema y responder añadiendo **capas de abstracción, gestión de estado y lógica de control especifica**, pero sin un entendimiento preciso del protocolo específico y sus garantías.

    *Manifestación en el código.*

    - Claude: Implementa un `ProgressLanguageClient` con `AtomicBoolean` y un parser de logs que busca cadenas mágicas (`"Build completed"`).
    - MiniMax: Emplea `ExecutorService`, `CompletableFuture` y un sistema elaborado para parsear eventos `WorkDoneProgress`.
    - Kimi: Utiliza una `BlockingQueue` para analizar mensajes de log en tiempo real.

    *Por qué falla en un sistema real.* Esta aproximación sustituye la falta de comprensión con **actividad y estructura**. La complejidad añadida es frágil porque se acopla a **artefactos de implementación** (el texto exacto de los logs, el orden específico de eventos) en lugar de acoplarse a la **semántica estable del protocolo**. Un cambio en un mensaje de log, un evento inesperado o una variación en el timing hará que toda la maquinaria colapse. Es el equivalente a construir un castillo de naipes sobre una mesa tambaleante.

    *Lo que revela.* El modelo puede imitar la *forma* del código "profesional" o "enterprise" (hilos, futuros, estados atómicos), pero no puede discernir cuándo esa complejidad está justificada y cuándo es solo **ruido arquitectónico**. Le falta el criterio fundamental del ingeniero: la simplicidad elegante.

*   Patrón 4: La trampa funcional (soluciones laterales desesperadas)

    *Modelos representativos:* Grok 4.1, DeepSeek-V3.2.

    *El anti-patrón.* Ante la dificultad percibida de integrar correctamente el sistema externo, el modelo **abandona los requisitos originales** e implementa una funcionalidad que simula el resultado, usando mecanismos radicalmente distintos y a menudo inapropiados.

    *Manifestación en el código.*

    - Grok 4.1: Implementa una "solución improvisada" usando **reflexión** (`getClass().getMethod("getLastActivity")`) para acceder a campos privados de su propia clase anónima, intentando medir inactividad en los logs.
    - DeepSeek-V3.2: En el método `performBasicFileSearch`, proporciona un **fallback** que, si LSP falla, recurre a buscar archivos `.java` recursivamente en el sistema de ficheros con `java.io.File`.

    *Por qué falla en un sistema real.* Estas soluciones no resuelven el problema planteado; lo **eluden**. la solución improvisada de Grok es intrínsecamente inseguro y se basa en una heurística peligrosa (el silencio como indicador de disponibilidad). El *fallback* de DeepSeek es una confesión de derrota: admite que no puede hacer funcionar el cliente LSP, así que ofrece una funcionalidad distinta y mucho más limitada. En un proyecto real, esto genera un sistema **engañoso** que parece funcionar en casos triviales pero falla estrepitosamente en el caso de uso principal.

    *Lo que revela.* Cuando se enfrentan a un muro de complejidad real, los modelos priorizan **generar una salida que se asemeje a una solución** sobre **resolver el problema especificado**. Es la esencia de la "alucinación" aplicada a la ingeniería de software. Prefieren inventar una realidad alterna antes que reconocer la limitación de sus propias capacidades.

Estos cuatro patrones no son una lista exhaustiva, sino un mapa de los *callejones sin salida cognitivos* a los que nos conducen los LLMs actuales cuando la tarea trasciende la mera traducción de especificaciones a sintaxis. Demuestran que, en ausencia de un verdadero modelo mental del dominio -con sus estados, transiciones y contratos-, la respuesta no es el error aleatorio, sino el fracaso sistemático y predecible. No cometen *mistakes*; reproducen, de forma acelerada, los *anti-patrones que un arquitecto humano aprende a desterrar con experiencia*. El problema no es que no sepan Java; es que no pueden hacer ingeniería de sistemas.
 
### 5 Arquetipos de incompetencia, el modelo frente a la promesa

Si en la sección anterior reflexione sobre el código, aquí lo hago sobre la estrategia del modelo. Más allá de las anécdotas individuales, estos nueve intentos los he agrupado en cuatro estrategias fallidas de aproximación al problema:

*   **La paradoja de la especialización (MiniMax M2.1):** El modelo anunciado para "tareas complejas del mundo real" en Java fue el que más ayuda requirió, demostrando que su optimización en pruebas de rendimiento **no se tradujo en resiliencia práctica** para un problema de integración de sistemas.

*   **El mito del razonamiento autónomo (DeepSeek):** A pesar de tener capacidad de búsqueda web, el modelo **no la utilizó** para resolver sus bloqueos, evidenciando una falta de meta-razonamiento o iniciativa para superar obstáculos por sí mismo.

*   **La ilusión de competencia (Gemini 3.0 Flash & ChatGPT):** Su velocidad y correcciones sintácticamente acertadas crearon una **falsa sensación de dominio**. Su fracaso fue el más silencioso y peligroso: código que compila y se ejecuta sin errores, pero que **no cumple su función**.

*   **Los problemas de diagnóstico e interpretación (GLM 4.7 & Grok 4.1):** Sus fallos señalan limitaciones en etapas clave: GLM en el **diagnóstico básico** (asociar error a línea de código) y Grok en la **interpretación del protocolo**, aunque al menos este último logró un mensaje de error significativo del servidor.

El patrón común a los nueve modelos fue la incapacidad para **modelar correctamente el ciclo de vida, el estado y el protocolo de un sistema externo** (`jdt-ls`), confirmando que su "entendimiento" se limita a la correlación sintáctica y no a la ingeniería de sistemas.


A raíz de estas pruebas, surge un contraargumento habitual: *"El modelo falló porque ese caso específico no estaba en su entrenamiento"*.

Mi conclusión es diferente. El problema es que **el estado en tiempo de ejecución siempre cae fuera del entrenamiento**. 

Un LLM aprende observando código estático (texto). Pero los problemas de integración (condiciones de carrera, timeouts, dependencias asíncronas) no existen en el texto; existen en el **tiempo**.

Ver millones de líneas de código no te enseña a manejar un ciclo de vida donde el servidor tarda 500ms más de lo previsto porque el disco está ocupado. Para eso no necesitas más patrones; necesitas un modelo mental de la causalidad y el entorno. Y eso es exactamente lo que la IA no tiene.


### 6. El prompt completo y su construcción

Este anexo documenta el artefacto central de la prueba: la instrucción precisa que se proporcionó a cada modelo. Su redacción no fue arbitraria, sino el resultado de un proceso iterativo destinado a eliminar ambigüedades y proporcionar todo el contexto necesario para resolver el problema.

#### 6.1. Génesis del prompt

La primera aproximación al problema se realizó utilizando *Gemini CLI* como asistente interactivo. A partir de una descripción inicial del objetivo, se fue refinando la solicitud mediante un diálogo en el que se proporcionaban, a medida que el modelo las pedía o necesitaba, las rutas específicas, las dependencias de Maven y los detalles del entorno.

Una vez conseguido un código que, tras varias iteraciones, compilaba con esta metodología conversacional, tomé la decisión de *consolidar toda esa información en un solo prompt autocontenido*. El objetivo era garantizar la equidad en próximas pruebas. Cada modelo posterior recibiría exactamente la misma información de partida, sin ventaja por una conversación previa.

Es importante señalar que este prompt final no fue el resultado de un diseño académico minucioso, sino de un proceso pragmático de copia y pega de los elementos que, en la iteración conversacional inicial, se habían revelado como necesarios para avanzar. No se realizó un análisis exhaustivo posterior para optimizar su estructura o claridad.

#### 6.2. Texto completo del prompt utilizado

Este prompt incluye explícitamente rutas absolutas, versiones de librerías, dependencias de Maven y la lógica de negocio esperada. Contiene la misma información técnica que le entregaría a un desarrollador junior para comenzar la tarea. El objetivo era evaluar si el modelo es capaz de interpretar una especificación técnica por sí mismo y conseguir un aplicativo minimo que funcione, sin depender de optimizaciones semánticas excesivas en la redacción de la orden.

El siguiente bloque de texto es el prompt exacto que pase a cada uno de los modelos desde la segunda prueba en adelante (comenzando por Gemini 3.0 Flash en AI Studio). He sustituido las rutas personales identificables por el marcador genérico `${HOME}`, y el nombre del modelo por ${MODEL}.
Antes de pasarle el prompt al LLM sustituí estos marcadores por sus respectivos valores.

```text
Hace unas semanas empecé a trabajar en un mini proyecto personal que se me ha quedado un poco enquistado.

La idea era hacer un servidor MCP que sirviera para que un agente (como por ejemplo gemini cli) pudiese usarlo para navegar por las clases de un proyecto maven+java, de forma similar a las herramientas que uso habitualmente en Netbeans para localizar clases y ver que metodos tienen.

La ultima incursion, y más fructifera, fue usando la libreria "org.eclipse.lsp4j"+"jdt-ls".

La idea inicial era empezar por un main que simplemente tuviese a capon puesta la ruta a un proyecto maven (este seria el workspace sobre el que trabajar) y recibiese como parametro el nombre de una clase (en caso de no recibir ningun argumento que busque "MCPServerManager") y que como salida nos diese los paquetes completos en los que se puede encontrar la clase.

Ya tengo instalado en una carpeta de mi sistema "jdt-language-server-latest".

Te dejo aqui la informacion sobre donde esta el servidor jdtls, donde dejar los datos de cache y el proyecto con el que estoy haciendo pruebas.
"""
String javainspectormcpBasePath = "${HOME}/datos/Applications/javainspectormcp";

String jdtlsScriptPath = javainspectormcpBasePath + "/jdt-language-server-latest/bin/jdtls";

// Ruta a la carpeta de configuracion para Linux.
String configPath = javainspectormcpBasePath + "/jdt-language-server-latest/config_linux";

// Carpeta 'workspace' para que JDT LS guarde sus caches. Creala si no existe.
String dataPath = javainspectormcpBasePath + "/jdtls_data";

// Ruta al proyecto Java que queremos analizar.
String projectToAnalyzePath = "${HOME}/datos/devel/io.github.jjdelcerro.gvsigdesktopmcpserver/io.github.jjdelcerro.gvsigdesktopmcpserver.app/io.github.jjdelcerro.gvsigdesktopmcpserver.app.mainplugin/";
"""

Estoy usando java 21.
En el pom tengo configuradas las siguientes dependencias:
"""
        <dependency>
            <groupId>org.eclipse.lsp4j</groupId>
            <artifactId>org.eclipse.lsp4j</artifactId>
            <version>0.24.0</version>
        </dependency>
        <dependency>
            <groupId>org.eclipse.lsp4j</groupId>
            <artifactId>org.eclipse.lsp4j.jsonrpc</artifactId>
            <version>0.24.0</version>
        </dependency>
"""

Como no se lo grandes que pueden ser los proyectos con los que vaya  a trabajar, me gustaría que al iniciar el servidor esperase a que estuviese inicializado, y fuese sacando mensajes con el progreso en la consola.

La clase estará en el paquete: io.github.jjdelcerro.javainspectormcp.main2.

Y se llamará Main${MODEL}

¿Como lo ves de viable?
Puedes generarme la clase java.
```

*Nota sobre las rutas*: El marcador `${HOME}` representa el directorio de usuario del sistema donde se ejecutaron las pruebas. Todas las rutas derivadas son consistentes con una estructura de directorios real y funcional.


**Nota sobre la ausencia de "Role Playing":**

Quizás eches de menos instrucciones del tipo *"Actúa como un Arquitecto Java Experto"*. Su omisión es deliberada. Como comenté en el artículo *["Cuando le dices a tu LLM 'No pulses ese botón'"](https://jjdelcerro.github.io/es/blog/cuando-le-dices-a-tu-llm-no-pulses-ese-boton/)*, los modelos operan bajo una **gravedad semántica** donde los conceptos tienen distinta "masa".

Términos técnicos específicos como `org.eclipse.lsp4j`, `0.24.0` o las dependencias exactas de Maven poseen una densidad semántica inmensa. Ya actúan como anclas pesadas que sitúan al modelo en la región correcta del espacio latente de forma inmediata. Frente a esta especificación técnica, un modificador vago como *"eres un experto"* es, en términos vectoriales, poco más que ruido de fondo. Preferí confiar en la densidad semántica explícita que en optimizaciones retóricas.

### 7. La escala de un proyecto real.

Esta sección cuantifica la dimensión de un proyecto de software profesional real, para contextualizar la afirmación recurrente en la promoción de LLMs de que pueden "procesar repositorios completos de código" o manejar contextos de "un millón de tokens". Las cifras se refieren al proyecto *gvSIG Desktop*, una aplicación de escritorio SIG de código abierto.

#### 7.1. Medidas concretas de un proyecto real

Los siguientes comandos, ejecutados en el directorio de desarrollo, miden la base de código. No son ejemplos hipotéticos; son instantáneas de la complejidad que un sistema de IA que pretenda "entender" o "refactorizar" un proyecto debe enfrentar.

**Volumen total del núcleo (core):**

```bash
~/datos/devel/org.gvsig.desktop$ ls
license.txt      org.gvsig.desktop.compat.cdc  org.gvsig.desktop.installer  org.gvsig.desktop.plugin  README.txt  utils
docs             maven-howto.rst  org.gvsig.desktop.buildtools  org.gvsig.desktop.framework   org.gvsig.desktop.library    pom.xml   src        
~/datos/devel/org.gvsig.desktop$ find . -name "*.java" | wc -l
5279
~/datos/devel/org.gvsig.desktop$
```

**Análisis de un módulo específico (DAL - Acceso a Datos):**

```bash
~/datos/devel/org.gvsig.desktop$ cd org.gvsig.desktop.compat.cdc/org.gvsig.fmap.dal/
~/datos/devel/org.gvsig.desktop/org.gvsig.desktop.compat.cdc/org.gvsig.fmap.dal$ find . -name "*.java" | wc -l
1056
~/datos/devel/org.gvsig.desktop/org.gvsig.desktop.compat.cdc/org.gvsig.fmap.dal$ find *.api -name "*.java" | wc -l
233
~/datos/devel/org.gvsig.desktop/org.gvsig.desktop.compat.cdc/org.gvsig.fmap.dal$ find *.spi -name "*.java" | wc -l
66
~/datos/devel/org.gvsig.desktop/org.gvsig.desktop.compat.cdc/org.gvsig.fmap.dal$ find *.impl -name "*.java" | wc -l
205
~/datos/devel/org.gvsig.desktop/org.gvsig.desktop.compat.cdc/org.gvsig.fmap.dal$
```

Medición del volumen de palabras y lineas:

```bash
~/datos/devel/org.gvsig.desktop/org.gvsig.desktop.compat.cdc/org.gvsig.fmap.dal$ find . -name "*.java" -exec cat {} ';'| wc -l -w
 197982  567416
~/datos/devel/org.gvsig.desktop/org.gvsig.desktop.compat.cdc/org.gvsig.fmap.dal$
```

Total:

* 197982 líneas
* 567416 palabras

**Análisis de un plugin complejo (VCSGis - Control de Versiones):**
```bash
~/datos/devel/org.gvsig.vcsgis$ ls
docs  org.gvsig.vcsgis.app  org.gvsig.vcsgis.lib  org.gvsig.vcsgis.main  org.gvsig.vcsgis.swing  org.gvsig.vcsgis.tomcat  pom.xml
~/datos/devel/org.gvsig.vcsgis$ find . -name "*.java" | wc -l
432
~/datos/devel/org.gvsig.vcsgis$ find . -name "*.java" -exec cat {} ';'| wc -l -w
  82822  222633
~/datos/devel/org.gvsig.vcsgis$
```

Total:

* 82822 líneas
* 222633 palabras

#### 7.2. Traducción a tokens y significado

Una estimación conservadora indica que *567416 palabras equivalen a aproximadamente 750000 a 1500000 tokens*, dependiendo del tokenizador. Esto implica que:

*   *Un solo componente* (DAL) de complejidad media ya consume o supera por sí solo el *límite de contexto de 1 millón de tokens* que modelos como Gemini 3 Pro anuncian como capacidad revolucionaria.
*   Para analizar el proyecto *completo* (core + plugins), un modelo necesitaría un contexto de varios millones de tokens, algo que simplemente *no existe en ninguna oferta comercial o de investigación actual*.


### 8. Contraste entre la promesa y la evidencia

Paralelamente a la ejecución de estas pruebas, una narrativa constante en canales de divulgación técnica y marketing promocional proclamaba capacidades revolucionarias. Este anexo no señala contenido específico, sino que analiza un patrón retórico recurrente, contrastando sus afirmaciones más comunes con la evidencia empírica recogida en este documento.

#### 8.1. Afirmaciones frecuentes en la promoción de LLMs

La retórica analizada suele estructurarse en torno a unas pocas capacidades presentadas como transformadoras:

1.  *Autonomía y capacidad de agente*. Se proclama que los modelos no son solo asistentes, sino *"agentes de desarrollo autónomos"* capaces de planificar y ejecutar tareas complejas, como "construir aplicaciones completas" desde una descripción vaga.
2.  *Comprensión de código a gran escala*. Se enfatiza la capacidad de *"procesar repositorios completos de código con un millón de tokens de contexto"*, sugiriendo que el modelo puede analizar y comprender un proyecto software en su totalidad.
3.  *Razonamiento de alto nivel*. Se citan pruebas de rendimiento donde los modelos alcanzan puntuaciones que indican *"razonamiento de nivel doctoral"* o capacidades que *"ponen en código rojo"* a la competencia, transmitiendo la idea de un salto cualitativo en la comprensión lógica.
4.  *Robustez frente a la fragilidad*. Se critica la fragilidad de los scripts tradicionales y se presenta al LLM como la solución, capaz de entender la *"intención"* del usuario y adaptarse a cambios de formato o contexto de forma nativa.

#### 8.2. Contraste con los resultados observados

Cada una de estas afirmaciones puede cotejarse con los datos de las nueve pruebas realizadas:

*   *Frente a la "Autonomía"* los modelos no solo no actuaron de forma autónoma, sino que mostraron una dependencia crítica de la intervención humana. Esto es clave para desmitificar la promesa de los "Workflows Agénticos". Durante estas pruebas actué como el orquestador agéntico, realimentando los errores y guiando la iteración. Hice manualmente lo que herramientas como Cursor o los "agentes autónomos" hacen vía script. El resultado demuestra que el andamiaje no corrige al cimiento. Si el modelo base tiene un mapa causal erróneo del sistema, un agente automatizado solo servirá para cometer el error más rápido o entrar en un bucle infinito de correcciones fallidas, exactamente como ocurrió con DeepSeek.

*   *Frente a la "Comprensión a gran escala"* Como se cuantifica en la seccion "La escala de un proyecto real", un único módulo de complejidad media (DAL) de gvSIG desktop puede contener entre *750000 y 1.5 millones de tokens*. La afirmación de procesar repositorios "completos" resulta, cuando menos, engañosa para proyectos de escala profesional real, donde incluso un subcomponente puede saturar el contexto anunciado.
*   *Frente al "Razonamiento de alto nivel"* Los modelos fallaron de manera uniforme en un problema que requiere un razonamiento lógico específico sobre el **ciclo de vida, el estado y el protocolo de un sistema externo** (`jdt-ls`). Los errores no fueron sintácticos, sino de lógica e integración. Un desempeño elevado en pruebas de rendimiento abstractas no se correlacionó con la capacidad de resolver un problema de integración de sistemas bien definido.
*   *Frente a la "Robustez"* Lejos de adaptarse a la complejidad, los modelos produjeron código que era intrínsecamente frágil. Los más "exitosos" (Gemini, ChatGPT) generaron código que, al compilar y ejecutarse sin errores pero **sin producir resultado alguno**, creaba una ilusión peligrosa de funcionamiento correcto, encapsulando el fallo en un silencio informativo.

#### 8.3. Conclusión del contraste

La distancia entre las afirmaciones promocionales y los resultados de una prueba de implementación real no es una cuestión de grados, sino de naturaleza. Se promete una comprensión holística y autónoma, mientras que la evidencia actual muestra herramientas muy avanzadas de autocompletado sintáctico que todavía carecen de un modelo mental del estado, los protocolos o las consecuencias a largo plazo de sus propias generaciones.

Este desfase no invalida en absoluto la utilidad real y demostrada de los LLMs en tareas acotadas (generación de código repetitivo, refactorizaciones simples, explicación de código, prototipado rápido). Sin embargo sí pone en perspectiva el relato de una revolución inminente en la ingeniería de software y nos invita a una conversación más adulta: reconocer con precisión dónde estamos hoy, valorar lo que ya funciona muy bien y seguir invirtiendo en el criterio humano que ninguna herramienta probabilística puede sustituir.

