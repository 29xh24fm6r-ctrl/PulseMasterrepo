// Node Explorer
// app/components/graph/NodeExplorer.tsx

"use client";

import { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface GraphNode {
  id: string;
  type: string;
  label: string;
  subtype?: string;
  updatedAt?: string;
}

interface NodeExplorerProps {
  onNodeSelect: (nodeId: string) => void;
  selectedNodeId?: string;
}

const NODE_TYPE_LABELS: Record<string, string> = {
  all: "All",
  life_arc: "Life Arc",
  contact: "Contact",
  deal: "Deal",
  goal: "Goal",
  emotion: "Emotion",
  finance: "Finance",
  alert: "Alert",
  finance_goal: "Finance Goal",
  finance_snapshot: "Finance Snapshot",
  finance_alert: "Finance Alert",
};

export function NodeExplorer({ onNodeSelect, selectedNodeId }: NodeExplorerProps) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadNodes();
  }, [selectedType, searchQuery]);

  async function loadNodes() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedType !== "all") params.set("type", selectedType);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/graph/nodes?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setNodes(data.nodes || []);
      } else {
        setError("Failed to load nodes");
      }
    } catch (err) {
      setError("Failed to load nodes");
    } finally {
      setLoading(false);
    }
  }

  function formatNodeType(type: string): string {
    return NODE_TYPE_LABELS[type] || type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  }

  function formatTimeAgo(dateStr?: string): string {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  return (
    <AppCard
      title="Node Explorer"
      description="Browse your life graph"
    >
      <div className="space-y-3 mb-4">
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="all">All</option>
          <option value="life_arc">Life Arc</option>
          <option value="contact">Contact</option>
          <option value="deal">Deal</option>
          <option value="goal">Goal</option>
          <option value="emotion">Emotion</option>
          <option value="finance">Finance</option>
          <option value="alert">Alert</option>
        </select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading nodes…" />
      ) : error ? (
        <ErrorState message={error} onRetry={loadNodes} />
      ) : nodes.length === 0 ? (
        <div className="text-center py-6 text-sm text-zinc-400">
          No nodes found
        </div>
      ) : (
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {nodes.map((node) => (
            <button
              key={node.id}
              onClick={() => onNodeSelect(node.id)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedNodeId === node.id
                  ? "bg-violet-600/20 border-violet-600/30 text-white"
                  : "bg-zinc-800/50 border-zinc-700/50 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white mb-1 truncate">
                    {node.label}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">
                      {formatNodeType(node.type)}
                    </span>
                    {node.subtype && (
                      <span className="text-xs text-zinc-500">• {node.subtype}</span>
                    )}
                  </div>
                </div>
                {node.updatedAt && (
                  <span className="text-xs text-zinc-500 flex-shrink-0">
                    {formatTimeAgo(node.updatedAt)}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </AppCard>
  );
}

