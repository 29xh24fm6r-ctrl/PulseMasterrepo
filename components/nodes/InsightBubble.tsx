// Insight Bubble - Floating text bubble that appears from nodes
// components/nodes/InsightBubble.tsx

"use client";

import React, { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";

interface InsightBubbleProps {
  position: [number, number, number];
  message: string;
  duration?: number;
  onComplete?: () => void;
}

export function InsightBubble({ position, message, duration = 4000, onComplete }: InsightBubbleProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [opacity, setOpacity] = useState(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    // Fade in
    const fadeIn = setTimeout(() => setOpacity(1), 100);
    
    // Fade out and complete
    const fadeOut = setTimeout(() => {
      setOpacity(0);
      setTimeout(() => onComplete?.(), 500);
    }, duration - 500);

    return () => {
      clearTimeout(fadeIn);
      clearTimeout(fadeOut);
    };
  }, [duration, onComplete]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Float upward
      groupRef.current.position.y += delta * 0.3;
      
      // Gentle rotation
      groupRef.current.rotation.y += delta * 0.5;
      
      // Face camera
      groupRef.current.lookAt(state.camera.position);
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Background bubble */}
      <mesh>
        <planeGeometry args={[message.length * 0.15, 0.4]} />
        <meshBasicMaterial
          color="#000000"
          transparent
          opacity={opacity * 0.7}
        />
      </mesh>
      
      {/* Text */}
      <Text
        position={[0, 0, 0.01]}
        fontSize={0.15}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#000000"
      >
        {message}
      </Text>
    </group>
  );
}



