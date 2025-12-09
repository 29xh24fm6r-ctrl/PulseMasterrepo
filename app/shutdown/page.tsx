"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type ShutdownData = {
  date: string;
  completedTasks: Array<{ id: string; name: string; xp?: number }>;
  dealsMovedToday: Array<{ id: string; name: string; stage?: string }>;
  incompleteTasks: Array<{ id: string; name: string }>;
  xpToday: number;
  xpTotal: number;
  tomorrowFocus: string[];
  reflectionPrompts: string[];
  stats: {
    tasksCompleted: number;
    dealsMoved: number;
    looseEnds: number;
  };
};

export default function ShutdownPage() {
  const [data, setData] = useState<ShutdownData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [wins, setWins] = useState("");
  const [reflection, setReflection] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function loadShutdownData() {
      try {
        const res = await fetch("/api/nightly-shutdown");
        if (!res.ok) throw new Error("Failed to load shutdown data");
        const result = await res.json();
        if (result.ok) {
          setData(result);
        } else {
          setError(result.error || "Unknown error");
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load nightly shutdown");
      } finally {
        setLoading(false);
      }
    }

    loadShutdownData();
  }, []);

  async function handleSubmit() {
    if (!wins.trim() && !reflection.trim()) {
      alert("Please add at least one win or reflection");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/nightly-shutdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wins,
          reflection,
          looseEnds: data?.incompleteTasks.map((t) => t.name) || [],
          tomorrowPlan: data?.tomorrowFocus || [],
        }),
      });

      const result = await res.json();
      if (result.ok) {
        setSubmitted(true);
      } else {
        alert("Failed to save: " + result.error);
      }
    } catch (err: any) {
      alert("Failed to save: " + err?.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-sm uppercase tracking-[0.2em] text-slate-500">
            Pulse OS
          </div>
          <div className="text-xl font-semibold">Loading your shutdown…</div>
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-xl font-semibold text-red-400">
            ⚠️ Error loading shutdown
          </div>
          <div className="text-sm text-slate-400">{error}</div>
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-emerald-500 text-slate-950 rounded-lg hover:bg-emerald-400"
          >
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-md">
          <div className="text-6xl">🌙</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Shutdown Complete
          </h1>
          <p className="text-slate-400 text-lg">
            Rest well, Warrior. Tomorrow is a new day.
          </p>
          <div className="pt-4">
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-indigo-500 text-white font-semibold rounded-xl hover:bg-indigo-400 transition"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 text-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="text-center space-y-2 pt-12">
          <div className="text-sm uppercase tracking-[0.3em] text-slate-500">
            {data.date}
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Nightly Shutdown
          </h1>
          <p className="text-slate-400 italic">
            Close the loop. Celebrate progress. Rest with clarity.
          </p>
        </header>

        <div className="bg-slate-900/50 border border-indigo-500/30 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            Today's Performance
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-400">
                {data.xpToday}
              </div>
              <div className="text-xs text-slate-500 mt-1">XP Earned</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-cyan-400">
                {data.stats.tasksCompleted}
              </div>
              <div className="text-xs text-slate-500 mt-1">Tasks Done</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">
                {data.stats.dealsMoved}
              </div>
              <div className="text-xs text-slate-500 mt-1">Deals Moved</div>
            </div>
          </div>
        </div>

        {data.completedTasks.length > 0 && (
          <div className="bg-slate-900/50 border border-emerald-500/30 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">✅</span>
              Completed Today ({data.completedTasks.length})
            </h2>
            <div className="space-y-2">
              {data.completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800"
                >
                  <span className="text-slate-200">{task.name}</span>
                  {task.xp && (
                    <span className="text-xs text-emerald-400 font-medium">
                      +{task.xp} XP
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {data.dealsMovedToday.length > 0 && (
          <div className="bg-slate-900/50 border border-cyan-500/30 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Deals Advanced Today
            </h2>
            <div className="space-y-2">
              {data.dealsMovedToday.map((deal) => (
                <div
                  key={deal.id}
                  className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800"
                >
                  <div>
                    <div className="text-slate-200">{deal.name}</div>
                    {deal.stage && (
                      <div className="text-xs text-slate-500 mt-1">
                        {deal.stage}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-slate-900/50 border border-purple-500/30 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">💭</span>
            Today's Wins
          </h2>
          <textarea
            value={wins}
            onChange={(e) => setWins(e.target.value)}
            placeholder="What were your biggest wins today? What moved forward?"
            className="w-full h-32 bg-slate-950/50 border border-slate-700 rounded-xl p-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
          />
        </div>

        <div className="bg-slate-900/50 border border-indigo-500/30 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            Identity Check
          </h2>
          <p className="text-slate-400 text-sm mb-3">
            Did you show up as the person you want to become?
          </p>
          <textarea
            value={reflection}
            onChange={(e) => setReflection(e.target.value)}
            placeholder="Reflect on your identity alignment today..."
            className="w-full h-24 bg-slate-950/50 border border-slate-700 rounded-xl p-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
          />
        </div>

        {data.incompleteTasks.length > 0 && (
          <div className="bg-slate-900/50 border border-amber-500/30 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">📌</span>
              Loose Ends ({data.incompleteTasks.length})
            </h2>
            <div className="space-y-2">
              {data.incompleteTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 bg-slate-950/50 rounded-xl border border-slate-800 text-slate-300"
                >
                  {task.name}
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3">
              These will carry over to tomorrow
            </p>
          </div>
        )}

        <div className="bg-slate-900/50 border border-emerald-500/30 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">🌅</span>
            Tomorrow's Launchpad
          </h2>
          <div className="space-y-2">
            {data.tomorrowFocus.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-slate-950/50 rounded-xl border border-slate-800"
              >
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-xs font-bold text-emerald-400">
                  {idx + 1}
                </div>
                <div className="flex-1 pt-0.5 text-slate-200 text-sm">
                  {item}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4 justify-center pb-12">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-8 py-4 bg-indigo-500 text-white font-semibold rounded-xl hover:bg-indigo-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Saving..." : "Complete Shutdown"}
          </button>
          <Link
            href="/"
            className="px-8 py-4 bg-slate-800 text-slate-200 font-semibold rounded-xl hover:bg-slate-700 transition border border-slate-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
