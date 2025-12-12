// Life Radial HUD - Minimal labels and single tooltip (no cards)
// components/life3d/LifeRadialHUD.tsx

"use client";

import React, { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { StatusChip } from "./StatusChip";
import { LifeNodeLabel } from "./LifeNodeLabel";
import { LifeNodeTooltip } from "./LifeNodeTooltip";
import { useLifeNode, LifeNodeId } from "./LifeNodeContext";

interface LifeRadialHUDProps {
  onOpenDrawer?: (tab: string) => void;
}

export function LifeRadialHUD({ onOpenDrawer }: LifeRadialHUDProps) {
  const { activeNode, setActiveNode } = useLifeNode();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 150, damping: 15 });
  const springY = useSpring(y, { stiffness: 150, damping: 15 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      
      // Normalize to -1 to 1
      const normalizedX = (clientX / innerWidth) * 2 - 1;
      const normalizedY = (clientY / innerHeight) * 2 - 1;
      
      // Parallax: move opposite to cursor (3-4px range for subtlety)
      x.set(normalizedX * -4);
      y.set(normalizedY * -4);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [x, y]);

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 flex items-center justify-center z-10"
      style={{
        x: springX,
        y: springY,
      }}
    >
      {/* Tiny labels near 3D nodes (approximate positions) */}
      <LifeNodeLabel nodeId="focus" value="No moves yet" position={{ x: "50%", y: "35%" }} />
      <LifeNodeLabel nodeId="emotion" value="Neutral" position={{ x: "65%", y: "50%" }} />
      <LifeNodeLabel nodeId="growth" value="Level 1" position={{ x: "35%", y: "50%" }} />

      {/* Single detail tooltip */}
      {activeNode && (
        <LifeNodeTooltip nodeId={activeNode} onClose={() => setActiveNode(null)} />
      )}

      {/* Bottom status chips */}
      <div className="pointer-events-auto absolute bottom-0 left-1/2 flex -translate-x-1/2 translate-y-1/2 gap-3">
        <StatusChip
          label="Wellness"
          value="85%"
          onClick={() => onOpenDrawer?.("wellness")}
        />
        <StatusChip
          label="Relationships"
          value="Calm"
          onClick={() => onOpenDrawer?.("relationships")}
        />
        <StatusChip
          label="Money"
          value="Stable"
          onClick={() => onOpenDrawer?.("finance")}
        />
      </div>
    </motion.div>
  );
}

