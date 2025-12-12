"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Loader2 } from "lucide-react";

export default function ScenarioBuilderPage() {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [scenario, setScenario] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [coachType, setCoachType] = useState("sales");
  const [difficulty, setDifficulty] = useState("auto");

  async function generateScenario() {
    if (!prompt.trim()) {
      setError("Please describe the scenario you want to create");
      return;
    }

    setGenerating(true);
    setError(null);
    setScenario(null);

    try {
      const res = await fetch("/api/coaches/scenario/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          coachType,
          preferredDifficulty: difficulty !== "auto" ? difficulty : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setScenario(data.scenario);
    } catch (err: any) {
      setError(err.message || "Failed to generate scenario");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <nav className="flex items-center gap-2 text-xs text-zinc-500 mb-3">
            <Link href="/coaches" className="hover:text-zinc-300 transition-colors">
              Coaches Corner
            </Link>
            <span>/</span>
            <span className="text-zinc-400">Scenario Builder</span>
          </nav>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/coaches"
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">AI Scenario Builder</h1>
                <p className="text-xs text-zinc-500">
                  Describe a scenario in plain English and AI will create a complete roleplay
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Input Section */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Coach Type
                </label>
                <select
                  value={coachType}
                  onChange={(e) => setCoachType(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                >
                  <option value="sales">Sales Coach</option>
                  <option value="negotiation">Negotiation Coach</option>
                  <option value="emotional">Emotional Coach</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Difficulty (optional)
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white"
                >
                  <option value="auto">Auto (based on your level)</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Describe Your Scenario
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., 'A customer wants to buy a car but thinks the price is too high. They have a budget of $30k but the car costs $35k. They're skeptical but interested.'"
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 min-h-[120px] focus:outline-none focus:border-violet-500"
                />
                <p className="text-xs text-zinc-500 mt-2">
                  Be as detailed as possible. Include customer background, constraints, and what you want to practice.
                </p>
              </div>

              <button
                onClick={generateScenario}
                disabled={generating || !prompt.trim()}
                className="w-full px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Scenario...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Scenario
                  </>
                )}
              </button>

              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-sm text-red-400">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Generated Scenario */}
          {scenario && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{scenario.title}</h2>
                <span className={`px-3 py-1 rounded text-xs font-medium ${
                  scenario.difficulty === "beginner" ? "bg-green-500/20 text-green-400" :
                  scenario.difficulty === "intermediate" ? "bg-yellow-500/20 text-yellow-400" :
                  scenario.difficulty === "advanced" ? "bg-orange-500/20 text-orange-400" :
                  "bg-red-500/20 text-red-400"
                }`}>
                  {scenario.difficulty}
                </span>
              </div>

              {scenario.description && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-300 mb-2">Description</h3>
                  <p className="text-sm text-zinc-400">{scenario.description}</p>
                </div>
              )}

              {scenario.initialPrompt && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-300 mb-2">Setup</h3>
                  <p className="text-sm text-zinc-400">{scenario.initialPrompt}</p>
                </div>
              )}

              {scenario.customerProfile && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-300 mb-2">Customer Profile</h3>
                  <div className="text-sm text-zinc-400 space-y-1">
                    {scenario.customerProfile.name && (
                      <div>Name: {scenario.customerProfile.name}</div>
                    )}
                    {scenario.customerProfile.budget && (
                      <div>Budget: ${scenario.customerProfile.budget.toLocaleString()}</div>
                    )}
                    {scenario.customerProfile.priorities && scenario.customerProfile.priorities.length > 0 && (
                      <div>Priorities: {scenario.customerProfile.priorities.join(", ")}</div>
                    )}
                  </div>
                </div>
              )}

              {scenario.qualityScore && (
                <div className="text-xs text-zinc-500">
                  Quality Score: {scenario.qualityScore}/100
                </div>
              )}

              <div className="pt-4 border-t border-zinc-800">
                <Link
                  href={`/coaches/sales?scenarioId=${scenario.id}`}
                  className="inline-block px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Start Roleplay with This Scenario
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

