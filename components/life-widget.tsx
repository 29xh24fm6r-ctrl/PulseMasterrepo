"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar, Clock, ChevronRight, Flame, CheckCircle2,
  Circle, Target, Sparkles, Star, Award, Zap,
  BookOpen, Scroll, Swords, Brain, Heart, TrendingUp
} from "lucide-react";

// ============================================
// CALENDAR WIDGET
// ============================================
interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type?: string;
}

export function CalendarWidget() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const res = await fetch("/api/calendar/today");
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
        }
      } catch (err) {
        console.error("Failed to load calendar:", err);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, []);

  const now = new Date();
  const upcomingEvents = events
    .filter(e => new Date(e.start) > now)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const nextEvent = upcomingEvents[0];
  const minutesUntilNext = nextEvent
    ? Math.round((new Date(nextEvent.start).getTime() - now.getTime()) / 60000)
    : null;

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold">Today's Schedule</h3>
        </div>
        <Link href="/planner" className="text-xs text-zinc-400 hover:text-white">
          Full calendar →
        </Link>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-12 bg-zinc-800 rounded-lg" />
          <div className="h-12 bg-zinc-800 rounded-lg" />
        </div>
      ) : (
        <>
          {nextEvent && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl mb-3">
              <div className="flex items-center gap-2 text-blue-300 text-xs font-medium mb-1">
                <Clock className="w-3 h-3" />
                {minutesUntilNext !== null && minutesUntilNext > 0
                  ? `In ${minutesUntilNext} min`
                  : "Starting now"}
              </div>
              <h4 className="font-medium">{nextEvent.title}</h4>
              <p className="text-xs text-zinc-400 mt-1">
                {formatTime(nextEvent.start)} - {formatTime(nextEvent.end)}
              </p>
            </div>
          )}

          <div className="space-y-2 max-h-40 overflow-y-auto">
            {upcomingEvents.slice(1, 5).map((event) => (
              <div
                key={event.id}
                className="p-3 bg-zinc-800/50 rounded-lg flex items-center justify-between"
              >
                <div>
                  <h4 className="text-sm font-medium">{event.title}</h4>
                  <p className="text-xs text-zinc-500">{formatTime(event.start)}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </div>
            ))}
            {events.length === 0 && (
              <div className="text-center py-4 text-zinc-500 text-sm">
                No events today. Enjoy the freedom! 🎉
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-zinc-800 text-center">
            <p className="text-xs text-zinc-500">
              {events.length} event{events.length !== 1 ? "s" : ""} today
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// HABITS WIDGET
// ============================================
interface Habit {
  id: string;
  name: string;
  streak: number;
  completedToday: boolean;
  icon?: string;
}

export function HabitsWidget() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    loadHabits();
  }, []);

  const loadHabits = async () => {
    try {
      const res = await fetch("/api/habits");
      if (res.ok) {
        const data = await res.json();
        const todayStr = new Date().toISOString().split("T")[0];
        
        const processedHabits = (data.habits || []).map((h: any) => ({
          id: h.id,
          name: h.name,
          streak: h.streak || 0,
          completedToday: (h.habit_completions || []).some(
            (c: any) => c.completed_at?.startsWith(todayStr)
          ),
          icon: h.icon || "🔥",
        }));
        
        setHabits(processedHabits);
      }
    } catch (err) {
      console.error("Failed to load habits:", err);
    } finally {
      setLoading(false);
    }
  };

  const completeHabit = async (habitId: string) => {
    setCompleting(habitId);
    try {
      const res = await fetch("/api/habits/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId }),
      });
      
      if (res.ok) {
        setHabits((prev) =>
          prev.map((h) =>
            h.id === habitId
              ? { ...h, completedToday: true, streak: h.streak + 1 }
              : h
          )
        );
      }
    } catch (err) {
      console.error("Failed to complete habit:", err);
    } finally {
      setCompleting(null);
    }
  };

  const completedCount = habits.filter((h) => h.completedToday).length;
  const totalHabits = habits.length;
  const progress = totalHabits > 0 ? (completedCount / totalHabits) * 100 : 0;

  return (
    <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-400" />
          <h3 className="font-semibold">Daily Habits</h3>
        </div>
        <Link href="/habits" className="text-xs text-zinc-400 hover:text-white">
          Manage →
        </Link>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
          <span>{completedCount}/{totalHabits} complete</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-12 bg-zinc-800 rounded-lg" />
          <div className="h-12 bg-zinc-800 rounded-lg" />
        </div>
      ) : (
        <div className="space-y-2">
          {habits.slice(0, 5).map((habit) => (
            <button
              key={habit.id}
              onClick={() => !habit.completedToday && completeHabit(habit.id)}
              disabled={habit.completedToday || completing === habit.id}
              className={`w-full p-3 rounded-xl flex items-center justify-between transition-all ${
                habit.completedToday
                  ? "bg-emerald-500/10 border border-emerald-500/30"
                  : "bg-zinc-800/50 hover:bg-zinc-800 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-3">
                {habit.completedToday ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : completing === habit.id ? (
                  <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Circle className="w-5 h-5 text-zinc-500" />
                )}
                <span className={habit.completedToday ? "text-emerald-300" : ""}>
                  {habit.name}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <Flame className="w-3 h-3 text-orange-400" />
                <span className="text-orange-400">{habit.streak}</span>
              </div>
            </button>
          ))}
          {habits.length === 0 && (
            <div className="text-center py-4">
              <p className="text-zinc-500 text-sm">No habits yet</p>
              <Link
                href="/habits"
                className="text-violet-400 text-sm hover:text-violet-300"
              >
                Create your first habit →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// IDENTITY ENGINE WIDGET
// ============================================
interface IdentityData {
  archetype: string;
  traits: Array<{ name: string; progress: number }>;
  dailyAction: string;
  level: number;
  xpToNext: number;
}

export function IdentityWidget() {
  const [identity, setIdentity] = useState<IdentityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadIdentity = async () => {
      try {
        const res = await fetch("/api/identity");
        if (res.ok) {
          const data = await res.json();
          setIdentity(data.identity);
        }
      } catch (err) {
        console.error("Failed to load identity:", err);
      } finally {
        setLoading(false);
      }
    };
    loadIdentity();
  }, []);

  const archetypeIcons: Record<string, string> = {
    "Warrior": "⚔️",
    "Sage": "📚",
    "Creator": "🎨",
    "Leader": "👑",
    "Healer": "💚",
    "Explorer": "🧭",
    "Rebel": "🔥",
    "Magician": "✨",
  };

  return (
    <div className="p-5 bg-gradient-to-br from-violet-900/20 to-indigo-900/20 border border-violet-500/30 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-violet-400" />
          <h3 className="font-semibold">Identity Engine</h3>
        </div>
        <Link href="/identity/dashboard" className="text-xs text-zinc-400 hover:text-white">
          Evolve →
        </Link>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-zinc-800 rounded-lg" />
          <div className="h-8 bg-zinc-800 rounded-lg" />
        </div>
      ) : identity ? (
        <>
          {/* Archetype Display */}
          <div className="text-center mb-4">
            <div className="text-4xl mb-2">
              {archetypeIcons[identity.archetype] || "🌟"}
            </div>
            <h4 className="text-lg font-bold text-violet-300">{identity.archetype}</h4>
            <p className="text-xs text-zinc-400">Level {identity.level}</p>
          </div>

          {/* Trait Progress */}
          <div className="space-y-2 mb-4">
            {identity.traits.slice(0, 3).map((trait, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-300">{trait.name}</span>
                  <span className="text-zinc-500">{trait.progress}%</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 transition-all"
                    style={{ width: `${trait.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Daily Action */}
          {identity.dailyAction && (
            <div className="p-3 bg-violet-500/10 rounded-xl">
              <p className="text-xs text-violet-300 font-medium mb-1">Today's Identity Action</p>
              <p className="text-sm">{identity.dailyAction}</p>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-zinc-500 text-sm mb-2">Discover who you're becoming</p>
          <Link
            href="/identity/dashboard"
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium inline-block"
          >
            Start Journey
          </Link>
        </div>
      )}
    </div>
  );
}

// ============================================
// PHILOSOPHY DOJO WIDGET
// ============================================
interface PhilosophyData {
  currentPath: string;
  mentor: string;
  mentorIcon: string;
  todayLesson: string;
  todayPractice: string;
  streak: number;
  beltRank: string;
  xpProgress: number;
}

export function PhilosophyWidget() {
  const [philosophy, setPhilosophy] = useState<PhilosophyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPhilosophy = async () => {
      try {
        const res = await fetch("/api/philosophy/today");
        if (res.ok) {
          const data = await res.json();
          setPhilosophy(data);
        }
      } catch (err) {
        console.error("Failed to load philosophy:", err);
      } finally {
        setLoading(false);
      }
    };
    loadPhilosophy();
  }, []);

  const beltColors: Record<string, string> = {
    "White": "bg-zinc-200",
    "Yellow": "bg-yellow-400",
    "Orange": "bg-orange-400",
    "Green": "bg-green-500",
    "Blue": "bg-blue-500",
    "Purple": "bg-purple-500",
    "Brown": "bg-amber-700",
    "Black": "bg-zinc-900 border border-zinc-600",
  };

  return (
    <div className="p-5 bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-500/30 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Scroll className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold">Philosophy Dojo</h3>
        </div>
        <Link href="/philosophy" className="text-xs text-zinc-400 hover:text-white">
          Train →
        </Link>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-zinc-800 rounded-lg" />
          <div className="h-20 bg-zinc-800 rounded-lg" />
        </div>
      ) : philosophy ? (
        <>
          {/* Mentor & Path */}
          <div className="flex items-center gap-3 mb-4">
            <div className="text-3xl">{philosophy.mentorIcon}</div>
            <div>
              <h4 className="font-medium text-amber-300">{philosophy.mentor}</h4>
              <p className="text-xs text-zinc-400">{philosophy.currentPath}</p>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <div className={`w-6 h-2 rounded-full ${beltColors[philosophy.beltRank] || "bg-zinc-600"}`} />
              <span className="text-xs text-zinc-400">{philosophy.beltRank}</span>
            </div>
          </div>

          {/* Today's Lesson */}
          <div className="p-3 bg-zinc-800/50 rounded-xl mb-3">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-medium mb-1">
              <BookOpen className="w-3 h-3" />
              Today's Lesson
            </div>
            <p className="text-sm text-zinc-300">{philosophy.todayLesson}</p>
          </div>

          {/* Today's Practice */}
          <div className="p-3 bg-amber-500/10 rounded-xl mb-3">
            <div className="flex items-center gap-2 text-amber-300 text-xs font-medium mb-1">
              <Swords className="w-3 h-3" />
              Today's Practice
            </div>
            <p className="text-sm">{philosophy.todayPractice}</p>
          </div>

          {/* Streak & XP */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <span>{philosophy.streak} day streak</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>{philosophy.xpProgress}% to next belt</span>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-zinc-500 text-sm mb-2">Begin your philosophical journey</p>
          <Link
            href="/philosophy"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm font-medium inline-block"
          >
            Choose a Path
          </Link>
        </div>
      )}
    </div>
  );
}

// ============================================
// EMOTIONAL CHECK-IN WIDGET
// ============================================
interface EmotionalState {
  mood: number;
  energy: number;
  stress: number;
  notes: string;
}

export function EmotionalCheckInWidget({ onComplete }: { onComplete?: () => void }) {
  const [state, setState] = useState<EmotionalState>({
    mood: 5,
    energy: 5,
    stress: 5,
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const moodEmojis = ["😢", "😔", "😕", "😐", "🙂", "😊", "😄", "😁", "🤩", "🥳"];
  const energyLabels = ["Exhausted", "Tired", "Low", "Okay", "Good", "Energized", "Pumped", "Wired", "Explosive", "Unstoppable"];

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/emotions/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      
      if (res.ok) {
        setSubmitted(true);
        onComplete?.();
      }
    } catch (err) {
      console.error("Failed to submit check-in:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-5 bg-gradient-to-br from-emerald-900/20 to-teal-900/20 border border-emerald-500/30 rounded-2xl text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
        <h3 className="font-semibold text-emerald-300">Check-in Complete!</h3>
        <p className="text-sm text-zinc-400 mt-1">Pulse is adapting to support you today.</p>
      </div>
    );
  }

  return (
    <div className="p-5 bg-gradient-to-br from-pink-900/20 to-rose-900/20 border border-pink-500/30 rounded-2xl">
      <div className="flex items-center gap-2 mb-4">
        <Heart className="w-5 h-5 text-pink-400" />
        <h3 className="font-semibold">How are you feeling?</h3>
      </div>

      {/* Mood Slider */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-zinc-400">Mood</span>
          <span className="text-2xl">{moodEmojis[state.mood - 1]}</span>
        </div>
        <input
          type="range"
          min="1"
          max="10"
          value={state.mood}
          onChange={(e) => setState({ ...state, mood: parseInt(e.target.value) })}
          className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-pink-500"
        />
      </div>

      {/* Energy Slider */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-zinc-400">Energy</span>
          <span className="text-sm text-amber-400">{energyLabels[state.energy - 1]}</span>
        </div>
        <input
          type="range"
          min="1"
          max="10"
          value={state.energy}
          onChange={(e) => setState({ ...state, energy: parseInt(e.target.value) })}
          className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
        />
      </div>

      {/* Stress Slider */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-zinc-400">Stress</span>
          <span className="text-sm text-red-400">{state.stress}/10</span>
        </div>
        <input
          type="range"
          min="1"
          max="10"
          value={state.stress}
          onChange={(e) => setState({ ...state, stress: parseInt(e.target.value) })}
          className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-red-500"
        />
      </div>

      {/* Notes */}
      <textarea
        placeholder="Anything on your mind? (optional)"
        value={state.notes}
        onChange={(e) => setState({ ...state, notes: e.target.value })}
        className="w-full p-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-sm resize-none mb-4 focus:outline-none focus:border-pink-500"
        rows={2}
      />

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-3 bg-pink-600 hover:bg-pink-500 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {submitting ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <Heart className="w-4 h-4" />
            Save Check-in
          </>
        )}
      </button>
    </div>
  );
}

// Export all widgets
export default {
  CalendarWidget,
  HabitsWidget,
  IdentityWidget,
  PhilosophyWidget,
  EmotionalCheckInWidget,
};
