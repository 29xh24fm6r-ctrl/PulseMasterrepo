"use client";
import { useState } from 'react';
import { Play, ChevronDown, ChevronUp, Zap, Clock, Battery, Target } from 'lucide-react';

interface NextBestActionProps { action: string; reasoning: string; estimatedTime: number; energyRequired: 'low' | 'medium' | 'high'; impactScore: number; alternatives?: { action: string; reason: string }[]; onStart: () => void; onSkip: () => void; }

export function NextBestAction({ action, reasoning, estimatedTime, energyRequired, impactScore, alternatives = [], onStart, onSkip }: NextBestActionProps) {
  const [showAlt, setShowAlt] = useState(false);
  const energy = { low: { bars: 1, color: 'text-green-400', label: 'Low' }, medium: { bars: 2, color: 'text-yellow-400', label: 'Medium' }, high: { bars: 3, color: 'text-orange-400', label: 'High' } }[energyRequired];
  const impactColor = impactScore >= 8 ? 'text-violet-400' : impactScore >= 5 ? 'text-blue-400' : 'text-zinc-400';
  return (
    <div className="bg-gradient-to-br from-violet-900/40 to-purple-900/40 border border-violet-500/30 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-violet-500/20"><div className="flex items-center gap-2"><Target className="w-5 h-5 text-violet-400" /><h2 className="text-lg font-semibold text-white">Next Best Action</h2></div><p className="text-sm text-violet-300/70 mt-1">Most impactful thing right now</p></div>
      <div className="p-6"><h3 className="text-xl font-medium text-white mb-2">{action}</h3><p className="text-sm text-zinc-400 mb-4">{reasoning}</p>
        <div className="flex flex-wrap gap-4 mb-6"><div className="flex items-center gap-2 text-sm"><Clock className="w-4 h-4 text-zinc-500" /><span className="text-zinc-400">~{estimatedTime}min</span></div><div className="flex items-center gap-2 text-sm"><Battery className="w-4 h-4 text-zinc-500" /><div className="flex gap-0.5">{[1,2,3].map(i => <div key={i} className={`w-1.5 h-3 rounded-sm ${i <= energy.bars ? energy.color.replace('text-','bg-') : 'bg-zinc-700'}`} />)}</div><span className={energy.color}>{energy.label}</span></div><div className="flex items-center gap-2 text-sm"><Zap className={`w-4 h-4 ${impactColor}`} /><span className={impactColor}>{impactScore >= 8 ? 'High' : impactScore >= 5 ? 'Good' : 'Some'} impact</span></div></div>
        <div className="flex gap-3"><button onClick={onStart} className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium flex items-center justify-center gap-2"><Play className="w-5 h-5" /> Start</button><button onClick={onSkip} className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl">Skip</button></div>
        {alternatives.length > 0 && <div className="mt-4"><button onClick={() => setShowAlt(!showAlt)} className="w-full flex items-center justify-center gap-2 py-2 text-sm text-zinc-500 hover:text-zinc-300">{showAlt ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />} {alternatives.length} alternatives</button>{showAlt && <div className="mt-2 space-y-2">{alternatives.map((a,i) => <button key={i} onClick={() => setShowAlt(false)} className="w-full text-left p-3 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 rounded-lg"><div className="text-sm text-zinc-300">{a.action}</div><div className="text-xs text-zinc-500">{a.reason}</div></button>)}</div>}</div>}
      </div>
    </div>
  );
}

export function NextActionInline({ action, estimatedTime, onStart }: { action: string; estimatedTime: number; onStart: () => void }) { return <div className="flex items-center gap-3 p-3 bg-violet-500/10 border border-violet-500/30 rounded-xl"><div className="w-10 h-10 bg-violet-500/20 rounded-lg flex items-center justify-center"><Target className="w-5 h-5 text-violet-400" /></div><div className="flex-1 min-w-0"><div className="text-sm font-medium text-white truncate">{action}</div><div className="text-xs text-zinc-500">~{estimatedTime}min</div></div><button onClick={onStart} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg flex items-center gap-1"><Play className="w-4 h-4" /> Start</button></div>; }
