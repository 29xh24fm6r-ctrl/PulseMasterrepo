// Strategy Panel Compact
// app/components/life-dashboard/StrategyPanelCompact.tsx

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Compass, RefreshCw, ChevronRight } from "lucide-react";
import Link from "next/link";
import { CoachLauncher } from "@/app/components/coaching/CoachLauncher";

interface Strategy {
  horizonDays: number;
  selectedPath: {
    name: string;
    description: string;
  };
  pillars: Array<{
    title: string;
    category: string;
  }>;
}

export function StrategyPanelCompact() {
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStrategy();
  }, []);

  async function loadStrategy() {
    try {
      const res = await fetch("/api/strategy/current");
      if (res.ok) {
        const data = await res.json();
        setStrategy(data.strategy);
      }
    } catch (err) {
      console.error("Failed to load strategy:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppCard
      title="Master Plan"
      description={`Your current ${strategy?.horizonDays || 90}-day strategy.`}
      actions={
        <div className="flex items-center gap-2">
          <CoachLauncher
            coachKey="strategy"
            origin="strategy.life_strip"
            variant="button"
            size="sm"
          />
          <Button size="sm" variant="ghost" asChild>
            <Link href="/strategy">View full strategy</Link>
          </Button>
        </div>
      }
    >
      {loading ? (
        <LoadingState message="Loading strategy…" />
      ) : !strategy ? (
        <EmptyState
          icon={Compass}
          title="No strategy yet"
          description="Generate your first strategy to get personalized guidance."
          action={{
            label: "Generate 90-day strategy",
            onClick: async () => {
              const res = await fetch("/api/strategy/rebuild", { method: "POST" });
              if (res.ok) {
                loadStrategy();
              }
            },
          }}
        />
      ) : (
        <div className="space-y-3">
          <div>
            <div className="text-lg font-semibold text-white mb-1">
              {strategy.selectedPath.name}
            </div>
            <p className="text-sm text-zinc-400 line-clamp-2">
              {strategy.selectedPath.description}
            </p>
          </div>
          {strategy.pillars.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {strategy.pillars.slice(0, 3).map((pillar, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded text-xs"
                >
                  {pillar.title}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </AppCard>
  );
}

