// Life Node Label - Tiny holographic labels anchored near 3D nodes
// components/life3d/LifeNodeLabel.tsx

"use client";

import React from "react";
import { LifeNodeId } from "./LifeNodeContext";

interface LifeNodeLabelProps {
  nodeId: LifeNodeId;
  value?: string;
  position: { x: string; y: string };
}

const nodeLabels: Record<NonNullable<LifeNodeId>, string> = {
  focus: "Focus",
  emotion: "Emotion",
  growth: "Growth",
};

export function LifeNodeLabel({ nodeId, value, position }: LifeNodeLabelProps) {
  if (!nodeId) return null;

  return (
    <div
      className="pointer-events-none absolute text-white/60 text-xs font-medium z-10"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -50%)",
        textShadow: "0 0 10px rgba(255,255,255,0.3)",
      }}
    >
      <div className="flex items-center gap-2">
        <span>{nodeLabels[nodeId]}</span>
        {value && (
          <>
            <span className="text-white/40">—</span>
            <span className="text-white/80">{value}</span>
          </>
        )}
      </div>
    </div>
  );
}



