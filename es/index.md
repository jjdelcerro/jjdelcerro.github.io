---
layout: default
title: "Inicio"
---

# Joaquín del Cerro | Arquitecto de Software

Bienvenido a mi espacio personal y profesional. Soy Joaquín del Cerro, y este sitio es el reflejo de mi trabajo y mi pasión: entender los sistemas desde sus fundamentos para construir soluciones robustas.

Aquí encontrarás mis artículos, un repositorio de ideas, análisis técnicos y prototipos sobre arquitectura de software, Sistemas de Información Geográfica (GIS) y, más recientemente, mi exploración en el campo de la Inteligencia Artificial.

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

Hasta otra..
