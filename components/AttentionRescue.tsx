"use client";

import { useState, useEffect } from 'react';
import { Focus, Coffee, ArrowRight, Shuffle, X } from 'lucide-react';

interface AttentionRescueProps {
  isOpen: boolean;
  currentTask?: string;
  distractionLevel: number; // 0-10
  sessionMinutes: number;
  onResume: () => void;
  onTakeBreak: () => void;
  onSwitchTask: () => void;
  onDismiss: () => void;
}

export function AttentionRescue({
  isOpen,
  currentTask,
  distractionLevel,
  sessionMinutes,
  onResume,
  onTakeBreak,
  onSwitchTask,
  onDismiss,
}: AttentionRescueProps) {
  const [showBreathing, setShowBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');

  // Breathing exercise
  useEffect(() => {
    if (!showBreathing) return;

    const phases: ('inhale' | 'hold' | 'exhale')[] = ['inhale', 'hold', 'exhale'];
    let phaseIndex = 0;

    const interval = setInterval(() => {
      phaseIndex = (phaseIndex + 1) % 3;
      setBreathPhase(phases[phaseIndex]);
    }, 4000);

    return () => clearInterval(interval);
  }, [showBreathing]);

  if (!isOpen) return null;

  // Message based on severity
  const getMessage = () => {
    if (distractionLevel > 7) {
      return "Hey. Time to refocus. You've got this.";
    } else if (distractionLevel > 4) {
      return "Noticed you might have wandered. Want to come back?";
    } else {
      return "Quick check-in: still on track?";
    }
  };

  // Urgency styling
  const getStyle = () => {
    if (distractionLevel > 7) {
      return 'border-red-500/50 bg-red-950/50';
    } else if (distractionLevel > 4) {
      return 'border-amber-500/50 bg-amber-950/50';
    }
    return 'border-violet-500/50 bg-violet-950/50';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className={`w-full max-w-md rounded-2xl border p-6 ${getStyle()}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Focus className="w-5 h-5 text-violet-400" />
            <span className="text-sm text-zinc-400">Attention Check</span>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        </div>

        {/* Breathing Exercise */}
        {showBreathing ? (
          <div className="text-center py-8">
            <div 
              className={`
                w-32 h-32 mx-auto rounded-full 
                bg-gradient-to-r from-violet-500/20 to-cyan-500/20
                flex items-center justify-center
                transition-transform duration-[4000ms] ease-in-out
                ${breathPhase === 'inhale' ? 'scale-125' : ''}
                ${breathPhase === 'hold' ? 'scale-125' : ''}
                ${breathPhase === 'exhale' ? 'scale-100' : ''}
              `}
            >
              <span className="text-lg text-white capitalize">{breathPhase}</span>
            </div>
            <p className="text-zinc-400 mt-4 mb-6">
              {breathPhase === 'inhale' && 'Breathe in slowly...'}
              {breathPhase === 'hold' && 'Hold...'}
              {breathPhase === 'exhale' && 'Breathe out slowly...'}
            </p>
            <button
              onClick={() => setShowBreathing(false)}
              className="text-sm text-violet-400 hover:text-violet-300"
            >
              I'm ready to focus
            </button>
          </div>
        ) : (
          <>
            {/* Message */}
            <div className="text-center mb-6">
              <p className="text-xl text-white mb-2">{getMessage()}</p>
              {currentTask && (
                <p className="text-sm text-zinc-400">
                  You were working on: <span className="text-white">"{currentTask}"</span>
                </p>
              )}
              {sessionMinutes > 0 && (
                <p className="text-xs text-zinc-500 mt-2">
                  {sessionMinutes} minutes into your focus session
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button
                onClick={onResume}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <ArrowRight className="w-5 h-5" />
                Back to it
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={onTakeBreak}
                  className="py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Coffee className="w-4 h-4" />
                  Need a break
                </button>
                <button
                  onClick={onSwitchTask}
                  className="py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Shuffle className="w-4 h-4" />
                  Switch task
                </button>
              </div>

              {/* Breathing option for high distraction */}
              {distractionLevel > 5 && (
                <button
                  onClick={() => setShowBreathing(true)}
                  className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  🫁 Need a moment to breathe first
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Simpler inline nudge (less intrusive)
interface AttentionNudgeProps {
  message: string;
  onDismiss: () => void;
  onAction?: () => void;
  actionLabel?: string;
}

export function AttentionNudge({
  message,
  onDismiss,
  onAction,
  actionLabel = 'Got it',
}: AttentionNudgeProps) {
  return (
    <div className="fixed bottom-4 right-4 z-40 animate-slide-up">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 shadow-lg max-w-sm">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Focus className="w-4 h-4 text-violet-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-zinc-300 mb-3">{message}</p>
            <div className="flex gap-2">
              {onAction && (
                <button
                  onClick={onAction}
                  className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-sm rounded-lg transition-colors"
                >
                  {actionLabel}
                </button>
              )}
              <button
                onClick={onDismiss}
                className="px-3 py-1.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
