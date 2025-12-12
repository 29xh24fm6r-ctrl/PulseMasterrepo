// Semantic Node 3D - Renders a semantic node in 3D space
// components/nodes/SemanticNode3D.tsx

"use client";

import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Float } from "@react-three/drei";
import * as THREE from "three";
import { SemanticNode } from "@/lib/realms/node-engine/types";

interface SemanticNode3DProps {
  node: SemanticNode;
  onHover?: (node: SemanticNode) => void;
  onClick?: (node: SemanticNode) => void;
  onFocus?: (node: SemanticNode) => void;
}

export function SemanticNode3D({ node, onHover, onClick, onFocus }: SemanticNode3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Apply behaviors
  useFrame((state) => {
    if (!meshRef.current) return;

    const { behavior } = node;

    // Pulse animation
    if (behavior.pulse) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      meshRef.current.scale.setScalar(scale * (node.size || 1));
    }

    // Rotation
    if (behavior.rotate) {
      meshRef.current.rotation.y += 0.01;
    }

    // Float
    if (behavior.float) {
      const y = Math.sin(state.clock.elapsedTime * 1.5) * 0.2;
      meshRef.current.position.y = (node.position?.y || 0) + y;
    }
  });

  const color = new THREE.Color(node.color || "#8b5cf6");
  const glowColor = new THREE.Color(node.glowColor || node.color || "#8b5cf6");
  const emissiveIntensity = hovered || node.signal === "active" ? 1.5 : 0.8;

  return (
    <group
      position={[node.position?.x || 0, node.position?.y || 0, node.position?.z || 0]}
      onPointerOver={() => {
        setHovered(true);
        onHover?.(node);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={() => onClick?.(node)}
    >
      <Float speed={node.behavior.float ? 1 : 0} rotationIntensity={0.2} floatIntensity={0.3}>
        {/* Main sphere */}
        <mesh ref={meshRef}>
          <sphereGeometry args={[node.size || 1, 32, 32]} />
          <meshStandardMaterial
            color={color}
            emissive={glowColor}
            emissiveIntensity={emissiveIntensity}
            roughness={0.2}
            metalness={0.6}
          />
        </mesh>

        {/* Outer glow */}
        {(hovered || node.signal === "active" || node.behavior.glow) && (
          <mesh scale={1.3}>
            <sphereGeometry args={[node.size || 1, 16, 16]} />
            <meshStandardMaterial
              color={glowColor}
              emissive={glowColor}
              emissiveIntensity={0.3}
              transparent
              opacity={0.4}
            />
          </mesh>
        )}

        {/* Label */}
        <Text
          position={[0, (node.size || 1) * 1.5, 0]}
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {node.metadata.label}
        </Text>
      </Float>
    </group>
  );
}



