// Pulse Simulation Engine v2 UI
// app/(authenticated)/simulation-v2/page.tsx

"use client";

import { useState, useEffect } from "react";
import { SimulationOutput, ScenarioResult } from "@/lib/simulation/v2/types";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertTriangle, Target, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SimulationV2Page() {
  const [output, setOutput] = useState<SimulationOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [horizonDays, setHorizonDays] = useState(90);

  useEffect(() => {
    runSimulation();
  }, [horizonDays]);

  async function runSimulation() {
    setLoading(true);
    try {
      const res = await fetch("/api/simulation/v2/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          horizonDays,
          scenarios: [], // Use defaults
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setOutput(data);
      }
    } catch (err) {
      console.error("Failed to run simulation:", err);
    } finally {
      setLoading(false);
    }
  }

  function getTrajectoryColor(trajectory: string) {
    switch (trajectory) {
      case "improving":
        return "text-green-400";
      case "declining":
        return "text-red-400";
      case "volatile":
        return "text-yellow-400";
      default:
        return "text-zinc-400";
    }
  }

  function getTrajectoryIcon(trajectory: string) {
    switch (trajectory) {
      case "improving":
        return <TrendingUp className="w-4 h-4" />;
      case "declining":
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  }

  return (
    <main className="flex flex-col gap-4 p-4 lg:p-6 max-w-7xl mx-auto">
      <header className="flex items-center justify-between gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Pulse Simulation Engine</h1>
          <p className="text-sm text-zinc-400">
            Predict your future: productivity, relationships, finance, and life trajectories
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={horizonDays}
            onChange={(e) => setHorizonDays(parseInt(e.target.value))}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white"
          >
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
            <option value={180}>180 days</option>
          </select>
          <Button onClick={runSimulation} disabled={loading}>
            {loading ? "Running..." : "Run Simulation"}
          </Button>
        </div>
      </header>

      {loading && !output ? (
        <LoadingState message="Running simulation..." />
      ) : output ? (
        <div className="grid gap-4">
          {output.scenarios.map((scenario) => (
            <ScenarioCard key={scenario.id} scenario={scenario} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-sm text-zinc-400">
          Click "Run Simulation" to generate predictions
        </div>
      )}
    </main>
  );
}

function ScenarioCard({ scenario }: { scenario: ScenarioResult }) {
  function getTrajectoryColor(trajectory: string) {
    switch (trajectory) {
      case "improving":
        return "text-green-400";
      case "declining":
        return "text-red-400";
      case "volatile":
        return "text-yellow-400";
      default:
        return "text-zinc-400";
    }
  }

  function getTrajectoryIcon(trajectory: string) {
    switch (trajectory) {
      case "improving":
        return <TrendingUp className="w-4 h-4" />;
      case "declining":
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  }

  return (
    <AppCard title={scenario.title} description={scenario.summary}>
      <div className="space-y-4">
        {/* Predicted Arcs */}
        {scenario.predictedArcs.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Predicted Arcs
            </h3>
            <div className="grid gap-2">
              {scenario.predictedArcs.map((arc) => (
                <div
                  key={arc.domain + arc.type}
                  className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white">
                      {arc.domain} - {arc.type}
                    </span>
                    <div className={cn("flex items-center gap-1", getTrajectoryColor(arc.trajectory))}>
                      {getTrajectoryIcon(arc.trajectory)}
                      <span className="text-xs capitalize">{arc.trajectory}</span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400">{arc.description}</p>
                  <div className="mt-1 text-xs text-zinc-500">
                    Confidence: {Math.round(arc.confidence * 100)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risk Windows */}
        {scenario.riskWindows.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              Risk Windows
            </h3>
            <div className="grid gap-2">
              {scenario.riskWindows.map((risk) => (
                <div
                  key={risk.id}
                  className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white">{risk.domain}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        risk.severity === "high" && "border-red-500/50 text-red-400",
                        risk.severity === "medium" && "border-yellow-500/50 text-yellow-400"
                      )}
                    >
                      {risk.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-300 mb-2">{risk.description}</p>
                  <div className="text-xs text-zinc-400">
                    <div className="font-medium mb-1">Mitigation:</div>
                    <ul className="list-disc list-inside space-y-0.5">
                      {risk.mitigation.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Opportunity Windows */}
        {scenario.opportunityWindows.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-green-400" />
              Opportunity Windows
            </h3>
            <div className="grid gap-2">
              {scenario.opportunityWindows.map((opp) => (
                <div
                  key={opp.id}
                  className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white">{opp.domain}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        opp.priority === "high" && "border-green-500/50 text-green-400"
                      )}
                    >
                      {opp.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-300 mb-2">{opp.description}</p>
                  <div className="text-xs text-zinc-400">
                    <div className="font-medium mb-1">Actions:</div>
                    <ul className="list-disc list-inside space-y-0.5">
                      {opp.suggestedActions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Actions */}
        {scenario.recommendedActions.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-2">Recommended Actions</h3>
            <div className="grid gap-2">
              {scenario.recommendedActions.map((action) => (
                <div
                  key={action.id}
                  className="p-3 bg-violet-500/10 border border-violet-500/30 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white">{action.title}</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        action.severity === "urgent" && "border-red-500/50 text-red-400",
                        action.severity === "warning" && "border-yellow-500/50 text-yellow-400"
                      )}
                    >
                      {action.severity}
                    </Badge>
                  </div>
                  {action.description && (
                    <p className="text-xs text-zinc-400">{action.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppCard>
  );
}



