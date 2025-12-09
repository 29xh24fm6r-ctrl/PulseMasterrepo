'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  BarChart3, 
  ChevronRight, 
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Sparkles,
  Target,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface ExecutiveSummary {
  id: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  overallScore: number;
  summary: string;
  highlights: string[];
  concerns: string[];
  recommendations: string[];
  domainScores: Record<string, number>;
}

const DOMAIN_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  work: { label: 'Work', emoji: '💼', color: 'text-blue-400' },
  health: { label: 'Health', emoji: '💪', color: 'text-emerald-400' },
  relationships: { label: 'Relationships', emoji: '❤️', color: 'text-pink-400' },
  finance: { label: 'Finance', emoji: '💰', color: 'text-yellow-400' },
  growth: { label: 'Growth', emoji: '🌱', color: 'text-violet-400' },
  recovery: { label: 'Recovery', emoji: '😴', color: 'text-cyan-400' },
};

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

export default function ExecutiveWidget() {
  const [summary, setSummary] = useState<ExecutiveSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/executive/summary');
      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const generateSummary = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/executive/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recompute: true }),
      });
      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to generate summary:', error);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-5 bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-violet-400" />
          <h3 className="font-semibold">Executive Summary</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-zinc-500" />
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-5 bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-2xl">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-violet-400" />
          <h3 className="font-semibold">Executive Summary</h3>
        </div>
        <div className="text-center py-6">
          <div className="text-2xl mb-2">📊</div>
          <p className="text-sm text-zinc-400 mb-4">
            No summary yet. Generate your first weekly report.
          </p>
          <button
            onClick={generateSummary}
            disabled={generating}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm font-medium flex items-center gap-2 mx-auto disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Generate Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-2xl">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-violet-400" />
          <h3 className="font-semibold">Executive Summary</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={generateSummary}
            disabled={generating}
            className="p-1.5 hover:bg-zinc-700 rounded-lg transition-colors disabled:opacity-50"
            title="Regenerate"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
          </button>
          <Link 
            href="/executive" 
            className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
          >
            Details <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Overall Score */}
      <div className="flex items-center gap-4 mb-4">
        <div className={`text-4xl font-bold ${getScoreColor(summary.overallScore)}`}>
          {summary.overallScore}
        </div>
        <div className="flex-1">
          <div className="text-sm text-zinc-400 mb-1">Overall Score</div>
          <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
            <div 
              className={`h-full ${getScoreBgColor(summary.overallScore)} transition-all`}
              style={{ width: `${summary.overallScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* Domain Scores */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {Object.entries(summary.domainScores).slice(0, 6).map(([key, score]) => {
          const config = DOMAIN_CONFIG[key] || { label: key, emoji: '📌', color: 'text-zinc-400' };
          return (
            <div key={key} className="p-2 bg-zinc-800/50 rounded-lg text-center">
              <div className="text-lg mb-0.5">{config.emoji}</div>
              <div className={`text-sm font-semibold ${getScoreColor(score)}`}>
                {score}
              </div>
              <div className="text-xs text-zinc-500">{config.label}</div>
            </div>
          );
        })}
      </div>

      {/* Summary Text */}
      <p className="text-sm text-zinc-300 mb-3">{summary.summary}</p>

      {/* Quick Highlights/Concerns */}
      {summary.highlights.length > 0 && (
        <div className="flex items-start gap-2 text-xs text-emerald-400 mb-2">
          <TrendingUp className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>{summary.highlights[0]}</span>
        </div>
      )}
      {summary.concerns.length > 0 && (
        <div className="flex items-start gap-2 text-xs text-amber-400">
          <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>{summary.concerns[0]}</span>
        </div>
      )}
    </div>
  );
}
