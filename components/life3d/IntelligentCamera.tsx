// Intelligent Camera - Reactive camera behavior
// components/life3d/IntelligentCamera.tsx

"use client";

import React, { useRef, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface IntelligentCameraProps {
  hoveredNodeId?: string | null;
  selectedNodeId?: string | null;
}

export function IntelligentCamera({ hoveredNodeId, selectedNodeId }: IntelligentCameraProps) {
  const { camera } = useThree();
  const targetPosition = useRef(new THREE.Vector3(0, 0.8, 4.5));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const idleOffset = useRef({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    // Fixed camera target - always frame orb + nodes
    const fixedTarget = new THREE.Vector3(0, 0.3, 0);
    targetLookAt.current.copy(fixedTarget);

    if (selectedNodeId) {
      // Camera glides into angle framing node (but still frames whole scene)
      switch (selectedNodeId) {
        case "focus":
          targetPosition.current.set(0, 0.8, 4.2);
          break;
        case "emotion":
          targetPosition.current.set(1.5, 0.8, 4.0);
          break;
        case "growth":
          targetPosition.current.set(-1.5, 0.8, 4.0);
          break;
      }
    } else if (hoveredNodeId) {
      // Slight adjustment on hover (minimal)
      switch (hoveredNodeId) {
        case "focus":
          targetPosition.current.set(0, 0.8, 4.3);
          break;
        case "emotion":
          targetPosition.current.set(1.2, 0.8, 4.1);
          break;
        case "growth":
          targetPosition.current.set(-1.2, 0.8, 4.1);
          break;
      }
    } else {
      // Default position - frames orb + all nodes
      targetPosition.current.set(0, 0.8, 4.5);
    }
  }, [hoveredNodeId, selectedNodeId]);

  useFrame((state, delta) => {
    // Smooth lerp to target position
    camera.position.lerp(targetPosition.current, 0.05);
    
    // Look at target
    const lookAt = new THREE.Vector3();
    camera.getWorldDirection(lookAt);
    const targetDir = targetLookAt.current.clone().sub(camera.position).normalize();
    const newDir = lookAt.lerp(targetDir, 0.05);
    camera.lookAt(camera.position.clone().add(newDir));
    
    // Idle breathing motion when nothing is hovered/selected
    if (!hoveredNodeId && !selectedNodeId) {
      idleOffset.current.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.1;
      idleOffset.current.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.1;
      idleOffset.current.z = Math.sin(state.clock.elapsedTime * 0.2) * 0.05;
      
      camera.position.add(
        new THREE.Vector3(
          idleOffset.current.x * delta,
          idleOffset.current.y * delta,
          idleOffset.current.z * delta
        )
      );
    }
  });

  return null;
}

