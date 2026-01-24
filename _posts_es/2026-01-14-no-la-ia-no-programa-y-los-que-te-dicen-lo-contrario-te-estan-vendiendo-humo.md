---
layout: post
title: "No, la IA no programa. Y los que te dicen lo contrario te están vendiendo humo"
date: 2026-01-11
canonical_url: "https://jjdelcerro.github.io/es/blog/no-la-ia-no-programa-y-los-que-te-dicen-lo-contrario-te-estan-vendiendo-humo/"
---  
Hace unas semanas, tras ver el enésimo video de un "experto" afirmando que "Gemini 3 Pro revoluciona la automatización" y que "los agentes de IA ya construyen aplicaciones completas", sentí una mezcla de incredulidad y rabia. Rabia por ver cómo la falta de experiencia en proyectos reales se disfraza de autoridad para envenenar el criterio de quienes están empezando.

Así que decidí hacer lo que ninguno de ellos hace: **una prueba real**. No con un repositorio de juguete de 10 archivos o con una API simple. Decidi probarlo con un problema de integración real. Conectar un servidor MCP a `jdt-ls` usando LSP4J. Empece por una prueba de contexto minima, generar una clase java que no tendria mas de 500 líneas. Sin integrar en nada, una clase autocontenida. No llegue a pasar de esta prueba.

El resultado: **8 modelos de IA, 0 éxitos.** Ni uno solo generó código funcional, y varios de ellos entraron en bucle corrigiendo errores de compilacion y tuve que indicarles yo las correcciones para que se pudiesen compilar algunas cosas.

Pero los videos siguen ahí. Los artículos prometiendo "revoluciones" se multiplican.

Esto no es un artículo técnico. Es una **denuncia**.

## La falsedad de procesar repositorios completos

En los videos dicen: "¡Procesa repositorios de un millón de tokens!". Suena impresionante hasta que abres un proyecto real.

Te doy números de **mi realidad**, no de sus demos:
- **gvSIG desktop (core)** 5.200 ficheros Java.
- **Solo el módulo DAL** 1.056 ficheros, 567.416 palabras, 1.500.000 tokens.

Un solo módulo de una aplicación profesional ya se come el 150% de la capacidad del contexto más avanzado del mercado. Cuando te prometen que la IA "entiende tu repositorio", te están mintiendo. Entiende un subconjunto ínfimo, una foto borrosa y recortada de la realidad de tu sistema.

## Por qué generar texto que parece código no es programar

He visto las demos. "Crea una app de TODOs en React". "Haz un dashboard con gráficos". Son el equivalente digital de *ensamblar un mueble de IKEA*. Todas las piezas están ahí con un manual claro pero al final tienes algo que parece un mueble.

La programación real no es ensamblaje de piezas prefabricadas. Es saber por qué elegimos una estructura sobre otra y asegurar que el sistema no colapse bajo su propio peso en unos años, a veces tan solo en unos meses una vez entra en producción.

Cuando a un LLM le das un problema real (integrar un protocolo como LSP, manejar estado asíncrono y lidiar con configuraciones específicas de `jdt-ls`) se desmoronan. No tienen un *modelo mental* del sistema. Solo tienen estadísticas de tokens.

Mi prueba. Los 8 modelos (Claude 4.5, Gemini 3 Flash, ChatGPT, GLM 4.7, Kimi K2, Qwen3-Coder, DeepSeek 3.2 y Grok 4.1) 
llegaron a generar código que compilaba tras varios turnos de corrección. Algunos necesitaron hasta siete turnos solo para llegar a código que compilase. Otros se metieron en bucles de modificacion y correccion de los que tuve que ayudarles a salir. Al final todos consiguieron un codigo que compilaba.
Pero no funcionaba. Se olvidaron de inicializar el servidor en el orden correcto, o no manejaron las notificaciones, o malinterpretaron la respuesta.

*Eso no es "programar". Es "generar texto que se parece a código Java".*

## El fraude del "atajo" cognitivo

El daño más grave no es la sobreventa técnica, sino el sabotaje intelectual que están sufriendo los programadores que hoy intentan entrar en la industria. Me hierve la sangre cuando escucho a esos "evangelistas" decir: "No pierdas el tiempo aprendiendo el lenguaje, aprende a pedírselo a la máquina de la forma correcta", tenemos LLMs con "capacidad de razonamiento doctoral", "Vibe Coding que entiende tu intención"...

Un junior ve esto y se pregunta para qué va a aprender algoritmos o arquitectura si la máquina "ya lo hace". Es una estafa. Se les está ocultando que, sin criterio, están delegando tareas críticas en una caja probabilística sobre repositorios que ni siquiera caben en su memoria. 

Estan promoviendo que los desarrolladores juniors se crean que todo es facil. Que pueden delegar en la IA tareas complejas. Sobre repositorios reales. Estan engañandonos en nuestra propia cara y no todos tenemos el criterio para darnos cuenta de como nos mienten.

Puedes usar la IA en programación pero no te va a ensañar...
- A tener *olfato* para detectar el código que *huele mal*.
- A *anticipar* consecuencias a meses o años vista.
- A *discutir* qué sacrificas con tu equipo.
- A *mantener* compatibilidad con otros sistemas.

*Te mienten. Y lo hacen con una sonrisa y unos bonitos gráficos.*

## El perfil de los que venden el humo

¿Quiénes están produciendo este ruido? Por un lado, los *inconscientes*, juniors que creen haber descubierto la magia porque aún no saben lo que no saben. Por otro, los *oportunistas* que optimizan para el click y el "enganche" porque la verdad no vende tanto. Y finalmente, los *teóricos sin callos*, gente que salta de demo en demo pero que nunca ha tenido que mantener un sistema real con usuarios y código heredado de hace 15 años.

## Un llamado a la honestidad técnica necesaria

A los creadores de contenido: dejen de vender humo. Si quieren enseñar IA, enseñen *sus límites*. Enséñen a la gente que esto funciona para tareas mecánicas o código repetitivo, que ayuda a refactorizar, pero que nunca sustituye tu comprensión del problema.

A los juniors: *aprendan fundamentos*. La IA es una herramienta poderosa en manos de un artesano experto. En manos de un novato, es un martillo neumático que puede destrozar todo lo que toca.

A mí: seguiré escribiendo artículos como este. Mostrando, con código (cuando pueda) y errores reales, la brecha entre el hype y la realidad.

Y la próxima vez que un "gurú" diga que la IA programa, le enviaré mis pruebas con los 8 intentos fallidos. A ver si tiene el valor de intentar arreglarlo.

*La IA no programa. Los programadores programan. Los demás hacen demos.*


*Este artículo estaba listo para publicar hace unos días. Pero una duda me perseguía. ¿y si el problema no era Java, sino la complejidad misma? Días después, ya con el texto frío, recordé algo que nos paso a finales de noviembre...*


### Postdata: aún había algo dando vueltas en mi cabeza

A finales de noviembre, un compañero y yo tuvimos que meter mano en la aplicación web de la empresa. Cuenta con un frontend de más de 50000 líneas de JavaScript y TypeScript. Nosotros somos arquitectos Java; de React solo sabíamos el nombre.

La promesa de la IA aquí debería cumplirse. Un stack moderno, una sintaxis popular, programadores "novatos". Localizamos donde habia que tocar, un par de modulos js, y le pedimos a "Gemini CLI" que nos explicara qué cambiar ahi y luego que generara el código. Su explicación fue coherente. El código sintácticamente perfecto.

**Falló en silencio.**
Habia que mostrar una lista con checks... a veces la lista no aparecía. A veces los check no respondían. A veces el estado se reseteaba solo. El error era un *cierre obsoleto* (*stale closure*). Gemini había olvidado declarar una dependencia en un `useCallback`. Escribió una función que no veía los cambios en el estado.

No supimos arreglarlo. Así que le pedimos a la IA que nos resumiera la filosofía de react, los hooks y las closures. Lo leímos, lo entendimos y le señalamos el fallo. La IA lo corrigió. Había cometido un error de junior y tuvimos que corregirle.

**La realidad:**
No es que no sepan Java. Es que, cuando la complejidad es real, estado asíncrono, ciclos de vida complejos o integración con sistemas "vivos", sin importar el lenguaje, falla. La IA no tiene modelo mental. Solo tiene probabilidad. Y eso, en un proyecto de verdad, se paga con horas de debug.

>
> 🔴 Nota: Ya esta publicada la (parte 2)[https://jjdelcerro.github.io/es/blog/no-la-ia-no-programa-parte2-las-pruebas-realizadas/] con el detalle de los 9 modelos, prompts y el análisis del código generado.
>


