// AI Twin Page - Experience v6
// app/(authenticated)/twin/page.tsx

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/button";
import { TwinModel } from "@/lib/twin/engine";
import { Brain, RefreshCw, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TwinPage() {
  const [twin, setTwin] = useState<TwinModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    loadTwin();
  }, []);

  async function loadTwin() {
    setLoading(true);
    try {
      const res = await fetch("/api/twin");
      if (res.ok) {
        const data = await res.json();
        setTwin(data.twin);
      }
    } catch (err) {
      console.error("Failed to load twin:", err);
    } finally {
      setLoading(false);
    }
  }

  async function regenerateTwin() {
    setRegenerating(true);
    try {
      const res = await fetch("/api/twin/regenerate", { method: "POST" });
      if (res.ok) {
        await loadTwin();
      }
    } catch (err) {
      console.error("Failed to regenerate twin:", err);
    } finally {
      setRegenerating(false);
    }
  }

  if (loading) {
    return <LoadingState message="Loading your AI Twin..." />;
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">AI Twin</h1>
          <p className="text-sm text-text-secondary">
            Your persistent self-model that knows how you think and decide
          </p>
        </div>
        <Button onClick={regenerateTwin} disabled={regenerating}>
          <RefreshCw className={cn("w-4 h-4 mr-2", regenerating && "animate-spin")} />
          Regenerate Twin
        </Button>
      </div>

      {!twin ? (
        <AppCard title="No Twin Model Yet" description="Generate your AI Twin to get started">
          <Button onClick={regenerateTwin} disabled={regenerating} className="mt-4">
            Generate AI Twin
          </Button>
        </AppCard>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Summary */}
          <AppCard title="Summary" description="Your compressed self-model">
            <div className="p-4 bg-surface3 rounded-lg border border-border-default">
              <div className="text-sm text-text-primary">
                {typeof twin.summary === "object"
                  ? JSON.stringify(twin.summary, null, 2)
                  : twin.summary}
              </div>
            </div>
          </AppCard>

          {/* Strengths */}
          <AppCard title="Strengths" description="Core capabilities">
            <div className="space-y-2">
              {twin.strengths.map((strength, i) => (
                <div
                  key={i}
                  className="p-2 bg-green-500/10 rounded border border-green-500/30 text-sm text-text-primary"
                >
                  {typeof strength === "string" ? strength : JSON.stringify(strength)}
                </div>
              ))}
            </div>
          </AppCard>

          {/* Weaknesses */}
          <AppCard title="Weaknesses" description="Areas of vulnerability">
            <div className="space-y-2">
              {twin.weaknesses.map((weakness, i) => (
                <div
                  key={i}
                  className="p-2 bg-yellow-500/10 rounded border border-yellow-500/30 text-sm text-text-primary"
                >
                  {typeof weakness === "string" ? weakness : JSON.stringify(weakness)}
                </div>
              ))}
            </div>
          </AppCard>

          {/* Decision Patterns */}
          <AppCard title="Decision Patterns" description="How you typically make choices">
            <div className="space-y-2">
              {twin.decisionPatterns.map((pattern, i) => (
                <div
                  key={i}
                  className="p-2 bg-surface3 rounded border border-border-default text-sm text-text-primary"
                >
                  {typeof pattern === "string" ? pattern : JSON.stringify(pattern)}
                </div>
              ))}
            </div>
          </AppCard>

          {/* Risk Patterns */}
          <AppCard title="Risk Patterns" description="When you tend to fail or burn out">
            <div className="space-y-2">
              {twin.riskPatterns.map((risk, i) => (
                <div
                  key={i}
                  className="p-2 bg-red-500/10 rounded border border-red-500/30 text-sm text-text-primary"
                >
                  {typeof risk === "string" ? risk : JSON.stringify(risk)}
                </div>
              ))}
            </div>
          </AppCard>

          {/* Values */}
          <AppCard title="Values" description="What drives you">
            <div className="space-y-2">
              {twin.values.map((value, i) => (
                <div
                  key={i}
                  className="p-2 bg-accent-blue/10 rounded border border-accent-blue/30 text-sm text-text-primary"
                >
                  {typeof value === "string" ? value : JSON.stringify(value)}
                </div>
              ))}
            </div>
          </AppCard>
        </div>
      )}

      {/* Simulations */}
      <AppCard title="Simulations" description="Run future trajectory simulations">
        <div className="space-y-3">
          <Button
            variant="outline"
            onClick={() => {
              // Navigate to simulation
            }}
          >
            <Play className="w-4 h-4 mr-2" />
            Baseline: Next 90 Days
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              // Navigate to simulation
            }}
          >
            <Play className="w-4 h-4 mr-2" />
            If I Go All-In on Health
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              // Navigate to simulation
            }}
          >
            <Play className="w-4 h-4 mr-2" />
            If I Push Hard on Income
          </Button>
        </div>
      </AppCard>
    </div>
  );
}

