
import React, { useState, useCallback, useMemo } from 'react';
import htm from 'htm';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, ContactShadows } from '@react-three/drei';
import Scene3D from './components/Scene3D.js';
import ControlPanel from './components/ControlPanel.js';

const html = htm.bind(React.createElement);

const BASE_SPHERES = [
  { id: '1', name: 'dinero', label: 'dinero', originalPos: [9, 0, 0] },
  { id: '2', name: 'arbol', label: 'arbol', originalPos: [0, 0, 9] },
  { id: '3', name: 'silla', label: 'silla', originalPos: [0, 9, 0] },
  { id: '4', name: 'ingresar', label: 'ingresar', originalPos: [7, 0, 0] },
  { id: '5', name: 'transaccion', label: 'transaccion', originalPos: [5, 0, 0] },
  { id: '6', name: 'banco', label: 'banco', originalPos: [5, 5, 5] },
];

const App = ({ 
  initialVisibleSpheres = ['dinero', 'arbol', 'silla', 'ingresar', 'transaccion', 'banco'],
  initialAxialOffset = 0,
  showControls = true 
}) => {
  // Inicializar esferas basadas en la prop de visibilidad
  const [spheres, setSpheres] = useState(() => 
    BASE_SPHERES.map(s => ({
      ...s,
      visible: initialVisibleSpheres.includes(s.name)
    }))
  );

  const [config, setConfig] = useState({
    cubeVisible: true,
    cubeOpacity: 0.3,
    spheresOpacity: 0.9,
    axialOffset: initialAxialOffset,
  });

  const toggleSphere = useCallback((id) => {
    setSpheres(prev => prev.map(s => s.id === id ? { ...s, visible: !s.visible } : s));
  }, []);

  const updateConfig = useCallback((updates) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  return html`
    <div className="relative w-full h-full min-h-[400px] bg-[#0f172a] text-white font-sans overflow-hidden">
      <div className="absolute inset-0 z-0">
        <${Canvas} shadows gl=${{ antialias: true }}>
          <${PerspectiveCamera} 
            makeDefault 
            position=${[5, 5, 28]} 
            fov=${45} 
          />
          <${OrbitControls} 
            makeDefault 
            target=${[5, 5, 5]} 
            enableDamping
          />
          
          <ambientLight intensity=${0.4} />
          
          <directionalLight 
            position=${[10, 20, 10]} 
            intensity=${1.8} 
            castShadow 
            shadow-mapSize=${[1024, 1024]}
          />
          
          <pointLight 
            position=${[0, 10, 25]} 
            intensity=${1.2} 
            color="#ffffff"
          />

          <${Scene3D} spheres=${spheres} config=${config} />

          <${ContactShadows} 
            position=${[5, -0.05, 5]} 
            opacity=${0.5} 
            scale=${35} 
            blur=${2.5} 
            far=${15} 
          />
        <//>
      </div>

      ${showControls && html`
        <${ControlPanel} 
          spheres=${spheres} 
          config=${config} 
          onToggleSphere=${toggleSphere} 
          onUpdateConfig=${updateConfig} 
        />
      `}

      <div className="absolute top-6 left-6 pointer-events-none select-none">
        <h1 className="text-2xl font-bold tracking-tight text-white/90">La habitación de bolas</h1>
      </div>
    </div>
  `;
};

export default App;
