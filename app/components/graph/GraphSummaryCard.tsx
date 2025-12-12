// Graph Summary Card
// app/components/graph/GraphSummaryCard.tsx

"use client";

import { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Network } from "lucide-react";

interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  topNodeTypes: Array<{
    type: string;
    count: number;
  }>;
}

export function GraphSummaryCard() {
  const [stats, setStats] = useState<GraphStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const res = await fetch("/api/graph/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        setError("Failed to load graph stats");
      }
    } catch (err) {
      setError("Failed to load graph stats");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppCard
      title="Graph Overview"
      description="Your life mapped as connections"
    >
      {loading ? (
        <LoadingState message="Loading graph stats…" />
      ) : error ? (
        <ErrorState message={error} onRetry={loadStats} />
      ) : !stats || stats.nodeCount === 0 ? (
        <div className="text-center py-6">
          <Network className="w-12 h-12 text-zinc-500 mx-auto mb-3" />
          <p className="text-sm text-zinc-400">
            Your graph is still growing as Pulse learns about your life.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-zinc-400 mb-1">Total Nodes</div>
              <div className="text-2xl font-bold text-white">{stats.nodeCount}</div>
            </div>
            <div>
              <div className="text-sm text-zinc-400 mb-1">Connections</div>
              <div className="text-2xl font-bold text-white">{stats.edgeCount}</div>
            </div>
          </div>
          {stats.topNodeTypes.length > 0 && (
            <div>
              <div className="text-sm text-zinc-400 mb-2">Top Node Types</div>
              <div className="flex flex-wrap gap-2">
                {stats.topNodeTypes.slice(0, 3).map((type) => (
                  <span
                    key={type.type}
                    className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded text-xs"
                  >
                    {type.type} ({type.count})
                  </span>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-zinc-500 pt-2 border-t border-zinc-800">
            Pulse maps your life as a graph — connecting goals, people, habits, arcs, emotions, and patterns.
          </p>
        </div>
      )}
    </AppCard>
  );
}




