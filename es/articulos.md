---
layout: default
title: "articulos"
---

# Joaquín del Cerro | Arquitecto de Software
---

## Últimas publicaciones

<ul>
  {% assign sorted_posts = site.posts_es | sort: 'date' | reverse %}
  {% for post in sorted_posts %}
    <li style="margin-bottom: 1.5em;">
      <small>{{ post.date | date: "%d de %B de %Y" }}</small>
      <h3 style="margin-top: 0.2em;">
        <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
      </h3>
      <p>{{ post.excerpt }}</p>
    </li>
  {% endfor %}
</ul>
