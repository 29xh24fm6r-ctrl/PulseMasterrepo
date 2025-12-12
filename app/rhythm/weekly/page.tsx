// Weekly Review Page
// app/rhythm/weekly/page.tsx

"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Calendar, TrendingUp, Target, BookOpen } from "lucide-react";

export default function WeeklyReviewPage() {
  const [review, setReview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReview();
  }, []);

  async function loadReview() {
    try {
      const res = await fetch("/api/rhythm/weekly");
      const data = await res.json();
      if (res.ok && data.review) {
        setReview(data.review);
      }
    } catch (err) {
      console.error("Failed to load review:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading weekly review...</div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-4xl mx-auto text-center text-zinc-400">
          No weekly review available yet.
        </div>
      </div>
    );
  }

  const data = review.data;

  // Prepare emotion chart data
  const emotionData = [
    { name: "Stress", value: data.emotionCounts.stress, color: "#ef4444" },
    { name: "Calm", value: data.emotionCounts.calm, color: "#10b981" },
    { name: "Hype", value: data.emotionCounts.hype, color: "#f59e0b" },
    { name: "Sad", value: data.emotionCounts.sad, color: "#3b82f6" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-6 h-6 text-violet-400" />
          <h1 className="text-2xl font-bold text-white">Weekly Review</h1>
          <span className="text-sm text-zinc-400">
            Week of {new Date(data.weekStart).toLocaleDateString()}
          </span>
        </div>

        {/* Summary */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="prose prose-invert max-w-none">
            <p className="text-sm text-zinc-300 whitespace-pre-line">{review.summary}</p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <div className="text-xs text-zinc-400">Total MXP</div>
            </div>
            <div className="text-2xl font-bold text-amber-400">{data.totalMXP}</div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-blue-400" />
              <div className="text-xs text-zinc-400">Sessions</div>
            </div>
            <div className="text-2xl font-bold text-blue-400">{data.sessionsCount}</div>
          </div>

          {data.chapterInfo && (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-violet-400" />
                <div className="text-xs text-zinc-400">Current Chapter</div>
              </div>
              <div className="text-lg font-bold text-violet-400">
                {data.chapterInfo.currentChapterTitle || "None"}
              </div>
            </div>
          )}
        </div>

        {/* Emotion Chart */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Emotion Breakdown</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={emotionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis
                  dataKey="name"
                  stroke="#a1a1aa"
                  tick={{ fill: "#a1a1aa" }}
                />
                <YAxis stroke="#a1a1aa" tick={{ fill: "#a1a1aa" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #3f3f46",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
                <Bar dataKey="value" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Identities */}
        {data.topIdentities && data.topIdentities.length > 0 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Top Identity Growth</h2>
            <div className="space-y-2">
              {data.topIdentities.map((identity: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between bg-violet-500/10 border border-violet-500/30 rounded-lg p-3"
                >
                  <span className="text-sm font-medium text-violet-400">{identity.name}</span>
                  <span className="text-sm text-zinc-300">+{identity.xpGained.toFixed(0)} XP</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wins & Struggles */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Key Wins</h2>
            <div className="space-y-2">
              {data.keyWins.map((win: string, idx: number) => (
                <div
                  key={idx}
                  className="text-sm text-zinc-300 bg-green-500/10 border border-green-500/30 rounded-lg p-3"
                >
                  {win}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Key Struggles</h2>
            <div className="space-y-2">
              {data.keyStruggles.map((struggle: string, idx: number) => (
                <div
                  key={idx}
                  className="text-sm text-zinc-300 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3"
                >
                  {struggle}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

