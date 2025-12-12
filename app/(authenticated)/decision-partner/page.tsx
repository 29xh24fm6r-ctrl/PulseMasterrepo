// Autonomous Decision Partner UI
// app/(authenticated)/decision-partner/page.tsx

"use client";

import { useState } from "react";
import { DecisionScenario, DecisionAnalysisResult } from "@/lib/cortex/sovereign/decision-partner/types";
import { AppCard } from "@/components/ui/AppCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DecisionPartnerPage() {
  const [scenario, setScenario] = useState<DecisionScenario>({
    id: "",
    userId: "",
    createdAt: new Date().toISOString(),
    title: "",
    description: "",
    options: [{ id: "opt1", label: "" }, { id: "opt2", label: "" }],
    status: "draft",
  });
  const [analysis, setAnalysis] = useState<DecisionAnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  function addOption() {
    setScenario({
      ...scenario,
      options: [...scenario.options, { id: `opt${scenario.options.length + 1}`, label: "" }],
    });
  }

  function updateOption(id: string, label: string) {
    setScenario({
      ...scenario,
      options: scenario.options.map((opt) => (opt.id === id ? { ...opt, label } : opt)),
    });
  }

  function removeOption(id: string) {
    setScenario({
      ...scenario,
      options: scenario.options.filter((opt) => opt.id !== id),
    });
  }

  async function runAnalysis() {
    if (!scenario.title || scenario.options.length < 2) {
      alert("Please provide a title and at least 2 options");
      return;
    }

    setAnalyzing(true);
    try {
      const res = await fetch("/api/decision-partner/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...scenario,
          id: `decision_${Date.now()}`,
        }),
      });

      if (res.ok) {
        const analysisData = await res.json();
        setAnalysis(analysisData);
      }
    } catch (err) {
      console.error("Failed to analyze:", err);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <main className="flex flex-col gap-4 p-4 lg:p-6 max-w-6xl mx-auto">
      <header className="mb-2">
        <h1 className="text-3xl font-bold text-white mb-1">Decision Partner</h1>
        <p className="text-sm text-zinc-400">
          Structured analysis for high-stakes decisions
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Input Form */}
        <AppCard title="Define Decision" description="Describe your decision and options">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-white mb-1 block">Title</label>
              <Input
                value={scenario.title}
                onChange={(e) => setScenario({ ...scenario, title: e.target.value })}
                placeholder="What decision are you facing?"
                className="bg-zinc-900 border-zinc-800"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-white mb-1 block">Description</label>
              <Textarea
                value={scenario.description}
                onChange={(e) => setScenario({ ...scenario, description: e.target.value })}
                placeholder="Provide context about this decision..."
                className="bg-zinc-900 border-zinc-800 min-h-[100px]"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-white mb-2 block">Options</label>
              <div className="space-y-2">
                {scenario.options.map((option, i) => (
                  <div key={option.id} className="flex gap-2">
                    <Input
                      value={option.label}
                      onChange={(e) => updateOption(option.id, e.target.value)}
                      placeholder={`Option ${i + 1}`}
                      className="bg-zinc-900 border-zinc-800"
                    />
                    {scenario.options.length > 2 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeOption(option.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addOption}
                className="mt-2"
              >
                Add Option
              </Button>
            </div>

            <Button
              onClick={runAnalysis}
              disabled={analyzing || !scenario.title || scenario.options.length < 2}
              className="w-full"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Run Analysis"
              )}
            </Button>
          </div>
        </AppCard>

        {/* Analysis Results */}
        {analysis && (
          <AppCard title="Analysis Results" description={analysis.summary}>
            <div className="space-y-4">
              {/* Recommendation */}
              {analysis.recommendation && (
                <div className="p-4 bg-violet-500/10 border border-violet-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-violet-400" />
                    <span className="text-sm font-semibold text-white">Recommendation</span>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(analysis.recommendation.confidence * 100)}% confidence
                    </Badge>
                  </div>
                  <div className="text-sm text-zinc-300 mb-2">
                    {analysis.recommendation.reasoning}
                  </div>
                </div>
              )}

              {/* Options Analysis */}
              <div className="space-y-3">
                {analysis.options.map((option) => (
                  <div
                    key={option.optionId}
                    className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-white">{option.label}</span>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-zinc-500" />
                        <span className="text-xs text-zinc-400">
                          {Math.round(option.overallScore * 100)}%
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-zinc-400">Benefits: </span>
                        <span className="text-green-400">
                          {option.projectedBenefits.slice(0, 2).join(", ")}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-400">Costs: </span>
                        <span className="text-red-400">
                          {option.projectedCosts.slice(0, 2).join(", ")}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-400">Identity Alignment: </span>
                        <span className="text-white">
                          {Math.round(option.identityAlignment.score * 100)}% -{" "}
                          {option.identityAlignment.reasoning}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-400">Risk: </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            option.riskProfile.level === "high" && "border-red-500/50 text-red-400",
                            option.riskProfile.level === "medium" &&
                              "border-yellow-500/50 text-yellow-400"
                          )}
                        >
                          {option.riskProfile.level}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Unknowns */}
              {analysis.unknowns.length > 0 && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-semibold text-white">Unknowns</span>
                  </div>
                  <ul className="text-xs text-zinc-300 space-y-1">
                    {analysis.unknowns.map((unknown, i) => (
                      <li key={i}>• {unknown}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Next Steps */}
              {analysis.suggestedNextSteps.length > 0 && (
                <div>
                  <div className="text-sm font-semibold text-white mb-2">Suggested Next Steps</div>
                  <ul className="text-xs text-zinc-300 space-y-1">
                    {analysis.suggestedNextSteps.map((step, i) => (
                      <li key={i}>• {step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </AppCard>
        )}
      </div>
    </main>
  );
}



