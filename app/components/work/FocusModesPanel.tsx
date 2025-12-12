// Focus Modes Panel Component
// app/components/work/FocusModesPanel.tsx

"use client";

import { useState, useEffect } from "react";
import { WorkItem, FocusModeType } from "@/lib/productivity/types";
import { AppCard } from "@/components/ui/AppCard";
import { Button } from "@/components/ui/button";
import { Timer, Zap, ListChecks, Play, Pause, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface FocusModesPanelProps {
  selectedItem?: WorkItem;
  onStartSession?: (mode: FocusModeType, itemIds: string[]) => void;
}

export function FocusModesPanel({
  selectedItem,
  onStartSession,
}: FocusModesPanelProps) {
  const [activeMode, setActiveMode] = useState<FocusModeType | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(25 * 60); // 25 minutes default
  const [sessionItemIds, setSessionItemIds] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Timer countdown effect
  useEffect(() => {
    if (!timerActive || timerSeconds <= 0) {
      if (timerSeconds === 0 && activeMode) {
        // Auto-end session when timer reaches 0
        handleEndSession();
      }
      return;
    }

    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timerActive, timerSeconds, activeMode]);

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  async function handleStartSingleFocus() {
    if (!selectedItem) return;
    
    try {
      const res = await fetch("/api/productivity/focus-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          mode: "single_task",
          workItemIds: [selectedItem.id],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveMode("single_task");
        setSessionItemIds([selectedItem.id]);
        setSessionId(data.session.id);
        setTimerSeconds(25 * 60);
        onStartSession?.("single_task", [selectedItem.id]);
      }
    } catch (err) {
      console.error("Failed to start session:", err);
    }
  }

  async function handleStartPowerHour() {
    // Power Hour mode - will be populated with multiple items
    try {
      const res = await fetch("/api/productivity/focus-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          mode: "power_hour",
          workItemIds: [], // Will be populated from queue
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveMode("power_hour");
        setSessionId(data.session.id);
        setTimerSeconds(60 * 60); // 60 minutes
        onStartSession?.("power_hour", []);
      }
    } catch (err) {
      console.error("Failed to start session:", err);
    }
  }

  async function handleEndSession() {
    if (sessionId) {
      try {
        await fetch("/api/productivity/focus-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "end",
            sessionId,
            completedItemIds: sessionItemIds, // TODO: Track which items were actually completed
          }),
        });
      } catch (err) {
        console.error("Failed to end session:", err);
      }
    }

    setActiveMode(null);
    setTimerActive(false);
    setTimerSeconds(activeMode === "single_task" ? 25 * 60 : 60 * 60);
    setSessionItemIds([]);
    setSessionId(null);
  }

  if (activeMode) {
    return (
      <AppCard
        title={activeMode === "single_task" ? "Single Focus" : "Power Hour"}
        description={
          activeMode === "single_task"
            ? "One task, full attention"
            : "Multiple micro-tasks in a focused block"
        }
        actions={
          <Button size="sm" variant="ghost" onClick={handleEndSession}>
            End Session
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="text-center py-6">
            <div className="text-5xl font-mono font-bold text-white mb-2">
              {formatTime(timerSeconds)}
            </div>
            <div className="text-sm text-zinc-400">
              {activeMode === "single_task" ? "Focus Session" : "Power Hour"}
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <Button
              onClick={() => setTimerActive(!timerActive)}
              className={cn(
                "px-6 py-3 rounded-xl font-medium",
                timerActive
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-green-500 hover:bg-green-600"
              )}
            >
              {timerActive ? (
                <>
                  <Pause className="w-5 h-5 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Start
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setTimerSeconds(activeMode === "single_task" ? 25 * 60 : 60 * 60);
                setTimerActive(false);
              }}
              className="px-6 py-3 rounded-xl"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              Reset
            </Button>
          </div>

          {activeMode === "single_task" && selectedItem && (
            <div className="mt-4 p-4 bg-violet-500/10 border border-violet-500/30 rounded-lg">
              <h3 className="text-sm font-semibold text-white mb-1">
                {selectedItem.title}
              </h3>
              {selectedItem.description && (
                <p className="text-xs text-zinc-400">{selectedItem.description}</p>
              )}
            </div>
          )}

          {activeMode === "power_hour" && (
            <div className="mt-4 space-y-2">
              <p className="text-xs text-zinc-400 text-center">
                Power Hour checklist will appear here
              </p>
            </div>
          )}
        </div>
      </AppCard>
    );
  }

  return (
    <AppCard
      title="Focus Modes"
      description="Choose your execution style"
    >
      <div className="space-y-3">
        <button
          onClick={handleStartSingleFocus}
          disabled={!selectedItem}
          className={cn(
            "w-full p-4 rounded-lg border text-left transition-all",
            "bg-zinc-900/50 border-zinc-800 hover:border-violet-500/50",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            selectedItem && "hover:bg-violet-500/10"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/20 rounded-lg">
              <Zap className="w-5 h-5 text-violet-400" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-white mb-1">Single Focus</div>
              <div className="text-xs text-zinc-400">
                {selectedItem
                  ? `Focus on: ${selectedItem.title}`
                  : "Select an item from the queue first"}
              </div>
            </div>
            <Timer className="w-4 h-4 text-zinc-500" />
          </div>
        </button>

        <button
          onClick={handleStartPowerHour}
          className={cn(
            "w-full p-4 rounded-lg border text-left transition-all",
            "bg-zinc-900/50 border-zinc-800 hover:border-orange-500/50",
            "hover:bg-orange-500/10"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <ListChecks className="w-5 h-5 text-orange-400" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-white mb-1">Power Hour</div>
              <div className="text-xs text-zinc-400">
                6-12 micro-tasks in a focused 60-minute block
              </div>
            </div>
            <Timer className="w-4 h-4 text-zinc-500" />
          </div>
        </button>
      </div>
    </AppCard>
  );
}

