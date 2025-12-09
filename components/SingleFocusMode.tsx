"use client";

import { useState, useEffect, useCallback } from 'react';
import { X, Play, Pause, SkipForward, CheckCircle2, Coffee } from 'lucide-react';

interface MicroTask {
  id: string;
  title: string;
  estimatedMinutes: number;
  completed: boolean;
  dopamineReward: string;
}

interface SingleFocusModeProps {
  task: {
    id: string;
    title: string;
    project?: string;
  };
  microTasks: MicroTask[];
  durationMinutes?: number;
  bodyDoubleMessage?: string;
  onComplete: (completed: boolean) => void;
  onMicroTaskComplete: (microTaskId: string) => void;
  onExit: () => void;
}

export function SingleFocusMode({
  task,
  microTasks,
  durationMinutes = 25,
  bodyDoubleMessage,
  onComplete,
  onMicroTaskComplete,
  onExit,
}: SingleFocusModeProps) {
  const [timeRemaining, setTimeRemaining] = useState(durationMinutes * 60);
  const [isRunning, setIsRunning] = useState(true);
  const [currentMicroIndex, setCurrentMicroIndex] = useState(0);
  const [showReward, setShowReward] = useState<string | null>(null);
  const [completedCount, setCompletedCount] = useState(0);

  // Timer
  useEffect(() => {
    if (!isRunning || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining(t => {
        if (t <= 1) {
          setIsRunning(false);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeRemaining]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Progress percentage
  const progress = ((durationMinutes * 60 - timeRemaining) / (durationMinutes * 60)) * 100;

  // Handle micro-task completion
  const handleMicroComplete = useCallback(() => {
    const currentMicro = microTasks[currentMicroIndex];
    if (!currentMicro) return;

    // Show reward
    setShowReward(currentMicro.dopamineReward);
    setTimeout(() => setShowReward(null), 1500);

    // Update state
    onMicroTaskComplete(currentMicro.id);
    setCompletedCount(c => c + 1);

    // Move to next or complete
    if (currentMicroIndex < microTasks.length - 1) {
      setCurrentMicroIndex(i => i + 1);
    } else {
      // All micro-tasks done!
      setTimeout(() => onComplete(true), 1000);
    }
  }, [currentMicroIndex, microTasks, onMicroTaskComplete, onComplete]);

  // Skip to next micro-task
  const skipMicro = () => {
    if (currentMicroIndex < microTasks.length - 1) {
      setCurrentMicroIndex(i => i + 1);
    }
  };

  const currentMicro = microTasks[currentMicroIndex];
  const microProgress = (completedCount / microTasks.length) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col">
      {/* Reward Animation */}
      {showReward && (
        <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="animate-bounce text-6xl">{showReward}</div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm text-zinc-400 uppercase tracking-wider">Focus Mode</span>
        </div>
        <button
          onClick={onExit}
          className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-8 max-w-2xl mx-auto w-full">
        {/* Timer Ring */}
        <div className="relative w-48 h-48 mb-8">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-zinc-800"
            />
            <circle
              cx="96"
              cy="96"
              r="88"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeDasharray={553}
              strokeDashoffset={553 - (553 * progress) / 100}
              className="text-violet-500 transition-all duration-1000"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-mono font-bold text-white">
              {formatTime(timeRemaining)}
            </span>
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="mt-2 p-2 hover:bg-zinc-800 rounded-full transition-colors"
            >
              {isRunning ? (
                <Pause className="w-6 h-6 text-zinc-400" />
              ) : (
                <Play className="w-6 h-6 text-violet-400" />
              )}
            </button>
          </div>
        </div>

        {/* Task Title */}
        <h1 className="text-2xl font-bold text-white text-center mb-2">
          {task.title}
        </h1>
        {task.project && (
          <p className="text-sm text-zinc-500 mb-6">{task.project}</p>
        )}

        {/* Body Double Message */}
        {bodyDoubleMessage && (
          <p className="text-center text-violet-300 italic mb-8 max-w-md">
            "{bodyDoubleMessage}"
          </p>
        )}

        {/* Current Micro-Task */}
        {currentMicro && (
          <div className="w-full max-w-md">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-zinc-500 uppercase tracking-wider">
                  Step {currentMicroIndex + 1} of {microTasks.length}
                </span>
                <span className="text-xs text-zinc-500">
                  ~{currentMicro.estimatedMinutes} min
                </span>
              </div>
              
              <h2 className="text-lg font-medium text-white mb-4">
                {currentMicro.title}
              </h2>

              {/* Micro-task progress bar */}
              <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-4">
                <div
                  className="bg-gradient-to-r from-violet-500 to-fuchsia-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${microProgress}%` }}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleMicroComplete}
                  className="flex-1 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Done with this step
                </button>
                {currentMicroIndex < microTasks.length - 1 && (
                  <button
                    onClick={skipMicro}
                    className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-colors"
                    title="Skip to next"
                  >
                    <SkipForward className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Completed All Micro-Tasks */}
        {!currentMicro && completedCount > 0 && (
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-white mb-2">All steps complete!</h2>
            <p className="text-zinc-400 mb-6">Amazing focus. You crushed it.</p>
            <button
              onClick={() => onComplete(true)}
              className="px-8 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-medium"
            >
              Finish Session
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-4 border-t border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-500">
            {completedCount}/{microTasks.length} steps
          </span>
          {completedCount > 0 && (
            <span className="text-sm text-violet-400">
              🔥 {completedCount} streak
            </span>
          )}
        </div>
        <button
          onClick={() => {
            setIsRunning(false);
            onComplete(completedCount > 0);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-zinc-300 transition-colors"
        >
          <Coffee className="w-4 h-4" />
          Take a break
        </button>
      </footer>
    </div>
  );
}
