// Insights Panel
// app/components/life-dashboard/InsightsPanel.tsx

"use client";

import { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Lightbulb, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Insight {
  id: string;
  type: string;
  title: string;
  body: string;
  is_positive?: boolean;
  created_at: string;
}

export function InsightsPanel() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInsights();
  }, []);

  async function loadInsights() {
    try {
      // Load from multiple sources
      const [financeRes, graphRes] = await Promise.all([
        fetch("/api/finance/alerts?limit=2"),
        fetch("/api/graph/insights?limit=2"),
      ]);

      const allInsights: Insight[] = [];

      if (financeRes.ok) {
        const financeData = await financeRes.json();
        if (financeData.alerts) {
          allInsights.push(...financeData.alerts.map((a: any) => ({
            ...a,
            type: "finance",
          })));
        }
      }

      if (graphRes.ok) {
        const graphData = await graphRes.json();
        if (graphData.insights) {
          allInsights.push(...graphData.insights);
        }
      }

      setInsights(allInsights.slice(0, 5));
    } catch (err) {
      console.error("Failed to load insights:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppCard
      title="Insights"
      description="Recent patterns and observations."
    >
      {loading ? (
        <LoadingState message="Loading insights…" />
      ) : insights.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="No insights yet"
          description="Insights will appear as Pulse learns your patterns."
        />
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50"
            >
              {insight.is_positive ? (
                <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white mb-1">
                  {insight.title}
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2">
                  {insight.body}
                </p>
                <div className="text-xs text-zinc-500 mt-1">
                  {new Date(insight.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppCard>
  );
}




