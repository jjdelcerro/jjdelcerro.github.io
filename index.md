---
layout: default
---

# Artículos y reflexiones

Aquí encontrarás mis artículos sobre arquitectura de software, desarrollo en gvSIG, y mis investigaciones recientes en el campo de la Inteligencia Artificial.

---

## Publicaciones

<ul>
  {% for post in site.posts %}
    <li>
      <h3>
        <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
      </h3>
      <p>{{ post.excerpt }}</p>
    </li>
  {% endfor %}
</ul>
