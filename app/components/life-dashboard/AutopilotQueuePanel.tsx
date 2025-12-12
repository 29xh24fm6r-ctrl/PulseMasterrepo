// Autopilot Queue Panel
// app/components/life-dashboard/AutopilotQueuePanel.tsx

"use client";

import { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Zap, CheckCircle2, Clock, X } from "lucide-react";

interface AutopilotAction {
  id: string;
  title: string;
  type: string;
  priority: number;
}

export function AutopilotQueuePanel() {
  const [actions, setActions] = useState<AutopilotAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQueue();
  }, []);

  async function loadQueue() {
    try {
      const res = await fetch("/api/life-arc/autopilot/queue");
      if (res.ok) {
        const data = await res.json();
        setActions(data.actions || []);
      }
    } catch (err) {
      console.error("Failed to load autopilot queue:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppCard
      title="Autopilot Queue"
      description="Next actions Autopilot has queued for you."
    >
      {loading ? (
        <LoadingState message="Loading queue…" />
      ) : actions.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="Queue is empty"
          description="Autopilot will queue actions based on your Life Arcs."
        />
      ) : (
        <div className="space-y-2">
          {actions.slice(0, 5).map((action) => (
            <div
              key={action.id}
              className="flex items-center justify-between gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50"
            >
              <div className="flex-1">
                <div className="text-sm font-medium text-white mb-1">
                  {action.title}
                </div>
                <div className="text-xs text-zinc-500 capitalize">
                  {action.type}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                  <Clock className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppCard>
  );
}




