// Life Cockpit - Full-screen radial HUD cockpit
// components/realms/LifeCockpit.tsx

"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Life3DScene } from "@/components/life3d/Life3DScene";
import { LifeRadialHUD } from "@/components/life3d/LifeRadialHUD";
import { SystemsDrawer } from "@/components/life3d/SystemsDrawer";
import { LifeNodeProvider, useLifeNode } from "@/components/life3d/LifeNodeContext";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

type EmotionState = "calm" | "neutral" | "energized" | "stressed";
type DrawerTab = "overview" | "wellness" | "relationships" | "finance" | "plan";

interface DashboardData {
  emotion?: string | null;
  emotionIntensity?: number;
  insight?: string;
  xpThisWeek?: number;
  focusScore?: number;
  activeArcs?: number;
  nextCheckpoint?: string;
  twinInsight?: string;
  masterPlan?: any;
}

function LifeCockpitContent() {
  const { user } = useUser();
  const { setActiveNode, activeNode } = useLifeNode();
  const [data, setData] = useState<DashboardData>({});
  const [loading, setLoading] = useState(true);
  const [emotionState, setEmotionState] = useState<EmotionState>("neutral");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("overview");
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [emotionRes, xpRes, coreRes] = await Promise.all([
          fetch("/api/emotion"),
          fetch("/api/xp/summary"),
          fetch("/api/pulse/core", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ context: "dashboard" }),
          }),
        ]);

        const emotionData = await emotionRes.json();
        const xpData = await xpRes.json();
        const coreData = await coreRes.json();

        const detected = emotionData.current?.detected_emotion?.toLowerCase() || "neutral";
        let mappedState: EmotionState = "neutral";
        if (detected.includes("calm") || detected.includes("peaceful")) {
          mappedState = "calm";
        } else if (detected.includes("energized") || detected.includes("excited")) {
          mappedState = "energized";
        } else if (detected.includes("stressed") || detected.includes("overwhelmed")) {
          mappedState = "stressed";
        }
        setEmotionState(mappedState);

        setData({
          emotion: emotionData.current?.detected_emotion || null,
          emotionIntensity: emotionData.current?.intensity || 0.5,
          insight: coreData.insights?.[0]?.message || "Your energy is stable and focus is trending up",
          xpThisWeek: xpData.weekTotal || 0,
          focusScore: coreData.focusScore || 75,
          activeArcs: 3,
          nextCheckpoint: "7 days",
          twinInsight: "You're building momentum in your career arc. Keep the focus.",
          masterPlan: null,
        });
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const handleOpenDrawer = (tab: string) => {
    setDrawerTab(tab as DrawerTab);
    setDrawerOpen(true);
  };

  const handleNodeSelect = (nodeId: "focus" | "emotion" | "growth") => {
    setActiveNode(nodeId);
    
    // Map node to drawer tab
    const tabMap: Record<"focus" | "emotion" | "growth", DrawerTab> = {
      focus: "overview",
      emotion: "overview",
      growth: "overview",
    };
    
    setDrawerTab(tabMap[nodeId]);
    setDrawerOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white/70">Loading your life cockpit...</div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Full-screen cockpit scene */}
      <section className="relative h-[calc(100vh-64px)] w-full overflow-hidden">
        {/* 3D Scene Background */}
        <Life3DScene 
          emotionState={emotionState} 
          onNodeSelect={handleNodeSelect}
          hoveredNodeId={hoveredNodeId}
          selectedNodeId={activeNode}
          userId={user?.id}
        />

        {/* Lens bloom effect around orb */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, rgba(168, 85, 247, 0.1) 0%, transparent 50%)`,
          }}
        />

        {/* Radial HUD */}
        <LifeRadialHUD onOpenDrawer={handleOpenDrawer} />

        {/* Systems Drawer Toggle Button */}
        <div className="absolute bottom-6 right-6 z-20">
          <Button
            onClick={() => setDrawerOpen(true)}
            className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white"
          >
            <Menu className="w-4 h-4 mr-2" />
            Open Systems Drawer
          </Button>
        </div>
      </section>

      {/* Systems Drawer */}
      <SystemsDrawer
        open={drawerOpen}
        activeTab={drawerTab}
        onClose={() => setDrawerOpen(false)}
        onTabChange={(tab) => setDrawerTab(tab)}
      />
    </div>
  );
}

export default function LifeCockpit() {
  return (
    <LifeNodeProvider>
      <LifeCockpitContent />
    </LifeNodeProvider>
  );
}
