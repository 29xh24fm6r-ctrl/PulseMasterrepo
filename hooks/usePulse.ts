"use client";
import { useState, useEffect, useCallback, useRef } from 'react';

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
  isGeneratingMicroTasks: boolean;
}

// ============================================
// CACHING LAYER - 60 second TTL
// ============================================
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 60 * 1000; // 60 seconds
const cache: Map<string, CacheEntry<any>> = new Map();

async function cachedFetch<T>(url: string, fallback: T): Promise<T> {
  const now = Date.now();
  const cached = cache.get(url);
  
  // Return cached data if still fresh
  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    console.log(`📦 Cache HIT: ${url}`);
    return cached.data;
  }
  
  console.log(`🌐 Cache MISS: ${url}`);
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    // Store in cache
    cache.set(url, { data, timestamp: now });
    
    return data;
  } catch (err) {
    console.error(`Failed to fetch ${url}:`, err);
    return fallback;
  }
}

// Force refresh a specific endpoint
function invalidateCache(url?: string) {
  if (url) {
    cache.delete(url);
  } else {
    cache.clear();
  }
}

// ============================================
// CONSTANTS
// ============================================
const REWARDS = ['🎉', '⭐', '🔥', '💪', '🚀', '✨', '🌟', '💎', '👏'];
const BODY_DOUBLES = [
  "I'm right here with you. Let's do this together.",
  "One step at a time. You've got this.",
  "Just focus on this one thing. Nothing else matters right now.",
  "You're not alone. Let's knock this out.",
  "Small progress is still progress. Let's go.",
];

// Fallback micro-tasks if AI fails
const FALLBACK_MICRO_TASKS: MicroTask[] = [
  { id: '1', title: 'Open and review what needs to be done', estimatedMinutes: 2, completed: false, dopamineReward: '⭐' },
  { id: '2', title: 'Identify the very first small step', estimatedMinutes: 3, completed: false, dopamineReward: '🔥' },
  { id: '3', title: 'Complete that first step', estimatedMinutes: 10, completed: false, dopamineReward: '💪' },
  { id: '4', title: 'Check progress and plan next move', estimatedMinutes: 5, completed: false, dopamineReward: '🚀' },
  { id: '5', title: 'Final push - finish strong!', estimatedMinutes: 5, completed: false, dopamineReward: '🏆' },
];

// ============================================
// HOOK
// ============================================
export function usePulse() {
  const [state, setState] = useState<PulseState>({
    score: 0, previousScore: 0,
    breakdown: { tasksOnTrack: 0, tasksTotal: 0, dealsActive: 0, dealsStale: 0, followUpsOnTime: 0, followUpsOverdue: 0 },
    streak: { current: 0, best: 0, today: 0, weekHistory: [] },
    nextAction: null, tasks: [], focusTask: null, microTasks: [], isLoading: true, isFocusMode: false, isGeneratingMicroTasks: false
  });
  
  const fetchInProgress = useRef(false);

  const fetchPulseData = useCallback(async (forceRefresh = false) => {
    // Prevent concurrent fetches
    if (fetchInProgress.current) {
      console.log('⏳ Fetch already in progress, skipping...');
      return;
    }
    
    fetchInProgress.current = true;
    
    // Invalidate cache if force refresh
    if (forceRefresh) {
      invalidateCache();
    }

    try {
      // Use cached fetch for all endpoints
      const [tasksRes, dealsRes, notifsRes] = await Promise.all([
        cachedFetch('/api/tasks/pull', { tasks: [] }),
        cachedFetch('/api/deals/pull', { deals: [] }),
        cachedFetch('/api/notifications', { items: [] })
      ]);

      const tasks: Task[] = (tasksRes.tasks || []).map((t: any) => ({
        id: t.id, title: t.name || t.title, status: t.status, priority: t.priority,
        project: t.project, estimatedMinutes: t.estimatedMinutes || 25, dueDate: t.dueDate
      }));
      const deals: Deal[] = (dealsRes.deals || []).map((d: any) => ({
        id: d.id, name: d.name, stage: d.stage, lastActivity: d.lastEdited
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
    } finally {
      fetchInProgress.current = false;
    }
  }, []);

  useEffect(() => { fetchPulseData(); }, [fetchPulseData]);

  // ============================================
  // AI-POWERED FOCUS MODE
  // ============================================
  const startFocusMode = useCallback(async (task: Task) => {
    // Set focus mode immediately with loading state
    setState(prev => ({ 
      ...prev, 
      focusTask: task, 
      microTasks: [], 
      isFocusMode: true, 
      isGeneratingMicroTasks: true 
    }));

    try {
      // Call AI to generate task-specific micro-tasks
      const res = await fetch('/api/pulse/micro-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task })
      });

      if (!res.ok) throw new Error('Failed to generate micro-tasks');
      
      const { microTasks } = await res.json();
      
      setState(prev => ({ 
        ...prev, 
        microTasks, 
        isGeneratingMicroTasks: false 
      }));
      
      console.log('🧠 AI generated micro-tasks for:', task.title);
      
    } catch (err) {
      console.error('AI micro-task generation failed, using fallback:', err);
      
      // Use fallback tasks with random rewards
      const fallbackWithRewards = FALLBACK_MICRO_TASKS.map((mt, i) => ({
        ...mt,
        dopamineReward: i === FALLBACK_MICRO_TASKS.length - 1 ? '🏆' : REWARDS[Math.floor(Math.random() * REWARDS.length)]
      }));
      
      setState(prev => ({ 
        ...prev, 
        microTasks: fallbackWithRewards, 
        isGeneratingMicroTasks: false 
      }));
    }
  }, []);

  const exitFocusMode = useCallback(() => {
    setState(prev => ({ ...prev, isFocusMode: false, focusTask: null, microTasks: [], isGeneratingMicroTasks: false }));
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
    // Force refresh data after completing
    invalidateCache();
    fetchPulseData(true);
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

  // Force refresh function for manual refresh button
  const forceRefresh = useCallback(() => {
    invalidateCache();
    fetchPulseData(true);
  }, [fetchPulseData]);

  return { 
    ...state, 
    fetchPulseData, 
    forceRefresh,
    startFocusMode, 
    exitFocusMode, 
    completeMicroTask, 
    completeFocusSession, 
    incrementStreak, 
    getBodyDoubleMessage 
  };
}