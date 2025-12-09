"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  XPCategory,
  XP_CATEGORIES,
  IdentityType,
  IDENTITIES,
  getLevelFromXP,
  getLevelProgress,
  getXPForLevel,
  calculateAscensionLevel,
} from "@/lib/xp/types";

// Ascension titles based on level
const ASCENSION_TITLES: Record<number, string> = {
  1: "Awakened",
  2: "Awakened",
  3: "Initiate",
  4: "Initiate",
  5: "Apprentice",
  6: "Apprentice",
  7: "Adept",
  8: "Adept",
  9: "Adept",
  10: "Warrior",
  11: "Warrior",
  12: "Warrior",
  13: "Warrior",
  14: "Warrior",
  15: "Veteran",
  16: "Veteran",
  17: "Veteran",
  18: "Veteran",
  19: "Veteran",
  20: "Commander",
  21: "Commander",
  22: "Commander",
  23: "Commander",
  24: "Commander",
  25: "Champion",
  26: "Champion",
  27: "Champion",
  28: "Champion",
  29: "Champion",
  30: "Master",
};

function getAscensionTitle(level: number): string {
  if (level >= 50) return "Transcendent";
  if (level >= 40) return "Legendary";
  if (level >= 30) return "Master";
  return ASCENSION_TITLES[level] || "Awakened";
}

interface XPData {
  totals: Record<XPCategory, number>;
  levels: Record<XPCategory, number>;
  ascensionLevel: number;
  totalXP: number;
  todayXP: number;
  recentGains: Array<{
    activity: string;
    category: XPCategory;
    amount: number;
    wasCrit: boolean;
    date: string;
  }>;
  currentStreak: number;
  activeIdentity: IdentityType | null;
}

interface XPAscensionWidgetProps {
  variant?: "full" | "compact" | "mini";
  showRecent?: boolean;
}

export default function XPAscensionWidget({ 
  variant = "full",
  showRecent = true 
}: XPAscensionWidgetProps) {
  const [data, setData] = useState<XPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayData, setTodayData] = useState<{ totalXP: number } | null>(null);

  useEffect(() => {
    fetchXPData();
  }, []);

  async function fetchXPData() {
    try {
      setLoading(true);
      
      // Fetch all-time totals
      const res = await fetch("/api/xp/log?period=all");
      const json = await res.json();
      
      if (!json.ok) {
        throw new Error(json.error || "Failed to fetch XP data");
      }

      // Fetch today's XP
      const todayRes = await fetch("/api/xp/log?period=today");
      const todayJson = await todayRes.json();

      setData({
        totals: json.totals,
        levels: json.levels,
        ascensionLevel: json.ascensionLevel,
        totalXP: json.totalXP,
        todayXP: todayJson.ok ? todayJson.totalXP : 0,
        recentGains: json.recentGains || [],
        currentStreak: 0, // TODO: Calculate from habits
        activeIdentity: null, // TODO: Calculate from resonance
      });

      setTodayData({ totalXP: todayJson.ok ? todayJson.totalXP : 0 });
      setError(null);
    } catch (err: any) {
      console.error("XP fetch error:", err);
      setError(err.message);
      // Set default data on error
      setData({
        totals: { DXP: 0, PXP: 0, IXP: 0, AXP: 0, MXP: 0 },
        levels: { DXP: 1, PXP: 1, IXP: 1, AXP: 1, MXP: 1 },
        ascensionLevel: 1,
        totalXP: 0,
        todayXP: 0,
        recentGains: [],
        currentStreak: 0,
        activeIdentity: null,
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className={`bg-slate-900/70 border border-slate-800 rounded-2xl p-4 ${variant === "mini" ? "p-3" : "p-4"}`}>
        <div className="flex items-center justify-center py-8">
          <div className="text-2xl animate-pulse">⚔️</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <div className="text-center text-slate-500 py-4">
          Unable to load XP data
        </div>
      </div>
    );
  }

  const { totals, levels, ascensionLevel, totalXP, todayXP, recentGains, activeIdentity } = data;
  const ascensionTitle = getAscensionTitle(ascensionLevel);

  // Mini variant - just the level badge
  if (variant === "mini") {
    return (
      <Link href="/xp" className="block">
        <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-xl p-3 hover:border-indigo-400/50 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
              {ascensionLevel}
            </div>
            <div>
              <div className="text-sm font-medium text-slate-200">{ascensionTitle}</div>
              <div className="text-xs text-slate-400">{totalXP.toLocaleString()} XP</div>
            </div>
            {todayXP > 0 && (
              <div className="ml-auto text-xs text-green-400">+{todayXP} today</div>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // Compact variant - level + category bars
  if (variant === "compact") {
    return (
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
              {ascensionLevel}
            </div>
            <div>
              <div className="text-sm text-slate-400">Ascension Level</div>
              <div className="font-semibold text-slate-200">{ascensionTitle}</div>
            </div>
          </div>
          <Link href="/xp" className="text-xs text-indigo-400 hover:text-indigo-300">
            View Skills →
          </Link>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {(Object.keys(XP_CATEGORIES) as XPCategory[]).map((cat) => {
            const config = XP_CATEGORIES[cat];
            const level = levels[cat];
            const progress = getLevelProgress(totals[cat]);
            
            return (
              <div key={cat} className="text-center">
                <div className="text-lg mb-1">{config.icon}</div>
                <div className="text-xs text-slate-400">{cat}</div>
                <div className="text-sm font-bold" style={{ color: config.color }}>
                  {level}
                </div>
                <div className="h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${progress * 100}%`,
                      backgroundColor: config.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {todayXP > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-800 text-center">
            <span className="text-green-400 text-sm">+{todayXP} XP today</span>
          </div>
        )}
      </div>
    );
  }

  // Full variant - everything
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold uppercase text-slate-400 tracking-wide">
          ⚔️ XP Ascension
        </h3>
        <Link href="/xp" className="text-xs text-indigo-400 hover:text-indigo-300">
          View Skills →
        </Link>
      </div>

      {/* Ascension Level Circle */}
      <div className="flex items-center gap-5 mb-5">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-1">
            <div className="w-full h-full rounded-full bg-slate-900 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-white">{ascensionLevel}</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wide">Level</div>
            </div>
          </div>
          {activeIdentity && (
            <div 
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-sm border-2 border-slate-900"
              style={{ backgroundColor: IDENTITIES[activeIdentity].color }}
              title={activeIdentity}
            >
              {IDENTITIES[activeIdentity].icon}
            </div>
          )}
        </div>
        <div>
          <div className="text-xl font-bold text-slate-100">{ascensionTitle}</div>
          <div className="text-sm text-slate-400">{totalXP.toLocaleString()} Total XP</div>
          {todayXP > 0 && (
            <div className="text-sm text-green-400 mt-1">+{todayXP} today</div>
          )}
        </div>
      </div>

      {/* Category Progress Bars */}
      <div className="space-y-3 mb-5">
        {(Object.keys(XP_CATEGORIES) as XPCategory[]).map((cat) => {
          const config = XP_CATEGORIES[cat];
          const level = levels[cat];
          const xp = totals[cat];
          const progress = getLevelProgress(xp);
          const toNext = getXPForLevel(level + 1) - xp;

          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span>{config.icon}</span>
                  <span className="text-xs text-slate-400">{config.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{xp.toLocaleString()} XP</span>
                  <span 
                    className="text-sm font-bold"
                    style={{ color: config.color }}
                  >
                    Lv.{level}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${progress * 100}%`,
                    background: `linear-gradient(90deg, ${config.color}, ${config.color}dd)`,
                  }}
                />
              </div>
              <div className="text-[10px] text-slate-600 mt-0.5 text-right">
                {toNext.toLocaleString()} to Lv.{level + 1}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Gains */}
      {showRecent && recentGains.length > 0 && (
        <div className="border-t border-slate-800 pt-4">
          <div className="text-xs text-slate-500 uppercase mb-2">Recent Gains</div>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {recentGains.slice(0, 5).map((gain, i) => (
              <div 
                key={i} 
                className="flex items-center justify-between text-xs py-1 px-2 rounded bg-slate-800/50"
              >
                <div className="flex items-center gap-2">
                  <span>{XP_CATEGORIES[gain.category]?.icon}</span>
                  <span className="text-slate-300 truncate max-w-[150px]">
                    {gain.activity}
                  </span>
                  {gain.wasCrit && (
                    <span className="text-yellow-400 text-[10px]">⚡CRIT</span>
                  )}
                </div>
                <span 
                  className="font-medium"
                  style={{ color: XP_CATEGORIES[gain.category]?.color }}
                >
                  +{gain.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mt-3 p-2 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
