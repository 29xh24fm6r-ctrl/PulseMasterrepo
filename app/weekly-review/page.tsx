"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  CheckCircle2,
  Flame,
  Sparkles,
  Target,
  Users,
  Brain,
  Cog,
  RefreshCw,
  Award,
  BarChart3,
  Lightbulb,
} from "lucide-react";

interface WeeklyReviewData {
  period: {
    start: string;
    end: string;
    weekNumber: number;
  };
  xp: {
    total: number;
    byCategory: Record<string, number>;
    dailyBreakdown: { date: string; amount: number }[];
    critCount: number;
    identityBonuses: number;
    trend: "up" | "down" | "stable";
    vsLastWeek: number;
  };
  tasks: {
    completed: number;
    created: number;
    completionRate: number;
    byPriority: { high: number; medium: number; low: number };
  };
  habits: {
    totalCompletions: number;
    streaks: { name: string; streak: number; icon: string }[];
    completionRate: number;
    perfectDays: number;
  };
  identity: {
    actionsTracked: number;
    resonanceGained: Record<string, number>;
    topArchetype: { id: string; name: string; icon: string; gained: number } | null;
    valuesReinforced: string[];
    streakDays: number;
  };
  highlights: {
    type: string;
    title: string;
    description: string;
    icon: string;
  }[];
  insights: string[];
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  DXP: { label: "Deal", color: "#3b82f6", icon: Target },
  PXP: { label: "People", color: "#ec4899", icon: Users },
  IXP: { label: "Inner", color: "#8b5cf6", icon: Brain },
  AXP: { label: "Auto", color: "#f59e0b", icon: Cog },
  MXP: { label: "Maint", color: "#10b981", icon: RefreshCw },
};

export default function WeeklyReviewPage() {
  const [review, setReview] = useState<WeeklyReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    fetchReview();
  }, [weekOffset]);

  async function fetchReview() {
    setLoading(true);
    try {
      const res = await fetch(`/api/weekly-review?weekOffset=${weekOffset}`);
      const data = await res.json();
      if (data.ok) {
        setReview(data.review);
      }
    } catch (err) {
      console.error("Failed to fetch weekly review:", err);
    } finally {
      setLoading(false);
    }
  }

  function formatDateRange(start: string, end: string): string {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${startDate.toLocaleDateString("en-US", options)} - ${endDate.toLocaleDateString("en-US", options)}`;
  }

  function getDayName(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short" });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-zinc-400">Loading your week...</p>
        </div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400">Failed to load review</p>
      </div>
    );
  }

  const maxDailyXP = Math.max(...review.xp.dailyBreakdown.map((d) => d.amount), 1);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-[128px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/" className="text-zinc-500 hover:text-zinc-300 text-sm flex items-center gap-1 mb-2">
              ← Dashboard
            </Link>
            <h1 className="text-3xl font-bold">Weekly Review</h1>
            <p className="text-zinc-500 mt-1">Reflect on your progress</p>
          </div>

          {/* Week Navigator */}
          <div className="flex items-center gap-2 bg-zinc-900/80 rounded-xl border border-zinc-800 p-1">
            <button
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="px-4 py-2 text-center min-w-[180px]">
              <div className="text-sm font-medium">Week {review.period.weekNumber}</div>
              <div className="text-xs text-zinc-500">
                {formatDateRange(review.period.start, review.period.end)}
              </div>
            </div>
            <button
              onClick={() => setWeekOffset((prev) => Math.max(0, prev - 1))}
              disabled={weekOffset === 0}
              className="p-2 rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Highlights */}
        {review.highlights.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {review.highlights.map((highlight, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20"
              >
                <div className="text-2xl mb-2">{highlight.icon}</div>
                <div className="font-semibold text-sm">{highlight.title}</div>
                <div className="text-xs text-zinc-400 mt-1">{highlight.description}</div>
              </div>
            ))}
          </div>
        )}

        {/* XP Summary */}
        <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800/50 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">XP Earned</h2>
                <p className="text-sm text-zinc-500">This week&apos;s progress</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-amber-400">+{review.xp.total}</div>
              <div className="flex items-center gap-1 text-sm">
                {review.xp.trend === "up" && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                {review.xp.trend === "down" && <TrendingDown className="w-4 h-4 text-red-400" />}
                {review.xp.trend === "stable" && <Minus className="w-4 h-4 text-zinc-400" />}
                <span className={review.xp.vsLastWeek >= 0 ? "text-emerald-400" : "text-red-400"}>
                  {review.xp.vsLastWeek >= 0 ? "+" : ""}{review.xp.vsLastWeek}% vs last week
                </span>
              </div>
            </div>
          </div>

          {/* Daily Chart */}
          <div className="mb-6">
            <div className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Daily Breakdown</div>
            <div className="flex items-end gap-2 h-32">
              {review.xp.dailyBreakdown.map((day, i) => {
                const height = (day.amount / maxDailyXP) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="text-xs text-zinc-500">{day.amount}</div>
                    <div
                      className="w-full bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-lg transition-all"
                      style={{ height: `${height}%`, minHeight: "8px" }}
                    />
                    <div className="text-xs text-zinc-500">{getDayName(day.date)}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="grid grid-cols-5 gap-3">
            {Object.entries(CATEGORY_CONFIG).map(([cat, config]) => {
              const amount = review.xp.byCategory[cat] || 0;
              const Icon = config.icon;
              return (
                <div key={cat} className="text-center">
                  <div
                    className="w-10 h-10 mx-auto rounded-lg flex items-center justify-center mb-2"
                    style={{ backgroundColor: `${config.color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: config.color }} />
                  </div>
                  <div className="font-semibold">{amount}</div>
                  <div className="text-xs text-zinc-500">{config.label}</div>
                </div>
              );
            })}
          </div>

          {/* XP Badges */}
          <div className="flex items-center gap-4 mt-4 pt-4 border-t border-zinc-800">
            {review.xp.critCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-yellow-400">
                <Flame className="w-4 h-4" />
                {review.xp.critCount} Critical Hits
              </div>
            )}
            {review.xp.identityBonuses > 0 && (
              <div className="flex items-center gap-2 text-sm text-violet-400">
                <Sparkles className="w-4 h-4" />
                {review.xp.identityBonuses} Identity Bonuses
              </div>
            )}
          </div>
        </div>

        {/* Tasks & Habits Row */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Tasks */}
          <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Tasks</h2>
                <p className="text-sm text-zinc-500">{review.tasks.completionRate}% completion</p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">{review.tasks.completed}</div>
                <div className="text-xs text-zinc-500">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{review.tasks.created}</div>
                <div className="text-xs text-zinc-500">Created</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                style={{ width: `${review.tasks.completionRate}%` }}
              />
            </div>

            {/* Priority breakdown */}
            <div className="flex items-center gap-4 mt-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-zinc-400">{review.tasks.byPriority.high} high</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-zinc-400">{review.tasks.byPriority.medium} med</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-zinc-400" />
                <span className="text-zinc-400">{review.tasks.byPriority.low} low</span>
              </div>
            </div>
          </div>

          {/* Habits */}
          <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Flame className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Habits</h2>
                <p className="text-sm text-zinc-500">{review.habits.perfectDays} perfect days</p>
              </div>
            </div>

            <div className="text-center mb-4">
              <div className="text-3xl font-bold text-emerald-400">{review.habits.totalCompletions}</div>
              <div className="text-sm text-zinc-500">completions this week</div>
            </div>

            {/* Streaks */}
            <div className="space-y-2">
              {review.habits.streaks.map((habit, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span>{habit.icon}</span>
                    <span className="text-sm">{habit.name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400 text-sm font-medium">
                    <Flame className="w-3 h-3" />
                    {habit.streak}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Identity Progress */}
        <div className="bg-gradient-to-br from-violet-900/20 to-fuchsia-900/20 rounded-2xl border border-violet-500/20 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Identity Progress</h2>
              <p className="text-sm text-zinc-500">{review.identity.actionsTracked} actions tracked</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Top Archetype */}
            {review.identity.topArchetype && (
              <div className="text-center p-4 bg-zinc-900/50 rounded-xl">
                <div className="text-3xl mb-2">{review.identity.topArchetype.icon}</div>
                <div className="font-semibold text-violet-400">{review.identity.topArchetype.name}</div>
                <div className="text-sm text-zinc-400">+{review.identity.topArchetype.gained} resonance</div>
              </div>
            )}

            {/* Values Reinforced */}
            <div className="p-4 bg-zinc-900/50 rounded-xl">
              <div className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Values Reinforced</div>
              <div className="flex flex-wrap gap-2">
                {review.identity.valuesReinforced.map((value) => (
                  <span key={value} className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full capitalize">
                    {value}
                  </span>
                ))}
              </div>
            </div>

            {/* Identity Streak */}
            <div className="text-center p-4 bg-zinc-900/50 rounded-xl">
              <div className="text-3xl font-bold text-amber-400">{review.identity.streakDays}</div>
              <div className="text-sm text-zinc-400">day identity streak</div>
            </div>
          </div>
        </div>

        {/* Insights */}
        {review.insights.length > 0 && (
          <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800/50 p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <Lightbulb className="w-5 h-5 text-cyan-400" />
              </div>
              <h2 className="text-lg font-semibold">Weekly Insights</h2>
            </div>
            <div className="space-y-3">
              {review.insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-zinc-800/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs text-cyan-400">{i + 1}</span>
                  </div>
                  <p className="text-sm text-zinc-300">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/journal"
            className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-medium transition-colors"
          >
            Write Reflection
          </Link>
          <Link
            href="/xp/history"
            className="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-medium transition-colors"
          >
            View Full XP History
          </Link>
        </div>
      </div>
    </div>
  );
}
