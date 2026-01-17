'use client';

export const dynamic = "force-dynamic";

// IMPORTANT:
// This page can touch auth/user state and must not be statically prerendered in CI.
import { AutonomyVoice } from "@/components/PageVoiceComponents";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Zap,
  CheckSquare,
  Clock,
  Heart,
  BookOpen,
  FileText,
  Check,
  X,
  Loader2,
  ArrowLeft,
  RefreshCw,
  Calendar
} from 'lucide-react';

interface AutonomyAction {
  id: string;
  type: 'task' | 'follow_up' | 'habit_nudge' | 'reflection' | 'briefing';
  title: string;
  description?: string;
  relatedInsightId?: string;
  status: string;
  scheduledFor?: string;
  createdAt: string;
  updatedAt: string;
}

type StatusFilter = 'suggested' | 'scheduled' | 'completed' | 'ignored';

function getTypeConfig(type: string) {
  switch (type) {
    case 'task':
      return {
        icon: CheckSquare,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10 border-blue-500/30',
        badgeBg: 'bg-blue-500/20',
        label: 'Task'
      };
    case 'follow_up':
      return {
        icon: Clock,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/30',
        badgeBg: 'bg-amber-500/20',
        label: 'Follow Up'
      };
    case 'habit_nudge':
      return {
        icon: Heart,
        color: 'text-pink-400',
        bg: 'bg-pink-500/10 border-pink-500/30',
        badgeBg: 'bg-pink-500/20',
        label: 'Habit Nudge'
      };
    case 'reflection':
      return {
        icon: BookOpen,
        color: 'text-purple-400',
        bg: 'bg-purple-500/10 border-purple-500/30',
        badgeBg: 'bg-purple-500/20',
        label: 'Reflection'
      };
    case 'briefing':
      return {
        icon: FileText,
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/10 border-cyan-500/30',
        badgeBg: 'bg-cyan-500/20',
        label: 'Briefing'
      };
    default:
      return {
        icon: Zap,
        color: 'text-zinc-400',
        bg: 'bg-zinc-500/10 border-zinc-500/30',
        badgeBg: 'bg-zinc-500/20',
        label: type
      };
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return diffMins <= 1 ? 'Just now' : `${diffMins}m ago`;
    }
    return `${diffHours}h ago`;
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default function AutonomyPage() {
  const [actions, setActions] = useState<AutonomyAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('suggested');

  const fetchActions = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch(`/api/autonomy/actions?status=${filter}&limit=50`);
      const data = await res.json();
      if (data.actions) {
        setActions(data.actions);
      }
    } catch (error) {
      console.error('Failed to fetch actions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

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
        // Update locally
        setActions(prev => prev.map(a =>
          a.id === id ? { ...a, status, updatedAt: new Date().toISOString() } : a
        ));

        // If filtering by a specific status, remove from view
        if (filter !== status) {
          setActions(prev => prev.filter(a => a.id !== id));
        }
      }
    } catch (error) {
      console.error('Failed to update action:', error);
    } finally {
      setUpdating(null);
    }
  };

  const tabs: { key: StatusFilter; label: string; emoji: string }[] = [
    { key: 'suggested', label: 'Suggested', emoji: '💡' },
    { key: 'scheduled', label: 'Scheduled', emoji: '📅' },
    { key: 'completed', label: 'Completed', emoji: '✅' },
    { key: 'ignored', label: 'Ignored', emoji: '👋' },
  ];

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
                <Zap className="w-6 h-6 text-yellow-400" />
                <h1 className="text-xl font-bold">Autonomy</h1>
              </div>
            </div>
            <button
              onClick={() => fetchActions(true)}
              disabled={refreshing}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <AutonomyVoice />
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-zinc-800">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${filter === tab.key
                  ? 'border-yellow-400 text-white'
                  : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
              >
                <span>{tab.emoji}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
          </div>
        ) : actions.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">
              {filter === 'suggested' ? '✨' : filter === 'completed' ? '🎉' : '📭'}
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {filter === 'suggested'
                ? "No suggestions right now"
                : `No ${filter} actions`}
            </h2>
            <p className="text-zinc-400">
              {filter === 'suggested'
                ? "Pulse will suggest actions based on your Third Brain insights."
                : "Nothing to show here yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {actions.map(action => {
              const config = getTypeConfig(action.type);
              const Icon = config.icon;
              const isUpdating = updating === action.id;
              const isActed = action.status !== 'suggested';

              return (
                <div
                  key={action.id}
                  className={`p-5 border rounded-2xl transition-all ${config.bg} ${isActed ? 'opacity-75' : ''
                    }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-xl ${config.badgeBg} ${config.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.badgeBg} ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {formatDate(action.createdAt)}
                        </span>
                        {action.status !== 'suggested' && (
                          <span className="text-xs text-zinc-500 capitalize">
                            • {action.status}
                          </span>
                        )}
                      </div>

                      <h3 className="font-semibold text-white mb-2">
                        {action.title}
                      </h3>

                      {action.description && (
                        <p className="text-sm text-zinc-300 leading-relaxed">
                          {action.description}
                        </p>
                      )}

                      {action.scheduledFor && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-zinc-400">
                          <Calendar className="w-3 h-3" />
                          Scheduled for {new Date(action.scheduledFor).toLocaleDateString()}
                        </div>
                      )}

                      {/* Actions */}
                      {action.status === 'suggested' && (
                        <div className="flex items-center gap-2 mt-4">
                          <button
                            onClick={() => updateStatus(action.id, 'completed')}
                            disabled={isUpdating}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                          >
                            {isUpdating ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            Done
                          </button>
                          <button
                            onClick={() => updateStatus(action.id, 'scheduled')}
                            disabled={isUpdating}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                          >
                            <Clock className="w-4 h-4" />
                            Later
                          </button>
                          <button
                            onClick={() => updateStatus(action.id, 'ignored')}
                            disabled={isUpdating}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-zinc-700/50 text-zinc-400 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                            Ignore
                          </button>
                        </div>
                      )}

                      {action.status === 'scheduled' && (
                        <div className="flex items-center gap-2 mt-4">
                          <button
                            onClick={() => updateStatus(action.id, 'completed')}
                            disabled={isUpdating}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                          >
                            {isUpdating ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            Mark Complete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
