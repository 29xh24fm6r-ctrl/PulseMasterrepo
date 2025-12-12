// Neighborhood Graph
// app/components/graph/NeighborhoodGraph.tsx

"use client";

import { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/badge";
import { ArrowDown } from "lucide-react";

interface GraphNeighbor {
  id: string;
  type: string;
  label: string;
  relation: string;
}

interface GraphNeighborhood {
  center: {
    id: string;
    type: string;
    label: string;
  };
  neighbors: GraphNeighbor[];
}

interface NeighborhoodGraphProps {
  nodeId?: string;
  onNeighborSelect?: (nodeId: string) => void;
}

const NODE_TYPE_COLORS: Record<string, string> = {
  life_arc: "bg-blue-50 text-blue-700 border-blue-300",
  contact: "bg-green-50 text-green-700 border-green-300",
  deal: "bg-purple-50 text-purple-700 border-purple-300",
  goal: "bg-yellow-50 text-yellow-700 border-yellow-300",
  emotion: "bg-red-50 text-red-700 border-red-300",
  finance: "bg-teal-50 text-teal-700 border-teal-300",
  alert: "bg-rose-50 text-rose-700 border-rose-300",
};

function formatNodeType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function getNodeTypeColor(type: string): string {
  return NODE_TYPE_COLORS[type] || "bg-zinc-50 text-zinc-700 border-zinc-300";
}

function formatRelation(relation: string): string {
  return relation.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

export function NeighborhoodGraph({ nodeId, onNeighborSelect }: NeighborhoodGraphProps) {
  const [neighborhood, setNeighborhood] = useState<GraphNeighborhood | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (nodeId) {
      loadNeighborhood();
    } else {
      setNeighborhood(null);
    }
  }, [nodeId]);

  async function loadNeighborhood() {
    if (!nodeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/graph/neighborhood/${nodeId}`);
      if (res.ok) {
        const data = await res.json();
        setNeighborhood(data.neighborhood);
      } else {
        setError("Failed to load neighborhood");
      }
    } catch (err) {
      setError("Failed to load neighborhood");
    } finally {
      setLoading(false);
    }
  }

  if (!nodeId) {
    return (
      <AppCard
        title="Connections"
        description="Neighbors in the graph"
      >
        <EmptyState
          title="No node selected"
          description="Select a node to see its connections."
        />
      </AppCard>
    );
  }

  return (
    <AppCard
      title="Connections"
      description="Neighbors in the graph"
    >
      {loading ? (
        <LoadingState message="Loading connections…" />
      ) : error ? (
        <ErrorState message={error} onRetry={loadNeighborhood} />
      ) : !neighborhood || neighborhood.neighbors.length === 0 ? (
        <EmptyState
          title="No connections"
          description="This node has no connections in the graph yet."
        />
      ) : (
        <div className="space-y-4">
          {/* Center node */}
          <div className="text-center pb-4 border-b border-zinc-800">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600/20 border border-violet-600/30 rounded-lg">
              <Badge variant="outline" className={getNodeTypeColor(neighborhood.center.type)}>
                {formatNodeType(neighborhood.center.type)}
              </Badge>
              <span className="font-medium text-white">{neighborhood.center.label}</span>
            </div>
          </div>

          {/* Neighbors */}
          <div className="space-y-3">
            {neighborhood.neighbors.slice(0, 10).map((neighbor) => (
              <div key={neighbor.id} className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <ArrowDown className="w-3 h-3" />
                  <span className="italic">{formatRelation(neighbor.relation)}</span>
                </div>
                <button
                  onClick={() => onNeighborSelect?.(neighbor.id)}
                  className="w-full text-left p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg hover:border-zinc-600 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getNodeTypeColor(neighbor.type)}>
                      {formatNodeType(neighbor.type)}
                    </Badge>
                    <span className="text-sm font-medium text-white">{neighbor.label}</span>
                  </div>
                </button>
              </div>
            ))}
            {neighborhood.neighbors.length > 10 && (
              <div className="text-xs text-zinc-500 text-center pt-2">
                +{neighborhood.neighbors.length - 10} more connections
              </div>
            )}
          </div>
        </div>
      )}
    </AppCard>
  );
}




