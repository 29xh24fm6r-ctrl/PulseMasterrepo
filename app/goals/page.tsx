"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Target,
  Plus,
  ChevronRight,
  TrendingUp,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  Sparkles,
} from "lucide-react";

interface KeyResult {
  id: string;
  title: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  progress: number;
  status: string;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  category: string;
  timeframe: string;
  status: string;
  startDate: string;
  endDate: string;
  keyResults: KeyResult[];
  progress: number;
  xpReward: number;
}

interface GoalStats {
  total: number;
  completed: number;
  inProgress: number;
  atRisk: number;
  notStarted: number;
  avgProgress: number;
  xpEarned: number;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  career: { label: "Career", icon: "💼", color: "#3b82f6" },
  health: { label: "Health", icon: "💪", color: "#10b981" },
  finance: { label: "Finance", icon: "💰", color: "#f59e0b" },
  relationships: { label: "Relationships", icon: "❤️", color: "#ec4899" },
  personal: { label: "Personal", icon: "🌟", color: "#8b5cf6" },
  learning: { label: "Learning", icon: "📚", color: "#06b6d4" },
  creative: { label: "Creative", icon: "🎨", color: "#f97316" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  not_started: { label: "Not Started", color: "#6b7280", bgColor: "bg-zinc-500/20" },
  in_progress: { label: "In Progress", color: "#3b82f6", bgColor: "bg-blue-500/20" },
  at_risk: { label: "At Risk", color: "#ef4444", bgColor: "bg-red-500/20" },
  completed: { label: "Completed", color: "#10b981", bgColor: "bg-emerald-500/20" },
  abandoned: { label: "Abandoned", color: "#6b7280", bgColor: "bg-zinc-500/20" },
};

const TIMEFRAME_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [stats, setStats] = useState<GoalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: "",
    description: "",
    category: "personal",
    timeframe: "monthly",
    endDate: "",
    keyResults: [{ title: "", targetValue: 0, unit: "" }],
  });

  useEffect(() => {
    loadGoals();
  }, []);

  async function loadGoals() {
    setLoading(true);
    try {
      const res = await fetch("/api/goals");
      const data = await res.json();
      setGoals(data.goals || []);
      setStats(data.stats || null);
    } catch (err) {
      console.error("Failed to load goals:", err);
    } finally {
      setLoading(false);
    }
  }

  async function createGoal() {
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", ...newGoal }),
      });
      const data = await res.json();
      if (data.goal) {
        setGoals((prev) => [...prev, data.goal]);
        setShowCreateModal(false);
        setNewGoal({
          title: "",
          description: "",
          category: "personal",
          timeframe: "monthly",
          endDate: "",
          keyResults: [{ title: "", targetValue: 0, unit: "" }],
        });
      }
    } catch (err) {
      console.error("Failed to create goal:", err);
    }
  }

  async function updateKeyResult(goalId: string, krId: string, newValue: number) {
    try {
      await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_key_result",
          goalId,
          keyResultId: krId,
          currentValue: newValue,
        }),
      });
      // Update local state
      setGoals((prev) =>
        prev.map((g) => {
          if (g.id !== goalId) return g;
          const updatedKRs = g.keyResults.map((kr) => {
            if (kr.id !== krId) return kr;
            const progress = Math.min(100, Math.round((newValue / kr.targetValue) * 100));
            return { ...kr, currentValue: newValue, progress };
          });
          const avgProgress = Math.round(
            updatedKRs.reduce((sum, kr) => sum + kr.progress, 0) / updatedKRs.length
          );
          return { ...g, keyResults: updatedKRs, progress: avgProgress };
        })
      );
    } catch (err) {
      console.error("Failed to update key result:", err);
    }
  }

  function addKeyResult() {
    setNewGoal((prev) => ({
      ...prev,
      keyResults: [...prev.keyResults, { title: "", targetValue: 0, unit: "" }],
    }));
  }

  function removeKeyResult(index: number) {
    setNewGoal((prev) => ({
      ...prev,
      keyResults: prev.keyResults.filter((_, i) => i !== index),
    }));
  }

  function updateKeyResultField(index: number, field: string, value: any) {
    setNewGoal((prev) => ({
      ...prev,
      keyResults: prev.keyResults.map((kr, i) =>
        i === index ? { ...kr, [field]: value } : kr
      ),
    }));
  }

  const filteredGoals = goals.filter((g) => {
    if (filter !== "all" && g.status !== filter) return false;
    if (categoryFilter !== "all" && g.category !== categoryFilter) return false;
    return true;
  });

  function getDaysRemaining(endDate: string): number {
    return Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Target className="w-7 h-7 text-violet-400" />
                Goals & OKRs
              </h1>
              <p className="text-zinc-400 text-sm">Track objectives and key results</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Goal
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
              <div className="text-2xl font-bold text-violet-400">{stats.total}</div>
              <div className="text-xs text-zinc-500">Total Goals</div>
            </div>
            <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
              <div className="text-2xl font-bold text-emerald-400">{stats.completed}</div>
              <div className="text-xs text-zinc-500">Completed</div>
            </div>
            <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
              <div className="text-2xl font-bold text-blue-400">{stats.inProgress}</div>
              <div className="text-xs text-zinc-500">In Progress</div>
            </div>
            <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
              <div className="text-2xl font-bold text-red-400">{stats.atRisk}</div>
              <div className="text-xs text-zinc-500">At Risk</div>
            </div>
            <div className="bg-zinc-900/80 rounded-xl p-4 border border-zinc-800">
              <div className="text-2xl font-bold text-amber-400">{stats.avgProgress}%</div>
              <div className="text-xs text-zinc-500">Avg Progress</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex gap-1 bg-zinc-900 rounded-lg p-1">
            {["all", "in_progress", "at_risk", "completed", "not_started"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  filter === s ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                {s === "all" ? "All" : STATUS_CONFIG[s]?.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-zinc-900 rounded-lg p-1">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                categoryFilter === "all" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              All
            </button>
            {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setCategoryFilter(key)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  categoryFilter === key ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
                }`}
              >
                {cfg.icon}
              </button>
            ))}
          </div>
        </div>

        {/* Goals List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <p className="text-zinc-500">No goals found</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm"
            >
              Create Your First Goal
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredGoals.map((goal) => {
              const catConfig = CATEGORY_CONFIG[goal.category] || CATEGORY_CONFIG.personal;
              const statusConfig = STATUS_CONFIG[goal.status] || STATUS_CONFIG.not_started;
              const daysRemaining = getDaysRemaining(goal.endDate);

              return (
                <div
                  key={goal.id}
                  onClick={() => setSelectedGoal(goal)}
                  className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-5 cursor-pointer hover:border-zinc-700 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                        style={{ backgroundColor: `${catConfig.color}20` }}
                      >
                        {catConfig.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{goal.title}</h3>
                        <p className="text-sm text-zinc-500">{goal.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${statusConfig.bgColor}`}
                        style={{ color: statusConfig.color }}
                      >
                        {statusConfig.label}
                      </span>
                      <ChevronRight className="w-4 h-4 text-zinc-600" />
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-zinc-400">Progress</span>
                      <span className="font-medium">{goal.progress}%</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${goal.progress}%`,
                          backgroundColor: catConfig.color,
                        }}
                      />
                    </div>
                  </div>

                  {/* Key Results preview */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {goal.keyResults.slice(0, 3).map((kr) => (
                      <div
                        key={kr.id}
                        className="flex items-center gap-2 px-2 py-1 bg-zinc-800/50 rounded text-xs"
                      >
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor: kr.progress >= 100 ? "#10b981" : catConfig.color,
                          }}
                        />
                        <span className="text-zinc-400 truncate max-w-[150px]">{kr.title}</span>
                        <span className="text-zinc-500">{kr.progress}%</span>
                      </div>
                    ))}
                    {goal.keyResults.length > 3 && (
                      <span className="text-xs text-zinc-500">
                        +{goal.keyResults.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-zinc-500">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {goal.timeframe}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {daysRemaining > 0 ? `${daysRemaining} days left` : "Overdue"}
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-amber-400">
                      <Sparkles className="w-3 h-3" />
                      +{goal.xpReward} XP
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Goal Detail Modal */}
        {selectedGoal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSelectedGoal(null)}
            />
            <div className="relative bg-zinc-900 rounded-2xl border border-zinc-700 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-zinc-900 p-6 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{
                      backgroundColor: `${CATEGORY_CONFIG[selectedGoal.category]?.color || "#8b5cf6"}20`,
                    }}
                  >
                    {CATEGORY_CONFIG[selectedGoal.category]?.icon || "🌟"}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedGoal.title}</h2>
                    <p className="text-sm text-zinc-500">{selectedGoal.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedGoal(null)}
                  className="p-2 hover:bg-zinc-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Overall Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-zinc-400">Overall Progress</span>
                    <span className="text-2xl font-bold">{selectedGoal.progress}%</span>
                  </div>
                  <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${selectedGoal.progress}%`,
                        backgroundColor:
                          CATEGORY_CONFIG[selectedGoal.category]?.color || "#8b5cf6",
                      }}
                    />
                  </div>
                </div>

                {/* Key Results */}
                <div>
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4 text-violet-400" />
                    Key Results ({selectedGoal.keyResults.length})
                  </h3>
                  <div className="space-y-4">
                    {selectedGoal.keyResults.map((kr) => (
                      <div key={kr.id} className="bg-zinc-800/50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{kr.title}</span>
                          {kr.progress >= 100 ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <span className="text-sm text-zinc-400">{kr.progress}%</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${kr.progress}%`,
                                  backgroundColor:
                                    kr.progress >= 100 ? "#10b981" : "#3b82f6",
                                }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={kr.currentValue}
                              onChange={(e) =>
                                updateKeyResult(
                                  selectedGoal.id,
                                  kr.id,
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-20 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-right text-sm"
                            />
                            <span className="text-sm text-zinc-500">
                              / {kr.targetValue} {kr.unit}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Goal Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-zinc-800/30 rounded-lg p-3">
                    <div className="text-zinc-500 mb-1">Timeframe</div>
                    <div className="font-medium capitalize">{selectedGoal.timeframe}</div>
                  </div>
                  <div className="bg-zinc-800/30 rounded-lg p-3">
                    <div className="text-zinc-500 mb-1">XP Reward</div>
                    <div className="font-medium text-amber-400">+{selectedGoal.xpReward} XP</div>
                  </div>
                  <div className="bg-zinc-800/30 rounded-lg p-3">
                    <div className="text-zinc-500 mb-1">Start Date</div>
                    <div className="font-medium">
                      {new Date(selectedGoal.startDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="bg-zinc-800/30 rounded-lg p-3">
                    <div className="text-zinc-500 mb-1">End Date</div>
                    <div className="font-medium">
                      {new Date(selectedGoal.endDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Goal Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowCreateModal(false)}
            />
            <div className="relative bg-zinc-900 rounded-2xl border border-zinc-700 w-full max-w-xl max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-zinc-900 p-6 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Plus className="w-5 h-5 text-violet-400" />
                  Create New Goal
                </h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-zinc-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Goal Title</label>
                  <input
                    type="text"
                    value={newGoal.title}
                    onChange={(e) => setNewGoal((p) => ({ ...p, title: e.target.value }))}
                    placeholder="e.g., Close $500K in Q4 Revenue"
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-violet-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Description</label>
                  <textarea
                    value={newGoal.description}
                    onChange={(e) => setNewGoal((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Describe your goal..."
                    rows={2}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-violet-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Category</label>
                    <select
                      value={newGoal.category}
                      onChange={(e) => setNewGoal((p) => ({ ...p, category: e.target.value }))}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-violet-500 focus:outline-none"
                    >
                      {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                        <option key={key} value={key}>
                          {cfg.icon} {cfg.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Timeframe</label>
                    <select
                      value={newGoal.timeframe}
                      onChange={(e) => setNewGoal((p) => ({ ...p, timeframe: e.target.value }))}
                      className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-violet-500 focus:outline-none"
                    >
                      {TIMEFRAME_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={newGoal.endDate}
                    onChange={(e) => setNewGoal((p) => ({ ...p, endDate: e.target.value }))}
                    className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-violet-500 focus:outline-none"
                  />
                </div>

                {/* Key Results */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm text-zinc-400">Key Results</label>
                    <button
                      onClick={addKeyResult}
                      className="text-xs text-violet-400 hover:text-violet-300"
                    >
                      + Add Key Result
                    </button>
                  </div>
                  <div className="space-y-3">
                    {newGoal.keyResults.map((kr, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          type="text"
                          value={kr.title}
                          onChange={(e) => updateKeyResultField(idx, "title", e.target.value)}
                          placeholder="Key result title"
                          className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:border-violet-500 focus:outline-none"
                        />
                        <input
                          type="number"
                          value={kr.targetValue || ""}
                          onChange={(e) =>
                            updateKeyResultField(idx, "targetValue", parseInt(e.target.value) || 0)
                          }
                          placeholder="Target"
                          className="w-20 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:border-violet-500 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={kr.unit}
                          onChange={(e) => updateKeyResultField(idx, "unit", e.target.value)}
                          placeholder="Unit"
                          className="w-20 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:border-violet-500 focus:outline-none"
                        />
                        {newGoal.keyResults.length > 1 && (
                          <button
                            onClick={() => removeKeyResult(idx)}
                            className="p-2 text-zinc-500 hover:text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={createGoal}
                  disabled={!newGoal.title || !newGoal.endDate}
                  className="w-full py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium"
                >
                  Create Goal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
