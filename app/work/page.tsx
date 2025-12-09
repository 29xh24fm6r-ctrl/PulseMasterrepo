"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Briefcase, DollarSign, TrendingUp, Target, Clock, Phone, Mail, AlertTriangle, ChevronRight, Loader2, ArrowRight, Sparkles, Activity, Zap, Calendar, User, CheckCircle } from "lucide-react";

export default function WorkDashboard() {
  const { userId, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState<any[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [revenueMetrics, setRevenueMetrics] = useState({ pipeline: 0, weighted: 0, closedThisMonth: 0, projectedClose: 0 });
  const [insights, setInsights] = useState<string[]>([]);
  const [nextAction, setNextAction] = useState<any>(null);

  useEffect(() => { if (!isLoaded || !userId) return; fetchData(); }, [userId, isLoaded]);

  async function fetchData() {
    try {
      const [dealsRes, followUpsRes] = await Promise.all([fetch("/api/deals?limit=20"), fetch("/api/follow-ups?status=pending&limit=10")]);
      if (dealsRes.ok) {
        const data = await dealsRes.json();
        const allDeals = data.deals || [];
        const activeDeals = allDeals.filter((d: any) => !d.stage?.toLowerCase().includes("closed"));
        const closedWon = allDeals.filter((d: any) => d.stage?.toLowerCase().includes("won"));
        const pipeline = activeDeals.reduce((sum: number, d: any) => sum + (d.amount || d.value || 0), 0);
        const weighted = activeDeals.reduce((sum: number, d: any) => sum + (d.amount || d.value || 0) * ((d.probability || 50) / 100), 0);
        const closed = closedWon.reduce((sum: number, d: any) => sum + (d.amount || d.value || 0), 0);
        setRevenueMetrics({ pipeline, weighted, closedThisMonth: closed, projectedClose: weighted * 0.8 });
        const enrichedDeals = activeDeals.map((d: any) => ({ ...d, days_in_stage: d.last_activity ? Math.floor((Date.now() - new Date(d.last_activity).getTime()) / (1000 * 60 * 60 * 24)) : 0 }));
        enrichedDeals.sort((a: any, b: any) => ((b.amount || b.value || 0) * ((b.probability || 50) / 100)) - ((a.amount || a.value || 0) * ((a.probability || 50) / 100)));
        setDeals(enrichedDeals);
        const newInsights: string[] = [];
        const stuckDeals = enrichedDeals.filter((d: any) => (d.days_in_stage || 0) > 7);
        if (stuckDeals.length > 0) newInsights.push(`${stuckDeals.length} deals stuck in current stage for 7+ days`);
        const highValue = enrichedDeals.filter((d: any) => (d.amount || d.value || 0) > 50000);
        if (highValue.length > 0) newInsights.push(`${highValue.length} high-value opportunities need attention`);
        setInsights(newInsights);
        const needsAction = enrichedDeals.find((d: any) => (d.days_in_stage || 0) > 3);
        if (needsAction) setNextAction({ title: `Follow up on ${needsAction.name}`, subtitle: `$${((needsAction.amount || needsAction.value || 0) / 1000).toFixed(0)}k • ${needsAction.days_in_stage} days since last activity`, href: `/deals` });
      }
      if (followUpsRes.ok) { const data = await followUpsRes.json(); setFollowUps(data.followUps || []); }
    } catch (error) { console.error("Failed to fetch data:", error); }
    finally { setLoading(false); }
  }

  const formatCurrency = (amount: number) => { if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`; if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}k`; return `$${amount}`; };
  const hotDeals = deals.filter((d) => (d.probability || 0) >= 70);
  const warmDeals = deals.filter((d) => (d.probability || 0) >= 40 && (d.probability || 0) < 70);
  const coldDeals = deals.filter((d) => (d.probability || 0) < 40);

  if (!isLoaded || loading) return <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl"><Briefcase className="w-8 h-8 text-green-400" /></div>
            <div><h1 className="text-3xl font-bold">Command Center</h1><p className="text-zinc-400">Revenue engine & deal intelligence</p></div>
          </div>
          <Link href="/deals" className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg"><DollarSign className="w-4 h-4" />Manage Deals</Link>
        </div>

        {nextAction && (
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-green-400" /><span className="text-sm font-medium text-green-400">NEXT ACTION</span></div>
            <div className="flex items-center justify-between">
              <div><h2 className="text-xl font-bold">{nextAction.title}</h2><p className="text-zinc-400 text-sm">{nextAction.subtitle}</p></div>
              <Link href={nextAction.href} className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-500 rounded-xl font-medium">Take Action<ArrowRight className="w-4 h-4" /></Link>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"><div className="flex items-center gap-2 text-zinc-400 mb-2"><Activity className="w-4 h-4" /><span className="text-sm">Pipeline</span></div><div className="text-2xl font-bold text-white">{formatCurrency(revenueMetrics.pipeline)}</div></div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"><div className="flex items-center gap-2 text-zinc-400 mb-2"><Target className="w-4 h-4" /><span className="text-sm">Weighted</span></div><div className="text-2xl font-bold text-green-400">{formatCurrency(revenueMetrics.weighted)}</div></div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"><div className="flex items-center gap-2 text-zinc-400 mb-2"><CheckCircle className="w-4 h-4" /><span className="text-sm">Closed (MTD)</span></div><div className="text-2xl font-bold text-emerald-400">{formatCurrency(revenueMetrics.closedThisMonth)}</div></div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4"><div className="flex items-center gap-2 text-zinc-400 mb-2"><TrendingUp className="w-4 h-4" /><span className="text-sm">Projected</span></div><div className="text-2xl font-bold text-blue-400">{formatCurrency(revenueMetrics.projectedClose)}</div></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Target className="w-5 h-5 text-violet-400" />Deal Movement Radar</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-4 bg-red-500/10 border border-red-500/30 rounded-xl"><div className="text-3xl font-bold text-red-400 mb-1">{hotDeals.length}</div><div className="text-xs text-zinc-400">🔥 Hot (70%+)</div><div className="text-xs text-red-400 mt-1">{formatCurrency(hotDeals.reduce((s, d) => s + (d.amount || d.value || 0), 0))}</div></div>
              <div className="text-center p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl"><div className="text-3xl font-bold text-amber-400 mb-1">{warmDeals.length}</div><div className="text-xs text-zinc-400">🌡️ Warm (40-70%)</div><div className="text-xs text-amber-400 mt-1">{formatCurrency(warmDeals.reduce((s, d) => s + (d.amount || d.value || 0), 0))}</div></div>
              <div className="text-center p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl"><div className="text-3xl font-bold text-blue-400 mb-1">{coldDeals.length}</div><div className="text-xs text-zinc-400">❄️ Cold (&lt;40%)</div><div className="text-xs text-blue-400 mt-1">{formatCurrency(coldDeals.reduce((s, d) => s + (d.amount || d.value || 0), 0))}</div></div>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-400" />Opportunity Scanner</h2>
            {insights.length > 0 ? (
              <div className="space-y-3">{insights.map((insight, i) => <div key={i} className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg"><AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" /><span className="text-sm">{insight}</span></div>)}</div>
            ) : <div className="text-center py-8 text-zinc-500"><CheckCircle className="w-10 h-10 mx-auto mb-2 text-green-400 opacity-50" /><p>Pipeline looking healthy!</p></div>}
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold flex items-center gap-2"><TrendingUp className="w-5 h-5 text-green-400" />Top Deals to Push</h2><Link href="/deals" className="text-sm text-violet-400 flex items-center gap-1">All deals <ChevronRight className="w-4 h-4" /></Link></div>
          <div className="space-y-3">
            {deals.slice(0, 3).map((deal, i) => (
              <div key={deal.id} className={`p-4 rounded-xl border transition-all hover:border-green-500/50 ${i === 0 ? "bg-green-500/10 border-green-500/30" : "bg-zinc-800/50 border-zinc-700"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i === 0 ? "bg-green-500 text-white" : "bg-zinc-700 text-zinc-300"}`}>{i + 1}</div>
                    <div><div className="font-semibold">{deal.name}</div><div className="text-sm text-zinc-400 flex items-center gap-2">{deal.contact_name && <><User className="w-3 h-3" />{deal.contact_name}</>}<span>• {deal.stage}</span></div></div>
                  </div>
                  <div className="text-right"><div className="text-xl font-bold text-green-400">{formatCurrency(deal.amount || deal.value || 0)}</div><div className="text-xs text-zinc-500">{deal.probability || 50}% • {deal.days_in_stage || 0}d in stage</div></div>
                </div>
                {deal.next_action && <div className="mt-3 pt-3 border-t border-zinc-700 text-sm text-zinc-400"><span className="text-green-400">Next:</span> {deal.next_action}</div>}
              </div>
            ))}
            {deals.length === 0 && <div className="text-center py-8 text-zinc-500"><DollarSign className="w-12 h-12 mx-auto mb-2 opacity-30" /><p>No active deals yet</p><Link href="/deals" className="text-green-400 text-sm">Create your first deal</Link></div>}
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-400" />Follow-up Pipeline</h2><Link href="/follow-ups" className="text-sm text-violet-400 flex items-center gap-1">View all <ChevronRight className="w-4 h-4" /></Link></div>
          <div className="space-y-2">
            {followUps.slice(0, 5).map((fu) => (
              <div key={fu.id} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
                <div className={`p-2 rounded-lg ${fu.type === "call" ? "bg-green-500/20" : fu.type === "email" ? "bg-blue-500/20" : "bg-zinc-700"}`}>
                  {fu.type === "call" ? <Phone className="w-4 h-4 text-green-400" /> : fu.type === "email" ? <Mail className="w-4 h-4 text-blue-400" /> : <Clock className="w-4 h-4 text-zinc-400" />}
                </div>
                <div className="flex-1"><div className="font-medium">{fu.title}</div>{fu.contact_name && <div className="text-xs text-zinc-500">{fu.contact_name}</div>}</div>
                <div className="text-xs text-zinc-500">{new Date(fu.due_date).toLocaleDateString()}</div>
              </div>
            ))}
            {followUps.length === 0 && <div className="text-center py-6 text-zinc-500"><CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">No pending follow-ups</p></div>}
          </div>
        </div>
      </div>
    </div>
  );
}
