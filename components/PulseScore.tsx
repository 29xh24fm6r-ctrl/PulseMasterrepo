"use client";

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

interface PulseScoreProps {
  score: number; // 0-100
  breakdown: {
    tasksOnTrack: number;
    tasksTotal: number;
    dealsActive: number;
    dealsStale: number;
    followUpsOnTime: number;
    followUpsOverdue: number;
  };
  previousScore?: number;
  showDetails?: boolean;
}

export function PulseScore({
  score,
  breakdown,
  previousScore,
  showDetails = true,
}: PulseScoreProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  // Animate score on mount
  useEffect(() => {
    const duration = 1000;
    const steps = 60;
    const increment = score / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setAnimatedScore(score);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.round(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score]);

  // Score styling
  const getScoreStyle = () => {
    if (score >= 90) return { bg: 'from-emerald-500 to-green-600', text: 'text-emerald-400', label: 'Excellent' };
    if (score >= 75) return { bg: 'from-green-500 to-emerald-600', text: 'text-green-400', label: 'Good' };
    if (score >= 60) return { bg: 'from-yellow-500 to-amber-600', text: 'text-yellow-400', label: 'Okay' };
    if (score >= 40) return { bg: 'from-orange-500 to-red-600', text: 'text-orange-400', label: 'Needs Focus' };
    return { bg: 'from-red-500 to-rose-600', text: 'text-red-400', label: 'Behind' };
  };

  const { bg, text, label } = getScoreStyle();

  // Trend
  const getTrend = () => {
    if (previousScore === undefined) return null;
    const diff = score - previousScore;
    if (diff > 5) return { icon: TrendingUp, color: 'text-green-400', label: `+${diff}%` };
    if (diff < -5) return { icon: TrendingDown, color: 'text-red-400', label: `${diff}%` };
    return { icon: Minus, color: 'text-zinc-500', label: 'Stable' };
  };

  const trend = getTrend();

  // Calculate ring progress
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Pulse Score</h2>
          <p className="text-sm text-zinc-500">How on-track you are</p>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 ${trend.color}`}>
            <trend.icon className="w-4 h-4" />
            <span className="text-sm">{trend.label}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        {/* Score Ring */}
        <div className="relative w-28 h-28 flex-shrink-0">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="56"
              cy="56"
              r="45"
              stroke="currentColor"
              strokeWidth="10"
              fill="none"
              className="text-zinc-800"
            />
            <circle
              cx="56"
              cy="56"
              r="45"
              stroke="url(#scoreGradient)"
              strokeWidth="10"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
            <defs>
              <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" className={score >= 60 ? 'text-emerald-500' : 'text-red-500'} stopColor="currentColor" />
                <stop offset="100%" className={score >= 60 ? 'text-green-400' : 'text-orange-500'} stopColor="currentColor" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${text}`}>{animatedScore}%</span>
            <span className="text-xs text-zinc-500">{label}</span>
          </div>
        </div>

        {/* Breakdown */}
        {showDetails && (
          <div className="flex-1 space-y-3">
            {/* Tasks */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-zinc-500" />
                <span className="text-sm text-zinc-400">Tasks</span>
              </div>
              <span className={`text-sm font-medium ${
                breakdown.tasksTotal === 0 ? 'text-zinc-500' :
                breakdown.tasksOnTrack / breakdown.tasksTotal >= 0.8 ? 'text-green-400' :
                breakdown.tasksOnTrack / breakdown.tasksTotal >= 0.5 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {breakdown.tasksTotal === 0 ? 'None' : `${breakdown.tasksOnTrack}/${breakdown.tasksTotal} on track`}
              </span>
            </div>

            {/* Deals */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-zinc-500" />
                <span className="text-sm text-zinc-400">Deals</span>
              </div>
              <span className={`text-sm font-medium ${
                breakdown.dealsStale === 0 ? 'text-green-400' :
                breakdown.dealsStale <= 2 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {breakdown.dealsStale === 0 ? `${breakdown.dealsActive} active` : 
                 `${breakdown.dealsStale} stale`}
              </span>
            </div>

            {/* Follow-ups */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-500" />
                <span className="text-sm text-zinc-400">Follow-ups</span>
              </div>
              <span className={`text-sm font-medium ${
                breakdown.followUpsOverdue === 0 ? 'text-green-400' :
                breakdown.followUpsOverdue <= 2 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {breakdown.followUpsOverdue === 0 ? 'All on time' : 
                 `${breakdown.followUpsOverdue} overdue`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Alert if score is low */}
      {score < 60 && (
        <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0" />
          <p className="text-sm text-orange-300">
            {score < 40 
              ? "Several items need attention. Let's focus on the most urgent."
              : "A few things slipping. Want me to prioritize?"}
          </p>
        </div>
      )}
    </div>
  );
}

// Compact version for header/sidebar
export function PulseScoreBadge({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-full">
      <div className={`w-2 h-2 rounded-full ${getColor()}`} />
      <span className="text-sm font-medium text-zinc-300">{score}%</span>
    </div>
  );
}
