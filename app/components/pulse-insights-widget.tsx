'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Brain, 
  ChevronRight, 
  Sparkles,
  AlertTriangle,
  Flame,
  User,
  DollarSign,
  CheckCircle
} from 'lucide-react';

interface Insight {
  type: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  title: string;
  message: string;
  action?: {
    label: string;
    type: string;
    payload: any;
  };
}

export default function PulseInsightsWidget() {
  const router = useRouter();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const res = await fetch('/api/pulse/proactive');
        const data = await res.json();
        if (data.success) {
          setInsights(data.insights?.slice(0, 3) || []);
        }
      } catch (error) {
        console.error('Failed to fetch insights:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, []);

  const getIcon = (type: string) => {
    const iconClass = "w-4 h-4";
    switch (type) {
      case 'overdue_tasks': return <AlertTriangle className={`${iconClass} text-amber-400`} />;
      case 'streak_risk': return <Flame className={`${iconClass} text-orange-400`} />;
      case 'cold_relationship': return <User className={`${iconClass} text-blue-400`} />;
      case 'stale_deal': return <DollarSign className={`${iconClass} text-green-400`} />;
      case 'celebration': 
      case 'momentum': return <Sparkles className={`${iconClass} text-yellow-400`} />;
      default: return <Brain className={`${iconClass} text-purple-400`} />;
    }
  };

  const handleAction = async (insight: Insight) => {
    if (!insight.action) return;
    
    if (insight.action.type === 'navigate') {
      router.push(`/${insight.action.payload.page}`);
    } else if (insight.action.type === 'log_habit') {
      await fetch('/api/pulse/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'log_habit', args: insight.action.payload }),
      });
      // Refresh insights
      const res = await fetch('/api/pulse/proactive');
      const data = await res.json();
      if (data.success) setInsights(data.insights?.slice(0, 3) || []);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-2xl p-5 border border-purple-500/20">
        <div className="animate-pulse">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 bg-gray-700 rounded-full"></div>
            <div className="h-4 bg-gray-700 rounded w-24"></div>
          </div>
          <div className="space-y-3">
            <div className="h-12 bg-gray-700/50 rounded-lg"></div>
            <div className="h-12 bg-gray-700/50 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-2xl p-5 border border-purple-500/20">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
            <Brain className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">Pulse Noticed</h3>
            <p className="text-gray-500 text-xs">Proactive insights</p>
          </div>
        </div>
        {insights.length > 0 && (
          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">
            {insights.length}
          </span>
        )}
      </div>

      {/* Insights */}
      {insights.length === 0 ? (
        <div className="text-center py-4">
          <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <p className="text-gray-400 text-sm">All caught up!</p>
          <p className="text-gray-600 text-xs mt-1">Pulse is watching...</p>
        </div>
      ) : (
        <div className="space-y-2">
          {insights.map((insight, idx) => (
            <button
              key={idx}
              onClick={() => handleAction(insight)}
              className={`w-full text-left p-3 rounded-xl transition-all hover:scale-[1.02] ${
                insight.priority === 'high' 
                  ? 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20' 
                  : insight.priority === 'medium'
                  ? 'bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20'
                  : 'bg-gray-800/50 hover:bg-gray-800/70 border border-gray-700/50'
              }`}
            >
              <div className="flex items-center gap-3">
                {getIcon(insight.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {insight.title}
                  </p>
                  <p className="text-gray-400 text-xs truncate">
                    {insight.message}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* View All Link */}
      {insights.length > 0 && (
        <button
          onClick={() => router.push('/notifications')}
          className="w-full mt-3 text-center text-xs text-purple-400 hover:text-purple-300 transition-colors"
        >
          View all insights →
        </button>
      )}
    </div>
  );
}
