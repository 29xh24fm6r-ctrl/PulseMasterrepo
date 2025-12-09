"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, Zap, Target, Trophy, Flame, Crown, Sparkles } from "lucide-react";
import { useXPToast } from "../components/xp-toast";

export default function XPToastDemo() {
  const { showXPToast } = useXPToast();

  const testToasts = [
    {
      label: "Task Completed",
      icon: <Target className="w-4 h-4" />,
      action: () => showXPToast({
        amount: 25,
        category: "DXP",
        activity: "Completed: Review quarterly report",
        wasCrit: false,
      }),
    },
    {
      label: "High Priority Task (Crit!)",
      icon: <Zap className="w-4 h-4 text-yellow-400" />,
      action: () => showXPToast({
        amount: 120,
        category: "DXP",
        activity: "Completed: Close the Ellmann deal",
        wasCrit: true,
        critMultiplier: 3,
      }),
    },
    {
      label: "Habit Logged",
      icon: <Flame className="w-4 h-4" />,
      action: () => showXPToast({
        amount: 15,
        category: "DXP",
        activity: "Workout (7 day streak!)",
        wasCrit: false,
      }),
    },
    {
      label: "Deal Won!",
      icon: <Trophy className="w-4 h-4" />,
      action: () => showXPToast({
        amount: 150,
        category: "AXP",
        activity: "Deal won: TechFlow Solutions",
        wasCrit: false,
      }),
    },
    {
      label: "Deal Won (CRIT!)",
      icon: <Trophy className="w-4 h-4 text-yellow-400" />,
      action: () => showXPToast({
        amount: 450,
        category: "AXP",
        activity: "Deal won: Enterprise Corp $500K",
        wasCrit: true,
        critMultiplier: 3,
      }),
    },
    {
      label: "Streak Milestone",
      icon: <Flame className="w-4 h-4 text-orange-400" />,
      action: () => showXPToast({
        amount: 200,
        category: "MXP",
        activity: "🔥 30-day streak: Morning Routine!",
        wasCrit: true,
        critMultiplier: 1,
      }),
    },
    {
      label: "Stoic Moment",
      icon: <Sparkles className="w-4 h-4" />,
      action: () => showXPToast({
        amount: 30,
        category: "IXP",
        activity: "Stayed calm under pressure",
        wasCrit: false,
      }),
    },
    {
      label: "Boundary Set (Crit!)",
      icon: <Crown className="w-4 h-4" />,
      action: () => showXPToast({
        amount: 160,
        category: "PXP",
        activity: "Said no to scope creep",
        wasCrit: true,
        critMultiplier: 4,
      }),
    },
    {
      label: "Journal Entry",
      icon: <Target className="w-4 h-4" />,
      action: () => showXPToast({
        amount: 20,
        category: "DXP",
        activity: "Journal entry saved",
        wasCrit: false,
      }),
    },
  ];

  const fireAll = () => {
    testToasts.forEach((t, i) => {
      setTimeout(() => t.action(), i * 400);
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-400" />
              XP Toast Demo
            </h1>
            <p className="text-sm text-slate-400">Test the XP notification system</p>
          </div>
        </header>

        {/* Info */}
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
          <p className="text-sm text-slate-300">
            Click any button below to trigger an XP toast. Toasts appear in the bottom-right 
            corner and auto-dismiss after 3 seconds. <strong>Crit</strong> toasts have extra 
            visual effects!
          </p>
        </div>

        {/* Test Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {testToasts.map((toast, i) => (
            <button
              key={i}
              onClick={toast.action}
              className="flex items-center gap-3 p-4 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700 rounded-xl transition-colors text-left"
            >
              <div className="p-2 rounded-lg bg-slate-700/50">
                {toast.icon}
              </div>
              <span className="font-medium">{toast.label}</span>
            </button>
          ))}
        </div>

        {/* Fire All Button */}
        <button
          onClick={fireAll}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-bold text-lg transition-colors"
        >
          🎆 Fire All Toasts!
        </button>

        {/* Usage Code */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-3">Usage in your code:</h3>
          <pre className="text-sm text-slate-300 overflow-x-auto">
{`// In any component:
import { useXPToast } from "@/app/components/xp-toast";

function MyComponent() {
  const { showXPToast } = useXPToast();
  
  const handleComplete = () => {
    showXPToast({
      amount: 25,
      category: "DXP",
      activity: "Task completed",
      wasCrit: false,
    });
  };
}

// Or use the helpers:
import { XPToasts } from "@/lib/xp-toast-helpers";

XPToasts.taskCompleted("Review docs", true);
XPToasts.habitLogged("Workout", 7);
XPToasts.dealWon("Big Corp", true, 2);`}
          </pre>
        </div>
      </div>
    </main>
  );
}
