"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  ChevronRight,
  Mail,
  Calendar,
  DollarSign,
  Heart,
  AlertTriangle,
} from "lucide-react";

interface ContactScore {
  contactId: string;
  totalScore: number;
  breakdown: {
    engagement: number;
    recency: number;
    dealValue: number;
    relationship: number;
  };
  tier: string;
  trend: "rising" | "stable" | "declining";
}

interface ScoredContact {
  id: string;
  name: string;
  company: string;
  email: string;
  score: ContactScore;
  factors: {
    emailsSent: number;
    emailsReceived: number;
    meetingsHeld: number;
    lastContactDate: string | null;
    dealValue: number;
    dealsClosed: number;
    dealsInProgress: number;
    relationshipLevel: string;
    notes: number;
    tags: string[];
  };
}

interface Stats {
  totalContacts: number;
  avgScore: number;
  tierBreakdown: Record<string, number>;
  risingCount: number;
  decliningCount: number;
  topPerformers: { id: string; name: string; score: number }[];
  needsAttention: { id: string; name: string; score: number; reason: string }[];
}

const TIER_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  platinum: { label: "Platinum", color: "#a855f7", icon: "💎" },
  gold: { label: "Gold", color: "#f59e0b", icon: "🥇" },
  silver: { label: "Silver", color: "#94a3b8", icon: "🥈" },
  bronze: { label: "Bronze", color: "#cd7f32", icon: "🥉" },
  inactive: { label: "Inactive", color: "#6b7280", icon: "💤" },
};

export default function ContactScoringPage() {
  const [contacts, setContacts] = useState<ScoredContact[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("score");
  const [selectedContact, setSelectedContact] = useState<ScoredContact | null>(null);

  useEffect(() => {
    loadContacts();
  }, [tierFilter, sortBy]);

  async function loadContacts() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tierFilter !== "all") params.set("tier", tierFilter);
      params.set("sortBy", sortBy);

      const res = await fetch(`/api/contacts/scoring?${params}`);
      const data = await res.json();
      setContacts(data.contacts || []);
      setStats(data.stats || null);
    } catch (err) {
      console.error("Failed to load contacts:", err);
    } finally {
      setLoading(false);
    }
  }

  async function recalculateAll() {
    setRefreshing(true);
    try {
      await fetch("/api/contacts/scoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recalculate_all" }),
      });
      await loadContacts();
    } catch (err) {
      console.error("Failed to recalculate:", err);
    } finally {
      setRefreshing(false);
    }
  }

  function getTrendIcon(trend: string) {
    switch (trend) {
      case "rising":
        return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case "declining":
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      default:
        return <Minus className="w-4 h-4 text-zinc-500" />;
    }
  }

  function getScoreColor(score: number): string {
    if (score >= 80) return "#a855f7";
    if (score >= 60) return "#f59e0b";
    if (score >= 40) return "#94a3b8";
    if (score >= 20) return "#cd7f32";
    return "#6b7280";
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="w-7 h-7 text-pink-400" />
                Contact Scoring
              </h1>
              <p className="text-zinc-400 text-sm">Prioritize relationships by engagement and value</p>
            </div>
          </div>
          <button
            onClick={recalculateAll}
            disabled={refreshing}
            className="px-4 py-2 bg-pink-600 hover:bg-pink-500 disabled:opacity-50 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Recalculate All
          </button>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-4 text-center">
              <div className="text-2xl font-bold text-pink-400">{stats.totalContacts}</div>
              <div className="text-xs text-zinc-500">Total Contacts</div>
            </div>
            <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-4 text-center">
              <div className="text-2xl font-bold text-violet-400">{stats.avgScore}</div>
              <div className="text-xs text-zinc-500">Avg Score</div>
            </div>
            <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">{stats.risingCount}</div>
              <div className="text-xs text-zinc-500">Rising 📈</div>
            </div>
            <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-4 text-center">
              <div className="text-2xl font-bold text-red-400">{stats.decliningCount}</div>
              <div className="text-xs text-zinc-500">Declining 📉</div>
            </div>
            <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">
                {stats.tierBreakdown.platinum + stats.tierBreakdown.gold}
              </div>
              <div className="text-xs text-zinc-500">Top Tier</div>
            </div>
          </div>
        )}

        {/* Tier Distribution */}
        {stats && (
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-4">
            <h3 className="font-semibold mb-3">Tier Distribution</h3>
            <div className="flex gap-2">
              {Object.entries(TIER_CONFIG).map(([tier, config]) => {
                const count = stats.tierBreakdown[tier] || 0;
                const pct = stats.totalContacts > 0 ? (count / stats.totalContacts) * 100 : 0;
                return (
                  <div
                    key={tier}
                    className="flex-1 text-center"
                    style={{ flex: Math.max(pct, 10) }}
                  >
                    <div
                      className="h-8 rounded-lg mb-2 flex items-center justify-center text-sm font-medium"
                      style={{ backgroundColor: `${config.color}30` }}
                    >
                      {config.icon} {count}
                    </div>
                    <div className="text-xs text-zinc-500">{config.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-1 bg-zinc-900 rounded-lg p-1">
            <button
              onClick={() => setTierFilter("all")}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                tierFilter === "all" ? "bg-pink-600 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              All
            </button>
            {Object.entries(TIER_CONFIG).map(([tier, config]) => (
              <button
                key={tier}
                onClick={() => setTierFilter(tier)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  tierFilter === tier ? "bg-pink-600 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                {config.icon}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm"
          >
            <option value="score">Sort by Score</option>
            <option value="recency">Sort by Recency</option>
            <option value="dealValue">Sort by Deal Value</option>
          </select>
        </div>

        {/* Alerts */}
        {stats && stats.needsAttention.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <h3 className="font-semibold text-red-400 flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4" />
              Needs Attention ({stats.needsAttention.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {stats.needsAttention.map((contact) => (
                <div
                  key={contact.id}
                  className="px-3 py-1.5 bg-zinc-800/50 rounded-lg text-sm flex items-center gap-2"
                >
                  <span>{contact.name}</span>
                  <span className="text-xs text-zinc-500">— {contact.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contacts Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid gap-4">
            {contacts.map((contact) => {
              const tierConfig = TIER_CONFIG[contact.score.tier] || TIER_CONFIG.inactive;
              return (
                <div
                  key={contact.id}
                  onClick={() => setSelectedContact(contact)}
                  className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-5 cursor-pointer hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Score Circle */}
                      <div className="relative w-14 h-14">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="28"
                            cy="28"
                            r="24"
                            fill="none"
                            stroke="#27272a"
                            strokeWidth="4"
                          />
                          <circle
                            cx="28"
                            cy="28"
                            r="24"
                            fill="none"
                            stroke={getScoreColor(contact.score.totalScore)}
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 24}`}
                            strokeDashoffset={`${2 * Math.PI * 24 * (1 - contact.score.totalScore / 100)}`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-bold">{contact.score.totalScore}</span>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{contact.name}</span>
                          <span className="text-lg">{tierConfig.icon}</span>
                          {getTrendIcon(contact.score.trend)}
                        </div>
                        <div className="text-sm text-zinc-500">{contact.company}</div>
                        <div className="text-xs text-zinc-600">{contact.email}</div>
                      </div>
                    </div>

                    {/* Score Breakdown */}
                    <div className="hidden md:flex items-center gap-6">
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-sm">
                          <Mail className="w-3 h-3 text-blue-400" />
                          <span>{contact.score.breakdown.engagement}/25</span>
                        </div>
                        <div className="text-[10px] text-zinc-500">Engagement</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3 h-3 text-emerald-400" />
                          <span>{contact.score.breakdown.recency}/25</span>
                        </div>
                        <div className="text-[10px] text-zinc-500">Recency</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-sm">
                          <DollarSign className="w-3 h-3 text-amber-400" />
                          <span>{contact.score.breakdown.dealValue}/25</span>
                        </div>
                        <div className="text-[10px] text-zinc-500">Deal Value</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-sm">
                          <Heart className="w-3 h-3 text-pink-400" />
                          <span>{contact.score.breakdown.relationship}/25</span>
                        </div>
                        <div className="text-[10px] text-zinc-500">Relationship</div>
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-zinc-600" />
                  </div>

                  {/* Tags */}
                  {contact.factors.tags.length > 0 && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-800">
                      {contact.factors.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-400"
                        >
                          {tag}
                        </span>
                      ))}
                      <span className="text-xs text-zinc-600 ml-auto">
                        Last contact: {formatDate(contact.factors.lastContactDate)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Contact Detail Modal */}
      {selectedContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedContact(null)}
          />
          <div className="relative bg-zinc-900 rounded-2xl border border-zinc-700 w-full max-w-lg max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                  style={{ backgroundColor: `${getScoreColor(selectedContact.score.totalScore)}30` }}
                >
                  {TIER_CONFIG[selectedContact.score.tier]?.icon || "👤"}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selectedContact.name}</h2>
                  <p className="text-sm text-zinc-500">{selectedContact.company}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold" style={{ color: getScoreColor(selectedContact.score.totalScore) }}>
                  {selectedContact.score.totalScore}
                </div>
                <div className="text-xs text-zinc-500">Score</div>
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="space-y-3 mb-6">
              {[
                { key: "engagement", label: "Engagement", icon: Mail, color: "#3b82f6" },
                { key: "recency", label: "Recency", icon: Calendar, color: "#10b981" },
                { key: "dealValue", label: "Deal Value", icon: DollarSign, color: "#f59e0b" },
                { key: "relationship", label: "Relationship", icon: Heart, color: "#ec4899" },
              ].map(({ key, label, icon: Icon, color }) => (
                <div key={key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="flex items-center gap-2 text-zinc-400">
                      <Icon className="w-4 h-4" style={{ color }} />
                      {label}
                    </span>
                    <span>{selectedContact.score.breakdown[key as keyof typeof selectedContact.score.breakdown]}/25</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(selectedContact.score.breakdown[key as keyof typeof selectedContact.score.breakdown] / 25) * 100}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Factors */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="text-zinc-500 text-xs">Emails Exchanged</div>
                <div className="font-medium">
                  {selectedContact.factors.emailsSent + selectedContact.factors.emailsReceived}
                </div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="text-zinc-500 text-xs">Meetings</div>
                <div className="font-medium">{selectedContact.factors.meetingsHeld}</div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="text-zinc-500 text-xs">Deal Value</div>
                <div className="font-medium">
                  ${selectedContact.factors.dealValue.toLocaleString()}
                </div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="text-zinc-500 text-xs">Deals Closed</div>
                <div className="font-medium">{selectedContact.factors.dealsClosed}</div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="text-zinc-500 text-xs">Relationship</div>
                <div className="font-medium capitalize">
                  {selectedContact.factors.relationshipLevel}
                </div>
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <div className="text-zinc-500 text-xs">Last Contact</div>
                <div className="font-medium">
                  {formatDate(selectedContact.factors.lastContactDate)}
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedContact(null)}
              className="w-full mt-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
