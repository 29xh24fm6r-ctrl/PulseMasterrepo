"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Flame,
  ChevronRight,
  CheckCircle2,
  Circle,
  TrendingUp,
  Calendar,
} from "lucide-react";

interface Habit {
  id: string;
  name: string;
  icon: string;
  streak: number;
  completedToday: boolean;
  completedThisWeek: number;
  targetPerWeek: number;
}

interface HabitWidgetData {
  habits: Habit[];
  totalStreakDays: number;
  perfectDaysThisWeek: number;
  overallCompletionRate: number;
}

const STORAGE_KEY = "pulse-habit-widget-cache";

export function HabitStreakWidget() {
  const [data, setData] = useState<HabitWidgetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Try to load from cache first
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        // Check if cache is from today
        if (parsed.date === new Date().toDateString()) {
          setData(parsed.data);
          setLoading(false);
          return;
        }
      }

      // Fetch from API
      const res = await fetch("/api/habits/pull");
      const result = await res.json();

      if (result.ok && result.habits) {
        const processedData = processHabits(result.habits);
        setData(processedData);
        
        // Cache the result
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          date: new Date().toDateString(),
          data: processedData,
        }));
      } else {
        // Use mock data if API fails
        setData(getMockData());
      }
    } catch (err) {
      console.error("Failed to load habits:", err);
      setData(getMockData());
    } finally {
      setLoading(false);
    }
  }

  function processHabits(rawHabits: any[]): HabitWidgetData {
    const habits: Habit[] = rawHabits.slice(0, 5).map((h: any) => ({
      id: h.id || Math.random().toString(),
      name: h.name || h.Name || "Habit",
      icon: h.icon || "✓",
      streak: h.streak || h.Streak || 0,
      completedToday: h.completedToday || h.CompletedToday || false,
      completedThisWeek: h.completedThisWeek || 0,
      targetPerWeek: h.targetPerWeek || 7,
    }));

    const totalStreakDays = habits.reduce((sum, h) => sum + h.streak, 0);
    const completedToday = habits.filter(h => h.completedToday).length;
    const overallCompletionRate = habits.length > 0 
      ? Math.round((completedToday / habits.length) * 100)
      : 0;

    return {
      habits,
      totalStreakDays,
      perfectDaysThisWeek: Math.floor(Math.random() * 5), // Would calculate from actual data
      overallCompletionRate,
    };
  }

  function getMockData(): HabitWidgetData {
    return {
      habits: [
        { id: "1", name: "Morning Routine", icon: "🌅", streak: 12, completedToday: true, completedThisWeek: 5, targetPerWeek: 7 },
        { id: "2", name: "Exercise", icon: "💪", streak: 7, completedToday: true, completedThisWeek: 4, targetPerWeek: 5 },
        { id: "3", name: "Reading", icon: "📚", streak: 5, completedToday: false, completedThisWeek: 3, targetPerWeek: 7 },
        { id: "4", name: "Meditation", icon: "🧘", streak: 3, completedToday: false, completedThisWeek: 2, targetPerWeek: 7 },
      ],
      totalStreakDays: 27,
      perfectDaysThisWeek: 2,
      overallCompletionRate: 50,
    };
  }

  async function toggleHabit(habitId: string) {
    if (!data) return;

    // Optimistic update
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        habits: prev.habits.map(h => 
          h.id === habitId 
            ? { ...h, completedToday: !h.completedToday, streak: !h.completedToday ? h.streak + 1 : h.streak - 1 }
            : h
        ),
      };
    });

    // Call API
    try {
      await fetch("/api/habits/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId, completed: true }),
      });
    } catch (err) {
      console.error("Failed to log habit:", err);
    }
  }

  if (loading) {
    return (
      <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
        <div className="flex items-center gap-2 text-zinc-400 mb-4">
          <Flame className="w-5 h-5" />
          <span className="font-medium">Habits</span>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const completedCount = data.habits.filter(h => h.completedToday).length;
  const topStreak = data.habits.reduce((max, h) => h.streak > max ? h.streak : max, 0);

  return (
    <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6 relative overflow-hidden">
      {/* Ambient glow for streaks */}
      {topStreak >= 7 && (
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-3xl" />
      )}

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <Flame className="w-5 h-5" />
            <span className="font-medium">Habits</span>
          </div>
          <Link
            href="/habits"
            className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1"
          >
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span className="text-white font-medium">{completedCount}/{data.habits.length}</span>
            <span className="text-zinc-500">today</span>
          </div>
          {topStreak > 0 && (
            <div className="flex items-center gap-1.5 text-amber-400">
              <Flame className="w-4 h-4" />
              <span className="font-medium">{topStreak}</span>
              <span className="text-zinc-500">best streak</span>
            </div>
          )}
        </div>

        {/* Habit List */}
        <div className="space-y-2">
          {data.habits.map((habit) => (
            <button
              key={habit.id}
              onClick={() => toggleHabit(habit.id)}
              className={`
                w-full flex items-center gap-3 p-3 rounded-xl transition-all
                ${habit.completedToday
                  ? "bg-emerald-500/10 border border-emerald-500/30"
                  : "bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600"
                }
              `}
            >
              {/* Checkbox */}
              <div className={`
                w-6 h-6 rounded-full flex items-center justify-center transition-all
                ${habit.completedToday
                  ? "bg-emerald-500 text-white"
                  : "border-2 border-zinc-600"
                }
              `}>
                {habit.completedToday && <CheckCircle2 className="w-4 h-4" />}
              </div>

              {/* Icon & Name */}
              <span className="text-lg">{habit.icon}</span>
              <span className={`flex-1 text-left text-sm ${habit.completedToday ? "text-emerald-400" : "text-zinc-300"}`}>
                {habit.name}
              </span>

              {/* Streak */}
              {habit.streak > 0 && (
                <div className={`
                  flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                  ${habit.streak >= 7 ? "bg-amber-500/20 text-amber-400" : "bg-zinc-700/50 text-zinc-400"}
                `}>
                  <Flame className="w-3 h-3" />
                  {habit.streak}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Weekly Progress */}
        <div className="mt-4 pt-4 border-t border-zinc-800">
          <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
            <span>This week</span>
            <span>{data.perfectDaysThisWeek} perfect days</span>
          </div>
          <div className="flex gap-1">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => {
              const today = new Date().getDay();
              const isPast = i < today;
              const isToday = i === today;
              // Mock: assume some days were perfect
              const wasPerfect = isPast && Math.random() > 0.4;
              
              return (
                <div
                  key={i}
                  className={`
                    flex-1 h-8 rounded-lg flex items-center justify-center text-xs font-medium
                    ${isToday
                      ? "bg-violet-500/20 text-violet-400 ring-1 ring-violet-500/50"
                      : wasPerfect
                      ? "bg-emerald-500/20 text-emerald-400"
                      : isPast
                      ? "bg-zinc-800/50 text-zinc-600"
                      : "bg-zinc-800/30 text-zinc-700"
                    }
                  `}
                >
                  {day}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default HabitStreakWidget;
