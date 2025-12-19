// Relationship Dashboard v2
// app/(authenticated)/relationships/v2/page.tsx

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { Badge } from "@/components/ui/badge";
import { getWorkCortexContextForUser } from "@/lib/cortex/context";
import { buildSocialGraph, detectOpportunities, detectRisks } from "@/lib/relationships/social-graph";
import { Users, AlertTriangle, Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface RelationshipDashboardData {
  socialGraph: {
    nodes: Array<{
      id: string;
      name: string;
      strength: number;
      drift: number;
      opportunity: number;
      risk: number;
    }>;
    edges: number;
  };
  connectionStrength: Array<{
    name: string;
    strength: number;
    category: string;
  }>;
  touchpointSuggestions: Array<{
    id: string;
    name: string;
    reason: string;
    priority: number;
  }>;
  riskAlerts: Array<{
    id: string;
    name: string;
    risk: string;
    severity: "low" | "medium" | "high";
  }>;
  peopleWhoNeedYou: Array<{
    id: string;
    name: string;
    urgency: number;
    reason: string;
  }>;
}

export default function RelationshipsDashboardV2Page() {
  const [data, setData] = useState<RelationshipDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRelationshipData();
  }, []);

  async function loadRelationshipData() {
    setLoading(true);
    try {
      const ctx = await getWorkCortexContextForUser("user_123"); // Would get from auth
      const graph = await buildSocialGraph("user_123", ctx);
      const opportunities = detectOpportunities(graph);
      const risks = detectRisks(graph);

      // Build connection strength heat map data
      const connectionStrength = graph.nodes
        .sort((a, b) => b.strength - a.strength)
        .slice(0, 10)
        .map((node) => ({
          name: node.name,
          strength: node.strength,
          category: node.category,
        }));

      // Build touchpoint suggestions
      const touchpointSuggestions = opportunities
        .filter((opp) => opp.priority === "high" || opp.priority === "medium")
        .slice(0, 5)
        .map((opp) => ({
          id: opp.nodeId,
          name: opp.nodeName,
          reason: opp.description,
          priority: opp.priority === "high" ? 90 : 70,
        }));

      // Build risk alerts
      const riskAlerts = risks
        .filter((risk) => risk.severity === "high" || risk.severity === "medium")
        .slice(0, 5)
        .map((risk) => ({
          id: risk.nodeId,
          name: risk.nodeName,
          risk: risk.description,
          severity: risk.severity,
        }));

      // Build "people who need you"
      const peopleWhoNeedYou = graph.nodes
        .filter((node) => node.risk > 70 && node.strength > 60)
        .slice(0, 5)
        .map((node) => ({
          id: node.id,
          name: node.name,
          urgency: node.risk,
          reason: `High risk (${Math.round(node.risk)}%) with strong relationship (${Math.round(node.strength)}%)`,
        }));

      setData({
        socialGraph: {
          nodes: graph.nodes,
          edges: graph.edges.length,
        },
        connectionStrength,
        touchpointSuggestions,
        riskAlerts,
        peopleWhoNeedYou,
      });
    } catch (err) {
      console.error("Failed to load relationship data:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingState message="Loading relationship intelligence..." />;
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-sm text-zinc-400">
        Failed to load relationship data
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Social Graph Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <AppCard
          title="Social Graph"
          description={`${data.socialGraph.nodes.length} relationships, ${data.socialGraph.edges} connections`}
        >
          <div className="p-4 bg-surface3 rounded-lg border border-border-default">
            <div className="text-sm text-text-primary">
              Your relationship network mapped and analyzed
            </div>
            <div className="mt-2 text-xs text-text-secondary">
              {data.socialGraph.nodes.length} nodes, {data.socialGraph.edges} edges detected
            </div>
          </div>
        </AppCard>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Connection Strength Heat Map */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <AppCard title="Connection Strength" description="Top relationships">
            <div className="space-y-2">
              {data.connectionStrength.map((connection) => (
                <div
                  key={connection.name}
                  className="p-3 bg-surface3 rounded-lg border border-border-default"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-text-primary">
                      {connection.name}
                    </span>
                    <Badge variant="outline" className="text-xs capitalize">
                      {connection.category}
                    </Badge>
                  </div>
                  <div className="h-2 bg-surface2 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-accent-blue transition-all"
                      initial={{ width: 0 }}
                      animate={{ width: `${connection.strength}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-text-secondary">
                    {Math.round(connection.strength)}% strength
                  </div>
                </div>
              ))}
            </div>
          </AppCard>
        </motion.div>

        {/* Touchpoint Suggestions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <AppCard
            title="Touchpoint Suggestions"
            description="Opportunities to connect"
          >
            <div className="space-y-2">
              {data.touchpointSuggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="p-3 bg-green-500/10 rounded-lg border border-green-500/30"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-green-400" />
                    <span className="text-sm font-semibold text-text-primary">
                      {suggestion.name}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {suggestion.priority}
                    </Badge>
                  </div>
                  <div className="text-xs text-text-secondary">{suggestion.reason}</div>
                </div>
              ))}
            </div>
          </AppCard>
        </motion.div>

        {/* Risk Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <AppCard title="Risk Alerts" description="Relationships needing attention">
            <div className="space-y-2">
              {data.riskAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "p-3 rounded-lg border",
                    alert.severity === "high" && "bg-red-500/10 border-red-500/30",
                    alert.severity === "medium" && "bg-yellow-500/10 border-yellow-500/30"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle
                      className={cn(
                        "w-4 h-4",
                        alert.severity === "high" && "text-red-400",
                        alert.severity === "medium" && "text-yellow-400"
                      )}
                    />
                    <span className="text-sm font-semibold text-text-primary">{alert.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {alert.severity}
                    </Badge>
                  </div>
                  <div className="text-xs text-text-secondary">{alert.risk}</div>
                </div>
              ))}
            </div>
          </AppCard>
        </motion.div>

        {/* People Who Need You Today */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <AppCard
            title="People Who Need You Today"
            description="High-priority connections"
          >
            <div className="space-y-2">
              {data.peopleWhoNeedYou.map((person) => (
                <div
                  key={person.id}
                  className="p-3 bg-accent-blue/10 rounded-lg border border-accent-blue/30"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-text-primary">{person.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(person.urgency)}% urgent
                    </Badge>
                  </div>
                  <div className="text-xs text-text-secondary">{person.reason}</div>
                </div>
              ))}
            </div>
          </AppCard>
        </motion.div>
      </div>
    </div>
  );
}



