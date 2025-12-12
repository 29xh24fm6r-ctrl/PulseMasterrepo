// Graph Insights Card
// app/components/graph/GraphInsightsCard.tsx

"use client";

import { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Lightbulb } from "lucide-react";

interface GraphInsight {
  type: string;
  title: string;
  body: string;
}

export function GraphInsightsCard() {
  const [insights, setInsights] = useState<GraphInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInsights();
  }, []);

  async function loadInsights() {
    try {
      const res = await fetch("/api/graph/insights");
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights || []);
      } else {
        setError("Failed to load insights");
      }
    } catch (err) {
      setError("Failed to load insights");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppCard
      title="Graph Insights"
      description="Patterns discovered in your graph"
    >
      {loading ? (
        <LoadingState message="Loading insights…" />
      ) : error ? (
        <ErrorState message={error} onRetry={loadInsights} />
      ) : insights.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="No insights yet"
          description="Insights will appear as Pulse discovers patterns in your graph."
        />
      ) : (
        <div className="space-y-3">
          {insights.slice(0, 5).map((insight, idx) => (
            <div
              key={idx}
              className="p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg"
            >
              <div className="text-sm font-medium text-white mb-1">
                {insight.title}
              </div>
              <p className="text-xs text-zinc-400">{insight.body}</p>
            </div>
          ))}
        </div>
      )}
    </AppCard>
  );
}




