"use client";
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

interface PulseScoreProps { score: number; breakdown: { tasksOnTrack: number; tasksTotal: number; dealsActive: number; dealsStale: number; followUpsOnTime: number; followUpsOverdue: number }; previousScore?: number; showDetails?: boolean; }

export function PulseScore({ score, breakdown, previousScore, showDetails = true }: PulseScoreProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  useEffect(() => { let c = 0; const inc = score / 60; const t = setInterval(() => { c += inc; if (c >= score) { setAnimatedScore(score); clearInterval(t); } else setAnimatedScore(Math.round(c)); }, 16); return () => clearInterval(t); }, [score]);
  const getStyle = () => { if (score >= 90) return { text: 'text-emerald-400', label: 'Excellent' }; if (score >= 75) return { text: 'text-green-400', label: 'Good' }; if (score >= 60) return { text: 'text-yellow-400', label: 'Okay' }; if (score >= 40) return { text: 'text-orange-400', label: 'Needs Focus' }; return { text: 'text-red-400', label: 'Behind' }; };
  const { text, label } = getStyle();
  const getTrend = () => { if (previousScore === undefined) return null; const d = score - previousScore; if (d > 5) return { icon: TrendingUp, color: 'text-green-400', label: `+${d}%` }; if (d < -5) return { icon: TrendingDown, color: 'text-red-400', label: `${d}%` }; return { icon: Minus, color: 'text-zinc-500', label: 'Stable' }; };
  const trend = getTrend();
  const circ = 2 * Math.PI * 45;
  const offset = circ - (animatedScore / 100) * circ;
  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">
      <div className="flex items-start justify-between mb-4"><div><h2 className="text-lg font-semibold text-white">Pulse Score</h2><p className="text-sm text-zinc-500">How on-track you are</p></div>{trend && <div className={`flex items-center gap-1 ${trend.color}`}><trend.icon className="w-4 h-4" /><span className="text-sm">{trend.label}</span></div>}</div>
      <div className="flex items-center gap-6">
        <div className="relative w-28 h-28"><svg className="w-full h-full transform -rotate-90"><circle cx="56" cy="56" r="45" stroke="currentColor" strokeWidth="10" fill="none" className="text-zinc-800" /><circle cx="56" cy="56" r="45" stroke="currentColor" strokeWidth="10" fill="none" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className={`transition-all duration-1000 ${score >= 60 ? 'text-emerald-500' : 'text-red-500'}`} /></svg><div className="absolute inset-0 flex flex-col items-center justify-center"><span className={`text-3xl font-bold ${text}`}>{animatedScore}%</span><span className="text-xs text-zinc-500">{label}</span></div></div>
        {showDetails && <div className="flex-1 space-y-3"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-zinc-500" /><span className="text-sm text-zinc-400">Tasks</span></div><span className={`text-sm font-medium ${breakdown.tasksTotal === 0 ? 'text-zinc-500' : breakdown.tasksOnTrack / breakdown.tasksTotal >= 0.8 ? 'text-green-400' : breakdown.tasksOnTrack / breakdown.tasksTotal >= 0.5 ? 'text-yellow-400' : 'text-red-400'}`}>{breakdown.tasksTotal === 0 ? 'None' : `${breakdown.tasksOnTrack}/${breakdown.tasksTotal}`}</span></div><div className="flex items-center justify-between"><div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-zinc-500" /><span className="text-sm text-zinc-400">Deals</span></div><span className={`text-sm font-medium ${breakdown.dealsStale === 0 ? 'text-green-400' : 'text-red-400'}`}>{breakdown.dealsStale === 0 ? `${breakdown.dealsActive} active` : `${breakdown.dealsStale} stale`}</span></div><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Clock className="w-4 h-4 text-zinc-500" /><span className="text-sm text-zinc-400">Follow-ups</span></div><span className={`text-sm font-medium ${breakdown.followUpsOverdue === 0 ? 'text-green-400' : 'text-red-400'}`}>{breakdown.followUpsOverdue === 0 ? 'On time' : `${breakdown.followUpsOverdue} overdue`}</span></div></div>}
      </div>
      {score < 60 && <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg flex items-center gap-3"><AlertTriangle className="w-5 h-5 text-orange-400" /><p className="text-sm text-orange-300">{score < 40 ? "Several items need attention." : "A few things slipping."}</p></div>}
    </div>
  );
}

export function PulseScoreBadge({ score }: { score: number }) { return <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-full"><div className={`w-2 h-2 rounded-full ${score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-yellow-500' : score >= 40 ? 'bg-orange-500' : 'bg-red-500'}`} /><span className="text-sm font-medium text-zinc-300">{score}%</span></div>; }
