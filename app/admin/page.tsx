"use client";
import React, { useState, useEffect } from "react";
import { Users, Crown, DollarSign, Zap, TrendingUp, Gift, RefreshCw, BarChart3, Activity } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) { setError(res.status === 401 ? "Unauthorized" : "Failed"); return; }
      setStats((await res.json()).stats);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadStats(); }, []);

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><RefreshCw className="w-8 h-8 text-violet-400 animate-spin" /></div>;
  if (error) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-red-400">{error}</div>;
  if (!stats) return null;

  const cards = [
    { title: "Total Users", value: stats.users.total, icon: Users, color: "text-blue-400", sub: "" },
    { title: "Pulse+", value: stats.users.plus, icon: Crown, color: "text-amber-400", sub: stats.users.conversionRate },
    { title: "MRR", value: "$" + stats.revenue.mrr, icon: DollarSign, color: "text-emerald-400", sub: "$" + stats.revenue.arr + " ARR" },
    { title: "AI Calls", value: stats.usage.totalAICalls, icon: Zap, color: "text-violet-400", sub: "$" + stats.usage.estimatedCost + " cost" },
    { title: "Tokens", value: stats.usage.totalTokensUsed, icon: Activity, color: "text-pink-400", sub: stats.usage.avgTokensPerUser + "/user" },
    { title: "Active", value: stats.users.active, icon: TrendingUp, color: "text-cyan-400", sub: "this month" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-6 h-6 text-violet-400" />Admin Dashboard</h1>
          <button onClick={loadStats} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 rounded-lg hover:bg-zinc-700"><RefreshCw className="w-4 h-4" />Refresh</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {cards.map((c) => (<div key={c.title} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900"><div className="flex items-center gap-2 mb-2"><c.icon className={"w-4 h-4 " + c.color} /><span className="text-xs text-zinc-400">{c.title}</span></div><div className="text-2xl font-bold">{c.value}</div>{c.sub && <div className="text-xs text-zinc-500">{c.sub}</div>}</div>))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
            <h2 className="text-lg font-semibold mb-4">Feature Usage</h2>
            {Object.entries(stats.featureUsage || {}).sort(([,a]: any,[,b]: any) => b-a).slice(0,10).map(([f,c]: any) => (<div key={f} className="flex justify-between py-1"><span className="text-zinc-300">{f}</span><span className="text-zinc-500">{c}</span></div>))}
            {Object.keys(stats.featureUsage || {}).length === 0 && <p className="text-zinc-500">No usage yet</p>}
          </div>
          <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
            <h2 className="text-lg font-semibold mb-4">Top Users</h2>
            {stats.topUsers?.map((u: any, i: number) => (<div key={i} className="flex justify-between py-1"><span className="text-zinc-300">{u.email}{u.plan === "plus" && <Crown className="inline w-3 h-3 text-amber-400 ml-1" />}</span><span className="text-zinc-500">{u.tokensUsed}</span></div>))}
            {(!stats.topUsers || stats.topUsers.length === 0) && <p className="text-zinc-500">No users yet</p>}
          </div>
          <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
            <h2 className="text-lg font-semibold mb-4">Recent Signups</h2>
            {stats.recentSignups?.map((u: any, i: number) => (<div key={i} className="flex justify-between py-1"><span className="text-zinc-300">{u.email}</span><span className="text-zinc-500">{new Date(u.date).toLocaleDateString()}</span></div>))}
            {(!stats.recentSignups || stats.recentSignups.length === 0) && <p className="text-zinc-500">No signups yet</p>}
          </div>
          <div className="p-6 bg-zinc-900 rounded-xl border border-zinc-800">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Gift className="w-5 h-5 text-pink-400" />Referrals</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div><div className="text-2xl font-bold">{stats.referrals.total}</div><div className="text-xs text-zinc-500">Total</div></div>
              <div><div className="text-2xl font-bold text-emerald-400">{stats.referrals.credited}</div><div className="text-xs text-zinc-500">Credited</div></div>
              <div><div className="text-2xl font-bold text-amber-400">{stats.referrals.pending}</div><div className="text-xs text-zinc-500">Pending</div></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
