'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  Brain, 
  ChevronRight, 
  AlertTriangle,
  Lightbulb,
  Sparkles,
  MessageSquare,
  Check,
  X,
  Loader2
} from 'lucide-react';

interface ThirdBrainInsight {
  id: string;
  kind: 'risk' | 'opportunity' | 'suggestion' | 'reflection' | 'nudge';
  title: string;
  description: string;
  severity: number;
  status: string;
  created_at: string;
  related_key?: string;
}

function getKindConfig(kind: string) {
  switch (kind) {
    case 'risk':
      return { 
        icon: AlertTriangle, 
        color: 'text-red-400', 
        bg: 'bg-red-500/10 border-red-500/20',
        label: 'Risk'
      };
    case 'opportunity':
      return { 
        icon: Sparkles, 
        color: 'text-emerald-400', 
        bg: 'bg-emerald-500/10 border-emerald-500/20',
        label: 'Opportunity'
      };
    case 'suggestion':
      return { 
        icon: Lightbulb, 
        color: 'text-amber-400', 
        bg: 'bg-amber-500/10 border-amber-500/20',
        label: 'Suggestion'
      };
    case 'reflection':
      return { 
        icon: MessageSquare, 
        color: 'text-purple-400', 
        bg: 'bg-purple-500/10 border-purple-500/20',
        label: 'Reflection'
      };
    case 'nudge':
      return { 
        icon: Brain, 
        color: 'text-cyan-400', 
        bg: 'bg-cyan-500/10 border-cyan-500/20',
        label: 'Nudge'
      };
    default:
      return { 
        icon: Brain, 
        color: 'text-zinc-400', 
        bg: 'bg-zinc-500/10 border-zinc-500/20',
        label: kind
      };
  }
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default function ThirdBrainWidget() {
  const [insights, setInsights] = useState<ThirdBrainInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    try {
      const res = await fetch('/api/third-brain/insights?status=open&limit=3');
      const data = await res.json();
      if (data.insights) {
        setInsights(data.insights);
      }
    } catch (error) {
      console.error('Failed to fetch Third Brain insights:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const updateStatus = async (id: string, status: 'accepted' | 'dismissed') => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/third-brain/insights/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      
      if (res.ok) {
        // Remove from list
        setInsights(prev => prev.filter(i => i.id !== id));
      }
    } catch (error) {
      console.error('Failed to update insight:', error);
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold">Third Brain</h3>
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
          <Brain className="w-5 h-5 text-cyan-400" />
          <h3 className="font-semibold">Third Brain</h3>
        </div>
        <Link 
          href="/third-brain" 
          className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 transition-colors"
        >
          View all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {insights.length === 0 ? (
        <div className="text-center py-6">
          <div className="text-2xl mb-2">👍</div>
          <p className="text-sm text-zinc-400">
            Pulse didn't spot anything urgent today
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map(insight => {
            const config = getKindConfig(insight.kind);
            const Icon = config.icon;
            const isUpdating = updating === insight.id;

            return (
              <div 
                key={insight.id} 
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
                      <span className="text-xs text-zinc-500">
                        {timeAgo(insight.created_at)}
                      </span>
                    </div>
                    <h4 className="font-medium text-sm text-white">
                      {insight.title}
                    </h4>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                      {insight.description}
                    </p>
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-3 ml-7">
                  <button
                    onClick={() => updateStatus(insight.id, 'accepted')}
                    disabled={isUpdating}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                  >
                    {isUpdating ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Check className="w-3 h-3" />
                    )}
                    Accept
                  </button>
                  <button
                    onClick={() => updateStatus(insight.id, 'dismissed')}
                    disabled={isUpdating}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-zinc-700/50 text-zinc-400 rounded-lg hover:bg-zinc-700 transition-colors disabled:opacity-50"
                  >
                    <X className="w-3 h-3" />
                    Dismiss
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
