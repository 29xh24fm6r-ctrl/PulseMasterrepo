"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Flame, Check, Calendar, TrendingUp, RefreshCw } from "lucide-react";
import { useXPToast } from "../components/xp-toast";

type Habit = {
  id: string;
  name: string;
  icon: string;
  streak: number;
  lastCompleted: string | null;
  frequency: string;
  category?: string;
  completedToday?: boolean;
};

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [logging, setLogging] = useState<string | null>(null);
  const { showXPToast } = useXPToast();

  useEffect(() => {
    loadHabits();
  }, []);

  async function loadHabits() {
    try {
      setLoading(true);
      const res = await fetch("/api/notion/habits");
      if (!res.ok) throw new Error("Failed to load habits");
      const data = await res.json();
      setHabits(data.habits ?? []);
    } catch (err) {
      console.error("Failed to load habits:", err);
    } finally {
      setLoading(false);
    }
  }

  async function logHabit(habitId: string) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit || habit.completedToday) return;

    setLogging(habitId);
    try {
      const res = await fetch("/api/habits/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          habitId,
          date: new Date().toISOString().split('T')[0]
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newStreak = data.newStreak || (habit.streak + 1);

        // Update local state
        setHabits(prev => prev.map(h =>
          h.id === habitId
            ? { ...h, completedToday: true, streak: newStreak, lastCompleted: new Date().toISOString() }
            : h
        ));

        // 🎉 Show XP Toast for habit completion
        if (data.xp) {
          showXPToast({
            amount: data.xp.amount || 15,
            category: data.xp.category || "DXP",
            activity: `${habit.icon} ${habit.name} (${newStreak} day streak!)`,
            wasCrit: data.xp.wasCrit || false,
            critMultiplier: data.xp.critMultiplier,
          });
        } else {
          showXPToast({
            amount: 15,
            category: "DXP",
            activity: `${habit.icon} ${habit.name} (${newStreak} day streak!)`,
            wasCrit: false,
          });
        }

        // 🔥 Show streak milestone toast if applicable
        if (data.streakBonus) {
          setTimeout(() => {
            showXPToast({
              amount: data.streakBonus.amount,
              category: "MXP",
              activity: `🔥 ${newStreak}-day streak milestone!`,
              wasCrit: true,
              critMultiplier: 1,
            });
          }, 500);
        }
      }
    } catch (err) {
      console.error("Failed to log habit:", err);
    } finally {
      setLogging(null);
    }
  }

  const completedToday = habits.filter(h => h.completedToday).length;
  const totalHabits = habits.length;
  const longestStreak = Math.max(...habits.map(h => h.streak), 0);
  const atRiskHabits = habits.filter(h => h.streak >= 3 && !h.completedToday);

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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
              🔥 Habits
            </h1>
            <p className="text-slate-400 text-sm">Build consistency, earn XP</p>
          </div>
        </div>
        <button
          onClick={loadHabits}
          className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-orange-400">{completedToday}/{totalHabits}</div>
          <div className="text-xs text-slate-400 uppercase">Today</div>
        </div>
        <div className="bg-orange-900/30 border border-orange-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-orange-400 flex items-center justify-center gap-1">
            <Flame className="w-5 h-5" />
            {longestStreak}
          </div>
          <div className="text-xs text-orange-400 uppercase">Best Streak</div>
        </div>
        <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400">
            {Math.round((completedToday / Math.max(totalHabits, 1)) * 100)}%
          </div>
          <div className="text-xs text-green-400 uppercase">Completion</div>
        </div>
        <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{atRiskHabits.length}</div>
          <div className="text-xs text-red-400 uppercase">At Risk</div>
        </div>
      </div>

      {/* Streak at Risk Warning */}
      {atRiskHabits.length > 0 && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 text-red-400 font-semibold mb-2">
            <Flame className="w-5 h-5" />
            Streaks at Risk!
          </div>
          <p className="text-sm text-slate-300">
            {atRiskHabits.map(h => `${h.icon} ${h.name} (${h.streak} days)`).join(", ")} 
            — complete now to keep your streaks alive!
          </p>
        </div>
      )}

      {/* Habits List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-pulse">🔥</div>
            <div className="text-slate-400">Loading habits...</div>
          </div>
        </div>
      ) : habits.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-4">🌱</div>
          <div className="text-slate-400">No habits yet. Add some in Notion!</div>
        </div>
      ) : (
        <div className="space-y-3">
          {habits.map((habit) => {
            const isAtRisk = habit.streak >= 3 && !habit.completedToday;
            
            return (
              <div
                key={habit.id}
                className={`bg-slate-900/70 border rounded-xl p-4 transition-all ${
                  habit.completedToday
                    ? 'border-green-500/30 bg-green-900/10'
                    : isAtRisk
                    ? 'border-red-500/50 bg-red-900/10'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Log Button */}
                  <button
                    onClick={() => logHabit(habit.id)}
                    disabled={habit.completedToday || logging === habit.id}
                    className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all ${
                      habit.completedToday
                        ? 'bg-green-500/20 cursor-default'
                        : 'bg-slate-800 hover:bg-green-500/20 hover:scale-105 cursor-pointer'
                    }`}
                  >
                    {logging === habit.id ? (
                      <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                    ) : habit.completedToday ? (
                      <Check className="w-6 h-6 text-green-400" />
                    ) : (
                      habit.icon || '✓'
                    )}
                  </button>

                  {/* Habit Info */}
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold ${habit.completedToday ? 'text-green-400' : 'text-slate-200'}`}>
                      {habit.name}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm">
                      {habit.frequency && (
                        <span className="text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {habit.frequency}
                        </span>
                      )}
                      {habit.category && (
                        <span className="text-slate-500">
                          {habit.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Streak Badge */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
                    habit.streak >= 7
                      ? 'bg-orange-500/20 text-orange-400'
                      : habit.streak >= 3
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    <Flame className={`w-4 h-4 ${habit.streak >= 7 ? 'animate-pulse' : ''}`} />
                    <span className="font-bold">{habit.streak}</span>
                    <span className="text-xs opacity-70">day{habit.streak !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Progress bar for streaks approaching milestones */}
                {habit.streak > 0 && habit.streak < 30 && (
                  <div className="mt-3 pt-3 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span>Next milestone</span>
                      <span>
                        {habit.streak < 7 ? '7 days' : habit.streak < 14 ? '14 days' : '30 days'}
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all"
                        style={{ 
                          width: `${
                            habit.streak < 7 
                              ? (habit.streak / 7) * 100 
                              : habit.streak < 14 
                              ? ((habit.streak - 7) / 7) * 100 
                              : ((habit.streak - 14) / 16) * 100
                          }%` 
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* XP Info Card */}
      <div className="mt-8 bg-purple-900/20 border border-purple-500/30 rounded-xl p-4">
        <div className="flex items-center gap-2 text-purple-400 font-semibold mb-2">
          <TrendingUp className="w-5 h-5" />
          XP Rewards
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-slate-400">Per habit</div>
            <div className="text-purple-300 font-semibold">+15 DXP</div>
          </div>
          <div>
            <div className="text-slate-400">7-day streak</div>
            <div className="text-orange-300 font-semibold">+50 MXP</div>
          </div>
          <div>
            <div className="text-slate-400">14-day streak</div>
            <div className="text-orange-300 font-semibold">+100 MXP</div>
          </div>
          <div>
            <div className="text-slate-400">30-day streak</div>
            <div className="text-orange-300 font-semibold">+200 MXP</div>
          </div>
        </div>
      </div>
    </main>
  );
}
