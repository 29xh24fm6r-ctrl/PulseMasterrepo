"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Users, ChevronRight, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

interface ContactScore {
  totalScore: number;
  tier: string;
  trend: "rising" | "stable" | "declining";
}

interface ScoredContact {
  id: string;
  name: string;
  company: string;
  score: ContactScore;
}

const TIER_ICONS: Record<string, string> = {
  platinum: "💎",
  gold: "🥇",
  silver: "🥈",
  bronze: "🥉",
  inactive: "💤",
};

export function ContactScoreWidget() {
  const [contacts, setContacts] = useState<ScoredContact[]>([]);
  const [stats, setStats] = useState<{ avgScore: number; decliningCount: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    try {
      const res = await fetch("/api/contacts/scoring?limit=5&sortBy=score");
      const data = await res.json();
      setContacts(data.contacts?.slice(0, 4) || []);
      setStats(data.stats || null);
    } catch (err) {
      // Mock data fallback
      setContacts([
        { id: "1", name: "Lisa Thompson", company: "GrowthCo", score: { totalScore: 92, tier: "platinum", trend: "rising" } },
        { id: "2", name: "Sarah Chen", company: "TechCorp", score: { totalScore: 85, tier: "platinum", trend: "stable" } },
        { id: "3", name: "Robert Chang", company: "Innovate", score: { totalScore: 71, tier: "gold", trend: "rising" } },
        { id: "4", name: "Michael Roberts", company: "Acme", score: { totalScore: 65, tier: "gold", trend: "declining" } },
      ]);
      setStats({ avgScore: 58, decliningCount: 2 });
    } finally {
      setLoading(false);
    }
  }

  function getScoreColor(score: number): string {
    if (score >= 80) return "#a855f7";
    if (score >= 60) return "#f59e0b";
    if (score >= 40) return "#94a3b8";
    return "#6b7280";
  }

  if (loading) {
    return (
      <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-pink-400" />
          <h2 className="font-semibold">Top Contacts</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-pink-400" />
          <h2 className="font-semibold">Top Contacts</h2>
        </div>
        <Link
          href="/contacts/scoring"
          className="text-xs text-zinc-500 hover:text-pink-400 flex items-center gap-1"
        >
          View All
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Alert if declining */}
      {stats && stats.decliningCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg mb-4 text-xs">
          <AlertTriangle className="w-3 h-3 text-red-400" />
          <span className="text-red-400">{stats.decliningCount} contacts declining</span>
        </div>
      )}

      {/* Contacts List */}
      <div className="space-y-3">
        {contacts.map((contact) => (
          <div
            key={contact.id}
            className="flex items-center gap-3 p-2 bg-zinc-800/30 rounded-lg hover:bg-zinc-800/50 transition-colors"
          >
            {/* Score */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                backgroundColor: `${getScoreColor(contact.score.totalScore)}20`,
                color: getScoreColor(contact.score.totalScore),
              }}
            >
              {contact.score.totalScore}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium truncate">{contact.name}</span>
                <span>{TIER_ICONS[contact.score.tier]}</span>
              </div>
              <div className="text-xs text-zinc-500 truncate">{contact.company}</div>
            </div>

            {/* Trend */}
            {contact.score.trend === "rising" && (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            )}
            {contact.score.trend === "declining" && (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
          </div>
        ))}
      </div>

      {/* Average Score */}
      {stats && (
        <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
          <span className="text-xs text-zinc-500">Avg Score</span>
          <span
            className="text-sm font-medium"
            style={{ color: getScoreColor(stats.avgScore) }}
          >
            {stats.avgScore}
          </span>
        </div>
      )}
    </div>
  );
}

export default ContactScoreWidget;
