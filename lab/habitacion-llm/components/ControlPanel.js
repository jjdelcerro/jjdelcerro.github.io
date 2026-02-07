
import React from 'react';
import htm from 'htm';

const html = htm.bind(React.createElement);

const ControlPanel = ({ 
  spheres, 
  config, 
  onToggleSphere, 
  onUpdateConfig 
}) => {
  return html`
    <div className="absolute top-0 right-0 h-full w-80 bg-slate-900/80 backdrop-blur-md border-l border-white/10 p-6 overflow-y-auto z-10">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
        Panel de Control
      </h2>

      <section className="mb-8">
        <div className="space-y-2 pt-4 border-t border-white/5">
          <div className="flex justify-between text-xs font-medium">
            <span>Ajuste "Financiero"</span>
            <span className="text-orange-400">Scale: x${(1 + config.axialOffset / 5).toFixed(2)}</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="5" 
            step="0.1" 
            value=${config.axialOffset} 
            onChange=${(e) => onUpdateConfig({ axialOffset: parseFloat(e.target.value) })}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
        </div>
        
      </section>

      <section className="mb-8">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Visibilidad</h3>
        <div className="space-y-1">
          ${spheres.map((sphere) => html`
            <label key=${sphere.id} className="flex items-center justify-between group cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors">
              <span className="text-sm font-medium capitalize">${sphere.name}</span>
              <input 
                type="checkbox" 
                checked=${sphere.visible} 
                onChange=${() => onToggleSphere(sphere.id)}
                className="w-4 h-4 rounded border-white/20 bg-white/10 text-blue-500"
              />
            </label>
          `)}
        </div>
        <label className="flex items-center justify-between group cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors">
          <span className="text-sm font-medium">Mostrar la habitación</span>
          <input 
            type="checkbox" 
            checked=${config.cubeVisible} 
            onChange=${(e) => onUpdateConfig({ cubeVisible: e.target.checked })}
            className="w-5 h-5 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
          />
        </label>
      </section>

      <section className="mb-8 space-y-6">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Ajustes de Escena</h3>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span>Transparencia Cubo</span>
            <span className="text-blue-400">${(config.cubeOpacity * 100).toFixed(0)}%</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value=${config.cubeOpacity} 
            onChange=${(e) => onUpdateConfig({ cubeOpacity: parseFloat(e.target.value) })}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-medium">
            <span>Transparencia Bolas</span>
            <span className="text-blue-400">${(config.spheresOpacity * 100).toFixed(0)}%</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01" 
            value=${config.spheresOpacity} 
            onChange=${(e) => onUpdateConfig({ spheresOpacity: parseFloat(e.target.value) })}
            className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

      </section>

      <footer className="mt-auto pt-10 text-[10px] text-white/20 text-center">
        Use el ratón para orbitar y zoom
      </footer>
    </div>
  `;
};

export default ControlPanel;
