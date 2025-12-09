"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Swords,
  Sparkles,
  User,
  Trophy,
  Flame,
  Target,
  BookOpen,
  Shield,
  Zap,
  ChevronRight,
  TreeDeciduous,
  MessageCircle,
  Sun,
  Loader2,
  Calendar,
} from "lucide-react";

// Types
type PhilosophyId = "stoicism" | "samurai" | "taoism" | "zen" | "seven_habits" | "discipline" | "spartan" | "buddhism";
type BeltRank = "white" | "yellow" | "orange" | "green" | "blue" | "brown" | "black" | "master";

interface DailyChallenge {
  id: string;
  type: 'skill_training' | 'mentor_session' | 'reflection';
  title: string;
  description: string;
  timeEstimate: string;
  xpReward: number;
  skill?: { treeId: string; treeName: string; treeIcon: string; skillId: string; };
  mentor?: { id: string; name: string; icon: string; suggestedPrompt: string; };
  reason: string;
}

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  todayComplete: boolean;
  streakMultiplier: number;
  tier: { name: string; icon: string; color: string; };
  recentActivity: { date: string; count: number }[];
}

interface Achievement {
  id: string;
  name: string;
  icon: string;
  rarity: string;
  unlocked: boolean;
  colors: { bg: string; border: string; text: string; };
}

interface AchievementStats {
  total: number;
  unlocked: number;
  points: number;
}

const PHILOSOPHIES = [
  { id: "stoicism", name: "Stoicism", description: "Master your emotions, focus on what you control", icon: "🏛️", color: "#6366f1" },
  { id: "samurai", name: "Way of the Samurai", description: "Honor, decisive action, and ruthless discipline", icon: "⚔️", color: "#dc2626" },
  { id: "taoism", name: "Taoism", description: "Flow with life's currents, softness overcomes", icon: "☯️", color: "#059669" },
  { id: "zen", name: "Zen", description: "Present moment awareness, beginner's mind", icon: "🧘", color: "#0891b2" },
  { id: "discipline", name: "Discipline Path", description: "Raw discipline as freedom, embrace the grind", icon: "💀", color: "#ea580c" },
  { id: "seven_habits", name: "7 Habits", description: "Covey's principles of effectiveness", icon: "📘", color: "#7c3aed" },
];

// ============================================
// STREAK CARD COMPONENT
// ============================================

function StreakCard({ streak }: { streak: StreakData | null }) {
  if (!streak) {
    return (
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 animate-pulse">
        <div className="h-20 bg-zinc-800 rounded-lg"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-gradient-to-br from-orange-950/50 to-zinc-900 border border-orange-500/20 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-4xl">{streak.tier.icon}</div>
          <div>
            <h3 className="text-2xl font-bold">{streak.currentStreak} Day Streak</h3>
            <p className="text-sm text-zinc-400">{streak.tier.name}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold" style={{ color: streak.tier.color }}>
            {streak.streakMultiplier}x
          </div>
          <p className="text-xs text-zinc-500">XP Multiplier</p>
        </div>
      </div>
      
      {/* Activity Heatmap */}
      <div className="mt-4">
        <p className="text-xs text-zinc-500 mb-2">Last 30 days</p>
        <div className="flex gap-1 flex-wrap">
          {streak.recentActivity.map((day, i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-sm ${day.count > 0 ? 'bg-orange-500' : 'bg-zinc-800'}`}
              title={`${day.date}: ${day.count > 0 ? 'Active' : 'No activity'}`}
            />
          ))}
        </div>
      </div>
      
      {/* Today's Status */}
      <div className="mt-4 flex items-center justify-between">
        {streak.todayComplete ? (
          <div className="flex items-center gap-2 text-green-400">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            <span className="text-sm">Today complete!</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-yellow-400">
            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></div>
            <span className="text-sm">Train today to keep your streak!</span>
          </div>
        )}
        <Link href="/philosophy-dojo/skill-tree" className="text-xs text-orange-400 hover:text-orange-300 transition">
          Train now →
        </Link>
      </div>
    </div>
  );
}

// ============================================
// ACHIEVEMENTS PREVIEW COMPONENT
// ============================================

function AchievementsPreview({ 
  achievements, 
  stats 
}: { 
  achievements: Achievement[]; 
  stats: AchievementStats | null;
}) {
  const recentUnlocked = achievements.filter(a => a.unlocked).slice(0, 5);
  
  return (
    <div className="bg-gradient-to-br from-yellow-950/30 to-zinc-900 border border-yellow-500/20 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-yellow-400" />
          <h3 className="font-semibold text-lg">Achievements</h3>
        </div>
        <Link href="/philosophy-dojo/achievements" className="text-sm text-yellow-400 hover:text-yellow-300 transition flex items-center gap-1">
          View all <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      
      {stats && (
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400"
              style={{ width: `${(stats.unlocked / stats.total) * 100}%` }}
            />
          </div>
          <span className="text-sm text-white/50">{stats.unlocked}/{stats.total}</span>
        </div>
      )}
      
      {recentUnlocked.length > 0 ? (
        <div className="flex gap-2 flex-wrap">
          {recentUnlocked.map(a => (
            <div 
              key={a.id}
              className={`p-2 rounded-lg ${a.colors.bg} ${a.colors.border} border`}
              title={a.name}
            >
              <span className="text-xl">{a.icon}</span>
            </div>
          ))}
          {stats && stats.unlocked > 5 && (
            <div className="p-2 rounded-lg bg-white/10 border border-white/20 flex items-center">
              <span className="text-sm text-white/50">+{stats.unlocked - 5} more</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-white/50">Complete training to unlock achievements!</p>
      )}
    </div>
  );
}

// ============================================
// DAILY CHALLENGE CARD
// ============================================

function DailyChallengeCard({ challenge, multiplier }: { challenge: DailyChallenge; multiplier: number }) {
  const getTypeColor = () => {
    switch (challenge.type) {
      case 'skill_training': return 'from-green-500/20 to-green-900/20 border-green-500/30';
      case 'mentor_session': return 'from-amber-500/20 to-amber-900/20 border-amber-500/30';
      case 'reflection': return 'from-purple-500/20 to-purple-900/20 border-purple-500/30';
    }
  };
  
  const getLink = () => {
    if (challenge.skill) return `/philosophy-dojo/skill-tree?tree=${challenge.skill.treeId}&skill=${challenge.skill.skillId}`;
    if (challenge.mentor) return `/philosophy-dojo/mentor?mentor=${challenge.mentor.id}`;
    return '/philosophy-dojo/mentor';
  };
  
  const adjustedXP = Math.round(challenge.xpReward * multiplier);
  
  return (
    <Link
      href={getLink()}
      className={`block p-4 rounded-xl bg-gradient-to-br ${getTypeColor()} border hover:scale-[1.02] transition-all group`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-white/10">
          {challenge.skill?.treeIcon ? (
            <span className="text-xl">{challenge.skill.treeIcon}</span>
          ) : challenge.mentor?.icon ? (
            <span className="text-xl">{challenge.mentor.icon}</span>
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white">{challenge.title}</h4>
          <p className="text-xs text-white/60 mt-1 line-clamp-2">{challenge.description}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-white/40">{challenge.timeEstimate}</span>
            <span className="text-xs text-yellow-400">
              +{adjustedXP} IXP
              {multiplier > 1 && <span className="text-orange-400 ml-1">({multiplier}x)</span>}
            </span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/60 transition flex-shrink-0" />
      </div>
    </Link>
  );
}

// ============================================
// MAIN PAGE
// ============================================

export default function PhilosophyDojoPage() {
  const [dailyChallenges, setDailyChallenges] = useState<DailyChallenge[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(true);
  const [dayTheme, setDayTheme] = useState({ focus: '', bonus: '' });
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [achievementStats, setAchievementStats] = useState<AchievementStats | null>(null);

  useEffect(() => {
    // Fetch daily challenges
    fetch('/api/philosophy/daily-challenge?count=3')
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setDailyChallenges(data.challenges);
          setDayTheme({ focus: data.dayFocus, bonus: data.dayBonus });
        }
      })
      .finally(() => setChallengesLoading(false));
    
    // Fetch streak data
    fetch('/api/philosophy/streaks')
      .then(res => res.json())
      .then(data => {
        if (data.ok) setStreak(data);
      });
    
    // Fetch achievements
    fetch('/api/philosophy/achievements')
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setAchievements(data.achievements);
          setAchievementStats(data.stats);
        }
      });
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-zinc-800 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Swords className="w-7 h-7 text-violet-400" />
              Philosophy Dojo
            </h1>
            <p className="text-sm text-zinc-500">Infinite training for the mind</p>
          </div>
          <Link
            href="/philosophy-dojo/achievements"
            className="px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 rounded-lg text-sm font-medium flex items-center gap-2 text-yellow-400"
          >
            <Trophy className="w-4 h-4" />
            {achievementStats?.unlocked || 0} Badges
          </Link>
          <Link
            href="/philosophy-dojo/mentor"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            AI Mentors
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Top Row: Streak + Achievements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StreakCard streak={streak} />
          <AchievementsPreview achievements={achievements} stats={achievementStats} />
        </div>
        
        {/* Daily Challenges Section */}
        <section className="bg-gradient-to-br from-violet-950/30 to-zinc-900 border border-violet-500/20 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-500/20">
                <Sun className="w-6 h-6 text-violet-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Today's Training</h2>
                {dayTheme.focus && (
                  <p className="text-xs text-zinc-500">
                    Focus: <span className="text-violet-400 capitalize">{dayTheme.focus}</span> — {dayTheme.bonus}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Calendar className="w-4 h-4" />
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>
          
          {challengesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
            </div>
          ) : dailyChallenges.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {dailyChallenges.map(challenge => (
                <DailyChallengeCard 
                  key={challenge.id} 
                  challenge={challenge} 
                  multiplier={streak?.streakMultiplier || 1}
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-zinc-500 py-4">No challenges available</p>
          )}
        </section>

        {/* Quick Access Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/philosophy-dojo/mentor"
            className="p-6 bg-gradient-to-br from-amber-950/50 to-zinc-900 border border-amber-500/20 rounded-2xl hover:border-amber-500/40 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <MessageCircle className="w-7 h-7 text-amber-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold group-hover:text-amber-400 transition">AI Mentors</h3>
                <p className="text-sm text-zinc-500 mt-1">Chat with 10 philosophical mentors</p>
              </div>
              <ChevronRight className="w-6 h-6 text-zinc-600 group-hover:text-amber-400 transition" />
            </div>
          </Link>
          
          <Link
            href="/philosophy-dojo/skill-tree"
            className="p-6 bg-gradient-to-br from-green-950/50 to-zinc-900 border border-green-500/20 rounded-2xl hover:border-green-500/40 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-green-500/20 flex items-center justify-center">
                <TreeDeciduous className="w-7 h-7 text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold group-hover:text-green-400 transition">Skill Trees</h3>
                <p className="text-sm text-zinc-500 mt-1">Master skills through training</p>
              </div>
              <ChevronRight className="w-6 h-6 text-zinc-600 group-hover:text-green-400 transition" />
            </div>
          </Link>
        </section>

        {/* Philosophy Paths (simplified) */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            Philosophy Paths
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {PHILOSOPHIES.map(phil => (
              <Link
                key={phil.id}
                href={`/philosophy-dojo/skill-tree?tree=${phil.id}`}
                className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/80 hover:border-zinc-700 transition text-center group"
              >
                <span className="text-3xl">{phil.icon}</span>
                <h3 className="font-medium mt-2 text-sm group-hover:text-white transition">{phil.name}</h3>
              </Link>
            ))}
          </div>
        </section>

        {/* Quick Links */}
        <section className="grid grid-cols-3 gap-4">
          <Link
            href="/philosophy-dojo/achievements"
            className="p-5 bg-gradient-to-br from-yellow-950/50 to-zinc-900 border border-yellow-500/20 rounded-2xl hover:border-yellow-500/40 transition-all"
          >
            <Trophy className="w-6 h-6 text-yellow-400 mb-2" />
            <h3 className="font-semibold">Achievements</h3>
            <p className="text-xs text-zinc-500 mt-1">View all your badges</p>
          </Link>
          <Link
            href="/philosophy-dojo/mentor"
            className="p-5 bg-gradient-to-br from-amber-950/50 to-zinc-900 border border-amber-500/20 rounded-2xl hover:border-amber-500/40 transition-all"
          >
            <User className="w-6 h-6 text-amber-400 mb-2" />
            <h3 className="font-semibold">AI Mentors</h3>
            <p className="text-xs text-zinc-500 mt-1">Learn from the masters</p>
          </Link>
          <Link
            href="/philosophy-dojo/skill-tree"
            className="p-5 bg-gradient-to-br from-green-950/50 to-zinc-900 border border-green-500/20 rounded-2xl hover:border-green-500/40 transition-all"
          >
            <TreeDeciduous className="w-6 h-6 text-green-400 mb-2" />
            <h3 className="font-semibold">Skill Trees</h3>
            <p className="text-xs text-zinc-500 mt-1">Master all 42 skills</p>
          </Link>
        </section>
      </div>
    </main>
  );
}
