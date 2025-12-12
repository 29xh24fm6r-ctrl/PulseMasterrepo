// Pulse Productivity Engine v1
// app/(authenticated)/work/page.tsx

"use client";

import { useState, useEffect } from "react";
import { WorkItem } from "@/lib/productivity/types";
import { TodayCommandQueue } from "@/app/components/work/TodayCommandQueue";
import { FocusModesPanel } from "@/app/components/work/FocusModesPanel";
import { PlanReviewStrip } from "@/app/components/work/PlanReviewStrip";
import { CoachLauncher } from "@/app/components/coaching/CoachLauncher";
import { Zap, TrendingUp, Award, Flame, Brain, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function WorkPage() {
  const [selectedItem, setSelectedItem] = useState<WorkItem | undefined>();
  const [xpToday, setXpToday] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [autonomousMode, setAutonomousMode] = useState(false);
  const [isReplanning, setIsReplanning] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      // Load today's XP
      const today = new Date().toISOString().split("T")[0];
      const xpRes = await fetch(`/api/xp/ledger?date=${today}`);
      if (xpRes.ok) {
        const xpData = await xpRes.json();
        setXpToday(xpData.total || 0);
      }

      // Load completion stats and streak
      // TODO: Add API endpoint for productivity stats
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  }

  function handleItemSelect(item: WorkItem) {
    setSelectedItem(item);
  }

  async function handleItemComplete(itemId: string) {
    setCompletedCount((prev) => prev + 1);
    
    // Award XP for completing work item
    try {
      await fetch("/api/xp/award", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: 10,
          category: "discipline",
          source: "work_item_completed",
          sourceId: itemId,
        }),
      });
      await loadStats();
    } catch (err) {
      console.error("Failed to award XP:", err);
    }
  }

  async function handleStartSession(mode: "single_task" | "power_hour", itemIds: string[]) {
    // Start focus session via API
    try {
      const res = await fetch("/api/productivity/focus-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          mode,
          workItemIds: itemIds,
        }),
      });
      if (res.ok) {
        console.log("Focus session started");
      }
    } catch (err) {
      console.error("Failed to start session:", err);
    }
  }

  async function handleReplan() {
    setIsReplanning(true);
    try {
      const res = await fetch("/api/productivity/replan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "replan" }),
      });
      if (res.ok) {
        // Queue will auto-refresh
        window.location.reload(); // Simple refresh for now
      }
    } catch (err) {
      console.error("Failed to replan:", err);
    } finally {
      setIsReplanning(false);
    }
  }

  // Autonomous mode: auto-replan every 30 minutes
  useEffect(() => {
    if (!autonomousMode) return;

    const interval = setInterval(() => {
      handleReplan();
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(interval);
  }, [autonomousMode]);

  return (
    <main className="flex flex-col gap-4 p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Pulse Execution Engine</h1>
          <p className="text-sm text-zinc-400">
            One screen that knows everything you could do, decides what matters today
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autonomousMode}
              onChange={(e) => setAutonomousMode(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-violet-600 focus:ring-violet-600"
            />
            <span className="text-sm text-zinc-300 flex items-center gap-1">
              <Brain className="w-4 h-4" />
              Autonomous Mode
            </span>
          </label>
          {isReplanning && (
            <div className="flex items-center gap-2 text-sm text-violet-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Pulse is restructuring your day...</span>
            </div>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleReplan}
            disabled={isReplanning}
          >
            Replan Day
          </Button>
          <CoachLauncher
            coachKey="motivational"
            origin="work.main"
            variant="button"
            label="Ask Productivity Coach"
            className="bg-violet-600 hover:bg-violet-700"
          />
        </div>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4 h-4 text-yellow-400" />
            <span className="text-xs text-zinc-400">XP Today</span>
          </div>
          <div className="text-xl font-bold text-white">{xpToday}</div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4 text-green-400" />
            <span className="text-xs text-zinc-400">Completed</span>
          </div>
          <div className="text-xl font-bold text-white">{completedCount}</div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-zinc-400">Day Streak</span>
          </div>
          <div className="text-xl font-bold text-white">{streak}</div>
        </div>
      </div>

      {/* Main Content: Queue + Focus Modes */}
      <section className="grid gap-4 lg:grid-cols-[2fr,1.3fr]">
        <TodayCommandQueue
          onItemSelect={handleItemSelect}
          onItemComplete={handleItemComplete}
        />
        <FocusModesPanel
          selectedItem={selectedItem}
          onStartSession={handleStartSession}
        />
      </section>

      {/* Plan / Review Strip */}
      <section className="mt-4">
        <PlanReviewStrip />
      </section>
    </main>
  );
}
