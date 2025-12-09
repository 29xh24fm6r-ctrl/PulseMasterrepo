"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Target,
  CheckCircle2,
  Flame,
  Sparkles,
  DollarSign,
  Trophy,
  BarChart3,
  Zap,
  Users,
  Brain,
  Cog,
  RefreshCw,
  Award,
  BookOpen,
} from "lucide-react";

interface MonthlyReviewData {
  period: {
    start: string;
    end: string;
    monthName: string;
    year: number;
  };
  xp: {
    total: number;
    byCategory: Record<string, number>;
    weeklyBreakdown: { week: number; xp: number; startDate: string }[];
    critCount: number;
    identityBonuses: number;
    trend: "up" | "down" | "stable";
    vsLastMonth: number;
    dailyAverage: number;
  };
  tasks: {
    completed: number;
    created: number;
    completionRate: number;
    byPriority: { high: number; medium: number; low: number };
    bestWeek: number;
  };
  habits: {
    totalCompletions: number;
    streaks: { name: string; days: number; icon: string }[];
    completionRate: number;
    perfectDays: number;
    longestStreak: number;
  };
  identity: {
    actionsTracked: number;
    resonanceGained: number;
    topArchetype: string | null;
    valuesReinforced: string[];
    activationAchieved: boolean;
    streakDays: number;
  };
  deals: {
    closed: number;
    closedValue: number;
    newDeals: number;
    pipelineGrowth: number;
    avgDealSize: number;
  };
  highlights: {
    type: string;
    title: string;
    description: string;
    icon: string;
  }[];
  insights: string[];
  goals: {
    set: number;
    completed: number;
    inProgress: number;
  };
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  DXP: { label: "Deal XP", color: "#3b82f6", icon: Target },
  PXP: { label: "People XP", color: "#ec4899", icon: Users },
  IXP: { label: "Inner XP", color: "#8b5cf6", icon: Brain },
  AXP: { label: "Auto XP", color: "#f59e0b", icon: Cog },
  MXP: { label: "Maint XP", color: "#10b981", icon: RefreshCw },
};

export default function MonthlyReviewPage() {
  const [data, setData] = useState<MonthlyReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [monthOffset, setMonthOffset] = useState(0);

  useEffect(() => {
    loadReview();
  }, [monthOffset]);

  async function loadReview() {
    setLoading(true);
    try {
      const res = await fetch(`/api/monthly-review?monthOffset=${monthOffset}`);
      const result = await res.json();
      if (result.ok) {
        setData(result.data);
      }
    } catch (err) {
      console.error("Failed to load monthly review:", err);
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(value: number): string {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
              <p className="text-zinc-400">Loading monthly review...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-6xl mx-auto text-center py-20">
          <p className="text-zinc-400">Failed to load review data</p>
          <button
            onClick={() => loadReview()}
            className="mt-4 px-4 py-2 bg-violet-600 rounded-lg"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  const TrendIcon = data.xp.trend === "up" ? TrendingUp : data.xp.trend === "down" ? TrendingDown : Minus;
  const trendColor = data.xp.trend === "up" ? "text-emerald-400" : data.xp.trend === "down" ? "text-red-400" : "text-zinc-400";

  const maxWeekXp = Math.max(...data.xp.weeklyBreakdown.map((w) => w.xp), 1);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Monthly Review</h1>
              <p className="text-zinc-400 text-sm">Your month at a glance</p>
            </div>
          </div>
          <Link
            href="/weekly-review"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm"
          >
            Weekly View
          </Link>
        </div>

        {/* Month Navigator */}
        <div className="flex items-center justify-center gap-4 py-4">
          <button
            onClick={() => setMonthOffset((prev) => prev + 1)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 px-6 py-3 bg-zinc-900 rounded-xl border border-zinc-800">
            <Calendar className="w-5 h-5 text-violet-400" />
            <span className="text-lg font-semibold">
              {data.period.monthName} {data.period.year}
            </span>
          </div>
          <button
            onClick={() => setMonthOffset((prev) => Math.max(0, prev - 1))}
            disabled={monthOffset === 0}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-30"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Highlights */}
        {data.highlights.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {data.highlights.map((highlight, idx) => (
              <div
                key={idx}
                className={`
                  p-4 rounded-xl border
                  ${highlight.type === "achievement" ? "bg-amber-500/10 border-amber-500/30" : ""}
                  ${highlight.type === "streak" ? "bg-orange-500/10 border-orange-500/30" : ""}
                  ${highlight.type === "milestone" ? "bg-emerald-500/10 border-emerald-500/30" : ""}
                  ${highlight.type === "improvement" ? "bg-violet-500/10 border-violet-500/30" : ""}
                `}
              >
                <div className="text-2xl mb-2">{highlight.icon}</div>
                <div className="font-semibold text-sm">{highlight.title}</div>
                <div className="text-xs text-zinc-400">{highlight.description}</div>
              </div>
            ))}
          </div>
        )}

        {/* XP Summary */}
        <div className="bg-gradient-to-br from-violet-900/30 to-fuchsia-900/30 rounded-2xl border border-violet-500/30 p-6">
          <div className="flex items-center gap-2 mb-6">
            <Zap className="w-5 h-5 text-violet-400" />
            <h2 className="text-lg font-semibold">XP Summary</h2>
          </div>

          {/* Top Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-zinc-900/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-violet-400">{data.xp.total.toLocaleString()}</div>
              <div className="text-xs text-zinc-500">Total XP</div>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white">{data.xp.dailyAverage}</div>
              <div className="text-xs text-zinc-500">Daily Avg</div>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4 text-center">
              <div className={`text-3xl font-bold flex items-center justify-center gap-1 ${trendColor}`}>
                <TrendIcon className="w-6 h-6" />
                {data.xp.vsLastMonth > 0 ? "+" : ""}{data.xp.vsLastMonth}%
              </div>
              <div className="text-xs text-zinc-500">vs Last Month</div>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-amber-400">{data.xp.critCount}</div>
              <div className="text-xs text-zinc-500">🔥 Crits</div>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-purple-400">{data.xp.identityBonuses}</div>
              <div className="text-xs text-zinc-500">✨ Identity Bonuses</div>
            </div>
          </div>

          {/* Weekly Breakdown Chart */}
          <div className="mb-6">
            <div className="text-sm text-zinc-400 mb-3">Weekly Breakdown</div>
            <div className="flex items-end gap-2 h-32">
              {data.xp.weeklyBreakdown.map((week) => (
                <div key={week.week} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-xs text-zinc-500">{week.xp}</div>
                  <div
                    className="w-full bg-gradient-to-t from-violet-600 to-fuchsia-500 rounded-t-lg transition-all"
                    style={{ height: `${(week.xp / maxWeekXp) * 100}%`, minHeight: "8px" }}
                  />
                  <div className="text-xs text-zinc-500">W{week.week}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Category Breakdown */}
          <div>
            <div className="text-sm text-zinc-400 mb-3">By Category</div>
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(data.xp.byCategory).map(([cat, xp]) => {
                const config = CATEGORY_CONFIG[cat];
                const Icon = config?.icon || Target;
                return (
                  <div key={cat} className="bg-zinc-900/50 rounded-lg p-3 text-center">
                    <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: config?.color }} />
                    <div className="text-lg font-bold" style={{ color: config?.color }}>
                      {xp.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-zinc-500">{cat}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Middle Row - Tasks, Habits, Identity */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tasks */}
          <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800 p-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold">Tasks</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-emerald-400">{data.tasks.completed}</div>
                <div className="text-xs text-zinc-500">Completed</div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-white">{data.tasks.completionRate}%</div>
                <div className="text-xs text-zinc-500">Rate</div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">High Priority</span>
                <span className="text-red-400 font-medium">{data.tasks.byPriority.high}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Medium Priority</span>
                <span className="text-amber-400 font-medium">{data.tasks.byPriority.medium}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Low Priority</span>
                <span className="text-zinc-400 font-medium">{data.tasks.byPriority.low}</span>
              </div>
              <div className="pt-2 border-t border-zinc-800 flex justify-between">
                <span className="text-zinc-400">Best Week</span>
                <span className="text-blue-400 font-medium">Week {data.tasks.bestWeek}</span>
              </div>
            </div>
          </div>

          {/* Habits */}
          <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-orange-400" />
              <h3 className="font-semibold">Habits</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-orange-400">{data.habits.totalCompletions}</div>
                <div className="text-xs text-zinc-500">Completions</div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-emerald-400">{data.habits.perfectDays}</div>
                <div className="text-xs text-zinc-500">Perfect Days</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-zinc-500 uppercase">Top Streaks</div>
              {data.habits.streaks.map((streak, idx) => (
                <div key={idx} className="flex items-center justify-between bg-zinc-800/30 rounded-lg px-3 py-2">
                  <span className="text-sm">
                    {streak.icon} {streak.name}
                  </span>
                  <span className="text-sm font-semibold text-orange-400">{streak.days}d</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-zinc-800 flex justify-between text-sm">
              <span className="text-zinc-400">Longest Streak</span>
              <span className="text-amber-400 font-medium">🔥 {data.habits.longestStreak} days</span>
            </div>
          </div>

          {/* Identity */}
          <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <h3 className="font-semibold">Identity</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-violet-400">{data.identity.actionsTracked}</div>
                <div className="text-xs text-zinc-500">Actions</div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-fuchsia-400">+{data.identity.resonanceGained}</div>
                <div className="text-xs text-zinc-500">Resonance</div>
              </div>
            </div>
            {data.identity.topArchetype && (
              <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-3 mb-3">
                <div className="text-xs text-violet-400 uppercase mb-1">Top Archetype</div>
                <div className="text-lg font-semibold">{data.identity.topArchetype}</div>
              </div>
            )}
            <div className="space-y-2">
              <div className="text-xs text-zinc-500 uppercase">Values Reinforced</div>
              <div className="flex flex-wrap gap-2">
                {data.identity.valuesReinforced.map((value, idx) => (
                  <span key={idx} className="px-2 py-1 bg-zinc-800 rounded-full text-xs text-zinc-300">
                    {value}
                  </span>
                ))}
              </div>
            </div>
            {data.identity.activationAchieved && (
              <div className="mt-3 p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-center">
                <span className="text-xs text-emerald-400 font-semibold">✨ Archetype Activated!</span>
              </div>
            )}
          </div>
        </div>

        {/* Deals Section */}
        <div className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 rounded-2xl border border-green-500/30 p-6">
          <div className="flex items-center gap-2 mb-6">
            <DollarSign className="w-5 h-5 text-green-400" />
            <h2 className="text-lg font-semibold">Deals Performance</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-zinc-900/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-green-400">{data.deals.closed}</div>
              <div className="text-xs text-zinc-500">Deals Closed</div>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-emerald-400">{formatCurrency(data.deals.closedValue)}</div>
              <div className="text-xs text-zinc-500">Revenue Closed</div>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-blue-400">{data.deals.newDeals}</div>
              <div className="text-xs text-zinc-500">New Deals</div>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-cyan-400">{formatCurrency(data.deals.pipelineGrowth)}</div>
              <div className="text-xs text-zinc-500">Pipeline Growth</div>
            </div>
            <div className="bg-zinc-900/50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-white">{formatCurrency(data.deals.avgDealSize)}</div>
              <div className="text-xs text-zinc-500">Avg Deal Size</div>
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold">Monthly Insights</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.insights.map((insight, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 bg-zinc-800/30 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs text-cyan-400">{idx + 1}</span>
                </div>
                <p className="text-sm text-zinc-300">{insight}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-center gap-4 py-4">
          <Link
            href="/journal"
            className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>Write Reflection</span>
          </Link>
          <Link
            href="/xp/history"
            className="flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            <span>View XP History</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
