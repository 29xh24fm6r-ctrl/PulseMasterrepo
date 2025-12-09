"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, DollarSign, TrendingUp, Clock, AlertTriangle, 
  ChevronRight, RefreshCw, Trophy, Target, Building2
} from "lucide-react";
import { useXPToast } from "../components/xp-toast";

type Deal = {
  id: string;
  name: string;
  value: number;
  stage: string;
  status: string;
  company?: string;
  contact?: string;
  daysSinceUpdate: number;
  lastUpdated: string;
  probability?: number;
};

const STAGES = [
  { name: "Lead", color: "bg-slate-500", textColor: "text-slate-400" },
  { name: "Qualified", color: "bg-blue-500", textColor: "text-blue-400" },
  { name: "Proposal", color: "bg-purple-500", textColor: "text-purple-400" },
  { name: "Negotiation", color: "bg-yellow-500", textColor: "text-yellow-400" },
  { name: "Won", color: "bg-green-500", textColor: "text-green-400" },
  { name: "Lost", color: "bg-red-500", textColor: "text-red-400" },
];

const ADVANCED_STAGES = ["Proposal", "Negotiation", "Contract", "Processing", "Underwriting", "Approved"];
const WON_STAGES = ["Won", "Closed Won", "Funded", "Completed"];

export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'stale' | 'won'>('active');
  const [updating, setUpdating] = useState<string | null>(null);
  const { showXPToast } = useXPToast();

  useEffect(() => {
    loadDeals();
  }, []);

  async function loadDeals() {
    try {
      setLoading(true);
      const res = await fetch("/api/notion/deals");
      if (!res.ok) throw new Error("Failed to load deals");
      const data = await res.json();
      setDeals(data.deals ?? []);
    } catch (err) {
      console.error("Failed to load deals:", err);
    } finally {
      setLoading(false);
    }
  }

  async function updateDealStage(dealId: string, newStage: string) {
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;

    const previousStage = deal.stage;
    setUpdating(dealId);

    try {
      const res = await fetch("/api/deals/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId, newStatus: newStage }),
      });

      if (res.ok) {
        const data = await res.json();

        // Update local state
        setDeals(prev => prev.map(d =>
          d.id === dealId
            ? { ...d, stage: newStage, status: newStage, daysSinceUpdate: 0 }
            : d
        ));

        // 🎉 Show XP Toast based on stage change
        if (data.xp) {
          const isWon = WON_STAGES.includes(newStage);
          const isAdvanced = ADVANCED_STAGES.includes(newStage);
          
          showXPToast({
            amount: data.xp.amount || (isWon ? 150 : isAdvanced ? 50 : 0),
            category: data.xp.category || "AXP",
            activity: isWon 
              ? `🏆 Deal Won: ${deal.name}` 
              : `${deal.name} → ${newStage}`,
            wasCrit: data.xp.wasCrit || false,
            critMultiplier: data.xp.critMultiplier,
          });
        } else if (WON_STAGES.includes(newStage)) {
          showXPToast({
            amount: 150,
            category: "AXP",
            activity: `🏆 Deal Won: ${deal.name}`,
            wasCrit: false,
          });
        } else if (ADVANCED_STAGES.includes(newStage) && !ADVANCED_STAGES.includes(previousStage)) {
          showXPToast({
            amount: 50,
            category: "AXP",
            activity: `${deal.name} → ${newStage}`,
            wasCrit: false,
          });
        }
      }
    } catch (err) {
      console.error("Failed to update deal:", err);
    } finally {
      setUpdating(null);
    }
  }

  // Calculate stats
  const activeDeals = deals.filter(d => !WON_STAGES.includes(d.stage) && d.stage !== 'Lost');
  const staleDeals = activeDeals.filter(d => d.daysSinceUpdate >= 7);
  const wonDeals = deals.filter(d => WON_STAGES.includes(d.stage));
  const totalPipeline = activeDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  const wonValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);

  // Filter deals
  const filteredDeals = deals.filter(d => {
    if (filter === 'active') return !WON_STAGES.includes(d.stage) && d.stage !== 'Lost';
    if (filter === 'stale') return d.daysSinceUpdate >= 7 && !WON_STAGES.includes(d.stage) && d.stage !== 'Lost';
    if (filter === 'won') return WON_STAGES.includes(d.stage);
    return true;
  }).sort((a, b) => (b.value || 0) - (a.value || 0));

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value}`;
  };

  const getStageColor = (stage: string) => {
    const stageConfig = STAGES.find(s => s.name.toLowerCase() === stage?.toLowerCase());
    return stageConfig || STAGES[0];
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
              💰 Deals
            </h1>
            <p className="text-slate-400 text-sm">Track your pipeline</p>
          </div>
        </div>
        <button
          onClick={loadDeals}
          className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{formatCurrency(totalPipeline)}</div>
          <div className="text-xs text-slate-400 uppercase">Pipeline</div>
        </div>
        <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{wonDeals.length}</div>
          <div className="text-xs text-green-400 uppercase">Won</div>
        </div>
        <div className="bg-blue-900/30 border border-blue-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{activeDeals.length}</div>
          <div className="text-xs text-blue-400 uppercase">Active</div>
        </div>
        <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{staleDeals.length}</div>
          <div className="text-xs text-red-400 uppercase">Stale (7+ days)</div>
        </div>
      </div>

      {/* Stale Deals Warning */}
      {staleDeals.length > 0 && filter !== 'won' && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 text-red-400 font-semibold mb-2">
            <AlertTriangle className="w-5 h-5" />
            {staleDeals.length} Stale Deal{staleDeals.length > 1 ? 's' : ''}
          </div>
          <p className="text-sm text-slate-300">
            These deals haven't been updated in 7+ days. Time to follow up!
          </p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
            filter === 'active'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Active ({activeDeals.length})
        </button>
        <button
          onClick={() => setFilter('stale')}
          className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
            filter === 'stale'
              ? 'bg-red-500 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Stale ({staleDeals.length})
        </button>
        <button
          onClick={() => setFilter('won')}
          className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
            filter === 'won'
              ? 'bg-green-500 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Won ({wonDeals.length})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl font-semibold text-sm transition-colors ${
            filter === 'all'
              ? 'bg-purple-500 text-white'
              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          All ({deals.length})
        </button>
      </div>

      {/* Deals List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-pulse">💰</div>
            <div className="text-slate-400">Loading deals...</div>
          </div>
        </div>
      ) : filteredDeals.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-4">📊</div>
          <div className="text-slate-400">
            {filter === 'active' ? 'No active deals' : 
             filter === 'stale' ? 'No stale deals - great job!' :
             filter === 'won' ? 'No won deals yet' : 'No deals found'}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDeals.map((deal) => {
            const stageConfig = getStageColor(deal.stage);
            const isStale = deal.daysSinceUpdate >= 7 && !WON_STAGES.includes(deal.stage);
            const isWon = WON_STAGES.includes(deal.stage);

            return (
              <div
                key={deal.id}
                className={`bg-slate-900/70 border rounded-xl p-4 transition-all ${
                  isWon
                    ? 'border-green-500/30 bg-green-900/10'
                    : isStale
                    ? 'border-red-500/50 bg-red-900/10'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Deal Icon */}
                  <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center ${
                    isWon ? 'bg-green-500/20' : 'bg-slate-800'
                  }`}>
                    {isWon ? (
                      <Trophy className="w-6 h-6 text-green-400" />
                    ) : (
                      <DollarSign className="w-6 h-6 text-green-400" />
                    )}
                  </div>

                  {/* Deal Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-200">{deal.name}</div>
                    <div className="flex items-center gap-3 mt-1 text-sm flex-wrap">
                      {deal.company && (
                        <span className="text-slate-500 flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {deal.company}
                        </span>
                      )}
                      <span className={`flex items-center gap-1 ${isStale ? 'text-red-400' : 'text-slate-500'}`}>
                        <Clock className="w-3 h-3" />
                        {deal.daysSinceUpdate === 0 ? 'Today' : `${deal.daysSinceUpdate}d ago`}
                      </span>
                    </div>
                  </div>

                  {/* Value */}
                  <div className="text-right">
                    <div className="text-xl font-bold text-green-400">
                      {formatCurrency(deal.value || 0)}
                    </div>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${stageConfig.color} bg-opacity-20 ${stageConfig.textColor}`}>
                      {deal.stage}
                    </span>
                  </div>
                </div>

                {/* Stage Selector (for active deals) */}
                {!isWon && deal.stage !== 'Lost' && (
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <div className="text-xs text-slate-500 mb-2">Move to stage:</div>
                    <div className="flex flex-wrap gap-2">
                      {STAGES.filter(s => s.name !== 'Lost' && s.name !== deal.stage).map((stage) => (
                        <button
                          key={stage.name}
                          onClick={() => updateDealStage(deal.id, stage.name)}
                          disabled={updating === deal.id}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all hover:scale-105 ${
                            stage.name === 'Won' 
                              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                              : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                          }`}
                        >
                          {updating === deal.id ? '...' : stage.name}
                          {stage.name === 'Won' && ' 🏆'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* XP Info Card */}
      <div className="mt-8 bg-green-900/20 border border-green-500/30 rounded-xl p-4">
        <div className="flex items-center gap-2 text-green-400 font-semibold mb-2">
          <TrendingUp className="w-5 h-5" />
          XP Rewards
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-slate-400">Deal Advanced</div>
            <div className="text-green-300 font-semibold">+50 AXP</div>
          </div>
          <div>
            <div className="text-slate-400">Deal Won</div>
            <div className="text-green-300 font-semibold">+150 AXP</div>
          </div>
          <div>
            <div className="text-slate-400">Crit Bonus</div>
            <div className="text-yellow-300 font-semibold">2-4x Multiplier</div>
          </div>
        </div>
      </div>
    </main>
  );
}
