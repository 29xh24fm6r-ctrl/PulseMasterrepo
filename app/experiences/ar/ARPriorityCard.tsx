// AR Priority Card Component
// app/experiences/ar/ARPriorityCard.tsx

"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface ARPriorityCardProps {
  priority: { id: string; title: string; priority: number };
  onExpand?: () => void;
}

export function ARPriorityCard({ priority, onExpand }: ARPriorityCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="w-64 p-4 bg-surface2/90 backdrop-blur-md rounded-lg border border-accent-cyan/50 cursor-pointer"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onExpand}
      animate={{
        scale: isHovered ? 1.1 : 1,
        z: isHovered ? 50 : 0,
      }}
      transition={{ type: "spring", stiffness: 300 }}
      style={{
        boxShadow: isHovered
          ? "0 0 30px rgba(6, 182, 212, 0.5)"
          : "0 0 10px rgba(6, 182, 212, 0.2)",
      }}
    >
      <div className="text-sm font-semibold text-text-primary">{priority.title}</div>
      <div className="mt-2 h-1 bg-surface3 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-accent-cyan"
          initial={{ width: 0 }}
          animate={{ width: `${priority.priority * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </motion.div>
  );
}



