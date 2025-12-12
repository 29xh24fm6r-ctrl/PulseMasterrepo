// Life Node Tooltip - Single small detail panel that appears when a node is selected
// components/life3d/LifeNodeTooltip.tsx

"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { LifeNodeId } from "./LifeNodeContext";
import { FocusPills } from "@/app/components/life-dashboard/FocusPills";
import { EnergyMoodPanel } from "@/app/components/life-dashboard/EnergyMoodPanel";
import { ArcsXpPanel } from "@/app/components/life-dashboard/ArcsXpPanel";

interface LifeNodeTooltipProps {
  nodeId: LifeNodeId;
  onClose: () => void;
}

const nodeLabels: Record<NonNullable<LifeNodeId>, string> = {
  focus: "Today's Focus",
  emotion: "You Right Now",
  growth: "Growth & XP",
};

export function LifeNodeTooltip({ nodeId, onClose }: LifeNodeTooltipProps) {
  if (!nodeId) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="pointer-events-auto absolute right-8 top-24 w-[280px] rounded-3xl bg-black/70 border border-white/20 backdrop-blur-2xl shadow-2xl p-4 text-xs text-white z-30"
        style={{
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="font-semibold text-sm uppercase tracking-wide">
            {nodeLabels[nodeId]}
          </span>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-white">
          {nodeId === "focus" && <FocusPills />}
          {nodeId === "emotion" && <EnergyMoodPanel />}
          {nodeId === "growth" && <ArcsXpPanel />}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}



