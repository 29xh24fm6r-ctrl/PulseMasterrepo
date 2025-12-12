"use client";

import React from "react";
import { motion } from "framer-motion";
import { colors, typography, shadows } from "@/design-system";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaAction?: () => void;
  sceneKey?: string;
}

export function EmptyState({
  icon = "✨",
  title,
  description,
  ctaLabel,
  ctaAction,
  sceneKey,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        className="text-6xl mb-6"
      >
        {icon}
      </motion.div>

      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-bold mb-3"
        style={{ color: colors.text.primary }}
      >
        {title}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-lg mb-8 max-w-md"
        style={{ color: colors.text.secondary }}
      >
        {description}
      </motion.p>

      {ctaLabel && ctaAction && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={ctaAction}
            size="lg"
            className="px-8 py-6 text-lg font-semibold"
            style={{
              background: sceneKey
                ? colors.scene[sceneKey as keyof typeof colors.scene]?.gradient
                : colors.accent.purple,
              color: "white",
              boxShadow: shadows.z2.glow,
            }}
          >
            {ctaLabel}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}

