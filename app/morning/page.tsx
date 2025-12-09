"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type MorningBriefing = {
  ok: boolean;
  date: string;
  dayOfWeek: string;
  greeting: string;
  aiBrief: string;
  summary: {
    totalTasks: number;
    overdueTasks: number;
    todayTasks: number;
    tomorrowTasks: number;
    highPriorityTasks: number;
    totalFollowUps: number;
    overdueFollowUps: number;
    todayFollowUps: number;
    totalDeals: number;
    staleDeals: number;
    pipelineValue: number;
    weightedPipeline: number;
    totalContacts: number;
    coldContacts: number;
    coolingContacts: number;
  };
  urgentItems: Array<{
    type: string;
    name: string;
    reason: string;
    priority: string;
  }>;
  todayFocus: {
    tasks: Array<{
      id: string;
      name: string;
      priority: string;
      dueDate: string | null;
    }>;
    followUps: Array<{
      id: string;
      name: string;
      priority: string;
    }>;
  };
  tomorrowPreview: {
    tasks: Array<{
      id: string;
      name: string;
      priority: string;
    }>;
  };
  attentionNeeded: {
    overdueTasks: Array<{
      id: string;
      name: string;
      daysOverdue: number;
      priority: string;
    }>;
    overdueFollowUps: Array<{
      id: string;
      name: string;
    }>;
    staleDeals: Array<{
      id: string;
      name: string;
      stage: string;
      daysSinceUpdate: number;
    }>;
    coolingRelationships: Array<{
      id: string;
      name: string;
      daysSinceContact: number;
    }>;
  };
};

export default function MorningPage() {
  const [briefing, setBriefing] = useState<MorningBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [xpData, setXpData] = useState<{ todayXP: number; totalXP: number } | null>(null);

  useEffect(() => {
    async function loadBriefing() {
      try {
        // Fetch morning briefing
        const res = await fetch("/api/morning-briefing");
        if (!res.ok) throw new Error("Failed to load briefing");
        const data = await res.json();
        
        if (data.ok) {
          setBriefing(data);
        } else {
          setError(data.error || "Unknown error");
        }

        // Fetch XP data
        try {
          const [allXP, todayXP] = await Promise.all([
            fetch("/api/xp/log?period=all").then(r => r.json()),
            fetch("/api/xp/log?period=today").then(r => r.json()),
          ]);
          
          setXpData({
            totalXP: allXP.ok ? allXP.totalXP : 0,
            todayXP: todayXP.ok ? todayXP.totalXP : 0,
          });
        } catch {
          // XP fetch failed, continue without it
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load morning briefing");
      } finally {
        setLoading(false);
      }
    }

    loadBriefing();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="text-4xl animate-pulse">🌅</div>
          <div className="text-sm uppercase tracking-[0.2em] text-slate-500">
            Pulse OS
          </div>
          <div className="text-xl font-semibold">Loading your briefing…</div>
        </div>
      </main>
    );
  }

  if (error || !briefing) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-xl font-semibold text-red-400">
            ⚠️ Error loading briefing
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

  const xpGoal = 100;
  const todayXP = xpData?.todayXP || 0;
  const totalXP = xpData?.totalXP || 0;

  // Build Focus 3 from urgent items + today's tasks
  const focus3: string[] = [];
  
  // Add top urgent items first
  for (const item of briefing.urgentItems.slice(0, 2)) {
    focus3.push(`${item.name} (${item.reason})`);
  }
  
  // Fill remaining with today's tasks
  for (const task of briefing.todayFocus.tasks) {
    if (focus3.length >= 3) break;
    if (!focus3.some(f => f.includes(task.name))) {
      focus3.push(task.name);
    }
  }

  // If still need more, add follow-ups
  for (const followUp of briefing.todayFocus.followUps) {
    if (focus3.length >= 3) break;
    focus3.push(`Follow up: ${followUp.name}`);
  }

  // Default if nothing
  if (focus3.length === 0) {
    focus3.push("Review your pipeline", "Check in with key contacts", "Plan tomorrow");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center space-y-2 pt-12">
          <div className="text-sm uppercase tracking-[0.3em] text-slate-500">
            {briefing.dayOfWeek} • {briefing.date}
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            {briefing.greeting}
          </h1>
        </header>

        {/* AI Brief */}
        {briefing.aiBrief && (
          <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🧠</span>
              <div>
                <div className="text-xs uppercase tracking-wide text-indigo-400 mb-2">Pulse Says</div>
                <p className="text-slate-200 leading-relaxed">{briefing.aiBrief}</p>
              </div>
            </div>
          </div>
        )}

        {/* XP Progress */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-slate-400">Today's XP</div>
              <div className="text-3xl font-bold text-emerald-400">
                {todayXP} / {xpGoal}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-400">Total XP</div>
              <div className="text-2xl font-semibold text-slate-200">
                {totalXP.toLocaleString()}
              </div>
            </div>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all"
              style={{
                width: `${Math.min(100, (todayXP / xpGoal) * 100)}%`,
              }}
            />
          </div>
          {todayXP < xpGoal && (
            <div className="text-xs text-slate-500 mt-2 text-center">
              {xpGoal - todayXP} XP to hit your daily goal
            </div>
          )}
        </div>

        {/* Focus 3 */}
        <div className="bg-slate-900/50 border border-emerald-500/30 rounded-2xl p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            Focus 3
          </h2>
          <div className="space-y-3">
            {focus3.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-slate-950/50 rounded-xl border border-slate-800"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center font-bold text-emerald-400">
                  {idx + 1}
                </div>
                <div className="flex-1 pt-1 text-slate-200">{item}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Urgent Items */}
        {briefing.urgentItems.length > 0 && (
          <div className="bg-slate-900/50 border border-amber-500/30 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              Needs Attention ({briefing.urgentItems.length})
            </h2>
            <div className="space-y-2">
              {briefing.urgentItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${
                      item.priority === 'High' ? 'bg-red-500' :
                      item.priority === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    <div>
                      <span className="text-slate-200">{item.name}</span>
                      <span className="text-xs text-slate-500 ml-2">({item.type})</span>
                    </div>
                  </div>
                  <span className="text-xs text-amber-400 font-medium">
                    {item.reason}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Today's Tasks */}
        {briefing.todayFocus.tasks.length > 0 && (
          <div className="bg-slate-900/50 border border-blue-500/30 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">📋</span>
              Today's Tasks ({briefing.todayFocus.tasks.length})
            </h2>
            <div className="space-y-2">
              {briefing.todayFocus.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${
                      task.priority === 'High' ? 'bg-red-500' :
                      task.priority === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`} />
                    <span className="text-slate-200">{task.name}</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stale Deals */}
        {briefing.attentionNeeded.staleDeals.length > 0 && (
          <div className="bg-slate-900/50 border border-red-500/30 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">🔥</span>
              Stale Deals ({briefing.attentionNeeded.staleDeals.length})
            </h2>
            <div className="space-y-2">
              {briefing.attentionNeeded.staleDeals.map((deal) => (
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
                  <div className="text-xs text-red-400 font-medium">
                    {deal.daysSinceUpdate} days idle
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cooling Relationships */}
        {briefing.attentionNeeded.coolingRelationships.length > 0 && (
          <div className="bg-slate-900/50 border border-orange-500/30 rounded-2xl p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">👤</span>
              Cooling Relationships ({briefing.attentionNeeded.coolingRelationships.length})
            </h2>
            <div className="space-y-2">
              {briefing.attentionNeeded.coolingRelationships.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-3 bg-slate-950/50 rounded-xl border border-slate-800"
                >
                  <span className="text-slate-200">{contact.name}</span>
                  <span className="text-xs text-orange-400 font-medium">
                    {contact.daysSinceContact} days ago
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">
              {briefing.summary.totalDeals}
            </div>
            <div className="text-xs text-slate-500 mt-1">Active Deals</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-cyan-400">
              {briefing.summary.totalTasks}
            </div>
            <div className="text-xs text-slate-500 mt-1">Open Tasks</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">
              {briefing.summary.overdueTasks}
            </div>
            <div className="text-xs text-slate-500 mt-1">Overdue</div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">
              ${(briefing.summary.pipelineValue / 1000).toFixed(0)}K
            </div>
            <div className="text-xs text-slate-500 mt-1">Pipeline</div>
          </div>
        </div>

        {/* Tomorrow Preview */}
        {briefing.tomorrowPreview.tasks.length > 0 && (
          <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-slate-400">
              <span>📅</span>
              Tomorrow Preview
            </h2>
            <div className="space-y-2">
              {briefing.tomorrowPreview.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 p-2 text-slate-400"
                >
                  <span className={`w-2 h-2 rounded-full ${
                    task.priority === 'High' ? 'bg-red-500/50' :
                    task.priority === 'Medium' ? 'bg-yellow-500/50' : 'bg-green-500/50'
                  }`} />
                  <span className="text-sm">{task.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-center pb-12">
          <Link
            href="/"
            className="px-6 py-3 bg-emerald-500 text-slate-950 font-semibold rounded-xl hover:bg-emerald-400 transition"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/voice"
            className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-500 transition"
          >
            🧠 Talk to Pulse
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-slate-800 text-slate-200 font-semibold rounded-xl hover:bg-slate-700 transition border border-slate-700"
          >
            Refresh
          </button>
        </div>
      </div>
    </main>
  );
}
