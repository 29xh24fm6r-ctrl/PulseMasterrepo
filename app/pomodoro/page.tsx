"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Brain, Zap, Target } from "lucide-react";
import { PomodoroTimer } from "@/app/components/pomodoro-timer";

export default function PomodoroPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Brain className="w-7 h-7 text-red-400" />
                Focus Timer
              </h1>
              <p className="text-zinc-400 text-sm">Pomodoro technique for deep work</p>
            </div>
          </div>
          <Link
            href="/tasks"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm flex items-center gap-2"
          >
            <Target className="w-4 h-4" />
            Tasks
          </Link>
        </div>

        {/* Timer */}
        <PomodoroTimer />

        {/* Tips */}
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            XP Rewards
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-red-400">+25</div>
              <div className="text-xs text-zinc-500">Focus Session</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-emerald-400">+5</div>
              <div className="text-xs text-zinc-500">Short Break</div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-400">+10</div>
              <div className="text-xs text-zinc-500">Long Break</div>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-6">
          <h3 className="font-semibold mb-4">🍅 The Pomodoro Technique</h3>
          <div className="space-y-3 text-sm text-zinc-400">
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xs font-bold">1</span>
              <p><strong className="text-white">Focus</strong> — Work on a single task for 25 minutes without interruption</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">2</span>
              <p><strong className="text-white">Short Break</strong> — Take a 5-minute break to rest your mind</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">3</span>
              <p><strong className="text-white">Repeat</strong> — After 4 sessions, take a longer 15-minute break</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-bold">4</span>
              <p><strong className="text-white">Earn XP</strong> — Complete sessions to earn Inner XP and build streaks</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
