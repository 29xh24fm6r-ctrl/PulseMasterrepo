'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Zap, 
  ChevronRight, 
  CheckSquare,
  Clock,
  Heart,
  BookOpen,
  FileText,
  Check,
  X,
  Loader2
} from 'lucide-react';

interface AutonomyAction {
  id: string;
  type: 'task' | 'follow_up' | 'habit_nudge' | 'reflection' | 'briefing';
  title: string;
  description?: string;
  status: string;
  createdAt: string;
}

function getTypeConfig(type: string) {
  switch (type) {
    case 'task':
      return { 
        icon: CheckSquare, 
        color: 'text-blue-400', 
        bg: 'bg-blue-500/10 border-blue-500/20',
        label: 'Task'
      };
    case 'follow_up':
      return { 
        icon: Clock, 
        color: 'text-amber-400', 
        bg: 'bg-amber-500/10 border-amber-500/20',
        label: 'Follow Up'
      };
    case 'habit_nudge':
      return { 
        icon: Heart, 
        color: 'text-pink-400', 
        bg: 'bg-pink-500/10 border-pink-500/20',
        label: 'Habit'
      };
    case 'reflection':
      return { 
        icon: BookOpen, 
        color: 'text-purple-400', 
        bg: 'bg-purple-500/10 border-purple-500/20',
        label: 'Reflect'
      };
    case 'briefing':
      return { 
        icon: FileText, 
        color: 'text-cyan-400', 
        bg: 'bg-cyan-500/10 border-cyan-500/20',
        label: 'Brief'
      };
    default:
      return { 
        icon: Zap, 
        color: 'text-zinc-400', 
        bg: 'bg-zinc-500/10 border-zinc-500/20',
        label: type
      };
  }
}

export default function AutonomyWidget() {
  const [actions, setActions] = useState<AutonomyAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchActions = useCallback(async () => {
    try {
      const res = await fetch('/api/autonomy/actions?status=suggested&limit=3');
      const data = await res.json();
      if (data.actions) {
        setActions(data.actions);
      }
    } catch (error) {
      console.error('Failed to fetch autonomy actions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const updateStatus = async (id: string, status: 'scheduled' | 'ignored' | 'completed') => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/autonomy/actions/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      
      if (res.ok) {
        setActions(prev => prev.filter(a => a.id !== id));
      }
    } catch (error) {
      console.error('Failed to update action:', error);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-yellow-400" />
          <h3 className="font-semibold">Pulse Suggests</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          <h3 className="font-semibold">Pulse Suggests</h3>
        </div>
        <Link 
          href="/autonomy" 
          className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {actions.length === 0 ? (
        <div className="text-center py-6">
          <div className="text-2xl mb-2">✨</div>
          <p className="text-sm text-zinc-400">
            No suggestions right now. You're all caught up!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {actions.map(action => {
            const config = getTypeConfig(action.type);
            const Icon = config.icon;
            const isUpdating = updating === action.id;

            return (
              <div 
                key={action.id} 
                className={`p-3 border rounded-xl ${config.bg} transition-all`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${config.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium ${config.color}`}>
                        {config.label}
                      </span>
                    </div>
                    <h4 className="font-medium text-sm text-white">
                      {action.title}
                    </h4>
                    {action.description && (
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                        {action.description}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-3 ml-7">
                  <button
                    onClick={() => updateStatus(action.id, 'completed')}
                    disabled={isUpdating}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                  >
                    {isUpdating ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                    Done
                  </button>
                  <button
                    onClick={() => updateStatus(action.id, 'scheduled')}
                    disabled={isUpdating}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                  >
                    <Clock className="w-3 h-3" />
                    Later
                  </button>
                  <button
                    onClick={() => updateStatus(action.id, 'ignored')}
                    disabled={isUpdating}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-zinc-700/50 text-zinc-400 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
