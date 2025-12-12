// Universe HUD - 2D Overlay UI
// components/universe/UniverseHUD.tsx

"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UniverseNodeConfig } from "@/lib/universe/config";
import { Button } from "@/components/ui/button";
import { Mic, User, Sparkles, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { colors } from "@/design-system";

interface UniverseHUDProps {
  userName?: string;
  hoveredNode: UniverseNodeConfig | null;
  selectedNode: UniverseNodeConfig | null;
  onSelectMostImportant: () => void;
  onDeselect: () => void;
}

export function UniverseHUD({
  userName,
  hoveredNode,
  selectedNode,
  onSelectMostImportant,
  onDeselect,
}: UniverseHUDProps) {
  const router = useRouter();
  const displayNode = selectedNode || hoveredNode;

  const handleEnterRealm = (route: string) => {
    router.push(route);
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Top Nav */}
      <div className="absolute top-0 left-0 right-0 p-6 pointer-events-auto">
        <div
          className="flex items-center justify-between backdrop-blur-xl rounded-2xl px-6 py-3"
          style={{
            background: "rgba(255, 255, 255, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-purple-400" />
            <span className="text-xl font-bold text-white">Pulse OS</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <Mic className="w-4 h-4" />
            </Button>
            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Center Welcome Overlay */}
      <AnimatePresence>
        {!displayNode && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-auto"
          >
            <div className="text-center max-w-2xl px-6">
              <motion.h1
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="text-5xl md:text-7xl font-extrabold text-white mb-4"
              >
                Welcome to your Pulse Universe{userName ? `, ${userName}` : ""}.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xl md:text-2xl text-white/80 mb-8"
              >
                Each glowing world is a system in your life.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Button
                  onClick={onSelectMostImportant}
                  size="lg"
                  className="px-8 py-6 text-lg font-semibold rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${colors.accent.purple}, ${colors.accent.pink})`,
                    color: "white",
                    boxShadow: "0 10px 40px rgba(139, 92, 246, 0.4)",
                  }}
                >
                  Show me what matters most today
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Node Info Panel */}
      <AnimatePresence>
        {displayNode && (
          <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="absolute right-6 top-1/2 transform -translate-y-1/2 pointer-events-auto"
            style={{ maxWidth: "400px" }}
          >
            <div
              className="p-8 rounded-3xl backdrop-blur-xl border"
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                borderColor: "rgba(255, 255, 255, 0.3)",
                boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-3xl font-extrabold text-white">{displayNode.label}</h2>
                {selectedNode && (
                  <button
                    onClick={onDeselect}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
              <p className="text-white/80 mb-6 leading-relaxed">{displayNode.description}</p>

              {/* Stats (stubbed) */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/10">
                  <span className="text-white/70 text-sm">Momentum</span>
                  <span className="text-white font-semibold">High</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/10">
                  <span className="text-white/70 text-sm">Clarity</span>
                  <span className="text-white font-semibold">Medium</span>
                </div>
              </div>

              {/* CTA */}
              <Button
                onClick={() => handleEnterRealm(displayNode.route)}
                size="lg"
                className="w-full font-semibold rounded-full flex items-center justify-center gap-2"
                style={{
                  background: `linear-gradient(135deg, ${colors.accent.purple}, ${colors.accent.pink})`,
                  color: "white",
                  boxShadow: "0 8px 30px rgba(139, 92, 246, 0.4)",
                }}
              >
                Enter {displayNode.label}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

