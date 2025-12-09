"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Zap,
  CheckSquare,
  Briefcase,
  Flame,
  Target,
  Users,
  Calendar,
  Clock,
} from "lucide-react";

interface AnalyticsData {
  overview: {
    totalXP: number;
    level: number;
    tasksCompleted: number;
    dealsValue: number;
    streakDays: number;
    goalsProgress: number;
  };
  trends: {
    xpByDay: { date: string; value: number }[];
    tasksByDay: { date: string; completed: number; created: number }[];
    habitCompletionRate: { date: string; rate: number }[];
  };
  distributions: {
    xpByCategory: { category: string; value: number; color: string }[];
    tasksByPriority: { priority: string; count: number; color: string }[];
    dealsByStage: { stage: string; count: number; value: number; color: string }[];
    contactsByTier: { tier: string; count: number; color: string }[];
  };
  insights: {
    bestDay: string;
    avgXPPerDay: number;
    taskCompletionRate: number;
    mostProductiveHour: number;
    topArchetype: string;
    longestStreak: number;
  };
  comparisons: {
    xpVsLastWeek: number;
    tasksVsLastWeek: number;
    habitsVsLastWeek: number;
  };
}

export default function AnalyticsDashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  async function loadAnalytics() {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics?period=${period}`);
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(value: number): string {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  }

  function renderTrendBadge(value: number) {
    if (value > 0) {
      return (
        <span className="flex items-center gap-1 text-xs text-emerald-400">
          <TrendingUp className="w-3 h-3" />
          +{value}%
        </span>
      );
    }
    if (value < 0) {
      return (
        <span className="flex items-center gap-1 text-xs text-red-400">
          <TrendingDown className="w-3 h-3" />
          {value}%
        </span>
      );
    }
    return <span className="text-xs text-zinc-500">No change</span>;
  }

  function renderMiniChart(values: number[], color: string, height: number = 40) {
    const max = Math.max(...values);
    return (
      <div className="flex items-end gap-0.5 h-full">
        {values.slice(-14).map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-t transition-all hover:opacity-80"
            style={{
              height: `${(v / max) * height}px`,
              backgroundColor: color,
              minWidth: "4px",
            }}
          />
        ))}
      </div>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      </main>
    );
  }

  if (!data) return null;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BarChart3 className="w-7 h-7 text-violet-400" />
                Analytics Dashboard
              </h1>
              <p className="text-zinc-400 text-sm">Your performance at a glance</p>
            </div>
          </div>
          <div className="flex gap-2">
            {["7d", "14d", "30d", "90d"].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  period === p ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-zinc-500 text-xs mb-2">
              <Zap className="w-3 h-3" />
              Total XP
            </div>
            <div className="text-2xl font-bold text-amber-400">{data.overview.totalXP.toLocaleString()}</div>
            {renderTrendBadge(data.comparisons.xpVsLastWeek)}
          </div>
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-zinc-500 text-xs mb-2">
              <Target className="w-3 h-3" />
              Level
            </div>
            <div className="text-2xl font-bold text-violet-400">{data.overview.level}</div>
            <span className="text-xs text-zinc-500">Current level</span>
          </div>
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-zinc-500 text-xs mb-2">
              <CheckSquare className="w-3 h-3" />
              Tasks Done
            </div>
            <div className="text-2xl font-bold text-blue-400">{data.overview.tasksCompleted}</div>
            {renderTrendBadge(data.comparisons.tasksVsLastWeek)}
          </div>
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-zinc-500 text-xs mb-2">
              <Briefcase className="w-3 h-3" />
              Deals Value
            </div>
            <div className="text-2xl font-bold text-emerald-400">{formatCurrency(data.overview.dealsValue)}</div>
            <span className="text-xs text-zinc-500">Closed won</span>
          </div>
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-zinc-500 text-xs mb-2">
              <Flame className="w-3 h-3" />
              Streak
            </div>
            <div className="text-2xl font-bold text-orange-400">{data.overview.streakDays}</div>
            {renderTrendBadge(data.comparisons.habitsVsLastWeek)}
          </div>
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-4">
            <div className="flex items-center gap-2 text-zinc-500 text-xs mb-2">
              <Target className="w-3 h-3" />
              Goals
            </div>
            <div className="text-2xl font-bold text-pink-400">{data.overview.goalsProgress}%</div>
            <span className="text-xs text-zinc-500">Avg progress</span>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* XP Trend */}
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              XP Trend (Last 14 Days)
            </h3>
            <div className="h-32">
              {renderMiniChart(data.trends.xpByDay.map((d) => d.value), "#f59e0b", 120)}
            </div>
            <div className="flex justify-between text-xs text-zinc-500 mt-2">
              <span>14 days ago</span>
              <span>Today</span>
            </div>
          </div>

          {/* Habit Completion */}
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              Habit Completion Rate
            </h3>
            <div className="h-32">
              {renderMiniChart(data.trends.habitCompletionRate.map((d) => d.rate), "#f97316", 120)}
            </div>
            <div className="flex justify-between text-xs text-zinc-500 mt-2">
              <span>14 days ago</span>
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* Distributions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* XP by Category */}
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-6">
            <h3 className="font-semibold mb-4 text-sm">XP by Category</h3>
            <div className="space-y-3">
              {data.distributions.xpByCategory.map((cat) => {
                const total = data.distributions.xpByCategory.reduce((s, c) => s + c.value, 0);
                const pct = Math.round((cat.value / total) * 100);
                return (
                  <div key={cat.category}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-400">{cat.category}</span>
                      <span>{cat.value.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tasks by Priority */}
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-6">
            <h3 className="font-semibold mb-4 text-sm">Tasks by Priority</h3>
            <div className="space-y-3">
              {data.distributions.tasksByPriority.map((p) => {
                const total = data.distributions.tasksByPriority.reduce((s, x) => s + x.count, 0);
                const pct = Math.round((p.count / total) * 100);
                return (
                  <div key={p.priority}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-400">{p.priority}</span>
                      <span>{p.count}</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: p.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Deals by Stage */}
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-6">
            <h3 className="font-semibold mb-4 text-sm">Deals by Stage</h3>
            <div className="space-y-3">
              {data.distributions.dealsByStage.map((s) => {
                const maxValue = Math.max(...data.distributions.dealsByStage.map((x) => x.value));
                const pct = Math.round((s.value / maxValue) * 100);
                return (
                  <div key={s.stage}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-400">{s.stage}</span>
                      <span>{formatCurrency(s.value)}</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: s.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Contacts by Tier */}
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-6">
            <h3 className="font-semibold mb-4 text-sm">Contacts by Tier</h3>
            <div className="space-y-3">
              {data.distributions.contactsByTier.map((t) => {
                const total = data.distributions.contactsByTier.reduce((s, x) => s + x.count, 0);
                const pct = Math.round((t.count / total) * 100);
                return (
                  <div key={t.tier}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-400">{t.tier}</span>
                      <span>{t.count}</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: t.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-6">
          <h3 className="font-semibold mb-4">📊 Key Insights</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
              <Calendar className="w-5 h-5 mx-auto mb-2 text-blue-400" />
              <div className="text-lg font-bold">{data.insights.bestDay}</div>
              <div className="text-xs text-zinc-500">Best Day</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
              <Zap className="w-5 h-5 mx-auto mb-2 text-amber-400" />
              <div className="text-lg font-bold">{data.insights.avgXPPerDay}</div>
              <div className="text-xs text-zinc-500">Avg XP/Day</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
              <CheckSquare className="w-5 h-5 mx-auto mb-2 text-emerald-400" />
              <div className="text-lg font-bold">{data.insights.taskCompletionRate}%</div>
              <div className="text-xs text-zinc-500">Completion Rate</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
              <Clock className="w-5 h-5 mx-auto mb-2 text-cyan-400" />
              <div className="text-lg font-bold">{data.insights.mostProductiveHour}:00</div>
              <div className="text-xs text-zinc-500">Peak Hour</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
              <Users className="w-5 h-5 mx-auto mb-2 text-violet-400" />
              <div className="text-lg font-bold">{data.insights.topArchetype}</div>
              <div className="text-xs text-zinc-500">Top Archetype</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-4 text-center">
              <Flame className="w-5 h-5 mx-auto mb-2 text-orange-400" />
              <div className="text-lg font-bold">{data.insights.longestStreak}</div>
              <div className="text-xs text-zinc-500">Longest Streak</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
