---
layout: default
title: "Inicio"
---

# Joaquín del Cerro | Arquitecto de Software

Bienvenido a mi espacio personal y profesional. Soy Joaquín del Cerro, y este sitio es el reflejo de mi trabajo y mi pasión: entender los sistemas desde sus fundamentos para construir soluciones robustas.

Aquí encontrarás mis artículos, un repositorio de ideas, análisis técnicos y prototipos sobre arquitectura de software, Sistemas de Información Geográfica (GIS) y, más recientemente, mi exploración en el campo de la Inteligencia Artificial.

<!-- INICIO DEL NUEVO BLOQUE DE NAVEGACIÓN -->
<p style="text-align: center; margin: 2.5em 0;">
  <a href="{{ '/es/acerca-de.html' | relative_url }}"><strong>Acerca de mí</strong></a> &nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="{{ '/es/experiencia.html' | relative_url }}"><strong>Experiencia</strong></a> &nbsp;&nbsp;|&nbsp;&nbsp;
  <a href="{{ '/es/proyectos.html' | relative_url }}"><strong>Proyectos</strong></a>
</p>
<!-- FIN DEL NUEVO BLOQUE DE NAVEGACIÓN -->

---

## Publicaciones Recientes

<ul>
  {% for post in site.posts_es %}
    <li style="margin-bottom: 1.5em;">
      <small>{{ post.date | date: "%d de %B de %Y" }}</small>
      <h3 style="margin-top: 0.2em;">
        <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
      </h3>
      <p>{{ post.excerpt }}</p>
    </li>
  {% endfor %}
</ul>
