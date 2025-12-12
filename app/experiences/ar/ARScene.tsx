// AR Scene System - WebXR/AR Interface
// app/experiences/ar/ARScene.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ARContext } from "@/lib/ar/context-builder";
import { ARPriorityCard } from "./ARPriorityCard";
import { AREnergyOrb } from "./AREnergyOrb";
import { ARIdentityArc } from "./ARIdentityArc";
import { ARButlerNode } from "./ARButlerNode";
import { ARRelationshipNodes } from "./ARRelationshipNodes";

interface ARSceneProps {
  context: ARContext;
  onCardExpand?: (cardId: string) => void;
  onDomainSwitch?: (domain: string) => void;
}

export function ARScene({ context, onCardExpand, onDomainSwitch }: ARSceneProps) {
  const [isARSupported, setIsARSupported] = useState(false);
  const [isARSessionActive, setIsARSessionActive] = useState(false);
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check WebXR support
    if (navigator.xr) {
      navigator.xr.isSessionSupported("immersive-ar").then((supported) => {
        setIsARSupported(supported);
      });
    }
  }, []);

  async function startARSession() {
    if (!navigator.xr || !isARSupported) {
      alert("AR not supported on this device");
      return;
    }

    try {
      const session = await (navigator.xr as any).requestSession("immersive-ar");
      setIsARSessionActive(true);

      session.addEventListener("end", () => {
        setIsARSessionActive(false);
      });
    } catch (err) {
      console.error("Failed to start AR session:", err);
    }
  }

  if (!isARSupported) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-lg font-semibold text-text-primary mb-2">
            AR Not Supported
          </div>
          <div className="text-sm text-text-secondary">
            Your device doesn't support WebXR AR. Try on a compatible device.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={sceneRef} className="relative w-full h-screen bg-black overflow-hidden">
      {/* AR Canvas would be rendered here by WebXR */}
      
      {/* Fallback 3D scene for non-AR devices */}
      {!isARSessionActive && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={startARSession}
            className="px-6 py-3 bg-accent-cyan text-white rounded-lg font-medium hover:bg-accent-cyan/80 transition-colors"
          >
            Start AR Session
          </button>
        </div>
      )}

      {/* AR Spatial Cards */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Priority Cards - Floating in space */}
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 space-y-4">
          {context.priorities.map((priority, i) => (
            <motion.div
              key={priority.id}
              initial={{ opacity: 0, y: 50, z: -100 }}
              animate={{ opacity: 1, y: 0, z: 0 }}
              transition={{ delay: i * 0.2, duration: 0.5 }}
              style={{
                transform: `translateZ(${i * 20}px)`,
              }}
            >
              <ARPriorityCard
                priority={priority}
                onExpand={() => onCardExpand?.(priority.id)}
              />
            </motion.div>
          ))}
        </div>

        {/* Energy Orb - Floating right */}
        <motion.div
          className="absolute top-1/2 right-20"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
        >
          <AREnergyOrb energy={context.todaysState.energy} />
        </motion.div>

        {/* Identity Arc - Floating left */}
        <motion.div
          className="absolute top-1/2 left-20"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
        >
          <ARIdentityArc emotion={context.todaysState.emotion} />
        </motion.div>

        {/* Butler Node - Center bottom */}
        <motion.div
          className="absolute bottom-20 left-1/2 transform -translate-x-1/2"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <ARButlerNode />
        </motion.div>

        {/* Relationship Nodes - Floating around */}
        {context.relationshipTouch && (
          <ARRelationshipNodes relationship={context.relationshipTouch} />
        )}
      </div>
    </div>
  );
}

