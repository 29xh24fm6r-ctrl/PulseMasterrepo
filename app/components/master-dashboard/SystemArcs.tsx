// System Arcs - Circular arcs orbiting the Pulse Orb
// app/components/master-dashboard/SystemArcs.tsx

"use client";

import React from "react";
import { motion } from "framer-motion";
import { colors } from "@/design-system";

interface SystemArcsProps {
  emotion?: string | null;
  xpTotal?: number;
  focusScore?: number;
}

export function SystemArcs({ emotion, xpTotal = 0, focusScore = 75 }: SystemArcsProps) {
  const arcs = [
    {
      id: "life",
      label: "Life Systems",
      value: `${focusScore}%`,
      color: colors.accent.purple,
      rotation: 0,
    },
    {
      id: "work",
      label: "Work Systems",
      value: "Active",
      color: colors.accent.blue,
      rotation: 120,
    },
    {
      id: "growth",
      label: "Growth Systems",
      value: `${Math.floor(xpTotal / 1000)}k XP`,
      color: colors.accent.orange,
      rotation: 240,
    },
  ];

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {arcs.map((arc, index) => (
        <motion.div
          key={arc.id}
          className="absolute"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 + index * 0.2, duration: 0.6 }}
        >
          <svg
            width="600"
            height="600"
            viewBox="0 0 600 600"
            className="transform"
            style={{
              transform: `rotate(${arc.rotation}deg)`,
            }}
          >
            {/* Arc Path */}
            <motion.path
              d="M 300 50 A 250 250 0 0 1 550 300"
              fill="none"
              stroke={arc.color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="10 5"
              opacity="0.6"
              animate={{
                pathLength: [0, 1, 0],
                opacity: [0.4, 0.8, 0.4],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            {/* Glow Effect */}
            <motion.path
              d="M 300 50 A 250 250 0 0 1 550 300"
              fill="none"
              stroke={arc.color}
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.2"
              animate={{
                opacity: [0.1, 0.3, 0.1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </svg>

          {/* Label at Arc End - Positioned at arc endpoint */}
          <motion.div
            className="absolute"
            style={{
              top: "50%",
              left: "50%",
              transform: `translate(calc(-50% + ${Math.cos((arc.rotation - 90) * Math.PI / 180) * 250}px), calc(-50% + ${Math.sin((arc.rotation - 90) * Math.PI / 180) * 250}px))`,
            }}
            animate={{
              y: [0, -5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: index * 0.3,
            }}
          >
            <div
              className="px-4 py-2 rounded-full backdrop-blur-md border text-sm font-semibold whitespace-nowrap"
              style={{
                background: `${arc.color}20`,
                borderColor: `${arc.color}40`,
                color: arc.color,
              }}
            >
              <div className="text-xs opacity-80 mb-1">{arc.label}</div>
              <div>{arc.value}</div>
            </div>
          </motion.div>
        </motion.div>
      ))}
    </div>
  );
}

