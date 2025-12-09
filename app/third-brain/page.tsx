'use client';
import { ThirdBrainVoice } from "@/components/PageVoiceComponents";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Brain, 
  AlertTriangle,
  Lightbulb,
  Sparkles,
  MessageSquare,
  Check,
  X,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Filter,
  RefreshCw
} from 'lucide-react';

interface ThirdBrainInsight {
  id: string;
  kind: 'risk' | 'opportunity' | 'suggestion' | 'reflection' | 'nudge';
  title: string;
  description: string;
  severity: number;
  status: string;
  created_at: string;
  acted_at?: string;
  related_key?: string;
}

type StatusFilter = 'open' | 'accepted' | 'done' | 'dismissed' | 'all';

function getKindConfig(kind: string) {
  switch (kind) {
    case 'risk':
      return { 
        icon: AlertTriangle, 
        color: 'text-red-400', 
        bg: 'bg-red-500/10 border-red-500/30',
        badgeBg: 'bg-red-500/20',
        label: 'Risk'
      };
    case 'opportunity':
      return { 
        icon: Sparkles, 
        color: 'text-emerald-400', 
        bg: 'bg-emerald-500/10 border-emerald-500/30',
        badgeBg: 'bg-emerald-500/20',
        label: 'Opportunity'
      };
    case 'suggestion':
      return { 
        icon: Lightbulb, 
        color: 'text-amber-400', 
        bg: 'bg-amber-500/10 border-amber-500/30',
        badgeBg: 'bg-amber-500/20',
        label: 'Suggestion'
      };
    case 'reflection':
      return { 
        icon: MessageSquare, 
        color: 'text-purple-400', 
        bg: 'bg-purple-500/10 border-purple-500/30',
        badgeBg: 'bg-purple-500/20',
        label: 'Reflection'
      };
    case 'nudge':
      return { 
        icon: Brain, 
        color: 'text-cyan-400', 
        bg: 'bg-cyan-500/10 border-cyan-500/30',
        badgeBg: 'bg-cyan-500/20',
        label: 'Nudge'
      };
    default:
      return { 
        icon: Brain, 
        color: 'text-zinc-400', 
        bg: 'bg-zinc-500/10 border-zinc-500/30',
        badgeBg: 'bg-zinc-500/20',
        label: kind
      };
  }
}

function getSeverityIndicator(severity: number) {
  if (severity >= 4) {
    return <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="High severity" />;
  }
  if (severity >= 3) {
    return <span className="w-2 h-2 rounded-full bg-amber-500" title="Medium severity" />;
  }
  return <span className="w-2 h-2 rounded-full bg-zinc-500" title="Low severity" />;
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
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

export default function ThirdBrainPage() {
  const [insights, setInsights] = useState<ThirdBrainInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>('open');

  const fetchInsights = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    
    try {
      const statusParam = filter === 'all' ? '' : `status=${filter}&`;
      const res = await fetch(`/api/third-brain/insights?${statusParam}limit=50`);
      const data = await res.json();
      if (data.insights) {
        setInsights(data.insights);
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const updateStatus = async (id: string, status: 'accepted' | 'dismissed' | 'done') => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/third-brain/insights/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      
      if (res.ok) {
        // Update locally
        setInsights(prev => prev.map(i => 
          i.id === id ? { ...i, status, acted_at: new Date().toISOString() } : i
        ));
        
        // If filtering by a specific status, remove from view
        if (filter !== 'all' && filter !== status) {
          setInsights(prev => prev.filter(i => i.id !== id));
        }
      }
    } catch (error) {
      console.error('Failed to update insight:', error);
    } finally {
      setUpdating(null);
    }
  };

  const tabs: { key: StatusFilter; label: string; count?: number }[] = [
    { key: 'open', label: 'Open' },
    { key: 'accepted', label: 'Accepted' },
    { key: 'done', label: 'Done' },
    { key: 'dismissed', label: 'Dismissed' },
    { key: 'all', label: 'All' },
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
                <Brain className="w-6 h-6 text-cyan-400" />
                <h1 className="text-xl font-bold">Third Brain</h1>
              </div>
            </div>
            <button
              onClick={() => fetchInsights(true)}
              disabled={refreshing}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
            <ThirdBrainVoice />
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
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  filter === tab.key
                    ? 'border-cyan-400 text-white'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
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
        ) : insights.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">
              {filter === 'open' ? '👍' : '📭'}
            </div>
            <h2 className="text-xl font-semibold mb-2">
              {filter === 'open' 
                ? "No open insights" 
                : `No ${filter} insights`}
            </h2>
            <p className="text-zinc-400">
              {filter === 'open' 
                ? "Pulse didn't spot anything urgent today. Check back later!"
                : "Nothing to show here yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map(insight => {
              const config = getKindConfig(insight.kind);
              const Icon = config.icon;
              const isUpdating = updating === insight.id;
              const isActed = insight.status !== 'open';

              return (
                <div 
                  key={insight.id} 
                  className={`p-5 border rounded-2xl transition-all ${config.bg} ${
                    isActed ? 'opacity-75' : ''
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
                        {getSeverityIndicator(insight.severity)}
                        <span className="text-xs text-zinc-500">
                          {formatDate(insight.created_at)}
                        </span>
                        {isActed && (
                          <span className="text-xs text-zinc-500 capitalize">
                            • {insight.status}
                          </span>
                        )}
                      </div>
                      
                      <h3 className="font-semibold text-white mb-2">
                        {insight.title}
                      </h3>
                      
                      <p className="text-sm text-zinc-300 leading-relaxed">
                        {insight.description}
                      </p>

                      {insight.related_key && (
                        <div className="mt-3">
                          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
                            {insight.related_key}
                          </span>
                        </div>
                      )}

                      {/* Actions */}
                      {insight.status === 'open' && (
                        <div className="flex items-center gap-2 mt-4">
                          <button
                            onClick={() => updateStatus(insight.id, 'accepted')}
                            disabled={isUpdating}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                          >
                            {isUpdating ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            Accept
                          </button>
                          <button
                            onClick={() => updateStatus(insight.id, 'done')}
                            disabled={isUpdating}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Done
                          </button>
                          <button
                            onClick={() => updateStatus(insight.id, 'dismissed')}
                            disabled={isUpdating}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-zinc-700/50 text-zinc-400 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                            Dismiss
                          </button>
                        </div>
                      )}

                      {insight.status === 'accepted' && (
                        <div className="flex items-center gap-2 mt-4">
                          <button
                            onClick={() => updateStatus(insight.id, 'done')}
                            disabled={isUpdating}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
                          >
                            {isUpdating ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                            Mark Done
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
