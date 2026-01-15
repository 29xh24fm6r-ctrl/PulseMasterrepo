"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Zap,
  Flame,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Compass,
  Target,
} from "lucide-react";

interface IdentityState {
  activeArchetype: string | null;
  resonance: Record<string, { current: number; peak: number; trend: string }>;
  values: Record<string, { score: number; trend: string }>;
  northStar: { vision: string; mission: string } | null;
  totalIdentityActions: number;
  streakDays: number;
  lastActionDate: string | null;
}

interface Archetype {
  id: string;
  name: string;
  icon: string;
  color: string;
  xpBonus: { category: string };
}

const STORAGE_KEY = "pulse-identity-state";

export function IdentityWidget() {
  const [state, setState] = useState<IdentityState | null>(null);
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [identityStrength, setIdentityStrength] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      let currentState = saved ? JSON.parse(saved) : null;

      const res = await fetch("/api/identity/profile", {
        method: currentState ? "POST" : "GET",
        headers: { "Content-Type": "application/json" },
        body: currentState ? JSON.stringify({ state: currentState }) : undefined,
      });
      const data = await res.json();

      if (data.ok) {
        if (data.state) {
          currentState = data.state;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
        }
        if (data.archetypes) setArchetypes(data.archetypes);
        if (data.profile?.identityStrength !== undefined) {
          setIdentityStrength(data.profile.identityStrength);
        }
      }

      setState(currentState);
    } catch (err) {
      console.error("Failed to load identity:", err);
    } finally {
      setLoading(false);
    }
  }

  function getTopArchetypes() {
    if (!state?.resonance) return [];
    return Object.entries(state.resonance)
      .map(([id, data]) => ({
        id,
        archetype: archetypes.find((a) => a.id === id),
        ...data,
      }))
      .filter((a) => a.archetype)
      .sort((a, b) => b.current - a.current)
      .slice(0, 3);
  }

  if (loading) {
    return (
      <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
        <div className="flex items-center gap-2 text-zinc-400 mb-4">
          <Sparkles className="w-5 h-5" />
          <span className="font-medium">Identity</span>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const activeArch = state?.activeArchetype
    ? archetypes.find((a) => a.id === state.activeArchetype)
    : null;

  const topArchetypes = getTopArchetypes();
  const hasNorthStar = state?.northStar?.vision || state?.northStar?.mission;

  // Empty state
  if (!state || state.totalIdentityActions === 0) {
    return (
      <div className="bg-gradient-to-br from-violet-900/20 to-fuchsia-900/20 rounded-2xl border border-violet-500/20 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-violet-400">
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">Identity</span>
          </div>
          <Link
            href="/bridge"
            className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
          >
            Start <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="text-center py-4">
          <div className="text-4xl mb-3">🔮</div>
          <p className="text-zinc-400 text-sm mb-3">
            Track who you&apos;re becoming
          </p>
          <Link
            href="/bridge"
            className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium transition-colors"
          >
            <Target className="w-4 h-4" />
            Begin Your Journey
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-violet-900/20 to-fuchsia-900/20 rounded-2xl border border-violet-500/20 p-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl" />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-violet-400">
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">Identity</span>
          </div>
          <Link
            href="/bridge"
            className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
          >
            Dashboard <ChevronRight className="w-3 h-3" />
          </Link>
        </div>

        {/* Active Archetype or Strength */}
        {activeArch ? (
          <div className="flex items-center gap-3 mb-4 p-3 bg-zinc-900/50 rounded-xl">
            <div className="text-3xl">{activeArch.icon}</div>
            <div className="flex-1">
              <div className="font-semibold" style={{ color: activeArch.color }}>
                {activeArch.name}
              </div>
              <div className="text-xs text-emerald-400 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                +25% {activeArch.xpBonus?.category} XP
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-zinc-400">Identity Strength</span>
              <span className="text-lg font-bold">{identityStrength}</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all"
                style={{ width: `${identityStrength}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Target className="w-4 h-4" />
            <span className="text-white font-medium">{state.totalIdentityActions}</span>
            <span>actions</span>
          </div>
          {state.streakDays > 0 && (
            <div className="flex items-center gap-1.5 text-amber-400">
              <Flame className="w-4 h-4" />
              <span className="font-medium">{state.streakDays}</span>
              <span>day streak</span>
            </div>
          )}
        </div>

        {/* Top Archetypes Progress */}
        {!activeArch && topArchetypes.length > 0 && (
          <div className="space-y-2 mb-4">
            <div className="text-xs text-zinc-500 uppercase tracking-wide">Top Archetypes</div>
            {topArchetypes.slice(0, 2).map(({ id, archetype, current }) => {
              if (!archetype) return null;
              const progress = Math.min(100, (current / 500) * 100);
              const isReady = current >= 500;

              return (
                <div key={id} className="flex items-center gap-2">
                  <span className="text-lg">{archetype.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-zinc-300">{archetype.name}</span>
                      <span className="text-zinc-500">
                        {current}/500
                        {isReady && <span className="ml-1 text-emerald-400">✓</span>}
                      </span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: archetype.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* North Star Preview */}
        {hasNorthStar && (
          <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <div className="flex items-center gap-2 text-amber-400 text-xs mb-1">
              <Compass className="w-3 h-3" />
              North Star
            </div>
            <p className="text-sm text-zinc-300 line-clamp-2">
              {state.northStar?.mission || state.northStar?.vision}
            </p>
          </div>
        )}

        {/* CTA if no north star */}
        {!hasNorthStar && (
          <Link
            href="/bridge"
            className="block p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-xl border border-zinc-700/50 text-center text-sm text-zinc-400 hover:text-white transition-colors"
          >
            <Compass className="w-4 h-4 inline mr-2" />
            Set your North Star
          </Link>
        )}
      </div>
    </div>
  );
}

export default IdentityWidget;
