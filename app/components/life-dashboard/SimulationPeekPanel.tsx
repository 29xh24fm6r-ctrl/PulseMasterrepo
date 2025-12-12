// Simulation Peek Panel
// app/components/life-dashboard/SimulationPeekPanel.tsx

"use client";

import { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Zap, ArrowRight } from "lucide-react";
import Link from "next/link";

export function SimulationPeekPanel() {
  const [lastSimulation, setLastSimulation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLastSimulation();
  }, []);

  async function loadLastSimulation() {
    try {
      const res = await fetch("/api/simulation/history?limit=1");
      if (res.ok) {
        const data = await res.json();
        if (data.runs && data.runs.length > 0) {
          setLastSimulation(data.runs[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load simulation:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppCard
      title="Simulation"
      description="Preview different life paths."
      actions={
        <Button size="sm" variant="ghost" asChild>
          <Link href="/simulation/paths">View all</Link>
        </Button>
      }
    >
      {loading ? (
        <LoadingState message="Loading simulations…" />
      ) : !lastSimulation ? (
        <EmptyState
          icon={Zap}
          title="No simulations yet"
          description="Run your first simulation to see potential outcomes."
          action={{
            label: "Run Simulation",
            onClick: () => (window.location.href = "/simulation/paths"),
          }}
        />
      ) : (
        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium text-white mb-1">
              {lastSimulation.scenario_name}
            </div>
            <p className="text-xs text-zinc-400 line-clamp-2">
              {lastSimulation.output?.summary || "Simulation completed"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="text-xs">
              Simulate Current Path
            </Button>
            <Button size="sm" variant="outline" className="text-xs">
              Simulate Healing Focus
            </Button>
          </div>
        </div>
      )}
    </AppCard>
  );
}




