// AR Relationship Nodes Component
// app/experiences/ar/ARRelationshipNodes.tsx

"use client";

import { motion } from "framer-motion";

interface ARRelationshipNodesProps {
  relationship: {
    id: string;
    name: string;
    strength: number;
    action: string;
  };
}

export function ARRelationshipNodes({ relationship }: ARRelationshipNodesProps) {
  return (
    <motion.div
      className="absolute top-1/4 right-1/4"
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1, type: "spring", stiffness: 200 }}
    >
      <div className="w-12 h-12 rounded-full bg-accent-blue/50 border-2 border-accent-blue flex items-center justify-center">
        <div className="text-xs font-semibold text-white">
          {relationship.name.charAt(0).toUpperCase()}
        </div>
      </div>
      <motion.div
        className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-status-warning"
        animate={{
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  );
}



