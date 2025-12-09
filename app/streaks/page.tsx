"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, TrendingUp } from "lucide-react";
import { StreakCalendar } from "@/app/components/streak-calendar";

export default function StreakCalendarPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Calendar className="w-7 h-7 text-emerald-400" />
                Streak Calendar
              </h1>
              <p className="text-zinc-400 text-sm">Track your daily activity and build streaks</p>
            </div>
          </div>
          <Link
            href="/achievements"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Achievements
          </Link>
        </div>

        {/* Main Calendar */}
        <StreakCalendar title="Activity Streaks" />

        {/* Tips */}
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
          <h3 className="font-semibold mb-4">🔥 Building Streaks</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-zinc-400">
            <div className="flex items-start gap-3">
              <span className="text-emerald-400">✓</span>
              <p>Complete at least one task, habit, or identity action each day to maintain your streak</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-amber-400">⭐</span>
              <p>Perfect days require 3+ habits AND 3+ tasks completed</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-violet-400">📈</span>
              <p>Higher activity = brighter squares on the calendar</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-orange-400">🔥</span>
              <p>Long streaks unlock special achievement badges</p>
            </div>
          </div>
        </div>

        {/* Streak Milestones */}
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
          <h3 className="font-semibold mb-4">🏆 Streak Milestones</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { days: 7, name: "Week Warrior", icon: "🔥", color: "text-orange-400" },
              { days: 30, name: "Monthly Master", icon: "🌟", color: "text-amber-400" },
              { days: 100, name: "Century Club", icon: "💯", color: "text-purple-400" },
              { days: 365, name: "Year of Excellence", icon: "🏆", color: "text-yellow-400" },
            ].map((milestone) => (
              <div
                key={milestone.days}
                className="bg-zinc-800/50 rounded-lg p-4 text-center"
              >
                <div className="text-2xl mb-1">{milestone.icon}</div>
                <div className={`font-bold ${milestone.color}`}>{milestone.days} Days</div>
                <div className="text-xs text-zinc-500">{milestone.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
