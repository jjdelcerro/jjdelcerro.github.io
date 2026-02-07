
import React from 'react';
import ReactDOM from 'react-dom/client';
import htm from 'htm';
import App from './App.js';

const html = htm.bind(React.createElement);

/**
 * Inicializa un visor de cubo 3D en un elemento específico.
 * @param {HTMLElement|string} target - Elemento DOM o selector CSS.
 * @param {Object} options - Configuración inicial.
 */
window.initCubeViewer = (target, options = {}) => {
  const element = typeof target === 'string' ? document.querySelector(target) : target;
  if (!element) {
    console.warn(`Visor Cubo 3D: No se pudo encontrar el elemento ${target}`);
    return;
  }

  const root = ReactDOM.createRoot(element);
  root.render(
    html`
      <${React.StrictMode}>
        <${App} ...${options} />
      <//>
    `
  );
};

// Auto-inicialización basada en atributos data-*
const autoInit = () => {
  document.querySelectorAll('[data-cube-viewer]').forEach(el => {
    const spheresStr = el.getAttribute('data-spheres');
    const scaleAttr = el.getAttribute('data-scale');
    const controlsAttr = el.getAttribute('data-controls');

    const options = {
      initialVisibleSpheres: spheresStr ? spheresStr.split(',').map(s => s.trim()) : undefined,
      initialAxialOffset: scaleAttr ? parseFloat(scaleAttr) : undefined,
      showControls: controlsAttr !== 'false'
    };

    window.initCubeViewer(el, options);
  });
};

// Ejecutar auto-inicialización cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', autoInit);
} else {
  autoInit();
}
