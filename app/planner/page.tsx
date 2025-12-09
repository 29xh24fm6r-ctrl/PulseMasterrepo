'use client';
import { PlannerVoice } from "@/components/PageVoiceComponents";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  CheckSquare,
  Clock,
  Users,
  Heart,
  BookOpen,
  Check,
  Circle,
  Loader2,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  SkipForward
} from 'lucide-react';

interface PlanItem {
  id: string;
  type: 'task' | 'block' | 'relationship' | 'health' | 'reflection';
  title: string;
  description?: string;
  status: string;
  scheduledFor?: string;
  priority: number;
  source?: string;
}

interface DayPlan {
  id: string;
  date: string;
  summary?: string;
  focusAreas: string[];
  energyNotes?: string;
  items: PlanItem[];
}

function getTypeConfig(type: string) {
  switch (type) {
    case 'task':
      return { 
        icon: CheckSquare, 
        color: 'text-blue-400', 
        bg: 'bg-blue-500/10 border-blue-500/30',
        label: 'Task'
      };
    case 'block':
      return { 
        icon: Clock, 
        color: 'text-violet-400', 
        bg: 'bg-violet-500/10 border-violet-500/30',
        label: 'Focus Block'
      };
    case 'relationship':
      return { 
        icon: Users, 
        color: 'text-pink-400', 
        bg: 'bg-pink-500/10 border-pink-500/30',
        label: 'Relationship'
      };
    case 'health':
      return { 
        icon: Heart, 
        color: 'text-emerald-400', 
        bg: 'bg-emerald-500/10 border-emerald-500/30',
        label: 'Health'
      };
    case 'reflection':
      return { 
        icon: BookOpen, 
        color: 'text-amber-400', 
        bg: 'bg-amber-500/10 border-amber-500/30',
        label: 'Reflection'
      };
    default:
      return { 
        icon: Circle, 
        color: 'text-zinc-400', 
        bg: 'bg-zinc-500/10 border-zinc-500/30',
        label: type
      };
  }
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDate(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'short', 
    day: 'numeric' 
  });
}

function getPriorityLabel(priority: number): string {
  switch (priority) {
    case 1: return '!!! Critical';
    case 2: return '!! Important';
    case 3: return '! Nice to have';
    default: return '';
  }
}

export default function PlannerPage() {
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const res = await fetch(`/api/planner?date=${dateStr}`);
      const data = await res.json();
      setPlan(data.plan || null);
    } catch (error) {
      console.error('Failed to fetch plan:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const generatePlan = async () => {
    setGenerating(true);
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];
      const res = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: dateStr }),
      });
      const data = await res.json();
      if (data.plan) {
        setPlan(data.plan);
      }
    } catch (error) {
      console.error('Failed to generate plan:', error);
    } finally {
      setGenerating(false);
    }
  };

  const updateStatus = async (id: string, status: 'completed' | 'skipped' | 'in_progress') => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/planner/items/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      
      if (res.ok) {
        setPlan(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map(item =>
              item.id === id ? { ...item, status } : item
            ),
          };
        });
      }
    } catch (error) {
      console.error('Failed to update item:', error);
    } finally {
      setUpdating(null);
    }
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  // Calculate stats
  const stats = plan ? {
    total: plan.items.length,
    completed: plan.items.filter(i => i.status === 'completed').length,
    inProgress: plan.items.filter(i => i.status === 'in_progress').length,
    skipped: plan.items.filter(i => i.status === 'skipped').length,
  } : { total: 0, completed: 0, inProgress: 0, skipped: 0 };

  const progress = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/life" 
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <Calendar className="w-6 h-6 text-violet-400" />
                <h1 className="text-xl font-bold">Day Planner</h1>
              </div>
            </div>
            <button
              onClick={generatePlan}
              disabled={generating}
              className="flex items-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {plan ? 'Regenerate' : 'Generate Plan'}
            </button>
          </div>
            <PlannerVoice />
        </div>
      </header>

      {/* Date Navigation */}
      <div className="border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => changeDate(-1)}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <div className="text-center">
              <h2 className="text-lg font-semibold">{formatDate(selectedDate)}</h2>
              <p className="text-xs text-zinc-500">
                {selectedDate.toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'long', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {!isToday && (
                <button
                  onClick={goToToday}
                  className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  Today
                </button>
              )}
              <button
                onClick={() => changeDate(1)}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
          </div>
        ) : !plan || plan.items.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">📋</div>
            <h2 className="text-xl font-semibold mb-2">No plan for this day</h2>
            <p className="text-zinc-400 mb-6">
              Generate an AI-powered plan based on your insights and goals.
            </p>
            <button
              onClick={generatePlan}
              disabled={generating}
              className="px-6 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-medium flex items-center gap-2 mx-auto disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
              Generate Plan
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="p-5 bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20 rounded-2xl">
              {plan.summary && (
                <p className="text-zinc-200 mb-4">{plan.summary}</p>
              )}
              
              <div className="flex flex-wrap gap-2 mb-4">
                {plan.focusAreas.map((area, i) => (
                  <span 
                    key={i}
                    className="px-3 py-1 bg-violet-500/20 text-violet-300 text-sm rounded-full"
                  >
                    {area}
                  </span>
                ))}
              </div>

              {plan.energyNotes && (
                <p className="text-sm text-zinc-400">
                  💡 {plan.energyNotes}
                </p>
              )}
            </div>

            {/* Progress */}
            <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-zinc-400">
                  {stats.completed}/{stats.total} completed
                </span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {stats.completed} done
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  {stats.inProgress} in progress
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-zinc-500" />
                  {stats.skipped} skipped
                </span>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-3">
              {plan.items.map(item => {
                const config = getTypeConfig(item.type);
                const Icon = config.icon;
                const isCompleted = item.status === 'completed';
                const isSkipped = item.status === 'skipped';
                const isInProgress = item.status === 'in_progress';
                const isUpdating = updating === item.id;

                return (
                  <div 
                    key={item.id} 
                    className={`p-4 border rounded-xl transition-all ${config.bg} ${
                      isCompleted ? 'opacity-60' : ''
                    } ${isSkipped ? 'opacity-40' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <button
                        onClick={() => !isCompleted && updateStatus(item.id, 'completed')}
                        disabled={isUpdating || isCompleted}
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors mt-0.5 ${
                          isCompleted 
                            ? 'bg-emerald-500 border-emerald-500' 
                            : isInProgress
                            ? 'border-amber-500 bg-amber-500/20'
                            : 'border-zinc-600 hover:border-violet-400'
                        }`}
                      >
                        {isUpdating ? (
                          <Loader2 className="w-3 h-3 animate-spin text-white" />
                        ) : isCompleted ? (
                          <Check className="w-3 h-3 text-white" />
                        ) : null}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`w-4 h-4 ${config.color}`} />
                          <span className={`text-xs font-medium ${config.color}`}>
                            {config.label}
                          </span>
                          {item.scheduledFor && (
                            <span className="text-xs text-zinc-500">
                              {formatTime(item.scheduledFor)}
                            </span>
                          )}
                          {item.priority === 1 && (
                            <span className="text-xs text-red-400">Critical</span>
                          )}
                        </div>
                        
                        <h3 className={`font-medium ${isCompleted ? 'line-through text-zinc-400' : ''}`}>
                          {item.title}
                        </h3>
                        
                        {item.description && (
                          <p className="text-sm text-zinc-400 mt-1">
                            {item.description}
                          </p>
                        )}

                        {/* Actions */}
                        {!isCompleted && !isSkipped && (
                          <div className="flex items-center gap-2 mt-3">
                            {!isInProgress && (
                              <button
                                onClick={() => updateStatus(item.id, 'in_progress')}
                                disabled={isUpdating}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors"
                              >
                                <Clock className="w-3 h-3" />
                                Start
                              </button>
                            )}
                            <button
                              onClick={() => updateStatus(item.id, 'completed')}
                              disabled={isUpdating}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors"
                            >
                              <Check className="w-3 h-3" />
                              Complete
                            </button>
                            <button
                              onClick={() => updateStatus(item.id, 'skipped')}
                              disabled={isUpdating}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-zinc-700/50 text-zinc-400 rounded-lg hover:bg-zinc-700 transition-colors"
                            >
                              <SkipForward className="w-3 h-3" />
                              Skip
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
