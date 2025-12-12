// HoloTag - Proper billboard text tag with distance scaling and glow
// components/nodes/HoloTag.tsx

"use client";

import React, { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

interface HoloTagProps {
  position: [number, number, number];
  label: string;
  value?: string;
  color?: string;
  nodeId: string;
}

export function HoloTag({ position, label, value, color = "#ffffff", nodeId }: HoloTagProps) {
  const textRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (textRef.current) {
      // Always face camera (billboard)
      textRef.current.lookAt(camera.position);
      
      // Scale based on camera distance (0.8-1.2 range)
      const distance = camera.position.distanceTo(new THREE.Vector3(...position));
      const scale = Math.max(0.8, Math.min(1.2, 4.5 / distance));
      textRef.current.scale.setScalar(scale);
    }
  });

  const fullText = value ? `${label} — ${value}` : label;
  // Max width constraint - wrap text if too long
  const maxChars = 20;
  const displayText = fullText.length > maxChars ? fullText.substring(0, maxChars) + "..." : fullText;

  return (
    <group ref={textRef} position={position} renderOrder={4}>
      {/* Background glow plane */}
      <mesh position={[0, 0, -0.01]} renderOrder={3}>
        <planeGeometry args={[displayText.length * 0.08, 0.25]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.05}
          depthWrite={false}
        />
      </mesh>
      
      {/* Text with glow */}
      <Text
        position={[0, 0, 0]}
        fontSize={0.12}
        color={color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.015}
        outlineColor="#000000"
        renderOrder={4}
      >
        {displayText}
      </Text>
      
      {/* Glow effect */}
      <mesh position={[0, 0, -0.005]} renderOrder={2}>
        <planeGeometry args={[displayText.length * 0.1, 0.3]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.1}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

