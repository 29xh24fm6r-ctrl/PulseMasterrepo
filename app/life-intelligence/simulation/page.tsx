"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { 
  Sparkles, Play, Loader2, ChevronRight, 
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  GitBranch, Clock, Target
} from "lucide-react";

interface Scenario {
  id: string;
  title: string;
  category: string;
  status: string;
  created_at: string;
}

interface SimulationResult {
  baseline_outcome: string;
  positive_outcome: string;
  negative_outcome: string;
  probability_positive: number;
  key_risks: string[];
  key_benefits: string[];
  recommendation: string;
  first_step: string;
}

export default function SimulationPage() {
  const { userId } = useAuth();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [newScenario, setNewScenario] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"new" | "history">("new");

  useEffect(() => {
    fetchScenarios();
  }, []);

  async function fetchScenarios() {
    const res = await fetch("/api/simulation/scenarios");
    if (res.ok) {
      const data = await res.json();
      setScenarios(data.scenarios || []);
    }
  }

  async function runSimulation() {
    if (!newScenario.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/voice/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: newScenario }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data.simulation);
        setSelectedScenario(data.scenario_id);
        fetchScenarios();
      }
    } catch (error) {
      console.error("Simulation failed:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-violet-400" />
            Life Simulation Engine
          </h1>
          <p className="text-zinc-400 mt-2">Explore possibilities and simulate life decisions</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("new")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              tab === "new" ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            New Simulation
          </button>
          <button
            onClick={() => setTab("history")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              tab === "history" ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            History ({scenarios.length})
          </button>
        </div>

        {tab === "new" ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Panel */}
            <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <GitBranch className="w-5 h-5 text-cyan-400" />
                What If...?
              </h2>
              
              <textarea
                value={newScenario}
                onChange={(e) => setNewScenario(e.target.value)}
                placeholder="Describe a life scenario to simulate...

Examples:
- What if I quit my job to start a business?
- What if I moved to a new city?
- What if I invested 50% of my savings in stocks?
- What if I went back to school for a masters degree?"
                className="w-full h-48 bg-zinc-900/50 border border-zinc-700 rounded-xl p-4 text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-violet-500"
              />

              <button
                onClick={runSimulation}
                disabled={!newScenario.trim() || loading}
                className="w-full mt-4 py-3 bg-gradient-to-r from-violet-600 to-pink-600 rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Running Simulation...</>
                ) : (
                  <><Play className="w-5 h-5" /> Simulate Future</>
                )}
              </button>

              {/* Quick Scenarios */}
              <div className="mt-6">
                <p className="text-sm text-zinc-500 mb-3">Quick scenarios:</p>
                <div className="flex flex-wrap gap-2">
                  {["Career change", "Move abroad", "Start a family", "Major purchase", "Health goal"].map((q) => (
                    <button
                      key={q}
                      onClick={() => setNewScenario(`What if I pursued a ${q.toLowerCase()}?`)}
                      className="px-3 py-1.5 bg-zinc-700/50 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Results Panel */}
            <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-pink-400" />
                Simulation Results
              </h2>

              {!result && !loading && (
                <div className="text-center py-12 text-zinc-500">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Run a simulation to see predicted outcomes</p>
                </div>
              )}

              {loading && (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-violet-400" />
                  <p className="text-zinc-400">Analyzing possibilities...</p>
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  {/* Probability Meter */}
                  <div className="bg-zinc-900/50 rounded-xl p-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-zinc-400">Success Probability</span>
                      <span className="text-green-400 font-bold">{Math.round(result.probability_positive * 100)}%</span>
                    </div>
                    <div className="h-3 bg-zinc-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-1000"
                        style={{ width: `${result.probability_positive * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Outcomes */}
                  <div className="grid grid-cols-1 gap-3">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-green-400 mb-2">
                        <TrendingUp className="w-4 h-4" />
                        <span className="font-medium">Best Case</span>
                      </div>
                      <p className="text-sm text-zinc-300">{result.positive_outcome}</p>
                    </div>

                    <div className="bg-zinc-700/30 border border-zinc-600/30 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-zinc-400 mb-2">
                        <ChevronRight className="w-4 h-4" />
                        <span className="font-medium">Baseline</span>
                      </div>
                      <p className="text-sm text-zinc-300">{result.baseline_outcome}</p>
                    </div>

                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-red-400 mb-2">
                        <TrendingDown className="w-4 h-4" />
                        <span className="font-medium">Worst Case</span>
                      </div>
                      <p className="text-sm text-zinc-300">{result.negative_outcome}</p>
                    </div>
                  </div>

                  {/* Risks & Benefits */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-900/50 rounded-xl p-4">
                      <p className="text-sm font-medium text-red-400 mb-2 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" /> Risks
                      </p>
                      <ul className="space-y-1">
                        {result.key_risks?.map((r, i) => (
                          <li key={i} className="text-xs text-zinc-400">• {r}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-zinc-900/50 rounded-xl p-4">
                      <p className="text-sm font-medium text-green-400 mb-2 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Benefits
                      </p>
                      <ul className="space-y-1">
                        {result.key_benefits?.map((b, i) => (
                          <li key={i} className="text-xs text-zinc-400">• {b}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className="bg-gradient-to-r from-violet-500/10 to-pink-500/10 border border-violet-500/20 rounded-xl p-4">
                    <p className="text-sm font-medium text-violet-400 mb-2">💡 Recommendation</p>
                    <p className="text-sm text-zinc-300">{result.recommendation}</p>
                    <div className="mt-3 pt-3 border-t border-zinc-700/50">
                      <p className="text-xs text-zinc-500">First Step:</p>
                      <p className="text-sm text-white font-medium">{result.first_step}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* History Tab */
          <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
            <div className="space-y-3">
              {scenarios.length === 0 ? (
                <p className="text-zinc-500 text-center py-8">No simulations yet. Run your first one!</p>
              ) : (
                scenarios.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl hover:bg-zinc-800/50 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="font-medium">{s.title}</p>
                      <p className="text-sm text-zinc-500">
                        {s.category} • {new Date(s.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      s.status === "completed" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
                    }`}>
                      {s.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}