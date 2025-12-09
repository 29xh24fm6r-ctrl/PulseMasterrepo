"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Target, ChevronRight, TrendingUp, AlertTriangle } from "lucide-react";

interface Goal {
  id: string;
  title: string;
  category: string;
  status: string;
  progress: number;
  endDate: string;
}

interface GoalStats {
  total: number;
  completed: number;
  inProgress: number;
  atRisk: number;
  avgProgress: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  career: "💼",
  health: "💪",
  finance: "💰",
  relationships: "❤️",
  personal: "🌟",
  learning: "📚",
  creative: "🎨",
};

export function GoalsWidget() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [stats, setStats] = useState<GoalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGoals();
  }, []);

  async function loadGoals() {
    try {
      const res = await fetch("/api/goals");
      const data = await res.json();
      setGoals(data.goals?.slice(0, 3) || []);
      setStats(data.stats || null);
    } catch (err) {
      // Use mock data
      setGoals([
        { id: "1", title: "Close $500K in Q4", category: "career", status: "in_progress", progress: 73, endDate: new Date().toISOString() },
        { id: "2", title: "Run Half Marathon", category: "health", status: "in_progress", progress: 67, endDate: new Date().toISOString() },
        { id: "3", title: "Read 12 Books", category: "learning", status: "at_risk", progress: 57, endDate: new Date().toISOString() },
      ]);
      setStats({ total: 6, completed: 1, inProgress: 3, atRisk: 2, avgProgress: 65 });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-violet-400" />
          <h2 className="font-semibold">Goals</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-violet-400" />
          <h2 className="font-semibold">Goals</h2>
        </div>
        <Link
          href="/goals"
          className="text-xs text-zinc-500 hover:text-violet-400 flex items-center gap-1"
        >
          View All
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="text-center">
            <div className="text-lg font-bold text-violet-400">{stats.total}</div>
            <div className="text-[10px] text-zinc-500">Total</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-emerald-400">{stats.completed}</div>
            <div className="text-[10px] text-zinc-500">Done</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-400">{stats.inProgress}</div>
            <div className="text-[10px] text-zinc-500">Active</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-red-400">{stats.atRisk}</div>
            <div className="text-[10px] text-zinc-500">At Risk</div>
          </div>
        </div>
      )}

      {/* Goals list */}
      <div className="space-y-3">
        {goals.map((goal) => (
          <Link
            key={goal.id}
            href="/goals"
            className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl hover:bg-zinc-800 transition-colors"
          >
            <div className="text-lg">{CATEGORY_ICONS[goal.category] || "🎯"}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{goal.title}</span>
                {goal.status === "at_risk" && (
                  <AlertTriangle className="w-3 h-3 text-red-400 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      goal.status === "at_risk" ? "bg-red-500" : "bg-violet-500"
                    }`}
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-500 w-8 text-right">{goal.progress}%</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Average progress */}
      {stats && (
        <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-zinc-500">Average Progress</span>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">{stats.avgProgress}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default GoalsWidget;
