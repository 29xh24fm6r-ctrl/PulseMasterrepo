"use client";

import { useState } from 'react';
import { Play, SkipForward, Eye, EyeOff, Sparkles, Brain } from 'lucide-react';

interface JustOneThingProps {
  task: {
    id: string;
    title: string;
    project?: string;
    estimatedMinutes?: number;
  } | null;
  hiddenCount: number;
  bodyDoubleMessage?: string;
  onStart: () => void;
  onSkip: () => void;
  onShowAll: () => void;
  onCapture?: () => void;
}

export function JustOneThing({
  task,
  hiddenCount,
  bodyDoubleMessage,
  onStart,
  onSkip,
  onShowAll,
  onCapture,
}: JustOneThingProps) {
  const [showHiddenHint, setShowHiddenHint] = useState(false);

  // No task state
  if (!task) {
    return (
      <div className="bg-gradient-to-br from-emerald-900/30 to-green-900/30 border border-emerald-500/30 rounded-2xl p-8 text-center">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">All Clear!</h2>
        <p className="text-zinc-400 mb-6">Nothing pending. Enjoy the freedom.</p>
        {onCapture && (
          <button
            onClick={onCapture}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium transition-colors"
          >
            Capture something new
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-violet-900/30 to-purple-900/30 border border-violet-500/30 rounded-2xl overflow-hidden">
      {/* Header - Zen mode indicator */}
      <div className="px-6 py-3 border-b border-violet-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-violet-400" />
          <span className="text-sm text-violet-300">Just One Thing</span>
        </div>
        <div className="flex items-center gap-2">
          {hiddenCount > 0 && (
            <button
              onClick={() => setShowHiddenHint(!showHiddenHint)}
              className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
            >
              {showHiddenHint ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {hiddenCount} hidden
            </button>
          )}
        </div>
      </div>

      {/* Hidden tasks hint */}
      {showHiddenHint && hiddenCount > 0 && (
        <div className="px-6 py-2 bg-zinc-900/50 border-b border-zinc-800 text-xs text-zinc-500">
          {hiddenCount} other tasks are hidden to help you focus. 
          <button onClick={onShowAll} className="text-violet-400 hover:text-violet-300 ml-1">
            Show all
          </button>
        </div>
      )}

      {/* The ONE thing */}
      <div className="p-8 text-center">
        {/* Visual focus indicator */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-violet-500/20 rounded-full blur-3xl" />
          <div className="relative w-24 h-24 mx-auto bg-violet-500/10 border-2 border-violet-500/50 rounded-full flex items-center justify-center">
            <span className="text-4xl">🎯</span>
          </div>
        </div>

        {/* Task */}
        <h2 className="text-2xl font-bold text-white mb-2">
          {task.title}
        </h2>
        {task.project && (
          <p className="text-sm text-zinc-500 mb-2">{task.project}</p>
        )}
        {task.estimatedMinutes && (
          <p className="text-sm text-zinc-400 mb-6">~{task.estimatedMinutes} minutes</p>
        )}

        {/* Body double message */}
        {bodyDoubleMessage && (
          <div className="max-w-md mx-auto mb-6 p-4 bg-violet-500/10 border border-violet-500/20 rounded-xl">
            <p className="text-violet-300 italic text-sm">"{bodyDoubleMessage}"</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={onStart}
            className="px-8 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            <Play className="w-5 h-5" />
            Let's do it
          </button>
          <button
            onClick={onSkip}
            className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-colors"
            title="Show different one"
          >
            <SkipForward className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Encouragement footer */}
      <div className="px-6 py-3 bg-zinc-900/50 border-t border-zinc-800 text-center">
        <p className="text-xs text-zinc-500">
          Nothing else matters right now. Just this one thing.
        </p>
      </div>
    </div>
  );
}

// Overwhelm helper - shows when user is clearly struggling
interface OverwhelmHelperProps {
  taskCount: number;
  onJustOneThing: () => void;
  onBrainDump: () => void;
  onTakeBreak: () => void;
  onTalkItOut?: () => void;
}

export function OverwhelmHelper({
  taskCount,
  onJustOneThing,
  onBrainDump,
  onTakeBreak,
  onTalkItOut,
}: OverwhelmHelperProps) {
  return (
    <div className="bg-gradient-to-br from-red-900/20 to-rose-900/20 border border-red-500/30 rounded-2xl p-6">
      <div className="text-center mb-6">
        <div className="text-4xl mb-4">😤</div>
        <h2 className="text-xl font-bold text-white mb-2">Feeling overwhelmed?</h2>
        <p className="text-zinc-400">
          {taskCount > 0 
            ? `${taskCount} tasks can feel like a lot. Let's simplify.`
            : "That's okay. Let's take it one step at a time."}
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={onJustOneThing}
          className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-xl">🎯</span>
          Show me ONE thing to focus on
        </button>

        <button
          onClick={onBrainDump}
          className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <span className="text-xl">🧠</span>
          Brain dump everything first
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onTakeBreak}
            className="py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <span>☕</span>
            Take a break
          </button>
          {onTalkItOut && (
            <button
              onClick={onTalkItOut}
              className="py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <span>💬</span>
              Talk it out
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-zinc-600 mt-4">
        Remember: You don't have to do everything. Just one thing.
      </p>
    </div>
  );
}
