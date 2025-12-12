// Semantic Positioning System - Fixed semantic orbit slots for nodes
// lib/realm/NodePositions.ts

import * as THREE from "three";

export const NODE_POSITIONS: Record<"focus" | "growth" | "emotion", [number, number, number]> = {
  focus: [0, 0.2, -1.2],      // Forward orbit (Z axis)
  growth: [-1.4, 0.2, 0],     // Left orbit (-X axis)
  emotion: [1.4, 0.2, 0],     // Right orbit (+X axis)
};

export const NODE_SCALES: Record<"focus" | "growth" | "emotion", number> = {
  focus: 0.28,    // Largest
  growth: 0.22,   // Medium
  emotion: 0.22,  // Medium
};

export function getNodePosition(nodeId: "focus" | "growth" | "emotion"): THREE.Vector3 {
  const pos = NODE_POSITIONS[nodeId];
  return new THREE.Vector3(pos[0], pos[1], pos[2]);
}

export function getNodeScale(nodeId: "focus" | "growth" | "emotion"): number {
  return NODE_SCALES[nodeId];
}



