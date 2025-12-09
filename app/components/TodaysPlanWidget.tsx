'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  ChevronRight, 
  CheckSquare,
  Clock,
  Users,
  Heart,
  BookOpen,
  Check,
  Circle,
  Loader2,
  Sparkles
} from 'lucide-react';

interface PlanItem {
  id: string;
  type: 'task' | 'block' | 'relationship' | 'health' | 'reflection';
  title: string;
  description?: string;
  status: string;
  scheduledFor?: string;
  priority: number;
}

interface DayPlan {
  id: string;
  date: string;
  summary?: string;
  focusAreas: string[];
  items: PlanItem[];
}

function getTypeConfig(type: string) {
  switch (type) {
    case 'task':
      return { icon: CheckSquare, color: 'text-blue-400' };
    case 'block':
      return { icon: Clock, color: 'text-violet-400' };
    case 'relationship':
      return { icon: Users, color: 'text-pink-400' };
    case 'health':
      return { icon: Heart, color: 'text-emerald-400' };
    case 'reflection':
      return { icon: BookOpen, color: 'text-amber-400' };
    default:
      return { icon: Circle, color: 'text-zinc-400' };
  }
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function TodaysPlanWidget() {
  const [plan, setPlan] = useState<DayPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchPlan = useCallback(async () => {
    try {
      const res = await fetch('/api/planner');
      const data = await res.json();
      if (data.plan) {
        setPlan(data.plan);
      }
    } catch (error) {
      console.error('Failed to fetch plan:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  const generatePlan = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
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

  const updateStatus = async (id: string, status: 'completed' | 'skipped') => {
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

  if (loading) {
    return (
      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-violet-400" />
          <h3 className="font-semibold">Today's Plan</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
        </div>
      </div>
    );
  }

  // No plan yet
  if (!plan || plan.items.length === 0) {
    return (
      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-violet-400" />
            <h3 className="font-semibold">Today's Plan</h3>
          </div>
        </div>
        <div className="text-center py-6">
          <div className="text-2xl mb-2">📋</div>
          <p className="text-sm text-zinc-400 mb-4">
            No plan for today yet
          </p>
          <button
            onClick={generatePlan}
            disabled={generating}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium flex items-center gap-2 mx-auto disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Generate Plan
          </button>
        </div>
      </div>
    );
  }

  const completedCount = plan.items.filter(i => i.status === 'completed').length;
  const totalCount = plan.items.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-violet-400" />
          <h3 className="font-semibold">Today's Plan</h3>
        </div>
        <Link 
          href="/planner" 
          className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          Full plan <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
          <span>{completedCount}/{totalCount} completed</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Focus areas */}
      {plan.focusAreas.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {plan.focusAreas.slice(0, 3).map((area, i) => (
            <span 
              key={i}
              className="px-2 py-0.5 bg-violet-500/10 text-violet-400 text-xs rounded-full"
            >
              {area}
            </span>
          ))}
        </div>
      )}

      {/* Items */}
      <div className="space-y-2">
        {plan.items.slice(0, 4).map(item => {
          const config = getTypeConfig(item.type);
          const Icon = config.icon;
          const isCompleted = item.status === 'completed';
          const isSkipped = item.status === 'skipped';
          const isUpdating = updating === item.id;

          return (
            <div 
              key={item.id} 
              className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                isCompleted ? 'opacity-50' : ''
              } ${isSkipped ? 'opacity-30' : ''}`}
            >
              <button
                onClick={() => !isCompleted && !isSkipped && updateStatus(item.id, 'completed')}
                disabled={isUpdating || isCompleted || isSkipped}
                className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  isCompleted 
                    ? 'bg-emerald-500 border-emerald-500' 
                    : 'border-zinc-600 hover:border-violet-400'
                }`}
              >
                {isUpdating ? (
                  <Loader2 className="w-3 h-3 animate-spin text-white" />
                ) : isCompleted ? (
                  <Check className="w-3 h-3 text-white" />
                ) : null}
              </button>

              <div className={`${config.color}`}>
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isCompleted ? 'line-through' : ''}`}>
                  {item.title}
                </p>
                {item.scheduledFor && (
                  <p className="text-xs text-zinc-500">
                    {formatTime(item.scheduledFor)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {plan.items.length > 4 && (
        <Link 
          href="/planner"
          className="block text-center text-xs text-zinc-400 hover:text-white mt-3 py-2"
        >
          +{plan.items.length - 4} more items
        </Link>
      )}
    </div>
  );
}
