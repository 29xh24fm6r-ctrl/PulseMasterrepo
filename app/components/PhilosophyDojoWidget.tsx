"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Flame, 
  TreeDeciduous, 
  Trophy, 
  ChevronRight, 
  Loader2,
  Swords,
  MessageCircle,
  Sparkles
} from "lucide-react";

interface StreakData {
  currentStreak: number;
  streakMultiplier: number;
  todayComplete: boolean;
  tier: {
    name: string;
    icon: string;
    color: string;
  };
}

interface DailyChallenge {
  id: string;
  type: 'skill_training' | 'mentor_session' | 'reflection';
  title: string;
  description: string;
  xpReward: number;
  skill?: {
    treeId: string;
    skillId: string;
    treeIcon: string;
  };
  mentor?: {
    id: string;
    icon: string;
  };
}

interface AchievementStats {
  total: number;
  unlocked: number;
  points: number;
}

interface SkillStats {
  mastered: number;
  available: number;
}

interface PhilosophyDojoWidgetProps {
  className?: string;
  compact?: boolean;
}

export default function PhilosophyDojoWidget({ 
  className = "", 
  compact = false 
}: PhilosophyDojoWidgetProps) {
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [achievements, setAchievements] = useState<AchievementStats | null>(null);
  const [skills, setSkills] = useState<SkillStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all data in parallel
    Promise.all([
      fetch('/api/philosophy/streaks').then(r => r.json()),
      fetch('/api/philosophy/daily-challenge?count=1').then(r => r.json()),
      fetch('/api/philosophy/achievements').then(r => r.json()),
      fetch('/api/philosophy/skills?all=true').then(r => r.json()),
    ])
      .then(([streakData, challengeData, achievementData, skillsData]) => {
        if (streakData.ok) setStreak(streakData);
        if (challengeData.ok && challengeData.challenges?.length > 0) {
          setChallenge(challengeData.challenges[0]);
        }
        if (achievementData.ok) setAchievements(achievementData.stats);
        if (skillsData.ok && skillsData.trees) {
          const totals = skillsData.trees.reduce(
            (acc: SkillStats, t: any) => ({
              mastered: acc.mastered + (t.stats?.mastered || 0),
              available: acc.available + (t.stats?.available || 0),
            }),
            { mastered: 0, available: 0 }
          );
          setSkills(totals);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={`bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 ${className}`}>
        <div className="flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
      </div>
    );
  }

  // Compact version for smaller spaces
  if (compact) {
    return (
      <Link 
        href="/philosophy-dojo"
        className={`block bg-gradient-to-br from-violet-950/50 to-zinc-900 border border-violet-500/20 rounded-2xl p-4 hover:border-violet-500/40 transition-all ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Swords className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h3 className="font-semibold">Philosophy Dojo</h3>
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                {streak && streak.currentStreak > 0 && (
                  <span className="flex items-center gap-1">
                    <span>{streak.tier.icon}</span>
                    <span>{streak.currentStreak}d</span>
                  </span>
                )}
                {skills && (
                  <span>{skills.mastered} skills</span>
                )}
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-zinc-600" />
        </div>
      </Link>
    );
  }

  // Full widget
  return (
    <div className={`bg-gradient-to-br from-violet-950/30 to-zinc-900 border border-violet-500/20 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Swords className="w-6 h-6 text-violet-400" />
          <h3 className="font-semibold text-lg">Philosophy Dojo</h3>
        </div>
        <Link 
          href="/philosophy-dojo"
          className="text-sm text-violet-400 hover:text-violet-300 transition flex items-center gap-1"
        >
          Open <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      
      {/* Stats Row */}
      <div className="grid grid-cols-4 divide-x divide-white/10 border-b border-white/10">
        {/* Streak */}
        <div className="p-4 text-center">
          <div className="text-2xl mb-1">
            {streak && streak.currentStreak > 0 ? streak.tier.icon : '💤'}
          </div>
          <div className="text-xl font-bold">{streak?.currentStreak || 0}</div>
          <div className="text-xs text-zinc-500">Day Streak</div>
        </div>
        
        {/* Skills */}
        <div className="p-4 text-center">
          <div className="text-2xl mb-1">
            <TreeDeciduous className="w-6 h-6 mx-auto text-green-400" />
          </div>
          <div className="text-xl font-bold">{skills?.mastered || 0}</div>
          <div className="text-xs text-zinc-500">Skills</div>
        </div>
        
        {/* Available */}
        <div className="p-4 text-center">
          <div className="text-2xl mb-1">
            <Sparkles className="w-6 h-6 mx-auto text-blue-400" />
          </div>
          <div className="text-xl font-bold">{skills?.available || 0}</div>
          <div className="text-xs text-zinc-500">Available</div>
        </div>
        
        {/* Achievements */}
        <div className="p-4 text-center">
          <div className="text-2xl mb-1">
            <Trophy className="w-6 h-6 mx-auto text-yellow-400" />
          </div>
          <div className="text-xl font-bold">{achievements?.unlocked || 0}</div>
          <div className="text-xs text-zinc-500">Badges</div>
        </div>
      </div>
      
      {/* Today's Challenge */}
      {challenge && (
        <div className="p-4">
          <p className="text-xs text-zinc-500 mb-2">Today's Challenge</p>
          <Link
            href={
              challenge.skill 
                ? `/philosophy-dojo/skill-tree?tree=${challenge.skill.treeId}&skill=${challenge.skill.skillId}`
                : '/philosophy-dojo/mentor'
            }
            className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition group"
          >
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-xl">
              {challenge.skill?.treeIcon || challenge.mentor?.icon || '🎯'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{challenge.title}</p>
              <p className="text-xs text-zinc-500 truncate">{challenge.description}</p>
            </div>
            <div className="text-right">
              <span className="text-sm text-yellow-400">+{challenge.xpReward}</span>
              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition" />
            </div>
          </Link>
        </div>
      )}
      
      {/* Quick Actions */}
      <div className="px-4 pb-4 grid grid-cols-2 gap-2">
        <Link
          href="/philosophy-dojo/skill-tree"
          className="flex items-center justify-center gap-2 py-2.5 bg-green-500/20 hover:bg-green-500/30 rounded-lg transition text-sm font-medium text-green-400"
        >
          <TreeDeciduous className="w-4 h-4" />
          Train Skills
        </Link>
        <Link
          href="/philosophy-dojo/mentor"
          className="flex items-center justify-center gap-2 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg transition text-sm font-medium text-amber-400"
        >
          <MessageCircle className="w-4 h-4" />
          Talk to Mentor
        </Link>
      </div>
      
      {/* Streak Warning */}
      {streak && !streak.todayComplete && streak.currentStreak > 0 && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 p-2 bg-orange-500/10 rounded-lg border border-orange-500/30">
            <Flame className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-orange-300">
              Train today to keep your {streak.currentStreak}-day streak!
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
