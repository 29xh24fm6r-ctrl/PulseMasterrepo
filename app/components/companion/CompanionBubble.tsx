// Companion Bubble Component - Experience v11
// app/components/companion/CompanionBubble.tsx

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CompanionBubbleProps {
  intervention: {
    insight: string;
    suggestion: string;
    emotionalGrounding: string;
    timelineProtection: string;
  };
  onClose: () => void;
}

export function CompanionBubble({ intervention, onClose }: CompanionBubbleProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        className="fixed bottom-24 right-6 w-80 p-4 bg-surface2 rounded-lg border border-accent-cyan/50 shadow-lg z-50"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-accent-cyan" />
            <span className="text-sm font-semibold text-text-primary">Pulse Companion</span>
          </div>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div>
            <div className="text-xs text-text-secondary mb-1">Insight</div>
            <div className="text-text-primary">{intervention.insight}</div>
          </div>
          <div>
            <div className="text-xs text-text-secondary mb-1">Suggestion</div>
            <div className="text-text-primary">{intervention.suggestion}</div>
          </div>
          <div>
            <div className="text-xs text-text-secondary mb-1">Emotional Grounding</div>
            <div className="text-text-primary">{intervention.emotionalGrounding}</div>
          </div>
          <div>
            <div className="text-xs text-text-secondary mb-1">Timeline Protection</div>
            <div className="text-text-primary">{intervention.timelineProtection}</div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}



