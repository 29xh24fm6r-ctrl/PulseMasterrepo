// Strategy Page - Deep Dive Layout
// app/(authenticated)/strategy/page.tsx

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Page } from "@/app/components/layout/Page";
import { PageSection } from "@/app/components/layout/PageSection";
import { AnimatedPanel } from "@/components/ui/AnimatedPanel";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Compass, RefreshCw, TrendingUp, AlertTriangle, Target } from "lucide-react";
import { toast } from "sonner";
import { CoachLauncher } from "@/app/components/coaching/CoachLauncher";
import Link from "next/link";

interface Strategy {
  id: string;
  horizonDays: number;
  chosenPathKey: string;
  summary: string;
  createdAt: string;
}

export default function StrategyPage() {
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);

  useEffect(() => {
    loadStrategy();
  }, []);

  async function loadStrategy() {
    setLoading(true);
    try {
      const res = await fetch("/api/strategy/current");
      if (res.ok) {
        const data = await res.json();
        setStrategy(data.strategy);
      }
    } catch (err) {
      console.error("Failed to load strategy:", err);
      toast.error("Failed to load strategy");
    } finally {
      setLoading(false);
    }
  }

  async function rebuildStrategy() {
    setRebuilding(true);
    try {
      const res = await fetch("/api/strategy/rebuild", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setStrategy(data.strategy);
        toast.success("Strategy rebuilt!");
      } else {
        toast.error("Failed to rebuild strategy");
      }
    } catch (err) {
      toast.error("Failed to rebuild strategy");
    } finally {
      setRebuilding(false);
    }
  }

  if (loading) {
    return (
      <Page title="Your Master Plan" description="Your current strategy">
        <LoadingState message="Loading strategy…" />
      </Page>
    );
  }

  if (!strategy) {
    return (
      <Page title="Your Master Plan" description="Your current strategy">
        <EmptyState
          title="No strategy yet"
          description="Generate your first 90-day strategy to get started."
        >
          <Button onClick={rebuildStrategy} disabled={rebuilding}>
            <Compass className="w-4 h-4 mr-2" />
            Generate Strategy
          </Button>
        </EmptyState>
      </Page>
    );
  }

  return (
    <Page
      title="Your Master Plan"
      description={`Your current ${strategy.horizonDays}-day strategy`}
    >
      {/* Section 1: Your Current Plan */}
      <PageSection
        title="Your Current Plan"
        description="The strategy path you're following"
      >
        <div className="flex items-center gap-2 mb-3">
          <Compass className="h-5 w-5 text-zinc-500" />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <AppCard
            title={strategy.chosenPathKey || "Strategy"}
            description={strategy.summary}
            actions={
              <div className="flex items-center gap-2">
                <CoachLauncher
                  coachKey="strategy"
                  origin="strategy.page"
                  variant="button"
                  size="sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={rebuildStrategy}
                  disabled={rebuilding}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${rebuilding ? "animate-spin" : ""}`} />
                  Rebuild
                </Button>
              </div>
            }
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-violet-400" />
                <span className="text-sm text-zinc-400">
                  {strategy.horizonDays}-day horizon
                </span>
              </div>
              <p className="text-sm text-zinc-300">{strategy.summary}</p>
            </div>
          </AppCard>

          <AppCard
            title="Strategy Health"
            description="How your strategy is performing"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Alignment</span>
                <span className="text-lg font-semibold text-green-400">85%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Progress</span>
                <span className="text-lg font-semibold text-violet-400">72%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-400">Days Remaining</span>
                <span className="text-lg font-semibold text-white">
                  {Math.max(0, strategy.horizonDays - Math.floor((Date.now() - new Date(strategy.createdAt).getTime()) / (1000 * 60 * 60 * 24)))}
                </span>
              </div>
            </div>
          </AppCard>
        </div>
      </PageSection>

      {/* Section 2: Pillars & Actions */}
      <PageSection
        title="Pillars & Actions"
        description="The core actions that support your strategy"
      >
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-5 w-5 text-zinc-500" />
        </div>
        <AppCard
          title="Strategy Pillars"
          description="Key focus areas for this period"
        >
          <div className="text-sm text-zinc-400">
            Pillar details will appear here once strategy is fully loaded.
          </div>
        </AppCard>
      </PageSection>

      {/* Section 3: Alternatives & History */}
      <PageSection
        title="Alternatives & History"
        description="Other paths considered and past strategies"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <AppCard
            title="Alternative Paths"
            description="Other strategy options you could take"
          >
            <Button variant="outline" className="w-full" asChild>
              <Link href="/simulation/paths">
                <TrendingUp className="w-4 h-4 mr-2" />
                Run Simulations
              </Link>
            </Button>
          </AppCard>

          <AppCard
            title="Strategy History"
            description="Past strategies and their outcomes"
          >
            <div className="text-sm text-zinc-400">
              Strategy history coming soon
            </div>
          </AppCard>
        </div>
      </PageSection>
    </Page>
  );
}

