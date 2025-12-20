// World-Scale Mind Dashboard - Experience v8
// app/(authenticated)/world/page.tsx

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { Badge } from "@/components/ui/badge";
import type { WorldInfluence } from "@/lib/world/types";
import { Cloud, TrendingUp, AlertTriangle, Target, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WorldMindPage() {
  const [influence, setInfluence] = useState<WorldInfluence | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorldInfluence();
  }, []);

  async function loadWorldInfluence() {
    setLoading(true);
    try {
      const res = await fetch("/api/world/influence");
      if (res.ok) {
        const data = await res.json();
        setInfluence(data.influence);
      }
    } catch (err) {
      console.error("Failed to load world influence:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingState message="Computing Life Weather Report..." />;
  }

  if (!influence) {
    return (
      <div className="text-center py-8 text-sm text-zinc-400">
        Failed to load world influence
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">Life Weather Radar</h1>
        <p className="text-sm text-text-secondary">
          Global patterns and personalized micro-adjustments
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Opportunity Windows */}
        {influence.opportunityWindows.length > 0 && (
          <AppCard title="Opportunity Windows" description="Favorable periods for action">
            <div className="space-y-3">
              {influence.opportunityWindows.map((window, i) => (
                <div
                  key={i}
                  className="p-3 bg-green-500/10 rounded-lg border border-green-500/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-text-primary">{window.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(window.probability * 100)}%
                    </Badge>
                  </div>
                  <div className="text-xs text-text-secondary mb-1">{window.timeframe}</div>
                  <div className="text-xs text-text-primary">{window.description}</div>
                </div>
              ))}
            </div>
          </AppCard>
        )}

        {/* Risk Fronts */}
        {influence.burnoutRiskSpikes.length > 0 && (
          <AppCard title="Risk Fronts" description="Burnout risk spikes">
            <div className="space-y-3">
              {influence.burnoutRiskSpikes.map((risk, i) => (
                <div
                  key={i}
                  className="p-3 bg-red-500/10 rounded-lg border border-red-500/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-text-primary">{risk.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(risk.risk * 100)}%
                    </Badge>
                  </div>
                  <div className="text-xs text-text-secondary mb-1">{risk.timeframe}</div>
                  <div className="text-xs text-text-primary">{risk.description}</div>
                </div>
              ))}
            </div>
          </AppCard>
        )}

        {/* Focus Highs */}
        {influence.focusHighs.length > 0 && (
          <AppCard title="Focus Highs" description="Optimal periods for deep work">
            <div className="space-y-3">
              {influence.focusHighs.map((high, i) => (
                <div
                  key={i}
                  className="p-3 bg-accent-blue/10 rounded-lg border border-accent-blue/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-text-primary">{high.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {Math.round(high.intensity * 100)}%
                    </Badge>
                  </div>
                  <div className="text-xs text-text-secondary mb-1">{high.timeframe}</div>
                  <div className="text-xs text-text-primary">{high.description}</div>
                </div>
              ))}
            </div>
          </AppCard>
        )}

        {/* Best Energy Hours */}
        {influence.bestEnergyHours.length > 0 && (
          <AppCard title="Best Energy Hours This Week" description="Optimal times for high-performance work">
            <div className="space-y-2">
              {influence.bestEnergyHours.map((hour, i) => (
                <div
                  key={i}
                  className="p-3 bg-surface3 rounded-lg border border-border-default"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-text-primary">{hour.day}</span>
                    <span className="text-xs text-text-secondary">{hour.hours}</span>
                  </div>
                  <div className="h-2 bg-surface2 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-accent-cyan transition-all"
                      initial={{ width: 0 }}
                      animate={{ width: `${hour.energy * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-text-secondary">
                    {Math.round(hour.energy * 100)}% energy
                  </div>
                </div>
              ))}
            </div>
          </AppCard>
        )}
      </div>
    </div>
  );
}



