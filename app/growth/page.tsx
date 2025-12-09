"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Flame, Star, Trophy, Target, TrendingUp, TrendingDown, Sparkles, ArrowRight, Loader2, ChevronRight, Zap, Award, Brain, CheckCircle } from "lucide-react";

export default function GrowthDashboard() {
  const { userId, isLoaded } = useAuth();
  const [loading, setLoading] = useState(true);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [identities, setIdentities] = useState<any[]>([]);
  const [habits, setHabits] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [nextAction, setNextAction] = useState<any>(null);

  useEffect(() => { if (!isLoaded || !userId) return; fetchData(); }, [userId, isLoaded]);

  async function fetchData() {
    try {
      const [xpRes, momentumRes, habitsRes, achievementsRes] = await Promise.all([
        fetch("/api/xp"), fetch("/api/identity/momentum"), fetch("/api/habits"), fetch("/api/achievements?limit=5"),
      ]);
      if (xpRes.ok) { const data = await xpRes.json(); setXp(data.xp || 0); setLevel(data.level || Math.floor((data.xp || 0) / 1000) + 1); }
      if (momentumRes.ok) {
        const data = await momentumRes.json();
        setIdentities(data.momentum || []);
        const needsWork = (data.momentum || []).find((i: any) => i.net_momentum < 0);
        if (needsWork) setNextAction({ title: `Reinforce your "${needsWork.label}" identity`, subtitle: "Momentum is declining - take an aligned action", href: `/identity` });
      }
      if (habitsRes.ok) { const data = await habitsRes.json(); setHabits(data.habits || []); }
      if (achievementsRes.ok) { const data = await achievementsRes.json(); setAchievements(data.achievements || []); }
    } catch (error) { console.error("Failed to fetch data:", error); }
    finally { setLoading(false); }
  }

  const xpToNextLevel = 1000;
  const currentLevelXp = xp % 1000;
  const xpProgress = (currentLevelXp / xpToNextLevel) * 100;
  const topStreaks = [...habits].sort((a, b) => (b.streak || 0) - (a.streak || 0)).slice(0, 5);

  if (!isLoaded || loading) return <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-xl"><Flame className="w-8 h-8 text-orange-400" /></div>
            <div><h1 className="text-3xl font-bold">The Dojo</h1><p className="text-zinc-400">Train, grow, transform</p></div>
          </div>
          <Link href="/dojo" className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-lg"><Target className="w-4 h-4" />Training Challenges</Link>
        </div>

        {nextAction && (
          <div className="bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/30 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-orange-400" /><span className="text-sm font-medium text-orange-400">NEXT ACTION</span></div>
            <div className="flex items-center justify-between">
              <div><h2 className="text-xl font-bold">{nextAction.title}</h2><p className="text-zinc-400 text-sm">{nextAction.subtitle}</p></div>
              <Link href={nextAction.href} className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-500 rounded-xl font-medium">Take Action<ArrowRight className="w-4 h-4" /></Link>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-500/20 rounded-xl"><Star className="w-8 h-8 text-yellow-400" /></div>
              <div><div className="text-3xl font-bold">Level {level}</div><div className="text-zinc-400">{xp.toLocaleString()} total XP</div></div>
            </div>
            <div className="text-right"><div className="text-2xl font-bold text-yellow-400">{xpToNextLevel - currentLevelXp}</div><div className="text-sm text-zinc-400">XP to next level</div></div>
          </div>
          <div className="h-4 bg-zinc-700 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full" style={{ width: `${xpProgress}%` }} /></div>
          <div className="flex justify-between mt-2 text-xs text-zinc-500"><span>Level {level}</span><span>{currentLevelXp}/{xpToNextLevel} XP</span><span>Level {level + 1}</span></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold flex items-center gap-2"><Brain className="w-5 h-5 text-purple-400" />Identity Momentum</h3><Link href="/identity" className="text-sm text-violet-400 flex items-center gap-1">Manage <ChevronRight className="w-4 h-4" /></Link></div>
            <div className="space-y-4">
              {identities.slice(0, 5).map((identity) => (
                <div key={identity.identity_id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{identity.identity_label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-400">{((identity.alignment_score || 0) * 100).toFixed(0)}%</span>
                      {identity.net_momentum > 0 ? <TrendingUp className="w-4 h-4 text-green-400" /> : identity.net_momentum < 0 ? <TrendingDown className="w-4 h-4 text-red-400" /> : null}
                    </div>
                  </div>
                  <div className="h-2 bg-zinc-700 rounded-full overflow-hidden"><div className={`h-full rounded-full ${(identity.alignment_score || 0) > 0.7 ? "bg-green-500" : (identity.alignment_score || 0) > 0.4 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${(identity.alignment_score || 0) * 100}%` }} /></div>
                  <div className="flex justify-between text-xs text-zinc-500"><span className="text-green-400">+{identity.positive_actions || 0} aligned</span><span className="text-red-400">-{identity.negative_actions || 0} misaligned</span></div>
                </div>
              ))}
              {identities.length === 0 && <div className="text-center py-8 text-zinc-500"><Brain className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No identities defined yet</p><Link href="/identity" className="text-violet-400 text-sm">Create your first identity</Link></div>}
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold flex items-center gap-2"><Flame className="w-5 h-5 text-orange-400" />Habit Streaks</h3><Link href="/habits" className="text-sm text-violet-400 flex items-center gap-1">All habits <ChevronRight className="w-4 h-4" /></Link></div>
            <div className="space-y-3">
              {topStreaks.map((habit) => (
                <div key={habit.id} className={`flex items-center justify-between p-3 rounded-xl ${habit.completed_today ? "bg-green-500/10 border border-green-500/30" : "bg-zinc-800/50"}`}>
                  <div className="flex items-center gap-3">
                    {habit.completed_today ? <CheckCircle className="w-5 h-5 text-green-400" /> : <div className="w-5 h-5 rounded-full border-2 border-zinc-600" />}
                    <span>{habit.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {(habit.streak || 0) >= 7 && <Flame className="w-4 h-4 text-orange-400" />}
                    <span className={`font-bold ${(habit.streak || 0) >= 7 ? "text-orange-400" : "text-zinc-400"}`}>{habit.streak || 0}</span>
                    <span className="text-xs text-zinc-500">days</span>
                  </div>
                </div>
              ))}
              {habits.length === 0 && <div className="text-center py-8 text-zinc-500"><Flame className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No habits tracked yet</p><Link href="/habits" className="text-violet-400 text-sm">Create your first habit</Link></div>}
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-400" />Recent Achievements</h3><Link href="/achievements" className="text-sm text-violet-400 flex items-center gap-1">All achievements <ChevronRight className="w-4 h-4" /></Link></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {achievements.slice(0, 3).map((achievement) => (
              <div key={achievement.id} className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl">
                <div className="flex items-center gap-3 mb-2"><Award className="w-8 h-8 text-yellow-400" /><div><div className="font-bold">{achievement.title}</div><div className="text-xs text-zinc-500">{new Date(achievement.unlocked_at).toLocaleDateString()}</div></div></div>
                <div className="flex items-center gap-1 text-sm text-yellow-400"><Star className="w-4 h-4" />+{achievement.xp} XP</div>
              </div>
            ))}
            {achievements.length === 0 && <div className="col-span-3 text-center py-8 text-zinc-500"><Trophy className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No achievements yet - keep going!</p></div>}
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-violet-400" />Quick Identity Actions</h3>
          <div className="flex flex-wrap gap-3">
            {identities.slice(0, 4).map((identity) => (
              <Link key={identity.identity_id} href={`/identity`} className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl"><div className="font-medium">{identity.identity_label}</div><div className="text-xs text-zinc-500">Log aligned action</div></Link>
            ))}
            <Link href="/identity" className="px-4 py-3 bg-violet-600/20 border border-violet-500/30 hover:bg-violet-600/30 rounded-xl"><div className="font-medium text-violet-400">+ New Identity</div><div className="text-xs text-zinc-500">Define who you want to be</div></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
