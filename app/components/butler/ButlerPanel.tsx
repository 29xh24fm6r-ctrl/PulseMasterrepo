// Butler Panel - Slide-up Interaction Layer
// app/components/butler/ButlerPanel.tsx

"use client";

import { motion } from "framer-motion";
import { X, Mic, Sparkles } from "lucide-react";
import { colors } from "@/design-system/colors";
import { motion as motionTokens } from "@/design-system/motion";

interface ButlerPanelProps {
  onClose: () => void;
  persona?: string;
  recentReasoning?: string;
  suggestedActions?: Array<{ id: string; title: string; description?: string }>;
}

export function ButlerPanel({
  onClose,
  persona = "warm_advisor",
  recentReasoning,
  suggestedActions = [],
}: ButlerPanelProps) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-overlay z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 bg-surface2 border-t border-border-default rounded-t-3xl shadow-z4-card z-50 max-h-[80vh] overflow-hidden"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={motionTokens.spring.medium}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-cyan to-accent-purple flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold text-text-primary">Pulse Butler</div>
                <div className="text-xs text-text-secondary capitalize">{persona} mode</div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface3 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Recent Reasoning */}
          {recentReasoning && (
            <div className="mb-6 p-4 bg-surface3 rounded-lg border border-border-default">
              <div className="text-xs text-text-secondary mb-2">Recent Reasoning</div>
              <div className="text-sm text-text-primary">{recentReasoning}</div>
            </div>
          )}

          {/* Suggested Actions */}
          {suggestedActions.length > 0 && (
            <div className="mb-6">
              <div className="text-sm font-semibold text-text-primary mb-3">
                Suggested Actions
              </div>
              <div className="space-y-2">
                {suggestedActions.map((action) => (
                  <motion.div
                    key={action.id}
                    className="p-3 bg-surface3 rounded-lg border border-border-default cursor-pointer hover:border-border-hover transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-sm text-text-primary font-medium">{action.title}</div>
                    {action.description && (
                      <div className="text-xs text-text-secondary mt-1">{action.description}</div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Voice Input */}
          <motion.button
            className="w-full p-4 bg-gradient-to-r from-accent-cyan to-accent-purple rounded-lg flex items-center justify-center gap-2 text-white font-medium"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Mic className="w-5 h-5" />
            <span>Voice Input</span>
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}



