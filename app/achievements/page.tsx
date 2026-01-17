"use client";

export const dynamic = "force-dynamic";


import React, { useState, useEffect } from "react";
import { usePulseContext } from "@/lib/companion/usePulseContext";
import {
  ArrowLeft,
  Trophy,
  Lock,
  CheckCircle2,
  Sparkles,
  Target,
  Flame,
  Briefcase,
  BookOpen,
  CheckSquare,
  Star,
  Filter,
} from "lucide-react";

interface BadgeData {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  category: string;
  requirement: {
    type: string;
    threshold: number;
    description: string;
  };
  xpReward: number;
  isUnlocked: boolean;
  progress: number;
  unlockedAt: string | null;
  rarityConfig: {
    color: string;
    bgColor: string;
    borderColor: string;
    glow: string;
  };
}

interface AchievementStats {
  totalUnlocked: number;
  totalBadges: number;
  totalXpFromBadges: number;
  completionPercentage: number;
  rarityBreakdown: Record<string, { unlocked: number; total: number }>;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  xp: { label: "XP", icon: Sparkles, color: "#f59e0b" },
  streaks: { label: "Streaks", icon: Flame, color: "#ef4444" },
  tasks: { label: "Tasks", icon: CheckSquare, color: "#3b82f6" },
  deals: { label: "Deals", icon: Briefcase, color: "#10b981" },
  identity: { label: "Identity", icon: Target, color: "#8b5cf6" },
  habits: { label: "Habits", icon: Flame, color: "#f97316" },
  journal: { label: "Journal", icon: BookOpen, color: "#ec4899" },
  special: { label: "Special", icon: Star, color: "#fbbf24" },
};

const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary"];

export default function AchievementsPage() {
  usePulseContext({
    title: "Achievements",
    focus: { type: "system", id: "xp_engine", label: "Logic Gate: XP" },
    hints: ["Review Recent Awards", "Check Streak"]
  });
  const [badges, setBadges] = useState<BadgeData[]>([]);
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unlocked" | "locked">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedBadge, setSelectedBadge] = useState<BadgeData | null>(null);

  useEffect(() => {
    loadAchievements();
  }, []);

  async function loadAchievements() {
    try {
      const res = await fetch("/api/achievements");
      const result = await res.json();
      if (result.ok) {
        setBadges(result.badges);
        setStats(result.stats);
      }
    } catch (err) {
      console.error("Failed to load achievements:", err);
    } finally {
      setLoading(false);
    }
  }

  // Filter badges
  const filteredBadges = badges.filter((badge) => {
    if (filter === "unlocked" && !badge.isUnlocked) return false;
    if (filter === "locked" && badge.isUnlocked) return false;
    if (categoryFilter !== "all" && badge.category !== categoryFilter) return false;
    return true;
  });

  // Group by rarity for display
  const badgesByRarity: Record<string, BadgeData[]> = {};
  for (const badge of filteredBadges) {
    if (!badgesByRarity[badge.rarity]) {
      badgesByRarity[badge.rarity] = [];
    }
    badgesByRarity[badge.rarity].push(badge);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              <p className="text-zinc-400">Loading achievements...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Trophy className="w-7 h-7 text-amber-400" />
                Achievements
              </h1>
              <p className="text-zinc-400 text-sm">Unlock badges by reaching milestones</p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-amber-900/30 to-orange-900/30 rounded-2xl border border-amber-500/30 p-5 text-center">
              <div className="text-4xl font-bold text-amber-400">{stats.totalUnlocked}</div>
              <div className="text-sm text-zinc-400">Badges Unlocked</div>
              <div className="text-xs text-zinc-500 mt-1">of {stats.totalBadges} total</div>
            </div>
            <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800 p-5 text-center">
              <div className="text-4xl font-bold text-white">{stats.completionPercentage}%</div>
              <div className="text-sm text-zinc-400">Completion</div>
              <div className="h-2 bg-zinc-800 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                  style={{ width: `${stats.completionPercentage}%` }}
                />
              </div>
            </div>
            <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800 p-5 text-center">
              <div className="text-4xl font-bold text-violet-400">{stats.totalXpFromBadges.toLocaleString()}</div>
              <div className="text-sm text-zinc-400">XP from Badges</div>
            </div>
            <div className="bg-zinc-900/80 rounded-2xl border border-zinc-800 p-5">
              <div className="text-xs text-zinc-500 uppercase mb-2">By Rarity</div>
              <div className="space-y-1">
                {RARITY_ORDER.map((rarity) => {
                  const data = stats.rarityBreakdown[rarity];
                  const colors: Record<string, string> = {
                    common: "#9ca3af",
                    uncommon: "#22c55e",
                    rare: "#3b82f6",
                    epic: "#a855f7",
                    legendary: "#f59e0b",
                  };
                  return (
                    <div key={rarity} className="flex items-center justify-between text-xs">
                      <span className="capitalize" style={{ color: colors[rarity] }}>
                        {rarity}
                      </span>
                      <span className="text-zinc-400">
                        {data.unlocked}/{data.total}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-500">Filter:</span>
          </div>
          <div className="flex gap-2">
            {(["all", "unlocked", "locked"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f
                  ? "bg-amber-500 text-black"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
          <div className="h-6 w-px bg-zinc-800 mx-2" />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${categoryFilter === "all"
                ? "bg-zinc-700 text-white"
                : "bg-zinc-800/50 text-zinc-500 hover:bg-zinc-800"
                }`}
            >
              All
            </button>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => setCategoryFilter(key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${categoryFilter === key
                    ? "bg-zinc-700 text-white"
                    : "bg-zinc-800/50 text-zinc-500 hover:bg-zinc-800"
                    }`}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Badges Grid by Rarity */}
        {RARITY_ORDER.map((rarity) => {
          const rarityBadges = badgesByRarity[rarity];
          if (!rarityBadges || rarityBadges.length === 0) return null;

          const rarityColors: Record<string, { text: string; border: string; bg: string }> = {
            common: { text: "text-zinc-400", border: "border-zinc-600", bg: "bg-zinc-500/10" },
            uncommon: { text: "text-emerald-400", border: "border-emerald-600", bg: "bg-emerald-500/10" },
            rare: { text: "text-blue-400", border: "border-blue-600", bg: "bg-blue-500/10" },
            epic: { text: "text-purple-400", border: "border-purple-600", bg: "bg-purple-500/10" },
            legendary: { text: "text-amber-400", border: "border-amber-600", bg: "bg-amber-500/10" },
          };

          const colors = rarityColors[rarity];

          return (
            <div key={rarity}>
              <div className={`flex items-center gap-2 mb-4 ${colors.text}`}>
                <div className={`w-3 h-3 rounded-full ${colors.bg} ${colors.border} border`} />
                <h2 className="text-lg font-semibold capitalize">{rarity}</h2>
                <span className="text-sm text-zinc-500">
                  ({rarityBadges.filter((b) => b.isUnlocked).length}/{rarityBadges.length})
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                {rarityBadges.map((badge) => (
                  <button
                    key={badge.id}
                    onClick={() => setSelectedBadge(badge)}
                    className={`
                      relative p-4 rounded-xl border transition-all text-left
                      ${badge.isUnlocked
                        ? `${badge.rarityConfig.bgColor} ${badge.rarityConfig.borderColor} hover:scale-105`
                        : "bg-zinc-900/50 border-zinc-800 opacity-60 hover:opacity-80"
                      }
                      ${badge.isUnlocked && badge.rarity === "legendary" ? "shadow-lg shadow-amber-500/20" : ""}
                      ${badge.isUnlocked && badge.rarity === "epic" ? "shadow-lg shadow-purple-500/20" : ""}
                    `}
                  >
                    {/* Lock overlay for locked badges */}
                    {!badge.isUnlocked && (
                      <div className="absolute top-2 right-2">
                        <Lock className="w-4 h-4 text-zinc-600" />
                      </div>
                    )}

                    {/* Badge icon */}
                    <div className="text-3xl mb-2">{badge.icon}</div>

                    {/* Badge name */}
                    <div className={`font-semibold text-sm ${badge.isUnlocked ? "text-white" : "text-zinc-500"}`}>
                      {badge.name}
                    </div>

                    {/* XP reward */}
                    <div className="text-xs text-zinc-500 mt-1">+{badge.xpReward} XP</div>

                    {/* Progress bar for locked badges */}
                    {!badge.isUnlocked && badge.progress > 0 && (
                      <div className="mt-2">
                        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-zinc-600 rounded-full"
                            style={{ width: `${badge.progress}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-zinc-600 mt-1">{badge.progress}%</div>
                      </div>
                    )}

                    {/* Unlocked indicator */}
                    {badge.isUnlocked && (
                      <div className="absolute bottom-2 right-2">
                        <CheckCircle2 className="w-4 h-4" style={{ color: badge.rarityConfig.color }} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {filteredBadges.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No badges match your filters</p>
          </div>
        )}

        {/* Badge Detail Modal */}
        {selectedBadge && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedBadge(null)}
            />
            <div
              className={`
                relative w-full max-w-md rounded-2xl border p-6
                ${selectedBadge.isUnlocked
                  ? `bg-zinc-900 ${selectedBadge.rarityConfig.borderColor}`
                  : "bg-zinc-900 border-zinc-700"
                }
              `}
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedBadge(null)}
                className="absolute top-4 right-4 p-2 hover:bg-zinc-800 rounded-lg"
              >
                ×
              </button>

              {/* Badge display */}
              <div className="text-center">
                <div
                  className={`
                    w-24 h-24 mx-auto rounded-2xl flex items-center justify-center text-5xl mb-4
                    ${selectedBadge.isUnlocked ? selectedBadge.rarityConfig.bgColor : "bg-zinc-800"}
                  `}
                >
                  {selectedBadge.icon}
                </div>

                <div className="flex items-center justify-center gap-2 mb-2">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                    style={{
                      backgroundColor: `${selectedBadge.rarityConfig.color}20`,
                      color: selectedBadge.rarityConfig.color,
                    }}
                  >
                    {selectedBadge.rarity}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 capitalize">
                    {selectedBadge.category}
                  </span>
                </div>

                <h3 className="text-xl font-bold mb-2">{selectedBadge.name}</h3>
                <p className="text-zinc-400 text-sm mb-4">{selectedBadge.description}</p>

                {/* Requirement */}
                <div className="bg-zinc-800/50 rounded-xl p-4 mb-4">
                  <div className="text-xs text-zinc-500 uppercase mb-1">Requirement</div>
                  <div className="text-sm text-zinc-300">{selectedBadge.requirement.description}</div>
                  {!selectedBadge.isUnlocked && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-zinc-500 mb-1">
                        <span>Progress</span>
                        <span>{selectedBadge.progress}%</span>
                      </div>
                      <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${selectedBadge.progress}%`,
                            backgroundColor: selectedBadge.rarityConfig.color,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Reward */}
                <div className="flex items-center justify-center gap-2 text-amber-400">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-semibold">+{selectedBadge.xpReward} XP Reward</span>
                </div>

                {/* Unlocked date */}
                {selectedBadge.isUnlocked && selectedBadge.unlockedAt && (
                  <div className="mt-4 text-xs text-zinc-500">
                    Unlocked {new Date(selectedBadge.unlockedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
