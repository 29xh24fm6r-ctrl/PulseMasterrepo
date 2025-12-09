"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Flame,
  Shield,
  Star,
  Target,
  RefreshCw,
  Check,
  Sparkles,
  Power,
  X,
  Compass,
  Edit3,
  Save,
} from "lucide-react";

// Types matching our engine
interface Archetype {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  coreTraits: string[];
  activationThreshold: number;
  xpBonus: {
    category: string;
    multiplier: number;
  };
}

interface CoreValue {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface NorthStar {
  vision: string;
  mission: string;
  updatedAt: string;
}

interface IdentityState {
  activeArchetype: string | null;
  activatedAt: string | null;
  resonance: Record<string, { current: number; peak: number; trend: string }>;
  values: Record<string, { score: number; trend: string }>;
  northStar: NorthStar | null;
  totalIdentityActions: number;
  streakDays: number;
  lastActionDate: string;
}

interface IdentityAction {
  id: string;
  name: string;
  description: string;
  archetypes: string[];
  values: string[];
  baseXP: number;
}

const STORAGE_KEY = "pulse-identity-state";

export default function IdentityDashboardPage() {
  const [state, setState] = useState<IdentityState | null>(null);
  const [archetypes, setArchetypes] = useState<Archetype[]>([]);
  const [values, setValues] = useState<CoreValue[]>([]);
  const [actions, setActions] = useState<IdentityAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingAction, setTrackingAction] = useState<string | null>(null);
  const [recentlyTracked, setRecentlyTracked] = useState<string | null>(null);
  const [identityStrength, setIdentityStrength] = useState(0);
  const [activating, setActivating] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // North Star state
  const [northStarModalOpen, setNorthStarModalOpen] = useState(false);
  const [editingVision, setEditingVision] = useState("");
  const [editingMission, setEditingMission] = useState("");
  const [savingNorthStar, setSavingNorthStar] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  async function loadData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      let currentState = saved ? JSON.parse(saved) : null;

      const profileRes = await fetch("/api/identity/profile", {
        method: currentState ? "POST" : "GET",
        headers: { "Content-Type": "application/json" },
        body: currentState ? JSON.stringify({ state: currentState }) : undefined,
      });
      const profileData = await profileRes.json();

      if (profileData.ok) {
        if (profileData.state) {
          currentState = profileData.state;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
        }
        if (profileData.archetypes) setArchetypes(profileData.archetypes);
        if (profileData.values) setValues(profileData.values);
        if (profileData.profile?.identityStrength !== undefined) {
          setIdentityStrength(profileData.profile.identityStrength);
        }
      }

      setState(currentState);

      const actionsRes = await fetch("/api/identity/track");
      const actionsData = await actionsRes.json();
      if (actionsData.ok) setActions(actionsData.actions);

    } catch (err) {
      console.error("Failed to load identity data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function trackAction(actionId: string) {
    if (!state) return;
    setTrackingAction(actionId);

    try {
      const res = await fetch("/api/identity/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionId, currentState: state }),
      });
      const data = await res.json();

      if (data.ok && data.newState) {
        setState(data.newState);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.newState));
        setRecentlyTracked(actionId);
        
        const profileRes = await fetch("/api/identity/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state: data.newState }),
        });
        const profileData = await profileRes.json();
        if (profileData.ok) {
          setIdentityStrength(profileData.profile.identityStrength);
        }

        setTimeout(() => setRecentlyTracked(null), 2000);
      }
    } catch (err) {
      console.error("Failed to track action:", err);
    } finally {
      setTrackingAction(null);
    }
  }

  async function activateArchetype(archetypeId: string) {
    if (!state) return;
    setActivating(archetypeId);

    try {
      const res = await fetch("/api/identity/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          archetypeId, 
          currentState: state,
          action: 'activate',
        }),
      });
      const data = await res.json();

      if (data.ok && data.newState) {
        setState(data.newState);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.newState));
        setToast({ message: data.message, type: 'success' });
      } else {
        setToast({ message: data.error || 'Failed to activate', type: 'error' });
      }
    } catch (err) {
      console.error("Failed to activate archetype:", err);
      setToast({ message: 'Failed to activate archetype', type: 'error' });
    } finally {
      setActivating(null);
    }
  }

  async function deactivateArchetype() {
    if (!state || !state.activeArchetype) return;
    setActivating(state.activeArchetype);

    try {
      const res = await fetch("/api/identity/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          archetypeId: state.activeArchetype, 
          currentState: state,
          action: 'deactivate',
        }),
      });
      const data = await res.json();

      if (data.ok && data.newState) {
        setState(data.newState);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.newState));
        setToast({ message: data.message, type: 'success' });
      } else {
        setToast({ message: data.error || 'Failed to deactivate', type: 'error' });
      }
    } catch (err) {
      console.error("Failed to deactivate archetype:", err);
      setToast({ message: 'Failed to deactivate archetype', type: 'error' });
    } finally {
      setActivating(null);
    }
  }

  function openNorthStarModal() {
    setEditingVision(state?.northStar?.vision || "");
    setEditingMission(state?.northStar?.mission || "");
    setNorthStarModalOpen(true);
  }

  async function saveNorthStar() {
    if (!editingVision.trim() && !editingMission.trim()) {
      setToast({ message: 'Please enter a vision or mission', type: 'error' });
      return;
    }

    setSavingNorthStar(true);

    try {
      const res = await fetch("/api/identity/north-star", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          vision: editingVision.trim(),
          mission: editingMission.trim(),
          currentState: state,
        }),
      });
      const data = await res.json();

      if (data.ok && data.newState) {
        setState(data.newState);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data.newState));
        setToast({ message: '⭐ North Star updated!', type: 'success' });
        setNorthStarModalOpen(false);
      } else {
        setToast({ message: data.error || 'Failed to save', type: 'error' });
      }
    } catch (err) {
      console.error("Failed to save north star:", err);
      setToast({ message: 'Failed to save North Star', type: 'error' });
    } finally {
      setSavingNorthStar(false);
    }
  }

  function getTrendIcon(trend: string) {
    if (trend === "rising") return <TrendingUp className="w-3 h-3 text-emerald-400" />;
    if (trend === "falling") return <TrendingDown className="w-3 h-3 text-red-400" />;
    return <Minus className="w-3 h-3 text-zinc-500" />;
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
      .slice(0, 6);
  }

  function getTopValues() {
    if (!state?.values) return [];
    return Object.entries(state.values)
      .map(([id, data]) => ({
        id,
        value: values.find((v) => v.id === id),
        ...data,
      }))
      .filter((v) => v.value)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-zinc-400 font-medium">Loading your identity...</p>
        </div>
      </div>
    );
  }

  const topArchetypes = getTopArchetypes();
  const topValues = getTopValues();
  const activeArch = state?.activeArchetype
    ? archetypes.find((a) => a.id === state.activeArchetype)
    : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-slide-in ${
          toast.type === 'success' 
            ? 'bg-emerald-500/90 text-white' 
            : 'bg-red-500/90 text-white'
        }`}>
          {toast.type === 'success' ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      {/* North Star Modal */}
      {northStarModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setNorthStarModalOpen(false)}
          />
          <div className="relative bg-zinc-900 rounded-2xl border border-zinc-700 p-6 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Compass className="w-6 h-6 text-amber-400" />
                Set Your North Star
              </h2>
              <button
                onClick={() => setNorthStarModalOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  🔭 Vision <span className="text-zinc-600">(Your long-term dream)</span>
                </label>
                <textarea
                  value={editingVision}
                  onChange={(e) => setEditingVision(e.target.value)}
                  placeholder="e.g., Build generational wealth while being present for my family..."
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  🎯 Mission <span className="text-zinc-600">(Your current focus)</span>
                </label>
                <textarea
                  value={editingMission}
                  onChange={(e) => setEditingMission(e.target.value)}
                  placeholder="e.g., Close 3 major deals this quarter while maintaining daily habits..."
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setNorthStarModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveNorthStar}
                  disabled={savingNorthStar}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {savingNorthStar ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save North Star
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-[128px]" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-[128px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/identity"
              className="text-zinc-500 hover:text-zinc-300 text-sm flex items-center gap-1 mb-2 transition-colors"
            >
              ← Identity Quiz
            </Link>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-400 bg-clip-text text-transparent">
              Identity Dashboard
            </h1>
            <p className="text-zinc-500 mt-1">Track who you&apos;re becoming</p>
          </div>
          <button
            onClick={loadData}
            className="p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 transition-all"
          >
            <RefreshCw className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* North Star Card */}
        <div className="mb-8 bg-gradient-to-br from-amber-900/20 to-orange-900/20 rounded-2xl border border-amber-500/20 p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Compass className="w-5 h-5 text-amber-400" />
                North Star
              </h2>
              <button
                onClick={openNorthStarModal}
                className="text-sm px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 transition-colors flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                {state?.northStar ? 'Edit' : 'Set'}
              </button>
            </div>

            {state?.northStar ? (
              <div className="space-y-4">
                {state.northStar.vision && (
                  <div>
                    <div className="text-xs text-amber-400/70 uppercase tracking-wide mb-1">🔭 Vision</div>
                    <p className="text-white/90">{state.northStar.vision}</p>
                  </div>
                )}
                {state.northStar.mission && (
                  <div>
                    <div className="text-xs text-amber-400/70 uppercase tracking-wide mb-1">🎯 Mission</div>
                    <p className="text-white/90">{state.northStar.mission}</p>
                  </div>
                )}
                <div className="text-xs text-zinc-500">
                  Updated {new Date(state.northStar.updatedAt).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="text-4xl mb-3">🧭</div>
                <p className="text-zinc-400 text-sm mb-3">
                  Define your vision and mission to guide your journey
                </p>
                <button
                  onClick={openNorthStarModal}
                  className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-sm font-medium transition-colors"
                >
                  Set Your North Star
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Identity Strength + Active Archetype */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Identity Strength */}
          <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-transparent" />
            <div className="relative">
              <div className="flex items-center gap-2 text-zinc-400 text-sm mb-4">
                <Flame className="w-4 h-4" />
                Identity Strength
              </div>
              <div className="flex items-end gap-4">
                <div className="text-6xl font-bold tabular-nums">{identityStrength}</div>
                <div className="text-zinc-500 text-lg mb-2">/100</div>
              </div>
              <div className="mt-4 h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full transition-all duration-1000"
                  style={{ width: `${identityStrength}%` }}
                />
              </div>
              <div className="mt-3 flex items-center gap-4 text-sm">
                <div className="text-zinc-500">
                  <span className="text-white font-medium">{state?.totalIdentityActions || 0}</span> actions
                </div>
                <div className="text-zinc-500">
                  <span className="text-amber-400 font-medium">{state?.streakDays || 0}</span> day streak
                </div>
              </div>
            </div>
          </div>

          {/* Active Archetype */}
          <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6 relative overflow-hidden">
            {activeArch ? (
              <>
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    background: `radial-gradient(circle at top right, ${activeArch.color}, transparent 70%)`,
                  }}
                />
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-zinc-400 text-sm">
                      <Shield className="w-4 h-4" />
                      Active Archetype
                    </div>
                    <button
                      onClick={deactivateArchetype}
                      disabled={activating === activeArch.id}
                      className="text-xs px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
                    >
                      {activating === activeArch.id ? (
                        <div className="w-3 h-3 border border-zinc-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Power className="w-3 h-3" />
                      )}
                      Deactivate
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-5xl">{activeArch.icon}</div>
                    <div>
                      <div className="text-2xl font-bold" style={{ color: activeArch.color }}>
                        {activeArch.name}
                      </div>
                      <div className="text-zinc-500 text-sm mt-1">{activeArch.description}</div>
                    </div>
                  </div>
                  <div className="mt-4 text-xs text-emerald-400 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    25% XP bonus to {activeArch.xpBonus?.category || 'aligned'} actions
                  </div>
                </div>
              </>
            ) : (
              <div className="relative h-full flex flex-col justify-center">
                <div className="flex items-center gap-2 text-zinc-400 text-sm mb-4">
                  <Shield className="w-4 h-4" />
                  Active Archetype
                </div>
                <div className="text-zinc-500 text-center py-4">
                  <div className="text-4xl mb-2 opacity-30">🔒</div>
                  <div className="text-sm">
                    Reach 500 resonance to activate an archetype
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Archetypes & Values */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Archetype Resonance */}
          <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-400" />
                Archetype Resonance
              </h2>
              <span className="text-xs text-zinc-500">500 to activate</span>
            </div>
            <div className="space-y-4">
              {topArchetypes.map(({ id, archetype, current, peak, trend }) => {
                if (!archetype) return null;
                const progress = Math.min(100, (current / 500) * 100);
                const canActivate = current >= 500;
                const isActive = state?.activeArchetype === id;
                const isActivating = activating === id;
                
                return (
                  <div key={id} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{archetype.icon}</span>
                        <span className="font-medium text-sm">{archetype.name}</span>
                        {isActive && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center gap-1">
                            <Zap className="w-2.5 h-2.5" />
                            ACTIVE
                          </span>
                        )}
                        {canActivate && !isActive && (
                          <button
                            onClick={() => activateArchetype(id)}
                            disabled={isActivating}
                            className="text-[10px] px-2 py-0.5 bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 rounded-full flex items-center gap-1 transition-colors"
                          >
                            {isActivating ? (
                              <div className="w-2.5 h-2.5 border border-violet-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Power className="w-2.5 h-2.5" />
                            )}
                            ACTIVATE
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {getTrendIcon(trend)}
                        <span className="text-zinc-400 tabular-nums">{current}</span>
                        <span className="text-zinc-600 text-xs">/ {peak} peak</span>
                      </div>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${progress}%`,
                          backgroundColor: archetype.color,
                          boxShadow: canActivate ? `0 0 12px ${archetype.color}` : "none",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Value Alignment */}
          <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-400" />
                Value Alignment
              </h2>
              <span className="text-xs text-zinc-500">0-100 scale</span>
            </div>
            <div className="space-y-4">
              {topValues.map(({ id, value, score, trend }) => {
                if (!value) return null;
                
                return (
                  <div key={id} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{value.icon}</span>
                        <span className="font-medium text-sm">{value.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        {getTrendIcon(trend)}
                        <span className="text-zinc-400 tabular-nums">{score}</span>
                      </div>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${score}%`,
                          background:
                            score >= 70
                              ? "linear-gradient(90deg, #10b981, #34d399)"
                              : score >= 50
                              ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                              : "linear-gradient(90deg, #ef4444, #f87171)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-6">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
            <Star className="w-5 h-5 text-fuchsia-400" />
            Track Identity Action
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {actions.slice(0, 12).map((action) => {
              const isTracking = trackingAction === action.id;
              const wasTracked = recentlyTracked === action.id;

              return (
                <button
                  key={action.id}
                  onClick={() => trackAction(action.id)}
                  disabled={isTracking}
                  className={`
                    group relative p-4 rounded-xl border text-left transition-all duration-300
                    ${wasTracked
                      ? "bg-emerald-500/20 border-emerald-500/50"
                      : "bg-zinc-800/50 border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600"
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{action.name}</div>
                      <div className="text-xs text-zinc-500 mt-1 line-clamp-2">
                        {action.description}
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {wasTracked ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      ) : isTracking ? (
                        <div className="w-6 h-6 border-2 border-zinc-600 border-t-violet-500 rounded-full animate-spin" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                    <span className="text-amber-400">+{action.baseXP} XP</span>
                    <span>•</span>
                    <span>{action.archetypes.slice(0, 2).join(", ")}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {actions.length > 12 && (
            <div className="mt-4 text-center">
              <button className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
                View all {actions.length} actions →
              </button>
            </div>
          )}
        </div>

        {/* Footer link */}
        <div className="mt-8 text-center">
          <Link
            href="/identity"
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <span>Take Identity Quiz</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
      `}</style>
    </div>
  );
}
