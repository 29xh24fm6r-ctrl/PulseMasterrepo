// Simulation Paths Page
// app/simulation/paths/page.tsx

"use client";

import { useState, useEffect } from "react";
import { TrendingUp, AlertTriangle, Target, Zap, Heart, Briefcase, Scale, RefreshCw, BarChart, Lightbulb, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { CoachLauncher } from "@/app/components/coaching/CoachLauncher";
import { getPredefinedScenarios } from "@/lib/simulation/run";

interface SimulationResult {
  id: string;
  scenarioName: string;
  output: {
    summary: string;
    risks: {
      burnout: number;
      relapse: number;
      conflict: number;
    };
    opportunities: {
      fastest_growth_area: string;
      major_unlocks: string[];
    };
    arcForecast: {
      healing: number;
      career: number;
      performance: number;
      identity: number;
    };
    metrics: Array<{
      day: number;
      energy: number;
      stress: number;
      mood: number;
      career_velocity: number;
      arc_healing: number;
      arc_career: number;
      risk_burnout: number;
    }>;
  };
  createdAt: string;
}

export default function SimulationPathsPage() {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [scenarios] = useState(getPredefinedScenarios());

  async function runScenario(scenarioName: string, input: any) {
    setLoading(true);
    try {
      const res = await fetch("/api/simulation/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioName, input }),
      });

      if (!res.ok) throw new Error("Failed to run simulation");

      const data = await res.json();
      setResult(data.result);
      toast.success("Simulation complete!");
    } catch (err: any) {
      console.error("Failed to run simulation:", err);
      toast.error(err.message || "Failed to run simulation");
    } finally {
      setLoading(false);
    }
  }

  function handleScenarioClick(scenario: typeof scenarios[0]) {
    setSelectedScenario(scenario.name);
    runScenario(scenario.name, scenario.input);
  }

  return (
    <Page
      title="Life Simulation"
      description="Preview different life paths and see potential outcomes"
    >
      {/* Section 1: Scenarios */}
      <PageSection
        title="Scenarios"
        description="Choose a scenario to simulate"
      >
        <AppCard
          title="Choose Your Path"
          description="Select a scenario to simulate"
        >
          {loading && <LoadingState message="Running simulation…" />}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {scenarios.map((scenario) => (
              <button
                key={scenario.name}
                onClick={() => handleScenarioClick(scenario)}
                disabled={loading}
                className={`bg-zinc-900/50 border rounded-xl p-4 text-left hover:border-violet-600 transition-colors ${
                  selectedScenario === scenario.name ? "border-violet-500" : "border-zinc-800"
                } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="font-medium text-white mb-1">{scenario.displayName}</div>
                <div className="text-xs text-zinc-400">
                  {scenario.input.days} days • {Object.keys(scenario.input.adjustments || {}).length} adjustments
                </div>
              </button>
            ))}
          </div>
        </AppCard>
      </PageSection>

      {/* Section 2: Results */}
      {result && (
        <PageSection
          title="Simulation Results"
          description="What this path might look like"
        >
            {/* Summary */}
            <AppCard
              title="Simulation Summary"
              description="What this path might look like"
            >
              <p className="text-zinc-300 whitespace-pre-line">{result.output.summary}</p>
            </AppCard>

            {/* Risks */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-orange-400" />
                  <span className="font-medium text-white">Burnout Risk</span>
                </div>
                <div className="text-2xl font-bold text-orange-400">
                  {result.output.risks.burnout.toFixed(0)}%
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 mt-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full"
                    style={{ width: `${result.output.risks.burnout}%` }}
                  />
                </div>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <span className="font-medium text-white">Relapse Risk</span>
                </div>
                <div className="text-2xl font-bold text-red-400">
                  {result.output.risks.relapse.toFixed(0)}%
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 mt-2">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{ width: `${result.output.risks.relapse}%` }}
                  />
                </div>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  <span className="font-medium text-white">Conflict Risk</span>
                </div>
                <div className="text-2xl font-bold text-yellow-400">
                  {result.output.risks.conflict.toFixed(0)}%
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 mt-2">
                  <div
                    className="bg-yellow-500 h-2 rounded-full"
                    style={{ width: `${result.output.risks.conflict}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Arc Forecast */}
            <AppCard
              title="Life Arc Forecast"
              description="Projected progress across life arcs"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-zinc-400">Healing</span>
                    <span className="text-sm font-medium text-white">
                      {result.output.arcForecast.healing.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${result.output.arcForecast.healing}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-zinc-400">Career</span>
                    <span className="text-sm font-medium text-white">
                      {result.output.arcForecast.career.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${result.output.arcForecast.career}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-zinc-400">Performance</span>
                    <span className="text-sm font-medium text-white">
                      {result.output.arcForecast.performance.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div
                      className="bg-violet-500 h-2 rounded-full"
                      style={{ width: `${result.output.arcForecast.performance}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-zinc-400">Identity</span>
                    <span className="text-sm font-medium text-white">
                      {result.output.arcForecast.identity.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full"
                      style={{ width: `${result.output.arcForecast.identity}%` }}
                    />
                  </div>
                </div>
              </div>
            </AppCard>

            {/* Opportunities */}
            {result.output.opportunities.major_unlocks.length > 0 && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Opportunities
                </h2>
                <div className="space-y-2">
                  <div className="text-sm text-zinc-300">
                    <span className="font-medium">Fastest Growth:</span> {result.output.opportunities.fastest_growth_area}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-zinc-300 mb-1">Major Unlocks:</div>
                    <ul className="list-disc list-inside text-sm text-zinc-400 space-y-1">
                      {result.output.opportunities.major_unlocks.map((unlock, idx) => (
                        <li key={idx}>{unlock}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Simple Chart Placeholder */}
            {result.output.metrics && result.output.metrics.length > 0 && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Trends Over Time</h2>
                <div className="text-sm text-zinc-400">
                  Energy: {result.output.metrics[0]?.energy.toFixed(0)} → {result.output.metrics[result.output.metrics.length - 1]?.energy.toFixed(0)}
                  <br />
                  Stress: {result.output.metrics[0]?.stress.toFixed(0)} → {result.output.metrics[result.output.metrics.length - 1]?.stress.toFixed(0)}
                  <br />
                  Career Velocity: {result.output.metrics[0]?.career_velocity.toFixed(0)} → {result.output.metrics[result.output.metrics.length - 1]?.career_velocity.toFixed(0)}
                </div>
                <p className="text-xs text-zinc-500 mt-4">
                  Note: This is a conceptual simulation based on your patterns, not a guarantee.
                </p>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
