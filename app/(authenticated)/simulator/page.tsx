// Parallel Life Simulator - Experience v9
// app/(authenticated)/simulator/page.tsx

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AppCard } from "@/components/ui/AppCard";
import { Button } from "@/components/ui/button";
import { ParallelSimulationResult } from "@/lib/simulation/parallel";
import { Play, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SimulatorPage() {
  const [scenario, setScenario] = useState("");
  const [hypothesis, setHypothesis] = useState("");
  const [result, setResult] = useState<ParallelSimulationResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function runSimulation() {
    if (!scenario.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/simulation/parallel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario, hypothesis: hypothesis || undefined }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data.result);
      }
    } catch (err) {
      console.error("Failed to run simulation:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Parallel Life Simulator</h1>
        <p className="text-sm text-text-secondary">
          10,000 life trajectories per decision. True predictive modeling.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input */}
        <AppCard title="Simulation Input" description="Define scenario and hypothesis">
          <div className="space-y-4">
            <div>
              <label className="text-sm text-text-secondary mb-1 block">Scenario</label>
              <textarea
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                className="w-full p-3 bg-surface3 rounded border border-border-default text-text-primary"
                placeholder="e.g., next 90 days if I stay as-is"
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm text-text-secondary mb-1 block">
                Hypothesis (Optional)
              </label>
              <textarea
                value={hypothesis}
                onChange={(e) => setHypothesis(e.target.value)}
                className="w-full p-3 bg-surface3 rounded border border-border-default text-text-primary"
                placeholder="e.g., if I commit to 5 deep work blocks per week"
                rows={3}
              />
            </div>
            <Button onClick={runSimulation} disabled={loading || !scenario.trim()}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running Simulation...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Simulation
                </>
              )}
            </Button>
          </div>
        </AppCard>

        {/* Results */}
        {result && (
          <AppCard title="Simulation Results" description="Baseline vs hypothetical">
            <div className="space-y-4">
              {/* Baseline */}
              <div className="p-4 bg-surface3 rounded-lg border border-border-default">
                <div className="text-sm font-semibold text-text-primary mb-2">Baseline</div>
                <div className="text-xs text-text-secondary mb-2">{result.baseline.narrative}</div>
                {result.baseline.risks.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-text-secondary mb-1">Risks:</div>
                    <ul className="text-xs text-text-primary list-disc list-inside">
                      {result.baseline.risks.map((risk, i) => (
                        <li key={i}>{risk}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Hypothetical */}
              {result.hypothetical && (
                <div className="p-4 bg-accent-blue/10 rounded-lg border border-accent-blue/30">
                  <div className="text-sm font-semibold text-text-primary mb-2">Hypothetical</div>
                  <div className="text-xs text-text-secondary mb-2">
                    {result.hypothetical.narrative}
                  </div>
                </div>
              )}

              {/* Comparison */}
              {result.comparison && (
                <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                  <div className="text-sm font-semibold text-text-primary mb-2">Comparison</div>
                  <div className="text-xs text-text-secondary mb-2">{result.comparison.narrative}</div>
                  <div className="text-xs font-semibold text-text-primary mt-2">
                    Recommendation: {result.comparison.recommendation}
                  </div>
                </div>
              )}
            </div>
          </AppCard>
        )}
      </div>
    </div>
  );
}



