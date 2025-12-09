"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Flame, Calendar, Target } from "lucide-react";

interface DayData {
  date: string;
  hasActivity: boolean;
  xpEarned: number;
  tasksCompleted: number;
  habitsCompleted: number;
  identityActions: number;
  isPerfectDay: boolean;
}

interface StreakCalendarProps {
  title?: string;
  onDayClick?: (day: DayData) => void;
}

export function StreakCalendar({ title = "Activity Calendar", onDayClick }: StreakCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<Record<string, DayData>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [stats, setStats] = useState({
    currentStreak: 0,
    longestStreak: 0,
    totalActiveDays: 0,
    perfectDays: 0,
  });

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  useEffect(() => {
    loadCalendarData();
  }, [currentDate]);

  async function loadCalendarData() {
    setLoading(true);
    try {
      // In production, fetch from API
      // const res = await fetch(`/api/calendar/streak?month=${currentDate.getMonth()}&year=${currentDate.getFullYear()}`);
      // const data = await res.json();
      
      // Generate mock data for now
      const data = generateMockData(currentDate);
      setCalendarData(data.days);
      setStats(data.stats);
    } catch (err) {
      console.error("Failed to load calendar data:", err);
    } finally {
      setLoading(false);
    }
  }

  function generateMockData(date: Date): { days: Record<string, DayData>; stats: typeof stats } {
    const days: Record<string, DayData> = {};
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let totalActiveDays = 0;
    let perfectDays = 0;

    // Generate data for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayDate = new Date(year, month, day);
      const isPast = dayDate <= today;

      // Random activity (weighted towards having activity)
      const hasActivity = isPast && Math.random() > 0.25;
      const xpEarned = hasActivity ? Math.floor(Math.random() * 400) + 50 : 0;
      const tasksCompleted = hasActivity ? Math.floor(Math.random() * 8) + 1 : 0;
      const habitsCompleted = hasActivity ? Math.floor(Math.random() * 5) : 0;
      const identityActions = hasActivity ? Math.floor(Math.random() * 3) : 0;
      const isPerfectDay = hasActivity && habitsCompleted >= 3 && tasksCompleted >= 3;

      days[dateStr] = {
        date: dateStr,
        hasActivity,
        xpEarned,
        tasksCompleted,
        habitsCompleted,
        identityActions,
        isPerfectDay,
      };

      if (hasActivity) {
        totalActiveDays++;
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
        if (isPerfectDay) perfectDays++;
      } else if (isPast) {
        tempStreak = 0;
      }
    }

    // Calculate current streak (from today backwards)
    currentStreak = 0;
    for (let day = today.getDate(); day >= 1; day--) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (days[dateStr]?.hasActivity) {
        currentStreak++;
      } else {
        break;
      }
    }

    return {
      days,
      stats: { currentStreak, longestStreak, totalActiveDays, perfectDays },
    };
  }

  function navigateMonth(direction: -1 | 1) {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  function getCalendarDays(): (DayData | null)[] {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (DayData | null)[] = [];

    // Empty cells for days before the first of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      days.push(calendarData[dateStr] || {
        date: dateStr,
        hasActivity: false,
        xpEarned: 0,
        tasksCompleted: 0,
        habitsCompleted: 0,
        identityActions: 0,
        isPerfectDay: false,
      });
    }

    return days;
  }

  function isToday(dateStr: string): boolean {
    const today = new Date().toISOString().split("T")[0];
    return dateStr === today;
  }

  function isFuture(dateStr: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const date = new Date(dateStr);
    return date > today;
  }

  function getActivityLevel(day: DayData): number {
    if (!day.hasActivity) return 0;
    const score = day.xpEarned / 100 + day.tasksCompleted + day.habitsCompleted * 2;
    if (score >= 10) return 4;
    if (score >= 6) return 3;
    if (score >= 3) return 2;
    return 1;
  }

  const calendarDays = getCalendarDays();

  return (
    <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-emerald-400" />
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToToday}
            className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </button>
          <button
            onClick={() => navigateMonth(1)}
            className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl p-3 text-center border border-orange-500/30">
          <div className="text-2xl font-bold text-orange-400">{stats.currentStreak}</div>
          <div className="text-xs text-zinc-500">Current Streak</div>
        </div>
        <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-amber-400">{stats.longestStreak}</div>
          <div className="text-xs text-zinc-500">Best Streak</div>
        </div>
        <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-emerald-400">{stats.totalActiveDays}</div>
          <div className="text-xs text-zinc-500">Active Days</div>
        </div>
        <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-violet-400">{stats.perfectDays}</div>
          <div className="text-xs text-zinc-500">Perfect Days</div>
        </div>
      </div>

      {/* Day names header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map((name) => (
          <div key={name} className="text-center text-xs text-zinc-500 py-1">
            {name}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            if (!day) {
              return <div key={`empty-${idx}`} className="aspect-square" />;
            }

            const level = getActivityLevel(day);
            const today = isToday(day.date);
            const future = isFuture(day.date);
            const dayNum = parseInt(day.date.split("-")[2]);

            const levelColors = [
              "bg-zinc-800/50", // 0 - no activity
              "bg-emerald-900/50", // 1 - low
              "bg-emerald-700/60", // 2 - medium
              "bg-emerald-500/70", // 3 - high
              "bg-emerald-400", // 4 - very high
            ];

            return (
              <button
                key={day.date}
                onClick={() => {
                  setSelectedDay(day);
                  onDayClick?.(day);
                }}
                disabled={future}
                className={`
                  aspect-square rounded-lg flex flex-col items-center justify-center relative
                  transition-all hover:scale-105 hover:ring-2 hover:ring-emerald-500/50
                  ${future ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
                  ${today ? "ring-2 ring-violet-500" : ""}
                  ${day.isPerfectDay ? "ring-2 ring-amber-500" : ""}
                  ${levelColors[level]}
                `}
              >
                <span className={`text-sm font-medium ${level >= 3 ? "text-white" : "text-zinc-400"}`}>
                  {dayNum}
                </span>
                {day.isPerfectDay && (
                  <span className="absolute -top-1 -right-1 text-[10px]">⭐</span>
                )}
                {day.hasActivity && level >= 2 && (
                  <Flame className="w-3 h-3 text-orange-400 absolute bottom-0.5" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-zinc-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-zinc-800/50" />
          <span>None</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-900/50" />
          <span>Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-700/60" />
          <span>Med</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-500/70" />
          <span>High</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-emerald-400" />
          <span>🔥</span>
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDay && selectedDay.hasActivity && (
        <div className="mt-4 p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium">
              {new Date(selectedDay.date).toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </div>
            {selectedDay.isPerfectDay && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                ⭐ Perfect Day
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-amber-400">{selectedDay.xpEarned}</div>
              <div className="text-[10px] text-zinc-500">XP Earned</div>
            </div>
            <div>
              <div className="text-lg font-bold text-blue-400">{selectedDay.tasksCompleted}</div>
              <div className="text-[10px] text-zinc-500">Tasks</div>
            </div>
            <div>
              <div className="text-lg font-bold text-orange-400">{selectedDay.habitsCompleted}</div>
              <div className="text-[10px] text-zinc-500">Habits</div>
            </div>
            <div>
              <div className="text-lg font-bold text-violet-400">{selectedDay.identityActions}</div>
              <div className="text-[10px] text-zinc-500">Identity</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for widgets
export function StreakCalendarMini() {
  const [data, setData] = useState<{ streak: number; last7: boolean[] }>({
    streak: 0,
    last7: [],
  });

  useEffect(() => {
    // Generate mock last 7 days
    const last7 = Array.from({ length: 7 }, () => Math.random() > 0.3);
    let streak = 0;
    for (let i = last7.length - 1; i >= 0; i--) {
      if (last7[i]) streak++;
      else break;
    }
    setData({ streak, last7 });
  }, []);

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  const today = new Date().getDay();

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        <Flame className="w-4 h-4 text-orange-400" />
        <span className="font-bold text-orange-400">{data.streak}</span>
      </div>
      <div className="flex gap-1">
        {data.last7.map((active, idx) => {
          const dayIdx = (today - 6 + idx + 7) % 7;
          return (
            <div
              key={idx}
              className={`
                w-5 h-5 rounded flex items-center justify-center text-[10px]
                ${active ? "bg-emerald-500/70 text-white" : "bg-zinc-800 text-zinc-600"}
                ${idx === 6 ? "ring-1 ring-violet-500" : ""}
              `}
            >
              {dayLabels[dayIdx]}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default StreakCalendar;
