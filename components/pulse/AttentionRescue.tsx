"use client";
import { useState, useEffect } from 'react';
import { Focus, Coffee, ArrowRight, Shuffle, X } from 'lucide-react';

interface AttentionRescueProps { isOpen: boolean; currentTask?: string; distractionLevel: number; sessionMinutes: number; onResume: () => void; onTakeBreak: () => void; onSwitchTask: () => void; onDismiss: () => void; }

export function AttentionRescue({ isOpen, currentTask, distractionLevel, sessionMinutes, onResume, onTakeBreak, onSwitchTask, onDismiss }: AttentionRescueProps) {
  const [showBreathing, setShowBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  useEffect(() => { if (!showBreathing) return; const phases: ('inhale' | 'hold' | 'exhale')[] = ['inhale', 'hold', 'exhale']; let i = 0; const interval = setInterval(() => { i = (i + 1) % 3; setBreathPhase(phases[i]); }, 4000); return () => clearInterval(interval); }, [showBreathing]);
  if (!isOpen) return null;
  const getMessage = () => distractionLevel > 7 ? "Hey. Time to refocus." : distractionLevel > 4 ? "Noticed you wandered. Come back?" : "Quick check-in: still on track?";
  const getStyle = () => distractionLevel > 7 ? 'border-red-500/50 bg-red-950/50' : distractionLevel > 4 ? 'border-amber-500/50 bg-amber-950/50' : 'border-violet-500/50 bg-violet-950/50';
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`w-full max-w-md rounded-2xl border p-6 ${getStyle()}`}>
        <div className="flex items-center justify-between mb-6"><div className="flex items-center gap-2"><Focus className="w-5 h-5 text-violet-400" /><span className="text-sm text-zinc-400">Attention Check</span></div><button onClick={onDismiss} className="p-1 hover:bg-white/10 rounded"><X className="w-4 h-4 text-zinc-500" /></button></div>
        {showBreathing ? (
          <div className="text-center py-8"><div className={`w-32 h-32 mx-auto rounded-full bg-gradient-to-r from-violet-500/20 to-cyan-500/20 flex items-center justify-center transition-transform duration-[4000ms] ${breathPhase !== 'exhale' ? 'scale-125' : 'scale-100'}`}><span className="text-lg text-white capitalize">{breathPhase}</span></div><p className="text-zinc-400 mt-4 mb-6">{breathPhase === 'inhale' ? 'Breathe in...' : breathPhase === 'hold' ? 'Hold...' : 'Breathe out...'}</p><button onClick={() => setShowBreathing(false)} className="text-sm text-violet-400 hover:text-violet-300">Ready to focus</button></div>
        ) : (
          <><div className="text-center mb-6"><p className="text-xl text-white mb-2">{getMessage()}</p>{currentTask && <p className="text-sm text-zinc-400">Working on: <span className="text-white">{currentTask}</span></p>}{sessionMinutes > 0 && <p className="text-xs text-zinc-500 mt-2">{sessionMinutes}min in</p>}</div>
          <div className="space-y-3"><button onClick={onResume} className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium flex items-center justify-center gap-2"><ArrowRight className="w-5 h-5" /> Back to it</button><div className="grid grid-cols-2 gap-3"><button onClick={onTakeBreak} className="py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm flex items-center justify-center gap-2"><Coffee className="w-4 h-4" /> Break</button><button onClick={onSwitchTask} className="py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm flex items-center justify-center gap-2"><Shuffle className="w-4 h-4" /> Switch</button></div>{distractionLevel > 5 && <button onClick={() => setShowBreathing(true)} className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-300">Breathe first</button>}</div></>
        )}
      </div>
    </div>
  );
}

interface AttentionNudgeProps { message: string; onDismiss: () => void; onAction?: () => void; actionLabel?: string; }
export function AttentionNudge({ message, onDismiss, onAction, actionLabel = 'Got it' }: AttentionNudgeProps) {
  return <div className="fixed bottom-4 right-4 z-40"><div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow-lg max-w-sm"><div className="flex items-start gap-3"><div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center"><Focus className="w-4 h-4 text-violet-400" /></div><div className="flex-1"><p className="text-sm text-zinc-300 mb-3">{message}</p><div className="flex gap-2">{onAction && <button onClick={onAction} className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg">{actionLabel}</button>}<button onClick={onDismiss} className="px-3 py-1.5 text-zinc-500 hover:text-zinc-300 text-sm">Dismiss</button></div></div></div></div></div>;
}
