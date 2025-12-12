// Node Detail Panel
// app/components/graph/NodeDetailPanel.tsx

"use client";

import { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, MessageSquare } from "lucide-react";
import Link from "next/link";

interface GraphNodeDetails {
  id: string;
  type: string;
  label: string;
  subtype?: string;
  description?: string;
  properties: Record<string, any>;
  tags?: string[];
}

interface NodeDetailPanelProps {
  nodeId?: string;
}

const NODE_TYPE_COLORS: Record<string, string> = {
  life_arc: "bg-blue-50 text-blue-700 border-blue-300",
  contact: "bg-green-50 text-green-700 border-green-300",
  deal: "bg-purple-50 text-purple-700 border-purple-300",
  goal: "bg-yellow-50 text-yellow-700 border-yellow-300",
  emotion: "bg-red-50 text-red-700 border-red-300",
  finance: "bg-teal-50 text-teal-700 border-teal-300",
  alert: "bg-rose-50 text-rose-700 border-rose-300",
  finance_goal: "bg-yellow-50 text-yellow-700 border-yellow-300",
  finance_snapshot: "bg-teal-50 text-teal-700 border-teal-300",
  finance_alert: "bg-rose-50 text-rose-700 border-rose-300",
};

function formatNodeType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function getNodeTypeColor(type: string): string {
  return NODE_TYPE_COLORS[type] || "bg-zinc-50 text-zinc-700 border-zinc-300";
}

function getRelatedLink(node: GraphNodeDetails): { href: string; label: string } | null {
  if (node.type === "life_arc") {
    return { href: "/life", label: "View Life Arcs" };
  }
  if (node.type === "contact") {
    return { href: "/relationships", label: "View Contact" };
  }
  if (node.type === "deal") {
    return { href: "/relationships", label: "View Deal" };
  }
  if (node.type === "goal" || node.type === "finance_goal") {
    return { href: "/finance", label: "View Goals" };
  }
  if (node.type === "emotion") {
    return { href: "/life", label: "View Emotions" };
  }
  if (node.type.includes("finance")) {
    return { href: "/finance", label: "View Finance" };
  }
  return null;
}

export function NodeDetailPanel({ nodeId }: NodeDetailPanelProps) {
  const [node, setNode] = useState<GraphNodeDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (nodeId) {
      loadNodeDetails();
    } else {
      setNode(null);
    }
  }, [nodeId]);

  async function loadNodeDetails() {
    if (!nodeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/graph/node/${nodeId}`);
      if (res.ok) {
        const data = await res.json();
        setNode(data.node);
      } else {
        setError("Failed to load node details");
      }
    } catch (err) {
      setError("Failed to load node details");
    } finally {
      setLoading(false);
    }
  }

  if (!nodeId) {
    return (
      <AppCard
        title="Node Details"
        description="Select a node to see details"
      >
        <EmptyState
          title="No node selected"
          description="Click on a node in the explorer to see its details and connections."
        />
      </AppCard>
    );
  }

  return (
    <AppCard
      title="Node Details"
      description="Information about this node"
    >
      {loading ? (
        <LoadingState message="Loading node details…" />
      ) : error ? (
        <ErrorState message={error} onRetry={loadNodeDetails} />
      ) : !node ? (
        <EmptyState title="Node not found" />
      ) : (
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-white">{node.label}</h3>
              <Badge variant="outline" className={getNodeTypeColor(node.type)}>
                {formatNodeType(node.type)}
              </Badge>
            </div>
            {node.description && (
              <p className="text-sm text-zinc-400">{node.description}</p>
            )}
          </div>

          {node.tags && node.tags.length > 0 && (
            <div>
              <div className="text-sm text-zinc-400 mb-2">Tags</div>
              <div className="flex flex-wrap gap-2">
                {node.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="bg-zinc-800 text-zinc-300">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {Object.keys(node.properties).length > 0 && (
            <div>
              <div className="text-sm text-zinc-400 mb-2">Properties</div>
              <div className="space-y-2">
                {Object.entries(node.properties)
                  .filter(([key]) => !["label", "description", "subtype", "tags"].includes(key))
                  .slice(0, 8)
                  .map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-zinc-400 capitalize">{key.replace(/_/g, " ")}:</span>
                      <span className="text-zinc-300 text-right">
                        {typeof value === "object" ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-zinc-800 flex gap-2">
            {getRelatedLink(node) && (
              <Button size="sm" variant="outline" asChild>
                <Link href={getRelatedLink(node)!.href}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {getRelatedLink(node)!.label}
                </Link>
              </Button>
            )}
            <Button size="sm" variant="outline">
              <MessageSquare className="w-4 h-4 mr-2" />
              Ask Pulse about this
            </Button>
          </div>
        </div>
      )}
    </AppCard>
  );
}




