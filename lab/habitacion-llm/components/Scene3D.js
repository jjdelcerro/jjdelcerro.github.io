
import React, { useMemo } from 'react';
import htm from 'htm';
import { Text, Line, Edges } from '@react-three/drei';
import * as THREE from 'three';

const html = htm.bind(React.createElement);

const Scene3D = ({ spheres, config }) => {
  const { cubeVisible, cubeOpacity, spheresOpacity, axialOffset } = config;

  const COLORS = {
    RED: '#ff4444',
    GREEN: '#44ff44',
    BLUE: '#4444ff',
    WHITE: '#ffffff',
    CUBE_FACE: '#334155',
    CUBE_EDGE: '#94a3b8'
  };

  const scaleX = 1 + (axialOffset / 5);
  const scaleYZ = 1 / scaleX;

  const scaledCubeDim = [10 * scaleX, 10 * scaleYZ, 10 * scaleYZ];
  const scaledCubePos = [5 * scaleX, 5 * scaleYZ, 5 * scaleYZ];

  const axisLines = useMemo(() => {
    const baseLength = 10;
    return [
      { 
        id: 'red', 
        points: [[0, 0, 0], [baseLength * scaleX, 0, 0]], 
        color: COLORS.RED, 
        label: 'Financiero',
        // Mantenemos la posición a la derecha fuera del cubo que estaba "clavada"
        labelPos: [baseLength * scaleX + 1.5, 0, 0],
        anchorY: 'middle'
      },
      { 
        id: 'blue', 
        points: [[0, 0, 0], [0, 0, baseLength * scaleYZ]], 
        color: COLORS.BLUE, 
        label: 'Naturaleza',
        // Ajustado: Solo debajo (-Y) al final del eje, sin adelantar (+Z)
        labelPos: [0, -1.0, baseLength * scaleYZ],
        anchorY: 'top'
      },
      { 
        id: 'green', 
        points: [[0, 0, 0], [0, baseLength * scaleYZ, 0]], 
        color: COLORS.GREEN, 
        label: 'Mobiliario',
        labelPos: [0, baseLength * scaleYZ + 0.6, 0],
        anchorY: 'bottom'
      },
    ];
  }, [axialOffset, scaleX, scaleYZ]);

  const getSphereColor = (pos) => {
    const [x, y, z] = pos;
    if (x > y && x > z) return COLORS.RED;
    if (y > x && y > z) return COLORS.GREEN;
    if (z > x && z > y) return COLORS.BLUE;
    return COLORS.WHITE;
  };

  return html`
    <group>
      ${cubeVisible && html`
        <mesh position=${scaledCubePos} receiveShadow>
          <boxGeometry args=${scaledCubeDim} />
          <meshStandardMaterial 
            color=${COLORS.CUBE_FACE} 
            transparent 
            opacity=${cubeOpacity} 
            side=${THREE.DoubleSide}
            depthWrite=${false}
            roughness=${0.4}
            metalness=${0.2}
          />
          <${Edges} 
            threshold=${15} 
            color=${COLORS.CUBE_EDGE}
            lineWidth=${2}
          />
        </mesh>
      `}

      ${axisLines.map(line => html`
        <group key=${line.id}>
          <${Line} 
            points=${line.points} 
            color=${line.color} 
            lineWidth=${3} 
          />
          <${Text}
            position=${line.labelPos}
            fontSize=${0.5}
            color=${line.color}
            anchorX="center"
            anchorY=${line.anchorY}
          >
            ${line.label}
          <//>
        <//>
      `)}

      ${spheres.filter(s => s.visible).map(sphere => {
        const [ox, oy, oz] = sphere.originalPos;
        const adjustedPos = [
          ox * scaleX,
          oy * scaleYZ,
          oz * scaleYZ
        ];
        const color = getSphereColor(sphere.originalPos);

        return html`
          <group key=${sphere.id} position=${adjustedPos}>
            <mesh castShadow receiveShadow>
              <sphereGeometry args=${[0.5, 64, 64]} />
              <meshStandardMaterial 
                color=${color}
                emissive=${color}
                emissiveIntensity=${0.15}
                transparent 
                opacity=${spheresOpacity}
                roughness=${0.1}
                metalness=${0.7}
              />
            </mesh>
            <${Text}
              position=${[0, 0.8, 0]}
              fontSize=${0.4}
              color="white"
              anchorX="center"
              anchorY="bottom"
              outlineWidth=${0.02}
              outlineColor="#000000"
            >
              ${sphere.label}
          <//>
          </group>
        `;
      })}
    <//>
  `;
};

export default Scene3D;
