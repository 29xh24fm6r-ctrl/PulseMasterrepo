// Arcs & XP Panel
// app/components/life-dashboard/ArcsXpPanel.tsx

"use client";

import { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Target, Award, ArrowRight } from "lucide-react";
import Link from "next/link";
import { CoachLauncher } from "@/app/components/coaching/CoachLauncher";

interface LifeArc {
  id: string;
  name: string;
  key: string;
  priority: number;
}

export function ArcsXpPanel() {
  const [arcs, setArcs] = useState<LifeArc[]>([]);
  const [xp, setXp] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [arcRes, xpRes] = await Promise.all([
        fetch("/api/life-arc/plan"),
        fetch("/api/xp/current"),
      ]);

      if (arcRes.ok) {
        const arcData = await arcRes.json();
        setArcs(arcData.plan?.arcs || []);
      }

      if (xpRes.ok) {
        const xpData = await xpRes.json();
        setXp(xpData.totalXp || 0);
      }
    } catch (err) {
      console.error("Failed to load arcs/XP:", err);
    } finally {
      setLoading(false);
    }
  }

  const topArcs = arcs.slice(0, 3);

  return (
    <AppCard
      title="Arcs & XP"
      description="Your life arcs and progress."
      actions={
        <div className="flex items-center gap-2">
          <CoachLauncher
            coachKey="career"
            origin="arcs"
            variant="link"
            label="Ask Career Coach"
          />
          <Button size="sm" variant="ghost" asChild>
            <Link href="/life">Open Life Arcs</Link>
          </Button>
        </div>
      }
    >
      {loading ? (
        <LoadingState message="Loading arcs…" />
      ) : arcs.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No active arcs"
          description="Create your first life arc to start tracking progress."
        />
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            {topArcs.map((arc) => (
              <div
                key={arc.id}
                className="p-2 bg-zinc-800/50 rounded-lg border border-zinc-700/50"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-medium text-white">{arc.name}</div>
                  <span className="text-xs text-zinc-500">Priority {arc.priority}</span>
                </div>
                <div className="w-full bg-zinc-700 rounded-full h-1.5">
                  <div
                    className="bg-violet-500 h-1.5 rounded-full"
                    style={{ width: "45%" }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-zinc-400">XP This Week</span>
              </div>
              <span className="text-sm font-medium text-white">{xp}</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2">
              <div
                className="bg-yellow-500 h-2 rounded-full"
                style={{ width: `${Math.min(100, (xp / 1000) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </AppCard>
  );
}

