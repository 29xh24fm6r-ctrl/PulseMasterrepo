// Micro Explainer Component - Experience Ω
// app/components/zero-friction/MicroExplainer.tsx

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MicroExplainerProps {
  message: string;
  action?: string;
  targetExperience?: string;
  onDismiss: () => void;
  onAction?: () => void;
}

export function MicroExplainer({
  message,
  action,
  targetExperience,
  onDismiss,
  onAction,
}: MicroExplainerProps) {
  const [visible, setVisible] = useState(true);

  function handleDismiss() {
    setVisible(false);
    setTimeout(onDismiss, 300);
  }

  function handleAction() {
    if (targetExperience) {
      window.location.href = targetExperience;
    }
    onAction?.();
    handleDismiss();
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          className="fixed bottom-24 left-6 right-6 md:left-auto md:right-6 md:w-80 p-4 bg-surface2 rounded-lg border border-accent-cyan/50 shadow-lg z-50"
        >
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-accent-cyan flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm text-text-primary mb-2">{message}</div>
              {action && (
                <Button
                  onClick={handleAction}
                  size="sm"
                  className="w-full"
                  variant="outline"
                >
                  {action}
                </Button>
              )}
            </div>
            <button
              onClick={handleDismiss}
              className="text-text-secondary hover:text-text-primary flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}



