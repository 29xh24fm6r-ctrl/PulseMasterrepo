"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Compass, Target, Map, Lightbulb, AlertTriangle, TrendingUp, Clock, Play, Loader2, Sparkles, ArrowRight, ChevronRight, Eye, Layers, Brain } from "lucide-react";

export default function StrategyDashboard() {
  const { userId, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<any[]>([]);
  const [simulations, setSimulations] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [atRiskGoals, setAtRiskGoals] = useState<any[]>([]);
  const [showSimModal, setShowSimModal] = useState(false);
  const [simInput, setSimInput] = useState("");
  const [runningSim, setRunningSim] = useState(false);

  useEffect(() => { if (!isLoaded || !userId) return; fetchData(); }, [userId, isLoaded]);

  async function fetchData() {
    try {
      const [goalsRes, simsRes, insightsRes] = await Promise.all([
        fetch("/api/goals?limit=10"), fetch("/api/simulations?limit=5"), fetch("/api/third-brain/insights?limit=6"),
      ]);
      if (goalsRes.ok) {
        const data = await goalsRes.json();
        const allGoals = data.goals || [];
        setGoals(allGoals);
        const now = new Date();
        const twoWeeksFromNow = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        setAtRiskGoals(allGoals.filter((g: any) => g.target_date && new Date(g.target_date) <= twoWeeksFromNow && (g.progress || 0) < 50));
      }
      if (simsRes.ok) { const data = await simsRes.json(); setSimulations(data.simulations || []); }
      if (insightsRes.ok) { const data = await insightsRes.json(); setInsights(data.insights || []); }
    } catch (error) { console.error("Failed to fetch data:", error); }
    finally { setLoading(false); }
  }

  async function runSimulation() {
    if (!simInput.trim()) return;
    setRunningSim(true);
    try {
      const res = await fetch("/api/simulations/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario: simInput }) });
      if (res.ok) { setSimInput(""); setShowSimModal(false); fetchData(); }
    } catch (error) { console.error("Failed to run simulation:", error); }
    finally { setRunningSim(false); }
  }

  const completedGoals = goals.filter((g) => (g.progress || 0) >= 100).length;
  const activeGoals = goals.filter((g) => (g.progress || 0) < 100);

  if (!isLoaded || loading) return <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500/20 to-blue-500/20 rounded-xl"><Compass className="w-8 h-8 text-indigo-400" /></div>
            <div><h1 className="text-3xl font-bold">War Room</h1><p className="text-zinc-400">Strategic command & foresight</p></div>
          </div>
          <button onClick={() => setShowSimModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg"><Play className="w-4 h-4" />Run Simulation</button>
        </div>

        {atRiskGoals.length > 0 && (
          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-amber-400" /><span className="text-sm font-medium text-amber-400">GOAL RISK ALERT</span></div>
            <div className="flex items-center justify-between">
              <div><h2 className="text-xl font-bold">{atRiskGoals.length} goal{atRiskGoals.length > 1 ? "s" : ""} at risk</h2><p className="text-zinc-400 text-sm">{atRiskGoals[0]?.title} — {atRiskGoals[0]?.progress || 0}% complete, deadline approaching</p></div>
              <Link href={`/goals`} className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 rounded-xl font-medium">Review Goals<ArrowRight className="w-4 h-4" /></Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"><div className="flex items-center gap-2 text-zinc-400 mb-2"><Target className="w-4 h-4" /><span className="text-sm">Active Goals</span></div><div className="text-2xl font-bold">{activeGoals.length}</div></div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"><div className="flex items-center gap-2 text-zinc-400 mb-2"><TrendingUp className="w-4 h-4" /><span className="text-sm">Completed</span></div><div className="text-2xl font-bold text-green-400">{completedGoals}</div></div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"><div className="flex items-center gap-2 text-zinc-400 mb-2"><Map className="w-4 h-4" /><span className="text-sm">Simulations</span></div><div className="text-2xl font-bold text-indigo-400">{simulations.length}</div></div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"><div className="flex items-center gap-2 text-zinc-400 mb-2"><Lightbulb className="w-4 h-4" /><span className="text-sm">Insights</span></div><div className="text-2xl font-bold text-yellow-400">{insights.length}</div></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold flex items-center gap-2"><Target className="w-5 h-5 text-blue-400" />Goal Map</h3><Link href="/goals" className="text-sm text-violet-400 flex items-center gap-1">All goals <ChevronRight className="w-4 h-4" /></Link></div>
            <div className="space-y-4">
              {activeGoals.slice(0, 5).map((goal) => {
                const isAtRisk = atRiskGoals.find((g) => g.id === goal.id);
                return (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">{isAtRisk && <AlertTriangle className="w-4 h-4 text-amber-400" />}<span className="font-medium">{goal.title}</span></div>
                      <span className={`text-sm ${isAtRisk ? "text-amber-400" : "text-zinc-400"}`}>{goal.progress || 0}%</span>
                    </div>
                    <div className="h-2 bg-zinc-700 rounded-full overflow-hidden"><div className={`h-full rounded-full ${isAtRisk ? "bg-amber-500" : (goal.progress || 0) >= 70 ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${goal.progress || 0}%` }} /></div>
                    {goal.target_date && <div className="flex items-center gap-1 text-xs text-zinc-500"><Clock className="w-3 h-3" />Target: {new Date(goal.target_date).toLocaleDateString()}</div>}
                  </div>
                );
              })}
              {goals.length === 0 && <div className="text-center py-8 text-zinc-500"><Target className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No goals set yet</p><Link href="/goals" className="text-violet-400 text-sm">Create your first goal</Link></div>}
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold flex items-center gap-2"><Lightbulb className="w-5 h-5 text-yellow-400" />Strategic Insights</h3><Link href="/intelligence" className="text-sm text-violet-400 flex items-center gap-1">More <ChevronRight className="w-4 h-4" /></Link></div>
            <div className="space-y-3">
              {insights.slice(0, 4).map((insight) => (
                <div key={insight.id} className="p-3 bg-zinc-800/50 rounded-lg border-l-2 border-yellow-500"><p className="text-sm">{insight.content}</p><div className="text-xs text-zinc-500 mt-1">{new Date(insight.created_at).toLocaleDateString()}</div></div>
              ))}
              {insights.length === 0 && <div className="text-center py-8 text-zinc-500"><Lightbulb className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>Insights will appear as you use Pulse</p></div>}
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold flex items-center gap-2"><Map className="w-5 h-5 text-indigo-400" />Recent Simulations</h3><Link href="/life-intelligence/simulation" className="text-sm text-violet-400 flex items-center gap-1">All simulations <ChevronRight className="w-4 h-4" /></Link></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {simulations.slice(0, 3).map((sim) => (
              <Link key={sim.id} href={`/life-intelligence/simulation`} className="p-4 bg-zinc-800/50 rounded-xl hover:bg-zinc-800">
                <div className="flex items-start gap-3"><Eye className="w-5 h-5 text-indigo-400 shrink-0 mt-1" /><div><div className="font-medium line-clamp-2">{sim.scenario}</div>{sim.summary && <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{sim.summary}</p>}<div className="text-xs text-zinc-500 mt-2">{new Date(sim.created_at).toLocaleDateString()}</div></div></div>
              </Link>
            ))}
            {simulations.length === 0 && <div className="col-span-3 text-center py-8 text-zinc-500"><Map className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No simulations yet</p><button onClick={() => setShowSimModal(true)} className="text-indigo-400 text-sm">Run your first simulation</button></div>}
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Brain className="w-5 h-5 text-purple-400" />Quick Decision Tools</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button onClick={() => setShowSimModal(true)} className="p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl hover:bg-indigo-500/20 text-left"><Map className="w-6 h-6 text-indigo-400 mb-2" /><div className="font-medium">What-If</div><div className="text-xs text-zinc-500">Explore scenarios</div></button>
            <Link href="/goals" className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl hover:bg-blue-500/20"><Target className="w-6 h-6 text-blue-400 mb-2" /><div className="font-medium">Goal Check</div><div className="text-xs text-zinc-500">Review progress</div></Link>
            <Link href="/intelligence" className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl hover:bg-purple-500/20"><Layers className="w-6 h-6 text-purple-400 mb-2" /><div className="font-medium">Insights</div><div className="text-xs text-zinc-500">AI analysis</div></Link>
            <Link href="/planner" className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl hover:bg-green-500/20"><TrendingUp className="w-6 h-6 text-green-400 mb-2" /><div className="font-medium">90-Day Plan</div><div className="text-xs text-zinc-500">Strategic roadmap</div></Link>
          </div>
        </div>
      </div>

      {showSimModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Map className="w-6 h-6 text-indigo-400" />Run a Simulation</h3>
            <p className="text-zinc-400 text-sm mb-4">Describe a scenario or decision you want to explore.</p>
            <textarea value={simInput} onChange={(e) => setSimInput(e.target.value)} placeholder="What if I quit my job and started my own business?" className="w-full h-32 bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-none" />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setShowSimModal(false)} className="px-4 py-2 text-zinc-400 hover:text-white">Cancel</button>
              <button onClick={runSimulation} disabled={runningSim || !simInput.trim()} className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg font-medium">
                {runningSim ? <><Loader2 className="w-4 h-4 animate-spin" />Running...</> : <><Play className="w-4 h-4" />Run Simulation</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
