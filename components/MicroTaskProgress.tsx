"use client";

import { useState } from 'react';
import { Check, Circle, ChevronRight, Sparkles } from 'lucide-react';

interface MicroTask {
  id: string;
  title: string;
  estimatedMinutes: number;
  completed: boolean;
  dopamineReward: string;
}

interface MicroTaskProgressProps {
  parentTaskTitle: string;
  microTasks: MicroTask[];
  currentIndex: number;
  onComplete: (microTaskId: string) => void;
  onSkip: (microTaskId: string) => void;
  compact?: boolean;
}

export function MicroTaskProgress({
  parentTaskTitle,
  microTasks,
  currentIndex,
  onComplete,
  onSkip,
  compact = false,
}: MicroTaskProgressProps) {
  const [recentReward, setRecentReward] = useState<string | null>(null);

  const completedCount = microTasks.filter(t => t.completed).length;
  const progress = (completedCount / microTasks.length) * 100;
  const currentTask = microTasks[currentIndex];
  const allComplete = completedCount === microTasks.length;

  const handleComplete = (id: string) => {
    const task = microTasks.find(t => t.id === id);
    if (task) {
      setRecentReward(task.dopamineReward);
      setTimeout(() => setRecentReward(null), 1500);
    }
    onComplete(id);
  };

  if (compact) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        {/* Compact header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-zinc-400 truncate flex-1">{parentTaskTitle}</span>
          <span className="text-xs text-zinc-500 ml-2">
            {completedCount}/{microTasks.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-3">
          <div
            className="bg-gradient-to-r from-violet-500 to-fuchsia-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Current step */}
        {currentTask && !allComplete && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleComplete(currentTask.id)}
              className="p-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors"
            >
              <Check className="w-4 h-4 text-white" />
            </button>
            <span className="text-sm text-zinc-300 truncate">{currentTask.title}</span>
          </div>
        )}

        {allComplete && (
          <div className="text-center text-emerald-400 text-sm">
            ✓ All steps complete!
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Working on</p>
            <h3 className="text-lg font-medium text-white">{parentTaskTitle}</h3>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-violet-400">{completedCount}</p>
            <p className="text-xs text-zinc-500">of {microTasks.length}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 w-full bg-zinc-800 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-violet-500 to-fuchsia-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Reward animation */}
      {recentReward && (
        <div className="px-6 py-4 bg-violet-500/20 border-b border-violet-500/30 text-center animate-pulse">
          <span className="text-2xl">{recentReward}</span>
        </div>
      )}

      {/* Steps list */}
      <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
        {microTasks.map((task, index) => {
          const isCurrent = index === currentIndex && !task.completed;
          const isPast = index < currentIndex || task.completed;
          const isFuture = index > currentIndex && !task.completed;

          return (
            <div
              key={task.id}
              className={`
                flex items-center gap-3 p-3 rounded-xl transition-all
                ${isCurrent ? 'bg-violet-500/20 border border-violet-500/30' : ''}
                ${isPast ? 'opacity-60' : ''}
                ${isFuture ? 'opacity-40' : ''}
              `}
            >
              {/* Status indicator */}
              <div className="flex-shrink-0">
                {task.completed ? (
                  <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                ) : isCurrent ? (
                  <button
                    onClick={() => handleComplete(task.id)}
                    className="w-6 h-6 bg-violet-600 hover:bg-violet-500 rounded-full flex items-center justify-center transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-white" />
                  </button>
                ) : (
                  <div className="w-6 h-6 border-2 border-zinc-700 rounded-full flex items-center justify-center">
                    <Circle className="w-3 h-3 text-zinc-600" />
                  </div>
                )}
              </div>

              {/* Task info */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${isCurrent ? 'text-white font-medium' : 'text-zinc-400'} truncate`}>
                  {task.title}
                </p>
                {isCurrent && (
                  <p className="text-xs text-zinc-500">~{task.estimatedMinutes} min</p>
                )}
              </div>

              {/* Reward preview */}
              {task.completed && (
                <span className="text-sm">{task.dopamineReward}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* All complete celebration */}
      {allComplete && (
        <div className="p-6 text-center bg-gradient-to-r from-emerald-500/20 to-green-500/20 border-t border-emerald-500/30">
          <Sparkles className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-lg font-medium text-white mb-1">All steps complete!</p>
          <p className="text-sm text-zinc-400">Amazing focus. You did it!</p>
        </div>
      )}
    </div>
  );
}

// Simple step indicator (horizontal dots)
export function StepIndicator({
  total,
  current,
  completed,
}: {
  total: number;
  current: number;
  completed: number;
}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: total }).map((_, i) => {
        const isCompleted = i < completed;
        const isCurrent = i === current;

        return (
          <div
            key={i}
            className={`
              w-2 h-2 rounded-full transition-all
              ${isCompleted ? 'bg-emerald-500' : ''}
              ${isCurrent && !isCompleted ? 'bg-violet-500 w-4' : ''}
              ${!isCompleted && !isCurrent ? 'bg-zinc-700' : ''}
            `}
          />
        );
      })}
    </div>
  );
}
