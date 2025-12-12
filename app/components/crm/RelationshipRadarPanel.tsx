// Relationship Radar Panel
// app/components/crm/RelationshipRadarPanel.tsx

"use client";

import { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { CoachLauncher } from "@/app/components/coaching/CoachLauncher";

interface RelationshipRadarItem {
  contactId: string;
  fullName: string;
  importance: number;
  healthScore: number;
  momentum: string;
  lastInteractionAt?: string;
  nextSuggestedCheckinAt?: string;
  reason: string;
}

export function RelationshipRadarPanel() {
  const [radar, setRadar] = useState<RelationshipRadarItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRadar();
  }, []);

  async function loadRadar() {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/radar");
      if (res.ok) {
        const data = await res.json();
        setRadar(data.radar || []);
      }
    } catch (err) {
      console.error("Failed to load radar:", err);
    } finally {
      setLoading(false);
    }
  }

  function getMomentumIcon(momentum: string) {
    switch (momentum) {
      case "improving":
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case "declining":
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      default:
        return <Minus className="w-4 h-4 text-zinc-400" />;
    }
  }

  function getHealthColor(score: number): string {
    if (score >= 70) return "bg-green-600/20 text-green-400 border-green-600/30";
    if (score >= 40) return "bg-yellow-600/20 text-yellow-400 border-yellow-600/30";
    return "bg-red-600/20 text-red-400 border-red-600/30";
  }

  return (
    <AppCard
      title="Relationship Radar"
      description="Who matters most right now"
    >
      {loading ? (
        <LoadingState message="Loading radar…" />
      ) : radar.length === 0 ? (
        <EmptyState
          title="No radar items"
          description="As you add contacts and interactions, Pulse will identify who needs attention."
        />
      ) : (
        <div className="space-y-3">
          {radar.map((item) => (
            <div
              key={item.contactId}
              className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-white">{item.fullName}</h4>
                    <Badge variant="outline" className="bg-zinc-800 text-zinc-300 text-xs">
                      Importance: {item.importance}/5
                    </Badge>
                  </div>
                  <p className="text-sm text-zinc-400 mb-2">{item.reason}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      {getMomentumIcon(item.momentum)}
                      <span className="text-xs text-zinc-500 capitalize">{item.momentum}</span>
                    </div>
                    <Badge variant="outline" className={getHealthColor(item.healthScore)}>
                      {item.healthScore}/100
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
                <Button size="sm" variant="outline" className="flex-1">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Log Interaction
                </Button>
                <CoachLauncher
                  coachKey="sales"
                  origin="crm.radar"
                  variant="button"
                  size="sm"
                  label="Ask Coach"
                  initialUserMessage={`Help me craft a warm check-in message to ${item.fullName}. ${item.reason}`}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </AppCard>
  );
}




