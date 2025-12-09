"use client";

import { useState, useEffect } from "react";
import { LayoutJson } from "@/types/dashboard";
import { Zap, Trophy, TrendingUp, Award } from "lucide-react";

export function XpPanel({ userId, layout }: { userId: string; layout: LayoutJson }) {
  const widgets = layout.panels.XP.widgets;

  // Mock XP data - replace with real API call
  const xpData = {
    todayXp: 350,
    targetXp: 500,
    totalXp: 12450,
    level: 24,
    streak: 7,
    careerProgress: 68,
    careerNext: "Deal Closer",
    beltColor: "blue",
    beltName: "Blue Belt",
  };

  const todayProgress = Math.round((xpData.todayXp / xpData.targetXp) * 100);

  if (widgets.length === 0) return null;

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {widgets.includes("xp_summary") && (
        <div className="flex-1 bg-gradient-to-br from-violet-900/30 to-purple-900/30 rounded-xl p-4 border border-violet-800/30">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-sm font-medium text-zinc-300">Today's XP</span>
            </div>
            <span className="text-2xl font-bold text-zinc-100">
              {xpData.todayXp}<span className="text-sm text-zinc-400 font-normal">/{xpData.targetXp}</span>
            </span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500" style={{ width: `${Math.min(todayProgress, 100)}%` }} />
          </div>
          <div className="flex justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1"><Trophy className="w-3 h-3" /> Level {xpData.level}</span>
            <span>🔥 {xpData.streak} day streak</span>
          </div>
        </div>
      )}

      {widgets.includes("career_track") && (
        <div className="flex-1 bg-gradient-to-br from-blue-900/30 to-cyan-900/30 rounded-xl p-4 border border-blue-800/30">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <span className="text-sm font-medium text-zinc-300">Career Track</span>
          </div>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500" style={{ width: `${xpData.careerProgress}%` }} />
          </div>
          <p className="text-xs text-zinc-400">Next: {xpData.careerNext}</p>
        </div>
      )}

      {widgets.includes("philosophy_belt") && (
        <div className="flex-1 bg-gradient-to-br from-emerald-900/30 to-teal-900/30 rounded-xl p-4 border border-emerald-800/30">
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium text-zinc-300">Philosophy Dojo</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-blue-500" />
            <span className="text-lg font-semibold text-zinc-100">{xpData.beltName}</span>
          </div>
        </div>
      )}
    </div>
  );
}
