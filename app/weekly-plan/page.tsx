'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Target,
  CheckCircle2,
  Circle,
  Plus,
  Sparkles,
  ChevronRight,
  Trophy,
  Brain,
  Loader2,
  Save,
  RefreshCw,
} from 'lucide-react';

interface WeeklyPlan {
  id: string;
  weekStart: string;
  weekEnd: string;
  theme?: string;
  topPriorities: Priority[];
  goals: Goal[];
  status: string;
  aiSummary?: string;
}

interface Priority {
  id: string;
  title: string;
  category: string;
  importance: number;
  completed: boolean;
  notes?: string;
}

interface Goal {
  id: string;
  title: string;
  targetMetric?: string;
  targetValue?: number;
  currentValue?: number;
  completed: boolean;
}

interface Suggestions {
  suggestedTheme: string;
  suggestedPriorities: Priority[];
  suggestedGoals: Goal[];
  aiAdvice: string;
}

const CATEGORIES = ['work', 'personal', 'health', 'relationships', 'growth'];
const CATEGORY_COLORS: Record<string, string> = {
  work: 'bg-blue-500/20 text-blue-400',
  personal: 'bg-purple-500/20 text-purple-400',
  health: 'bg-green-500/20 text-green-400',
  relationships: 'bg-pink-500/20 text-pink-400',
  growth: 'bg-yellow-500/20 text-yellow-400',
};

export default function WeeklyPlanPage() {
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [newPriority, setNewPriority] = useState('');
  const [newGoal, setNewGoal] = useState('');

  useEffect(() => {
    loadPlan();
  }, []);

  async function loadPlan() {
    try {
      const res = await fetch('/api/weekly-plan');
      const data = await res.json();
      setPlan(data.plan);
    } catch (err) {
      console.error('Failed to load plan:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadSuggestions() {
    setLoadingSuggestions(true);
    try {
      const res = await fetch('/api/weekly-plan?mode=suggestions');
      const data = await res.json();
      setSuggestions(data);
    } catch (err) {
      console.error('Failed to load suggestions:', err);
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function savePlan(updates: Partial<WeeklyPlan>) {
    if (!plan) return;
    setSaving(true);
    try {
      const res = await fetch('/api/weekly-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, ...updates }),
      });
      const data = await res.json();
      if (data.plan) setPlan(data.plan);
    } catch (err) {
      console.error('Failed to save:', err);
    } finally {
      setSaving(false);
    }
  }

  function togglePriority(id: string) {
    if (!plan) return;
    const updated = plan.topPriorities.map((p) =>
      p.id === id ? { ...p, completed: !p.completed } : p
    );
    setPlan({ ...plan, topPriorities: updated });
    savePlan({ topPriorities: updated });
  }

  function toggleGoal(id: string) {
    if (!plan) return;
    const updated = plan.goals.map((g) =>
      g.id === id ? { ...g, completed: !g.completed } : g
    );
    setPlan({ ...plan, goals: updated });
    savePlan({ goals: updated });
  }

  function addPriority() {
    if (!plan || !newPriority.trim()) return;
    const priority: Priority = {
      id: `p-${Date.now()}`,
      title: newPriority,
      category: 'work',
      importance: 2,
      completed: false,
    };
    const updated = [...plan.topPriorities, priority];
    setPlan({ ...plan, topPriorities: updated });
    savePlan({ topPriorities: updated });
    setNewPriority('');
  }

  function addGoal() {
    if (!plan || !newGoal.trim()) return;
    const goal: Goal = {
      id: `g-${Date.now()}`,
      title: newGoal,
      completed: false,
    };
    const updated = [...plan.goals, goal];
    setPlan({ ...plan, goals: updated });
    savePlan({ goals: updated });
    setNewGoal('');
  }

  function applySuggestions() {
    if (!plan || !suggestions) return;
    const updates = {
      theme: suggestions.suggestedTheme,
      topPriorities: [...plan.topPriorities, ...suggestions.suggestedPriorities],
      goals: [...plan.goals, ...suggestions.suggestedGoals],
    };
    setPlan({ ...plan, ...updates });
    savePlan(updates);
    setSuggestions(null);
  }

  function formatDateRange(start: string, end: string): string {
    const s = new Date(start);
    const e = new Date(end);
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${s.toLocaleDateString('en-US', opts)} - ${e.toLocaleDateString('en-US', opts)}`;
  }

  const completedPriorities = plan?.topPriorities.filter((p) => p.completed).length || 0;
  const totalPriorities = plan?.topPriorities.length || 0;
  const completedGoals = plan?.goals.filter((g) => g.completed).length || 0;
  const totalGoals = plan?.goals.length || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/life" className="p-2 hover:bg-slate-800 rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-600 rounded-lg">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Weekly Plan</h1>
                {plan && (
                  <p className="text-sm text-slate-400">
                    {formatDateRange(plan.weekStart, plan.weekEnd)}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
            <button
              onClick={loadSuggestions}
              disabled={loadingSuggestions}
              className="px-3 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium flex items-center gap-2 transition"
            >
              {loadingSuggestions ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              AI Suggestions
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* AI Suggestions Banner */}
        {suggestions && (
          <div className="p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-violet-400" />
                <span className="font-semibold">AI Suggestions</span>
              </div>
              <button
                onClick={() => setSuggestions(null)}
                className="text-slate-400 hover:text-slate-300"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-slate-300 mb-3">{suggestions.aiAdvice}</p>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">
                Theme: <span className="text-violet-400">{suggestions.suggestedTheme}</span>
              </span>
              <span className="text-sm text-slate-400">
                {suggestions.suggestedPriorities.length} priorities
              </span>
              <span className="text-sm text-slate-400">
                {suggestions.suggestedGoals.length} goals
              </span>
            </div>
            <button
              onClick={applySuggestions}
              className="mt-3 px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm font-medium transition"
            >
              Apply Suggestions
            </button>
          </div>
        )}

        {/* Theme */}
        {plan?.theme && (
          <div className="p-4 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-xl">
            <div className="text-sm text-slate-400 mb-1">This Week's Theme</div>
            <div className="text-xl font-semibold">{plan.theme}</div>
          </div>
        )}

        {/* Progress Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-blue-400" />
              <span className="font-medium">Priorities</span>
            </div>
            <div className="text-2xl font-bold">
              {completedPriorities}/{totalPriorities}
            </div>
            <div className="mt-2 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${totalPriorities ? (completedPriorities / totalPriorities) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span className="font-medium">Goals</span>
            </div>
            <div className="text-2xl font-bold">
              {completedGoals}/{totalGoals}
            </div>
            <div className="mt-2 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-500 transition-all"
                style={{ width: `${totalGoals ? (completedGoals / totalGoals) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Top Priorities */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-400" />
            Top Priorities
          </h2>
          <div className="space-y-2">
            {plan?.topPriorities.map((priority) => (
              <div
                key={priority.id}
                className={`p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3 transition ${
                  priority.completed ? 'opacity-60' : ''
                }`}
              >
                <button onClick={() => togglePriority(priority.id)}>
                  {priority.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <Circle className="w-6 h-6 text-slate-600" />
                  )}
                </button>
                <div className="flex-1">
                  <span className={priority.completed ? 'line-through text-slate-500' : ''}>
                    {priority.title}
                  </span>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full ${CATEGORY_COLORS[priority.category] || 'bg-slate-700'}`}>
                  {priority.category}
                </span>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="text"
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPriority()}
                placeholder="Add priority..."
                className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-violet-500"
              />
              <button
                onClick={addPriority}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>

        {/* Goals */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Weekly Goals
          </h2>
          <div className="space-y-2">
            {plan?.goals.map((goal) => (
              <div
                key={goal.id}
                className={`p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-3 transition ${
                  goal.completed ? 'opacity-60' : ''
                }`}
              >
                <button onClick={() => toggleGoal(goal.id)}>
                  {goal.completed ? (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  ) : (
                    <Circle className="w-6 h-6 text-slate-600" />
                  )}
                </button>
                <div className="flex-1">
                  <span className={goal.completed ? 'line-through text-slate-500' : ''}>
                    {goal.title}
                  </span>
                  {goal.targetMetric && (
                    <div className="text-sm text-slate-400">
                      {goal.currentValue || 0} / {goal.targetValue} {goal.targetMetric}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                type="text"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addGoal()}
                placeholder="Add goal..."
                className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-violet-500"
              />
              <button
                onClick={addGoal}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </section>

        {/* AI Summary */}
        {plan?.aiSummary && (
          <section className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Brain className="w-4 h-4 text-violet-400" />
              Weekly Summary
            </h3>
            <p className="text-slate-300">{plan.aiSummary}</p>
          </section>
        )}
      </main>
    </div>
  );
}