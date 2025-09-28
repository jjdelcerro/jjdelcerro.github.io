---
layout: default
title: "Proyectos Destacados"
---

# Proyectos Destacados

Esta página es una inmersión profunda en algunos de los sistemas más significativos que he diseñado y construido a lo largo de mi carrera. Cada proyecto representa un desafío técnico único y una oportunidad para aplicar mi filosofía de trabajo: entender los problemas desde sus fundamentos para crear soluciones robustas, eficientes y a medida.

---

<h2 id="asistente-ia">Asistente de IA para Aplicaciones de Escritorio (I+D Personal)</h2>

Diseñé y desarrollé un prototipo funcional para integrar un asistente de IA en una aplicación de escritorio Java/Swing (gvSIG desktop). El proyecto incluyó el análisis de viabilidad de las APIs de LLMs y la creación de una arquitectura de cliente-servidor local (Model Context Protocol - MCP) para resolver los problemas de coste y distribución.

Todo el proceso, desde la arquitectura hasta la implementación, está documentado en una serie de artículos técnicos en mi blog.

---

<h2 id="vcsgis">VCSGis: Sistema de Control de Versiones para Datos GIS</h2>

Fui el responsable del diseño y desarrollo desde cero de VCSGis, un sistema de control de versiones y concurrencia para datos geoespaciales. Nació como solución a la incapacidad de herramientas estándar (Git, SVN) para manejar la idiosincrasia de los datos GIS: volúmenes masivos y ficheros binarios de gigabytes.

La solución se articula sobre una arquitectura cliente-servidor:
*   El **backend** es un servicio a medida, desarrollado para gestionar las transacciones y el versionado a través de una API basada en JSON.
*   El **cliente** fue implementado como un plugin nativo para gvSIG desktop, integrándose directamente en la interfaz de usuario y el flujo de trabajo del cartógrafo.

Inspirado en SVN, el sistema permite la edición concurrente de cartografía a gran escala, proporcionando una herramienta fundamental para el nicho de mercado de gvSIG.

---

<h2 id="sigcar">SIGCAR: Sistema de Información Geográfica de Accidentalidad</h2>

Fui el arquitecto y desarrollador principal de SIGCAR, una personalización sobre gvSIG Desktop para modernizar la gestión de datos de accidentes de tráfico de la Generalitat Valenciana (GVA). Mi rol abarcó el diseño completo del sistema, desde la ingesta de datos hasta su explotación final.

*   **Pipeline de Datos (ETL):** Diseñé un proceso robusto para la ingesta, validación y carga de los datos de accidentalidad que la DGT proporcionaba en formato XML, incluyendo un motor de reglas de negocio para garantizar la calidad del dato.
*   **Enriquecimiento de Datos:** El sistema georreferenciaba automáticamente cada accidente utilizando el catálogo de carreteras de la GVA y enriquecía los registros con información derivada (datos de aforo, tipología del día, edad de los implicados).
*   **Modelado y Migración:** Diseñé el modelo de datos relacional y ejecuté la migración de los datos históricos desde un sistema heredado.
*   **Interfaz de Explotación:** Implementé las herramientas de consulta y visualización dentro de gvSIG, incluyendo un formulario de búsqueda avanzada y una ficha detallada de accidente.

---

<h2 id="sistema-de-publicacion-juridica">Sistema de Publicación Jurídica en CD-ROM</h2>

En Dysmatica, lideré el diseño y desarrollo end-to-end de un sistema para la digitalización y distribución masiva de enciclopedias jurídicas para la Editorial La Ley. El principal desafío fue construir una solución de alto rendimiento para los limitados PCs de la época.

*   **Base de Datos y Motor de Búsqueda Propietarios:** Para superar las limitaciones de velocidad de los CD-ROM, diseñé y programé una base de datos a medida y un motor de búsqueda de texto completo optimizados para operar eficientemente desde medios de solo lectura.
*   **Pipeline de Ingeniería de Datos (ETL):** Creé todo el flujo de herramientas para procesar los textos originales (digitalizados desde papel), extraer metadatos y cargarlos en nuestra base de datos estructurada.
*   **Gestión de Operaciones:** Orquesté el flujo completo de producción, gestionando las actualizaciones trimestrales de múltiples obras en paralelo.

---

<h2 id="sistema-de-localizacion-de-flotas">Sistema de Localización de Flotas (pre-GPRS y GPRS)</h2>

En CENOCLAP, fui el arquitecto y desarrollador de un sistema de localización de flotas en una época en la que la comunicación con los vehículos se realizaba a través de SMS. El proyecto exigió construir gran parte de la infraestructura desde cero.

*   **Arquitectura de Comunicaciones:** Monté un proveedor de servicios de internet (ISP) completo sobre FreeBSD para gestionar la comunicación bidireccional vía SMS con los servicios de Telefónica.
*   **Desarrollo Backend:** Implementé toda la pila de servicios, incluyendo un gestor de colas de mensajes (MQ Series), bases de datos (MS SQL Server) y el servidor web (IIS con la versión de Java 1.1 de Microsoft).
*   **Migración a GPRS:** Lideré la completa reingeniería del sistema con la llegada de GPRS, participando en el rediseño del software embarcado y adaptando toda la arquitectura del backend para operar sobre conexiones TCP/IP directas.

---

<h2 id="erp-a-medida">ERP a Medida con Arquitectura de Cliente Ligero</h2>

También en CENOCLAP, lideré el desarrollo de una aplicación de gestión de almacén y contabilidad desde cero. El proyecto destacó por su arquitectura y por el proceso de certificación de calidad.

*   **Desarrollo Full-Stack:** El sistema se desarrolló en **Python con la librería gráfica Tk**, utilizando **PostgreSQL** como base de datos y **FreeBSD** como sistema operativo.
*   **Arquitectura de Cliente Ligero:** Para optimizar los recursos, diseñé una arquitectura donde la aplicación se ejecutaba de forma centralizada en un servidor FreeBSD, y los PCs de los usuarios (Windows) actuaban como terminales gráficos remotos conectándose a través de **servidores X** o **VNC**.
*   **Certificación ISO 9000:** Fui responsable de adaptar nuestras metodologías ágiles para cumplir con los estrictos requisitos de la norma, creando una versión propia de "Métrica ágil".
