"use client";

import { useState } from 'react';
import { 
  SingleFocusMode,
  AttentionRescue,
  AttentionNudge,
  StreakCounter,
  StreakDisplay,
  MicroTaskProgress,
  StepIndicator,
  PulseScore,
  PulseScoreBadge,
  NextBestAction,
  NextActionInline,
  JustOneThing,
  OverwhelmHelper,
} from '@/components/pulse';

// Demo data
const demoTask = {
  id: 'task-1',
  title: 'Write Q4 planning document',
  project: 'Strategic Planning',
  estimatedMinutes: 45,
};

const demoMicroTasks = [
  { id: 'micro-1', title: 'Open doc and review outline', estimatedMinutes: 2, completed: true, dopamineReward: '🎯 Started!' },
  { id: 'micro-2', title: 'Write executive summary', estimatedMinutes: 10, completed: true, dopamineReward: '✍️ Nice!' },
  { id: 'micro-3', title: 'Fill in Q3 review section', estimatedMinutes: 15, completed: false, dopamineReward: '📊 Progress!' },
  { id: 'micro-4', title: 'Draft Q4 goals', estimatedMinutes: 12, completed: false, dopamineReward: '🎯 Goals set!' },
  { id: 'micro-5', title: 'Review and finalize', estimatedMinutes: 6, completed: false, dopamineReward: '🎉 DONE!' },
];

export default function PulseDemoPage() {
  // State for interactive demos
  const [showFocusMode, setShowFocusMode] = useState(false);
  const [showAttentionRescue, setShowAttentionRescue] = useState(false);
  const [showNudge, setShowNudge] = useState(false);
  const [streakCount, setStreakCount] = useState(3);
  const [microTasks, setMicroTasks] = useState(demoMicroTasks);
  const [currentMicroIndex, setCurrentMicroIndex] = useState(2);

  const handleMicroComplete = (id: string) => {
    setMicroTasks(prev => prev.map(t => 
      t.id === id ? { ...t, completed: true } : t
    ));
    setCurrentMicroIndex(prev => Math.min(prev + 1, demoMicroTasks.length - 1));
    setStreakCount(s => s + 1);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Pulse UI Components</h1>
        <p className="text-zinc-500 mb-8">ADHD-optimized interface components</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pulse Score */}
          <section>
            <h2 className="text-lg font-semibold mb-4 text-violet-400">Pulse Score</h2>
            <PulseScore
              score={73}
              breakdown={{
                tasksOnTrack: 8,
                tasksTotal: 12,
                dealsActive: 5,
                dealsStale: 2,
                followUpsOnTime: 6,
                followUpsOverdue: 1,
              }}
              previousScore={68}
            />
            <div className="mt-4 flex items-center gap-4">
              <span className="text-sm text-zinc-500">Badge version:</span>
              <PulseScoreBadge score={73} />
            </div>
          </section>

          {/* Streak Counter */}
          <section>
            <h2 className="text-lg font-semibold mb-4 text-orange-400">Streak Counter</h2>
            <StreakDisplay
              currentStreak={streakCount}
              bestStreak={12}
              todayCompleted={streakCount}
              weekHistory={[3, 5, 2, 4, streakCount, 0, 0]}
            />
            <div className="mt-4 flex items-center gap-4">
              <span className="text-sm text-zinc-500">Sizes:</span>
              <StreakCounter count={streakCount} size="sm" />
              <StreakCounter count={streakCount} size="md" />
              <StreakCounter count={streakCount} size="lg" />
            </div>
            <button 
              onClick={() => setStreakCount(s => s + 1)}
              className="mt-2 px-3 py-1 bg-zinc-800 rounded text-sm"
            >
              +1 Streak
            </button>
          </section>

          {/* Next Best Action */}
          <section>
            <h2 className="text-lg font-semibold mb-4 text-violet-400">Next Best Action</h2>
            <NextBestAction
              action="Review the Harrison loan application"
              reasoning="High priority, due soon, and you're in your peak energy time"
              estimatedTime={20}
              energyRequired="medium"
              impactScore={8}
              alternatives={[
                { action: 'Call back Marcus Chen', reason: 'Waiting 2 days' },
                { action: 'Update CRM notes', reason: 'Quick win' },
              ]}
              onStart={() => setShowFocusMode(true)}
              onSkip={() => {}}
            />
            <div className="mt-4">
              <span className="text-sm text-zinc-500 block mb-2">Inline version:</span>
              <NextActionInline
                action="Review the Harrison loan application"
                estimatedTime={20}
                onStart={() => setShowFocusMode(true)}
              />
            </div>
          </section>

          {/* Just One Thing */}
          <section>
            <h2 className="text-lg font-semibold mb-4 text-violet-400">Just One Thing</h2>
            <JustOneThing
              task={demoTask}
              hiddenCount={11}
              bodyDoubleMessage="I'm right here with you. Let's do this together."
              onStart={() => setShowFocusMode(true)}
              onSkip={() => {}}
              onShowAll={() => {}}
            />
          </section>

          {/* Micro Task Progress */}
          <section>
            <h2 className="text-lg font-semibold mb-4 text-fuchsia-400">Micro-Task Progress</h2>
            <MicroTaskProgress
              parentTaskTitle={demoTask.title}
              microTasks={microTasks}
              currentIndex={currentMicroIndex}
              onComplete={handleMicroComplete}
              onSkip={() => setCurrentMicroIndex(i => Math.min(i + 1, microTasks.length - 1))}
            />
            <div className="mt-4">
              <span className="text-sm text-zinc-500 block mb-2">Compact version:</span>
              <MicroTaskProgress
                parentTaskTitle={demoTask.title}
                microTasks={microTasks}
                currentIndex={currentMicroIndex}
                onComplete={handleMicroComplete}
                onSkip={() => {}}
                compact
              />
            </div>
            <div className="mt-4 flex items-center gap-4">
              <span className="text-sm text-zinc-500">Step indicator:</span>
              <StepIndicator 
                total={5} 
                current={currentMicroIndex} 
                completed={microTasks.filter(t => t.completed).length} 
              />
            </div>
          </section>

          {/* Overwhelm Helper */}
          <section>
            <h2 className="text-lg font-semibold mb-4 text-red-400">Overwhelm Helper</h2>
            <OverwhelmHelper
              taskCount={23}
              onJustOneThing={() => {}}
              onBrainDump={() => {}}
              onTakeBreak={() => {}}
              onTalkItOut={() => {}}
            />
          </section>
        </div>

        {/* Interactive Demos */}
        <div className="mt-12 border-t border-zinc-800 pt-8">
          <h2 className="text-xl font-bold mb-4">Interactive Demos</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setShowFocusMode(true)}
              className="px-4 py-2 bg-violet-600 rounded-lg"
            >
              Open Focus Mode
            </button>
            <button
              onClick={() => setShowAttentionRescue(true)}
              className="px-4 py-2 bg-amber-600 rounded-lg"
            >
              Show Attention Rescue
            </button>
            <button
              onClick={() => setShowNudge(true)}
              className="px-4 py-2 bg-zinc-700 rounded-lg"
            >
              Show Nudge
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showFocusMode && (
        <SingleFocusMode
          task={demoTask}
          microTasks={microTasks}
          durationMinutes={25}
          bodyDoubleMessage="I'm right here with you. Let's crush this together."
          onComplete={(completed) => {
            setShowFocusMode(false);
            if (completed) setStreakCount(s => s + 1);
          }}
          onMicroTaskComplete={handleMicroComplete}
          onExit={() => setShowFocusMode(false)}
        />
      )}

      {showAttentionRescue && (
        <AttentionRescue
          isOpen={true}
          currentTask={demoTask.title}
          distractionLevel={6}
          sessionMinutes={12}
          onResume={() => setShowAttentionRescue(false)}
          onTakeBreak={() => setShowAttentionRescue(false)}
          onSwitchTask={() => setShowAttentionRescue(false)}
          onDismiss={() => setShowAttentionRescue(false)}
        />
      )}

      {showNudge && (
        <AttentionNudge
          message="Hey, gently bringing you back. You were working on the Q4 planning doc."
          onDismiss={() => setShowNudge(false)}
          onAction={() => setShowNudge(false)}
          actionLabel="Back to it"
        />
      )}
    </main>
  );
}
