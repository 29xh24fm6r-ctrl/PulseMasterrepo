// Reactive Atmosphere - Emotion-driven atmospheric effects
// components/life3d/ReactiveAtmosphere.tsx

"use client";

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { NodeEmotion } from "@/lib/realm/nodeState";

interface ReactiveAtmosphereProps {
  emotion: NodeEmotion;
}

export function ReactiveAtmosphere({ emotion }: ReactiveAtmosphereProps) {
  const particlesRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (particlesRef.current) {
      switch (emotion) {
        case "rising":
          // Gradient upward motion
          particlesRef.current.rotation.y += 0.001;
          particlesRef.current.position.y += Math.sin(state.clock.elapsedTime) * 0.01;
          break;
        case "falling":
          // Downward haze
          particlesRef.current.rotation.y -= 0.001;
          particlesRef.current.position.y -= Math.sin(state.clock.elapsedTime) * 0.01;
          break;
        case "blocked":
          // Static distortion rings
          particlesRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
          break;
        case "flowing":
          // Slow spiral motion
          particlesRef.current.rotation.y += 0.002;
          particlesRef.current.rotation.z += 0.001;
          break;
        default: // neutral
          particlesRef.current.rotation.y += 0.0005;
      }
    }
  });

  // Generate particles for atmosphere
  const particleCount = 500;
  const positions = React.useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
    }
    return pos;
  }, []);

  // Color based on emotion
  const getColor = () => {
    switch (emotion) {
      case "rising":
        return "#ff6b35";
      case "falling":
        return "#4a90e2";
      case "blocked":
        return "#8b5cf6";
      case "flowing":
        return "#10b981";
      default:
        return "#a855f7";
    }
  };

  const fogColor = getColor();

  return (
    <>
      {/* Fog */}
      <fog attach="fog" args={[fogColor, 8, 20]} />
      
      {/* Atmospheric particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={particleCount}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.05} color={fogColor} transparent opacity={0.3} />
      </points>
    </>
  );
}

