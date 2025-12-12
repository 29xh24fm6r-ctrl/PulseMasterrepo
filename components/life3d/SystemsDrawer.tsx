// Systems Drawer - Slide-up drawer for detailed system cards
// components/life3d/SystemsDrawer.tsx

"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassPanel } from "./GlassPanel";
import { FinanceStrip } from "@/app/components/life-dashboard/FinanceStrip";
import { RelationshipsStrip } from "@/app/components/life-dashboard/RelationshipsStrip";
import { StrategyPanelCompact } from "@/app/components/life-dashboard/StrategyPanelCompact";
import { EmptyState } from "@/app/components/scenes/EmptyState";
import { Heart, DollarSign, Compass, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";

type DrawerTab = "overview" | "wellness" | "relationships" | "finance" | "plan";

interface SystemsDrawerProps {
  open: boolean;
  activeTab?: DrawerTab;
  onClose: () => void;
  onTabChange?: (tab: DrawerTab) => void;
}

export function SystemsDrawer({ open, activeTab = "overview", onClose, onTabChange }: SystemsDrawerProps) {
  const [currentTab, setCurrentTab] = useState<DrawerTab>(activeTab);

  useEffect(() => {
    if (activeTab) {
      setCurrentTab(activeTab);
    }
  }, [activeTab]);

  const handleTabChange = (tab: DrawerTab) => {
    setCurrentTab(tab);
    onTabChange?.(tab);
  };

  const tabs: { id: DrawerTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "wellness", label: "Wellness" },
    { id: "relationships", label: "Relationships" },
    { id: "finance", label: "Finance" },
    { id: "plan", label: "Plan" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "75%" }}
            animate={{ y: 0 }}
            exit={{ y: "75%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="pointer-events-auto fixed inset-x-0 bottom-0 flex justify-center z-50"
          >
            <div className="w-full max-w-5xl rounded-t-3xl bg-black/70 border border-white/20 backdrop-blur-2xl shadow-[0_-20px_60px_rgba(0,0,0,0.8)] p-6">
              {/* Drawer header */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex gap-2">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={cn(
                        "px-4 py-2 rounded-lg text-xs font-medium transition-colors",
                        currentTab === tab.id
                          ? "bg-white/20 text-white"
                          : "bg-white/5 text-white/70 hover:bg-white/10"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer body */}
              <div className="max-h-[60vh] overflow-y-auto">
                {currentTab === "overview" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <GlassPanel glowColor="#10b981">
                      <div className="flex items-center gap-3 mb-4">
                        <Heart className="w-5 h-5 text-green-400" />
                        <h4 className="text-lg font-semibold text-white">Wellness</h4>
                      </div>
                      <div className="text-center">
                        <p className="text-3xl font-extrabold text-white mb-1">85%</p>
                        <p className="text-sm text-white/70">Vitality Score</p>
                      </div>
                    </GlassPanel>

                    <GlassPanel glowColor="#ec4899">
                      <div className="flex items-center gap-3 mb-4">
                        <Heart className="w-5 h-5 text-pink-400" />
                        <h4 className="text-lg font-semibold text-white">Relationships</h4>
                      </div>
                      <RelationshipsStrip />
                    </GlassPanel>

                    <GlassPanel glowColor="#06b6d4">
                      <div className="flex items-center gap-3 mb-4">
                        <DollarSign className="w-5 h-5 text-cyan-400" />
                        <h4 className="text-lg font-semibold text-white">Finance</h4>
                      </div>
                      <FinanceStrip />
                    </GlassPanel>

                    <GlassPanel glowColor="#a855f7">
                      <div className="flex items-center gap-3 mb-4">
                        <Compass className="w-5 h-5 text-purple-300" />
                        <h3 className="text-lg font-semibold text-white">Master Plan</h3>
                      </div>
                      <EmptyState
                        icon="🗺️"
                        title="No master plan yet"
                        description="Let's build your Master Plan together."
                        ctaLabel="Create Master Plan"
                        ctaAction={() => (window.location.href = "/strategy-board")}
                        sceneKey="life"
                      />
                    </GlassPanel>
                  </div>
                )}

                {currentTab === "wellness" && (
                  <GlassPanel glowColor="#10b981">
                    <div className="text-center">
                      <Heart className="w-16 h-16 text-green-400 mx-auto mb-4" />
                      <h3 className="text-2xl font-bold text-white mb-2">Wellness</h3>
                      <p className="text-4xl font-extrabold text-white mb-1">85%</p>
                      <p className="text-sm text-white/70">Vitality Score</p>
                    </div>
                  </GlassPanel>
                )}

                {currentTab === "relationships" && (
                  <GlassPanel glowColor="#ec4899">
                    <div className="flex items-center gap-3 mb-4">
                      <Heart className="w-6 h-6 text-pink-400" />
                      <h3 className="text-xl font-semibold text-white">Relationships</h3>
                    </div>
                    <RelationshipsStrip />
                  </GlassPanel>
                )}

                {currentTab === "finance" && (
                  <GlassPanel glowColor="#06b6d4">
                    <div className="flex items-center gap-3 mb-4">
                      <DollarSign className="w-6 h-6 text-cyan-400" />
                      <h3 className="text-xl font-semibold text-white">Finance</h3>
                    </div>
                    <FinanceStrip />
                  </GlassPanel>
                )}

                {currentTab === "plan" && (
                  <GlassPanel glowColor="#a855f7">
                    <div className="flex items-center gap-3 mb-4">
                      <Compass className="w-6 h-6 text-purple-300" />
                      <h3 className="text-xl font-semibold text-white">Master Plan</h3>
                    </div>
                    <StrategyPanelCompact />
                  </GlassPanel>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}



