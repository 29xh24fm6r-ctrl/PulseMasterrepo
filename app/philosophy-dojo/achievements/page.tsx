"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Trophy, Lock, Loader2, Sparkles } from "lucide-react";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  rarity: string;
  xpReward: number;
  unlocked: boolean;
  secret?: boolean;
  colors: {
    bg: string;
    border: string;
    text: string;
  };
}

interface AchievementStats {
  total: number;
  unlocked: number;
  points: number;
}

const CATEGORY_LABELS: Record<string, { name: string; icon: string }> = {
  streak: { name: 'Streak', icon: '🔥' },
  skills: { name: 'Skills', icon: '📚' },
  mastery: { name: 'Mastery', icon: '🏆' },
  cross_training: { name: 'Cross-Training', icon: '🌐' },
  special: { name: 'Special', icon: '⭐' },
  dedication: { name: 'Dedication', icon: '💪' },
};

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

function AchievementCard({ achievement }: { achievement: Achievement }) {
  const isLocked = !achievement.unlocked;

  return (
    <div
      className={`relative p-4 rounded-xl border-2 transition-all ${isLocked
        ? 'bg-zinc-900/50 border-zinc-800 opacity-60'
        : `${achievement.colors.bg} ${achievement.colors.border}`
        }`}
    >
      {/* Rarity indicator */}
      <div className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full ${isLocked ? 'bg-zinc-800 text-zinc-500' : `${achievement.colors.bg} ${achievement.colors.text}`
        }`}>
        {achievement.rarity}
      </div>

      {/* Content */}
      <div className="flex items-start gap-3">
        <div className={`text-3xl ${isLocked ? 'grayscale opacity-50' : ''}`}>
          {isLocked ? <Lock className="w-8 h-8 text-zinc-600" /> : achievement.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold ${isLocked ? 'text-zinc-500' : 'text-white'}`}>
            {achievement.name}
          </h3>
          <p className={`text-xs mt-1 ${isLocked ? 'text-zinc-600' : 'text-white/60'}`}>
            {achievement.description}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs ${isLocked ? 'text-zinc-600' : 'text-yellow-400'}`}>
              +{achievement.xpReward} IXP
            </span>
          </div>
        </div>
      </div>

      {/* Unlocked indicator */}
      {!isLocked && (
        <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
          <Trophy className="w-3 h-3 text-white" />
        </div>
      )}
    </div>
  );
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<AchievementStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/philosophy/achievements?check=true')
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setAchievements(data.achievements);
          setStats(data.stats);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Group achievements by category
  const categories = [...new Set(achievements.map(a => a.category))];

  // Filter by selected category
  const filteredAchievements = selectedCategory
    ? achievements.filter(a => a.category === selectedCategory)
    : achievements;

  // Sort: unlocked first, then by rarity
  const sortedAchievements = [...filteredAchievements].sort((a, b) => {
    if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
    return RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/20">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/philosophy-dojo" className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                  Achievements
                </h1>
                <p className="text-white/60">Your journey of philosophical mastery</p>
              </div>
            </div>

            {stats && (
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-yellow-400">{stats.unlocked}</p>
                  <p className="text-xs text-white/50">Unlocked</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-white/30">{stats.total - stats.unlocked}</p>
                  <p className="text-xs text-white/50">Remaining</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-400">{stats.points}</p>
                  <p className="text-xs text-white/50">Total XP</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {stats && (
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all duration-500"
                style={{ width: `${(stats.unlocked / stats.total) * 100}%` }}
              />
            </div>
            <span className="text-sm text-white/50">
              {Math.round((stats.unlocked / stats.total) * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Category Filter */}
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${selectedCategory === null
              ? 'bg-white/20 border border-white/30'
              : 'bg-white/5 border border-white/10 hover:bg-white/10'
              }`}
          >
            All
          </button>
          {categories.map(cat => {
            const info = CATEGORY_LABELS[cat] || { name: cat, icon: '📌' };
            const count = achievements.filter(a => a.category === cat && a.unlocked).length;
            const total = achievements.filter(a => a.category === cat).length;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition flex items-center gap-2 ${selectedCategory === cat
                  ? 'bg-white/20 border border-white/30'
                  : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
              >
                <span>{info.icon}</span>
                <span>{info.name}</span>
                <span className="text-xs text-white/50">{count}/{total}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="max-w-6xl mx-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-white/50" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedAchievements.map(achievement => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
          </div>
        )}

        {!loading && sortedAchievements.length === 0 && (
          <div className="text-center py-20 text-white/50">
            No achievements in this category yet
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h3 className="text-sm font-semibold text-white/50 mb-3">Rarity</h3>
        <div className="flex flex-wrap gap-3">
          {[
            { name: 'Common', color: 'text-zinc-400' },
            { name: 'Uncommon', color: 'text-green-400' },
            { name: 'Rare', color: 'text-blue-400' },
            { name: 'Epic', color: 'text-purple-400' },
            { name: 'Legendary', color: 'text-yellow-400' },
          ].map(r => (
            <span key={r.name} className={`text-sm ${r.color}`}>
              ● {r.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
