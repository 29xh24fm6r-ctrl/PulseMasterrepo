// Holographic Canvas - 3D Spatial Dashboard
// app/experiences/holographic/HoloCanvas.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { getWorkCortexContextForUser } from "@/lib/cortex/context";
import { PulseCortexContext } from "@/lib/cortex/types";

interface HoloCanvasProps {
  userId: string;
}

export function HoloCanvas({ userId }: HoloCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<PulseCortexContext | null>(null);

  useEffect(() => {
    loadContext();
  }, [userId]);

  async function loadContext() {
    const context = await getWorkCortexContextForUser(userId);
    setCtx(context);
  }

  // Three.js/React Three Fiber would be initialized here
  // For now, using CSS 3D transforms as placeholder

  return (
    <div className="relative w-full h-screen bg-surface1 overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Floating Panels - Using CSS 3D transforms */}
      <div className="absolute inset-0 perspective-1000">
        {/* Priority Cards - Stacked */}
        <motion.div
          className="absolute top-20 left-1/2 transform -translate-x-1/2"
          style={{ transformStyle: "preserve-3d" }}
        >
          {ctx?.domains.strategy?.currentQuarterFocus?.bigThree.map((priority, i) => (
            <motion.div
              key={i}
              className="w-80 p-6 bg-surface2/90 backdrop-blur-md rounded-lg border border-accent-cyan/50 mb-4"
              style={{
                transform: `translateZ(${i * 20}px) rotateY(${i * 5}deg)`,
              }}
              animate={{
                y: [0, -10, 0],
                rotateY: [i * 5, i * 5 + 2, i * 5],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.2,
              }}
            >
              <div className="text-lg font-semibold text-text-primary">{priority}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Identity Arc - Glowing Ring */}
        <motion.div
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
          animate={{
            rotateZ: [0, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <div className="w-64 h-64 rounded-full border-4 border-accent-purple/50 relative">
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-accent-purple"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>
        </motion.div>

        {/* Relationship Graph - Constellation */}
        <div className="absolute top-1/4 right-1/4">
          {ctx?.domains.relationships?.keyPeople?.slice(0, 5).map((person, i) => {
            const angle = (i / 5) * Math.PI * 2;
            const radius = 60;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            return (
              <motion.div
                key={person.id}
                className="absolute w-8 h-8 rounded-full bg-accent-blue/50 border border-accent-blue"
                style={{
                  left: x,
                  top: y,
                }}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.6, 1, 0.6],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.2,
                }}
              />
            );
          })}
        </div>

        {/* XP Particle Field - Animated dots */}
        <div className="absolute inset-0">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-accent-cyan"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -100, 0],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        {/* Holo Butler Orb */}
        <motion.div
          className="absolute bottom-20 left-1/2 transform -translate-x-1/2"
          animate={{
            scale: [1, 1.1, 1],
            y: [0, -10, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-accent-cyan to-accent-purple relative">
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle, rgba(6, 182, 212, 0.5) 0%, transparent 70%)`,
              }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            {/* Thinking particles */}
            {Array.from({ length: 8 }).map((_, i) => {
              const angle = (i / 8) * Math.PI * 2;
              const radius = 40;
              return (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-white"
                  style={{
                    left: "50%",
                    top: "50%",
                  }}
                  animate={{
                    x: [0, Math.cos(angle) * radius, 0],
                    y: [0, Math.sin(angle) * radius, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.1,
                  }}
                />
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}



