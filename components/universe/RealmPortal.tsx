// Realm Portal - Cinematic overlay when entering a realm
// components/universe/RealmPortal.tsx

"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UniverseNodeConfig, UniverseNodeMetrics } from "@/lib/universe/config";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { colors } from "@/design-system";

interface RealmPortalProps {
  node: UniverseNodeConfig;
  metrics: UniverseNodeMetrics;
  onEnter: () => void;
  onClose: () => void;
  onAskPulse?: () => void;
}

export function RealmPortal({
  node,
  metrics,
  onEnter,
  onClose,
  onAskPulse,
}: RealmPortalProps) {
  // Generate AGI insight based on metrics
  const getInsight = () => {
    if (metrics.urgency > 0.7) {
      return `${node.label} needs your attention – ${metrics.urgency > 0.8 ? "urgent" : "important"} items are waiting.`;
    }
    if (metrics.momentum > 0.7) {
      return `You're building strong momentum in ${node.label}. Keep going.`;
    }
    if (metrics.importance > 0.7) {
      return `${node.label} is a key focus area right now.`;
    }
    return `${node.label} is stable. Ready when you are.`;
  };

  const getStats = () => {
    const stats = [];
    if (metrics.importance > 0.5) {
      stats.push({ label: "Importance", value: `${Math.round(metrics.importance * 100)}%` });
    }
    if (metrics.urgency > 0.3) {
      stats.push({ label: "Urgency", value: `${Math.round(metrics.urgency * 100)}%` });
    }
    if (metrics.momentum > 0.5) {
      stats.push({ label: "Momentum", value: `${Math.round(metrics.momentum * 100)}%` });
    }
    return stats;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="fixed inset-0 flex items-center justify-center z-50 pointer-events-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Portal Panel */}
        <motion.div
          initial={{ y: 20 }}
          animate={{ y: 0 }}
          className="relative z-10 w-full max-w-2xl mx-4"
          style={{
            background: "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(20px)",
            border: "2px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "2rem",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(139, 92, 246, 0.3) inset",
          }}
        >
          {/* Neon Edge Glow */}
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{
              background: `linear-gradient(135deg, ${colors.accent.purple}20, ${colors.accent.pink}20)`,
              boxShadow: `0 0 40px ${colors.accent.purple}40`,
            }}
          />

          <div className="relative z-10 p-10">
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-10 h-10 text-purple-400" />
              </motion.div>
              <div>
                <h2 className="text-4xl font-extrabold text-white mb-1">{node.label}</h2>
                <p className="text-white/70">{node.description}</p>
              </div>
            </div>

            {/* AGI Insight */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-6 rounded-2xl mb-6"
              style={{
                background: "rgba(139, 92, 246, 0.2)",
                border: "1px solid rgba(139, 92, 246, 0.4)",
              }}
            >
              <p className="text-lg text-white leading-relaxed">{getInsight()}</p>
            </motion.div>

            {/* Stats */}
            {getStats().length > 0 && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                {getStats().map((stat, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="p-4 rounded-xl text-center"
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    <div className="text-xs text-white/70 mb-1">{stat.label}</div>
                    <div className="text-2xl font-bold text-white">{stat.value}</div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* CTAs */}
            <div className="flex gap-4">
              <Button
                onClick={onEnter}
                size="lg"
                className="flex-1 font-semibold rounded-full flex items-center justify-center gap-2"
                style={{
                  background: `linear-gradient(135deg, ${colors.accent.purple}, ${colors.accent.pink})`,
                  color: "white",
                  boxShadow: "0 10px 40px rgba(139, 92, 246, 0.4)",
                }}
              >
                ENTER {node.label.toUpperCase()}
                <ArrowRight className="w-5 h-5" />
              </Button>
              {onAskPulse && (
                <Button
                  onClick={onAskPulse}
                  size="lg"
                  variant="outline"
                  className="font-semibold rounded-full"
                  style={{
                    borderColor: "rgba(255, 255, 255, 0.3)",
                    color: "white",
                    background: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  Ask Pulse
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}



