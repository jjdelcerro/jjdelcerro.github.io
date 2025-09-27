---
title: "Acerca de mí"
translation_url: /en/about.html
---

# Asistente de IA para Aplicaciones de Escritorio (I+D Personal)

Diseñé y desarrollé un prototipo funcional para integrar un asistente de IA en una aplicación de escritorio Java/Swing (gvSIG desktop). El proyecto incluyó el análisis de viabilidad de las APIs de LLMs y la creación de una arquitectura de cliente-servidor local (Model Context Protocol - MCP) para resolver los problemas de coste y distribución.

Todo el proceso, desde la arquitectura hasta la implementación, está documentado en una serie de artículos técnicos en mi blog.

# VCSGis: Sistema de Control de Versiones para Datos GIS

Diseñé y desarrollamos desde cero VCSGis, un sistema de control de versiones y concurrencia para datos geoespaciales, como solución a la incapacidad de herramientas estándar (Git, SVN) para manejar la idiosincrasia de los datos GIS: volúmenes masivos y ficheros binarios de gigabytes.

La solución se articula sobre una arquitectura cliente-servidor:

* El backend es un servicio a medida, desarrollado para gestionar las transacciones y el versionado a través de una API basada en JSON.

* El cliente fue implementado como un plugin nativo para gvSIG desktop, integrándose directamente en la interfaz de usuario y el flujo de trabajo del cartógrafo.

Inspirado en SVN, el sistema permite la edición concurrente de cartografía a gran escala, proporcionando una herramienta fundamental para el nicho de mercado de gvSIG. Fui responsable de todo el ciclo de vida del producto, desde la concepción de la arquitectura hasta la implementación y el mantenimiento actual.
