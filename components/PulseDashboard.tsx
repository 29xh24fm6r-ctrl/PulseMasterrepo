"use client";

import React, { useState } from 'react';
import { usePulse } from '@/hooks/usePulse';

export function PulseDashboard() {
  const {
    score,
    breakdown,
    streak,
    nextAction,
    tasks,
    focusTask,
    microTasks,
    isLoading,
    isFocusMode,
    isGeneratingMicroTasks,
    startFocusMode,
    exitFocusMode,
    completeMicroTask,
    completeFocusSession,
    forceRefresh,
    getBodyDoubleMessage
  } = usePulse();

  const [showReward, setShowReward] = useState<string | null>(null);
  const [bodyDoubleMsg] = useState(() => getBodyDoubleMessage());

  // Handle micro-task completion with reward animation
  const handleComplete = (taskId: string, reward: string) => {
    completeMicroTask(taskId);
    setShowReward(reward);
    setTimeout(() => setShowReward(null), 1500);
  };

  // Check if all micro-tasks are done
  const allMicroTasksDone = microTasks.length > 0 && microTasks.every(t => t.completed);
  const completedCount = microTasks.filter(t => t.completed).length;
  const currentMicroTask = microTasks.find(t => !t.completed);

  // ============================================
  // FOCUS MODE OVERLAY
  // ============================================
  if (isFocusMode && focusTask) {
    return (
      <div className="fixed inset-0 z-50 bg-zinc-950/95 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-violet-500 rounded-full animate-pulse" />
              <span className="text-violet-400 font-medium">Focus Mode</span>
            </div>
            <button
              onClick={exitFocusMode}
              className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Exit ✕
            </button>
          </div>

          {/* Task Title */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Working on</div>
            <h2 className="text-xl font-semibold text-white mb-3">{focusTask.title}</h2>
            {focusTask.project && (
              <div className="text-sm text-zinc-400">📁 {focusTask.project}</div>
            )}
          </div>

          {/* Body Double Message */}
          <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-4 mb-6 text-center">
            <p className="text-violet-300 text-sm italic">"{bodyDoubleMsg}"</p>
          </div>

          {/* AI Loading State */}
          {isGeneratingMicroTasks ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
              <div className="w-12 h-12 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-zinc-400">🧠 AI is breaking down your task...</p>
              <p className="text-xs text-zinc-500 mt-2">Creating personalized micro-steps</p>
            </div>
          ) : (
            <>
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-zinc-500 mb-2">
                  <span>Progress</span>
                  <span>{completedCount}/{microTasks.length} steps</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500"
                    style={{ width: `${(completedCount / microTasks.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Micro Tasks */}
              <div className="space-y-2 mb-6">
                {microTasks.map((task, index) => (
                  <div
                    key={task.id}
                    className={`p-4 rounded-xl border transition-all ${
                      task.completed
                        ? 'bg-emerald-500/10 border-emerald-500/30 opacity-60'
                        : task.id === currentMicroTask?.id
                          ? 'bg-violet-500/20 border-violet-500/50 scale-[1.02]'
                          : 'bg-zinc-900 border-zinc-800 opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          task.completed
                            ? 'bg-emerald-500 text-white'
                            : task.id === currentMicroTask?.id
                              ? 'bg-violet-500 text-white'
                              : 'bg-zinc-700 text-zinc-400'
                        }`}>
                          {task.completed ? '✓' : index + 1}
                        </div>
                        <div>
                          <div className={`font-medium ${task.completed ? 'line-through text-zinc-500' : 'text-white'}`}>
                            {task.title}
                          </div>
                          <div className="text-xs text-zinc-500">~{task.estimatedMinutes} min</div>
                        </div>
                      </div>
                      
                      {!task.completed && task.id === currentMicroTask?.id && (
                        <button
                          onClick={() => handleComplete(task.id, task.dopamineReward)}
                          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Done ✓
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Reward Animation */}
              {showReward && (
                <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
                  <div className="text-8xl animate-bounce">{showReward}</div>
                </div>
              )}

              {/* Complete Session Button */}
              {allMicroTasksDone && (
                <button
                  onClick={() => completeFocusSession(true)}
                  className="w-full py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-semibold rounded-xl transition-all text-lg"
                >
                  🎉 Complete Session! +1 Streak
                </button>
              )}
            </>
          )}

          {/* Streak Display */}
          <div className="mt-6 flex justify-center gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-violet-400">{streak.current}</div>
              <div className="text-xs text-zinc-500">Current Streak</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-400">{streak.best}</div>
              <div className="text-xs text-zinc-500">Best Streak</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">{streak.today}</div>
              <div className="text-xs text-zinc-500">Today</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // NORMAL DASHBOARD VIEW
  // ============================================
  if (isLoading) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-violet-900/20 to-fuchsia-900/20 border border-violet-500/30 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="text-violet-400">🎯</span> Focus Mode
        </h2>
        <button
          onClick={forceRefresh}
          className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 hover:bg-zinc-800 rounded transition-colors"
          title="Refresh data"
        >
          🔄
        </button>
      </div>

      {/* Score + Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-zinc-900/50 rounded-xl p-3 text-center">
          <div className={`text-2xl font-bold ${
            score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400'
          }`}>{score}%</div>
          <div className="text-xs text-zinc-500">Pulse Score</div>
        </div>
        <div className="bg-zinc-900/50 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">{breakdown.tasksOnTrack}/{breakdown.tasksTotal}</div>
          <div className="text-xs text-zinc-500">Tasks On Track</div>
        </div>
        <div className="bg-zinc-900/50 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-green-400">{breakdown.dealsActive}</div>
          <div className="text-xs text-zinc-500">Active Deals</div>
        </div>
        <div className="bg-zinc-900/50 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-orange-400">{streak.current}🔥</div>
          <div className="text-xs text-zinc-500">Focus Streak</div>
        </div>
      </div>

      {/* Next Action / Start Focus */}
      {nextAction ? (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-violet-400 uppercase tracking-wider mb-1">
                🧠 Pulse Recommends
              </div>
              <div className="font-medium text-white truncate">{nextAction.task.title}</div>
              <div className="text-sm text-zinc-400 mt-1">{nextAction.reasoning}</div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  nextAction.energyRequired === 'high' ? 'bg-red-500/20 text-red-400' :
                  nextAction.energyRequired === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-green-500/20 text-green-400'
                }`}>
                  {nextAction.energyRequired} energy
                </span>
                <span className="text-xs text-zinc-500">
                  Impact: {nextAction.impactScore}/10
                </span>
              </div>
            </div>
            <button
              onClick={() => startFocusMode(nextAction.task)}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
            >
              Start Focus →
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 text-zinc-500">
          <div className="text-3xl mb-2">🎉</div>
          <p>All caught up! No tasks to focus on.</p>
        </div>
      )}

      {/* Quick Task List */}
      {tasks.length > 0 && (
        <div className="mt-4">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">Other tasks to focus on:</div>
          <div className="flex flex-wrap gap-2">
            {tasks.slice(0, 5).map(task => (
              <button
                key={task.id}
                onClick={() => startFocusMode(task)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:text-white transition-colors truncate max-w-[200px]"
              >
                {task.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
