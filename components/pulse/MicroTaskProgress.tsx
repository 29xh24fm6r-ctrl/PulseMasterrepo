"use client";
import { useState } from 'react';
import { Check, Circle, ChevronRight, Sparkles } from 'lucide-react';

interface MicroTask { id: string; title: string; estimatedMinutes: number; completed: boolean; dopamineReward: string; }
interface MicroTaskProgressProps { parentTaskTitle: string; microTasks: MicroTask[]; currentIndex: number; onComplete: (id: string) => void; onSkip: (id: string) => void; compact?: boolean; }

export function MicroTaskProgress({ parentTaskTitle, microTasks, currentIndex, onComplete, onSkip, compact = false }: MicroTaskProgressProps) {
  const [reward, setReward] = useState<string | null>(null);
  const done = microTasks.filter(t => t.completed).length;
  const progress = (done / microTasks.length) * 100;
  const current = microTasks[currentIndex];
  const allDone = done === microTasks.length;
  const handleComplete = (id: string) => { const t = microTasks.find(x => x.id === id); if (t) { setReward(t.dopamineReward); setTimeout(() => setReward(null), 1500); } onComplete(id); };
  
  if (compact) return <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"><div className="flex items-center justify-between mb-3"><span className="text-sm text-zinc-400 truncate flex-1">{parentTaskTitle}</span><span className="text-xs text-zinc-500 ml-2">{done}/{microTasks.length}</span></div><div className="w-full bg-zinc-800 rounded-full h-1.5 mb-3"><div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} /></div>{current && !allDone && <div className="flex items-center gap-2"><button onClick={() => handleComplete(current.id)} className="p-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg"><Check className="w-4 h-4 text-white" /></button><span className="text-sm text-zinc-300 truncate">{current.title}</span></div>}{allDone && <div className="text-center text-emerald-400 text-sm">Done!</div>}</div>;
  
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-zinc-800"><div className="flex items-center justify-between"><div><p className="text-xs text-zinc-500 uppercase mb-1">Working on</p><h3 className="text-lg font-medium text-white">{parentTaskTitle}</h3></div><div className="text-right"><p className="text-2xl font-bold text-violet-400">{done}</p><p className="text-xs text-zinc-500">of {microTasks.length}</p></div></div><div className="mt-4 w-full bg-zinc-800 rounded-full h-2"><div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} /></div></div>
      {reward && <div className="px-6 py-4 bg-violet-500/20 border-b border-violet-500/30 text-center animate-pulse"><span className="text-2xl">{reward}</span></div>}
      <div className="p-4 space-y-2 max-h-64 overflow-y-auto">{microTasks.map((t, i) => { const isCur = i === currentIndex && !t.completed; const isPast = i < currentIndex || t.completed; const isFut = i > currentIndex && !t.completed; return <div key={t.id} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isCur ? 'bg-violet-500/20 border border-violet-500/30' : ''} ${isPast ? 'opacity-60' : ''} ${isFut ? 'opacity-40' : ''}`}><div className="flex-shrink-0">{t.completed ? <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center"><Check className="w-4 h-4 text-white" /></div> : isCur ? <button onClick={() => handleComplete(t.id)} className="w-6 h-6 bg-violet-600 hover:bg-violet-500 rounded-full flex items-center justify-center"><ChevronRight className="w-4 h-4 text-white" /></button> : <div className="w-6 h-6 border-2 border-zinc-700 rounded-full flex items-center justify-center"><Circle className="w-3 h-3 text-zinc-600" /></div>}</div><div className="flex-1 min-w-0"><p className={`text-sm ${isCur ? 'text-white font-medium' : 'text-zinc-400'} truncate`}>{t.title}</p>{isCur && <p className="text-xs text-zinc-500">~{t.estimatedMinutes}min</p>}</div>{t.completed && <span className="text-sm">{t.dopamineReward}</span>}</div>; })}</div>
      {allDone && <div className="p-6 text-center bg-gradient-to-r from-emerald-500/20 to-green-500/20 border-t border-emerald-500/30"><Sparkles className="w-8 h-8 text-emerald-400 mx-auto mb-2" /><p className="text-lg font-medium text-white mb-1">All done!</p><p className="text-sm text-zinc-400">Amazing focus.</p></div>}
    </div>
  );
}

export function StepIndicator({ total, current, completed }: { total: number; current: number; completed: number }) { return <div className="flex items-center gap-1">{Array.from({ length: total }).map((_, i) => <div key={i} className={`w-2 h-2 rounded-full transition-all ${i < completed ? 'bg-emerald-500' : i === current ? 'bg-violet-500 w-4' : 'bg-zinc-700'}`} />)}</div>; }
