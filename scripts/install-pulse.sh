#!/bin/bash
# Pulse Dashboard Integration Script

echo "🚀 Installing Pulse Dashboard Integration..."

# Create hooks directory if needed
mkdir -p hooks
mkdir -p components

# Check if pulse components exist
if [ ! -d "components/pulse" ]; then
  echo "❌ Error: components/pulse not found. Install Pulse UI components first."
  exit 1
fi

echo "✓ Pulse components found"

# Create usePulse hook
cat > hooks/usePulse.ts << 'HOOK_EOF'
"use client";
import { useState, useEffect, useCallback } from 'react';

interface Task { id: string; title: string; status: string; priority?: string; project?: string; estimatedMinutes?: number; dueDate?: string; }
interface Deal { id: string; name: string; stage: string; lastActivity?: string; }
interface MicroTask { id: string; title: string; estimatedMinutes: number; completed: boolean; dopamineReward: string; }

interface PulseState {
  score: number;
  previousScore: number;
  breakdown: { tasksOnTrack: number; tasksTotal: number; dealsActive: number; dealsStale: number; followUpsOnTime: number; followUpsOverdue: number };
  streak: { current: number; best: number; today: number; weekHistory: number[] };
  nextAction: { task: Task; reasoning: string; energyRequired: 'low' | 'medium' | 'high'; impactScore: number } | null;
  tasks: Task[];
  focusTask: Task | null;
  microTasks: MicroTask[];
  isLoading: boolean;
  isFocusMode: boolean;
}

const REWARDS = ['🎉', '⭐', '🔥', '💪', '🚀', '✨', '🌟', '💎', '🏆', '👏'];
const BODY_DOUBLES = [
  "I'm right here with you. Let's do this together.",
  "One step at a time. You've got this.",
  "Just focus on this one thing. Nothing else matters right now.",
  "You're not alone. Let's knock this out.",
  "Small progress is still progress. Let's go.",
];

export function usePulse() {
  const [state, setState] = useState<PulseState>({
    score: 0, previousScore: 0,
    breakdown: { tasksOnTrack: 0, tasksTotal: 0, dealsActive: 0, dealsStale: 0, followUpsOnTime: 0, followUpsOverdue: 0 },
    streak: { current: 0, best: 0, today: 0, weekHistory: [] },
    nextAction: null, tasks: [], focusTask: null, microTasks: [], isLoading: true, isFocusMode: false
  });

  const fetchPulseData = useCallback(async () => {
    try {
      const [tasksRes, dealsRes, notifsRes] = await Promise.all([
        fetch('/api/tasks').then(r => r.json()).catch(() => ({ tasks: [] })),
        fetch('/api/deals').then(r => r.json()).catch(() => ({ deals: [] })),
        fetch('/api/notifications').then(r => r.json()).catch(() => ({ items: [] }))
      ]);

      const tasks: Task[] = (tasksRes.tasks || []).map((t: any) => ({
        id: t.id, title: t.title, status: t.status, priority: t.priority,
        project: t.project, estimatedMinutes: t.estimatedMinutes || 25, dueDate: t.dueDate
      }));
      const deals: Deal[] = (dealsRes.deals || []).map((d: any) => ({
        id: d.id, name: d.name, stage: d.stage, lastActivity: d.lastActivity
      }));
      const followUps = notifsRes.items || [];

      const incompleteTasks = tasks.filter(t => t.status !== 'Done' && t.status !== 'Completed');
      const overdueTasks = incompleteTasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date());
      const tasksOnTrack = incompleteTasks.length - overdueTasks.length;

      const now = new Date();
      const staleDeals = deals.filter(d => {
        if (!d.lastActivity) return true;
        return (now.getTime() - new Date(d.lastActivity).getTime()) / (1000 * 60 * 60 * 24) > 7;
      });

      const overdueFollowUps = followUps.filter((f: any) => f.isOverdue).length;

      let score = 100;
      if (incompleteTasks.length > 0) score -= (overdueTasks.length / incompleteTasks.length) * 30;
      if (deals.length > 0) score -= (staleDeals.length / deals.length) * 30;
      if (followUps.length > 0) score -= (overdueFollowUps / followUps.length) * 20;
      if (incompleteTasks.length > 10) score -= 10;
      score = Math.max(0, Math.min(100, Math.round(score)));

      const storedStreak = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('pulseStreak') || '{"current":0,"best":0,"today":0,"weekHistory":[0,0,0,0,0,0,0]}')
        : { current: 0, best: 0, today: 0, weekHistory: [0,0,0,0,0,0,0] };

      const priorityOrder = ['High', 'Medium', 'Low'];
      const sortedTasks = [...incompleteTasks].sort((a, b) => {
        const pA = priorityOrder.indexOf(a.priority || 'Low');
        const pB = priorityOrder.indexOf(b.priority || 'Low');
        if (pA !== pB) return pA - pB;
        if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        return 0;
      });

      const topTask = sortedTasks[0];
      const nextAction = topTask ? {
        task: topTask,
        reasoning: topTask.priority === 'High' ? 'High priority, needs attention' : topTask.dueDate ? 'Due soon' : 'Next in queue',
        energyRequired: (topTask.priority === 'High' ? 'high' : topTask.priority === 'Medium' ? 'medium' : 'low') as 'low' | 'medium' | 'high',
        impactScore: topTask.priority === 'High' ? 9 : topTask.priority === 'Medium' ? 6 : 4
      } : null;

      setState(prev => ({
        ...prev, score, previousScore: prev.score || score,
        breakdown: { tasksOnTrack, tasksTotal: incompleteTasks.length, dealsActive: deals.length - staleDeals.length, dealsStale: staleDeals.length, followUpsOnTime: followUps.length - overdueFollowUps, followUpsOverdue: overdueFollowUps },
        streak: storedStreak, nextAction, tasks: incompleteTasks, isLoading: false
      }));
    } catch (err) {
      console.error('Failed to fetch pulse data:', err);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => { fetchPulseData(); }, [fetchPulseData]);

  const startFocusMode = useCallback((task: Task) => {
    const micros: MicroTask[] = [
      { id: '1', title: 'Open and review the task', estimatedMinutes: 2, completed: false, dopamineReward: REWARDS[Math.floor(Math.random() * REWARDS.length)] },
      { id: '2', title: 'Identify the first small step', estimatedMinutes: 3, completed: false, dopamineReward: REWARDS[Math.floor(Math.random() * REWARDS.length)] },
      { id: '3', title: 'Complete first step', estimatedMinutes: 10, completed: false, dopamineReward: REWARDS[Math.floor(Math.random() * REWARDS.length)] },
      { id: '4', title: 'Review progress, plan next', estimatedMinutes: 5, completed: false, dopamineReward: REWARDS[Math.floor(Math.random() * REWARDS.length)] },
      { id: '5', title: 'Final push - wrap it up', estimatedMinutes: 5, completed: false, dopamineReward: '🏆' },
    ];
    setState(prev => ({ ...prev, focusTask: task, microTasks: micros, isFocusMode: true }));
  }, []);

  const exitFocusMode = useCallback(() => {
    setState(prev => ({ ...prev, isFocusMode: false, focusTask: null, microTasks: [] }));
  }, []);

  const completeMicroTask = useCallback((id: string) => {
    setState(prev => ({ ...prev, microTasks: prev.microTasks.map(t => t.id === id ? { ...t, completed: true } : t) }));
  }, []);

  const completeFocusSession = useCallback((completed: boolean) => {
    if (completed && typeof window !== 'undefined') {
      const stored = JSON.parse(localStorage.getItem('pulseStreak') || '{"current":0,"best":0,"today":0,"weekHistory":[0,0,0,0,0,0,0]}');
      stored.current += 1;
      stored.today += 1;
      stored.best = Math.max(stored.best, stored.current);
      const dayOfWeek = new Date().getDay();
      const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      stored.weekHistory[adjustedDay] = (stored.weekHistory[adjustedDay] || 0) + 1;
      localStorage.setItem('pulseStreak', JSON.stringify(stored));
      setState(prev => ({ ...prev, streak: stored }));
    }
    exitFocusMode();
    fetchPulseData();
  }, [exitFocusMode, fetchPulseData]);

  const incrementStreak = useCallback(() => {
    if (typeof window === 'undefined') return;
    const stored = JSON.parse(localStorage.getItem('pulseStreak') || '{"current":0,"best":0,"today":0,"weekHistory":[0,0,0,0,0,0,0]}');
    stored.current += 1;
    stored.today += 1;
    stored.best = Math.max(stored.best, stored.current);
    const dayOfWeek = new Date().getDay();
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    stored.weekHistory[adjustedDay] = (stored.weekHistory[adjustedDay] || 0) + 1;
    localStorage.setItem('pulseStreak', JSON.stringify(stored));
    setState(prev => ({ ...prev, streak: stored }));
  }, []);

  const getBodyDoubleMessage = useCallback(() => BODY_DOUBLES[Math.floor(Math.random() * BODY_DOUBLES.length)], []);

  return { ...state, fetchPulseData, startFocusMode, exitFocusMode, completeMicroTask, completeFocusSession, incrementStreak, getBodyDoubleMessage };
}
HOOK_EOF

echo "✓ Created hooks/usePulse.ts"

# Create PulseDashboard component
cat > components/PulseDashboard.tsx << 'DASHBOARD_EOF'
"use client";
import { usePulse } from '@/hooks/usePulse';
import { PulseScore } from './pulse/PulseScore';
import { StreakDisplay } from './pulse/StreakCounter';
import { NextBestAction, NextActionInline } from './pulse/NextBestAction';
import { JustOneThing } from './pulse/JustOneThing';
import { SingleFocusMode } from './pulse/SingleFocusMode';
import { Loader2 } from 'lucide-react';

interface PulseDashboardProps {
  variant?: 'full' | 'compact' | 'minimal';
}

export function PulseDashboard({ variant = 'full' }: PulseDashboardProps) {
  const {
    score, previousScore, breakdown, streak, nextAction, tasks, focusTask, microTasks,
    isLoading, isFocusMode, startFocusMode, exitFocusMode, completeMicroTask,
    completeFocusSession, getBodyDoubleMessage
  } = usePulse();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
        <span className="ml-2 text-zinc-400">Loading Pulse...</span>
      </div>
    );
  }

  if (isFocusMode && focusTask) {
    return (
      <SingleFocusMode
        task={{ id: focusTask.id, title: focusTask.title, project: focusTask.project }}
        microTasks={microTasks}
        durationMinutes={25}
        bodyDoubleMessage={getBodyDoubleMessage()}
        onComplete={completeFocusSession}
        onMicroTaskComplete={completeMicroTask}
        onExit={exitFocusMode}
      />
    );
  }

  if (variant === 'minimal' && nextAction) {
    return (
      <NextActionInline
        action={nextAction.task.title}
        estimatedTime={nextAction.task.estimatedMinutes || 25}
        onStart={() => startFocusMode(nextAction.task)}
      />
    );
  }

  if (variant === 'compact') {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <PulseScore score={score} breakdown={breakdown} previousScore={previousScore} showDetails={false} />
          {nextAction && (
            <NextActionInline
              action={nextAction.task.title}
              estimatedTime={nextAction.task.estimatedMinutes || 25}
              onStart={() => startFocusMode(nextAction.task)}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PulseScore score={score} breakdown={breakdown} previousScore={previousScore} />
        <StreakDisplay
          currentStreak={streak.current}
          bestStreak={streak.best}
          todayCompleted={streak.today}
          weekHistory={streak.weekHistory}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {nextAction ? (
          <NextBestAction
            action={nextAction.task.title}
            reasoning={nextAction.reasoning}
            estimatedTime={nextAction.task.estimatedMinutes || 25}
            energyRequired={nextAction.energyRequired}
            impactScore={nextAction.impactScore}
            alternatives={tasks.slice(1, 4).map(t => ({ action: t.title, reason: t.priority || 'In queue' }))}
            onStart={() => startFocusMode(nextAction.task)}
            onSkip={() => {}}
          />
        ) : (
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 flex items-center justify-center">
            <p className="text-zinc-500">No pending tasks</p>
          </div>
        )}
        <JustOneThing
          task={nextAction ? { id: nextAction.task.id, title: nextAction.task.title, project: nextAction.task.project, estimatedMinutes: nextAction.task.estimatedMinutes } : null}
          hiddenCount={Math.max(0, tasks.length - 1)}
          bodyDoubleMessage={getBodyDoubleMessage()}
          onStart={() => nextAction && startFocusMode(nextAction.task)}
          onSkip={() => {}}
          onShowAll={() => {}}
        />
      </div>
    </div>
  );
}
DASHBOARD_EOF

echo "✓ Created components/PulseDashboard.tsx"

echo ""
echo "✅ Pulse Dashboard Integration Complete!"
echo ""
echo "To add to your main page, add this import and component:"
echo ""
echo "  import { PulseDashboard } from '@/components/PulseDashboard';"
echo ""
echo "  // In your JSX:"
echo "  <PulseDashboard />           // Full dashboard"
echo "  <PulseDashboard variant='compact' />  // Compact"
echo "  <PulseDashboard variant='minimal' />  // Just next action"
echo ""
