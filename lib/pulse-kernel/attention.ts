// Pulse Kernel: Attention Management Layer
// Optimized for ADHD: micro-tasks, momentum streaks, focus rescue, one priority at a time
// Updated: AI-powered micro-task generation

import {
  AttentionState,
  AttentionBlocker,
  MicroTask,
  FocusPrompt,
  NextBestAction,
  UserProfile,
  ContextWindow,
  Memory,
} from './types';

interface Task {
  id: string;
  title: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedMinutes?: number;
  dueDate?: Date;
  project?: string;
  complexity?: 'simple' | 'moderate' | 'complex';
  energyRequired?: 'low' | 'medium' | 'high';
  status: string;
}

interface AttentionSession {
  startTime: Date;
  taskId: string;
  taskTitle: string;
  targetDuration: number; // minutes
  actualDuration: number;
  distractions: { time: Date; duration: number }[];
  completed: boolean;
}

// State management
let currentSession: AttentionSession | null = null;
let streakCount = 0;
let lastCompletionTime: Date | null = null;

/**
 * ATTENTION MANAGER
 * Central controller for focus, distractions, and task management
 */
export const attentionManager = {
  /**
   * Get current attention state
   */
  getState(userProfile: UserProfile, context: ContextWindow): AttentionState {
    const blockers = this.detectBlockers(userProfile, context);
    const suggestedMode = this.suggestMode(userProfile, context, blockers);
    
    return {
      currentFocus: currentSession?.taskTitle || null,
      focusScore: this.calculateFocusScore(currentSession),
      distractionLevel: this.calculateDistractionLevel(currentSession, context),
      sessionDuration: currentSession 
        ? Math.floor((Date.now() - currentSession.startTime.getTime()) / 60000)
        : 0,
      streakCount,
      lastBreak: null, // TODO: track from memory
      suggestedMode,
      blockers,
    };
  },

  /**
   * Detect what's blocking attention
   */
  detectBlockers(userProfile: UserProfile, context: ContextWindow): AttentionBlocker[] {
    const blockers: AttentionBlocker[] = [];
    
    // Check energy level
    if (userProfile.emotionalBaseline.currentEnergyLevel < 3) {
      blockers.push({
        type: 'energy_low',
        severity: 8,
        suggestedIntervention: 'Take a 10-minute walk or grab a snack. Your brain needs fuel.',
      });
    }
    
    // Check stress level
    if (userProfile.emotionalBaseline.currentStressLevel > 7) {
      blockers.push({
        type: 'anxiety',
        severity: userProfile.emotionalBaseline.currentStressLevel,
        suggestedIntervention: 'Let\'s pause and prioritize. What\'s the ONE thing that matters most right now?',
      });
    }
    
    // Check for meeting context
    if (context.environmentalFactors.isInMeeting) {
      blockers.push({
        type: 'distraction',
        severity: 5,
        suggestedIntervention: 'You\'re in a meeting. I\'ll hold non-urgent items until you\'re done.',
      });
    }
    
    return blockers;
  },

  /**
   * Suggest the best mode for current state
   */
  suggestMode(
    userProfile: UserProfile, 
    context: ContextWindow,
    blockers: AttentionBlocker[]
  ): 'deep_focus' | 'light_work' | 'break' | 'wind_down' {
    if (blockers.some(b => b.type === 'energy_low' && b.severity > 7)) {
      return 'break';
    }
    
    if (context.environmentalFactors.timeOfDay === 'evening' || 
        context.environmentalFactors.timeOfDay === 'night') {
      return 'wind_down';
    }
    
    const currentHour = new Date().getHours().toString().padStart(2, '0') + ':00';
    if (userProfile.preferences.peakEnergyTimes?.includes(currentHour)) {
      return 'deep_focus';
    }
    
    return 'light_work';
  },

  /**
   * Calculate focus score (0-100)
   */
  calculateFocusScore(session: AttentionSession | null): number {
    if (!session) return 0;
    
    const totalDistractionTime = session.distractions.reduce((sum, d) => sum + d.duration, 0);
    const focusedTime = session.actualDuration - totalDistractionTime;
    
    if (session.actualDuration === 0) return 100;
    return Math.round((focusedTime / session.actualDuration) * 100);
  },

  /**
   * Calculate distraction level (0-10)
   */
  calculateDistractionLevel(session: AttentionSession | null, context: ContextWindow): number {
    if (!session) return 0;
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentDistractions = session.distractions.filter(d => d.time > fiveMinutesAgo);
    
    return Math.min(10, recentDistractions.length * 2);
  },

  /**
   * Start a focus session
   */
  startSession(task: Task, targetMinutes: number = 25): AttentionSession {
    currentSession = {
      startTime: new Date(),
      taskId: task.id,
      taskTitle: task.title,
      targetDuration: targetMinutes,
      actualDuration: 0,
      distractions: [],
      completed: false,
    };
    
    return currentSession;
  },

  /**
   * End current session
   */
  endSession(completed: boolean): AttentionSession | null {
    if (!currentSession) return null;
    
    currentSession.completed = completed;
    currentSession.actualDuration = Math.floor(
      (Date.now() - currentSession.startTime.getTime()) / 60000
    );
    
    if (completed) {
      const now = new Date();
      if (lastCompletionTime) {
        const hoursSinceLastCompletion = 
          (now.getTime() - lastCompletionTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceLastCompletion < 2) {
          streakCount++;
        } else {
          streakCount = 1;
        }
      } else {
        streakCount = 1;
      }
      lastCompletionTime = now;
    }
    
    const session = currentSession;
    currentSession = null;
    return session;
  },

  /**
   * Record a distraction
   */
  recordDistraction(durationSeconds: number) {
    if (currentSession) {
      currentSession.distractions.push({
        time: new Date(),
        duration: durationSeconds / 60,
      });
    }
  },

  /**
   * Get current streak count
   */
  getStreakCount(): number {
    return streakCount;
  },
};

/**
 * AI MICRO-TASK GENERATOR
 * Calls the AI endpoint to generate task-specific micro-tasks
 */
export async function generateAIMicroTasks(task: Task): Promise<MicroTask[]> {
  try {
    const res = await fetch('/api/pulse/micro-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task }),
    });

    if (!res.ok) {
      throw new Error(`AI micro-tasks API failed: ${res.status}`);
    }

    const { microTasks } = await res.json();
    
    // Ensure proper structure with parentTaskId
    return microTasks.map((mt: any, index: number) => ({
      id: mt.id || `${task.id}-${index + 1}`,
      parentTaskId: task.id,
      title: mt.title,
      estimatedMinutes: mt.estimatedMinutes || 5,
      order: index + 1,
      completed: mt.completed || false,
      dopamineReward: mt.dopamineReward || '✓',
    }));
  } catch (error) {
    console.error('AI micro-task generation failed, using fallback:', error);
    // Fall back to template-based generation
    return generateMicroTasks(task, {} as UserProfile);
  }
}

/**
 * MICRO-TASK GENERATOR (Template-based fallback)
 * Breaks complex tasks into tiny, dopamine-friendly chunks
 */
export function generateMicroTasks(task: Task, userProfile: UserProfile): MicroTask[] {
  const microTasks: MicroTask[] = [];
  const complexity = task.complexity || 'moderate';
  
  if (complexity === 'simple') {
    microTasks.push({
      id: `${task.id}-1`,
      parentTaskId: task.id,
      title: `Start: Open/prepare for "${task.title}"`,
      estimatedMinutes: 2,
      order: 1,
      completed: false,
      dopamineReward: '🎯 Started!',
    });
    microTasks.push({
      id: `${task.id}-2`,
      parentTaskId: task.id,
      title: `Do: Complete "${task.title}"`,
      estimatedMinutes: (task.estimatedMinutes || 15) - 4,
      order: 2,
      completed: false,
      dopamineReward: '✅ Done!',
    });
    microTasks.push({
      id: `${task.id}-3`,
      parentTaskId: task.id,
      title: `Close: Review and mark complete`,
      estimatedMinutes: 2,
      order: 3,
      completed: false,
      dopamineReward: '🎉 Complete!',
    });
  } else if (complexity === 'moderate') {
    microTasks.push(
      {
        id: `${task.id}-1`,
        parentTaskId: task.id,
        title: `Prep: Gather what you need for "${task.title}"`,
        estimatedMinutes: 3,
        order: 1,
        completed: false,
        dopamineReward: '📋 Ready to go!',
      },
      {
        id: `${task.id}-2`,
        parentTaskId: task.id,
        title: `Start: First pass / rough draft`,
        estimatedMinutes: Math.floor((task.estimatedMinutes || 30) * 0.3),
        order: 2,
        completed: false,
        dopamineReward: '🚀 Momentum!',
      },
      {
        id: `${task.id}-3`,
        parentTaskId: task.id,
        title: `Core: Main work on "${task.title}"`,
        estimatedMinutes: Math.floor((task.estimatedMinutes || 30) * 0.4),
        order: 3,
        completed: false,
        dopamineReward: '💪 Crushing it!',
      },
      {
        id: `${task.id}-4`,
        parentTaskId: task.id,
        title: `Polish: Review and refine`,
        estimatedMinutes: Math.floor((task.estimatedMinutes || 30) * 0.2),
        order: 4,
        completed: false,
        dopamineReward: '✨ Looking good!',
      },
      {
        id: `${task.id}-5`,
        parentTaskId: task.id,
        title: `Close: Finalize and mark done`,
        estimatedMinutes: 2,
        order: 5,
        completed: false,
        dopamineReward: '🎉 DONE!',
      }
    );
  } else {
    const phases = [
      { name: 'Understand', percent: 0.1, reward: '🧠 Got it!' },
      { name: 'Plan', percent: 0.1, reward: '📋 Mapped out!' },
      { name: 'Setup', percent: 0.1, reward: '🔧 Ready!' },
      { name: 'Execute Part 1', percent: 0.2, reward: '🚀 Progress!' },
      { name: 'Execute Part 2', percent: 0.2, reward: '💪 Halfway!' },
      { name: 'Execute Part 3', percent: 0.15, reward: '🔥 Almost!' },
      { name: 'Review', percent: 0.1, reward: '✨ Polished!' },
      { name: 'Complete', percent: 0.05, reward: '🎉 CRUSHED IT!' },
    ];
    
    phases.forEach((phase, i) => {
      microTasks.push({
        id: `${task.id}-${i + 1}`,
        parentTaskId: task.id,
        title: `${phase.name}: ${task.title}`,
        estimatedMinutes: Math.max(5, Math.floor((task.estimatedMinutes || 60) * phase.percent)),
        order: i + 1,
        completed: false,
        dopamineReward: phase.reward,
      });
    });
  }
  
  return microTasks;
}

/**
 * FOCUS PROMPT GENERATOR
 */
export function generateFocusPrompt(
  type: FocusPrompt['type'],
  context: {
    taskTitle?: string;
    streakCount?: number;
    sessionMinutes?: number;
    userEnergy?: number;
  }
): FocusPrompt {
  switch (type) {
    case 'start':
      return {
        type: 'start',
        message: context.taskTitle 
          ? `Ready to focus on: "${context.taskTitle}"? Let's do 25 minutes.`
          : `Ready to focus? Pick one thing and let's go.`,
        tone: 'encouraging',
        action: { label: 'Start Focus', callback: 'startFocus' },
      };
    
    case 'continue':
      return {
        type: 'continue',
        message: `${context.sessionMinutes || 0} minutes in. You're doing great. Keep going.`,
        tone: 'encouraging',
      };
    
    case 'rescue':
      return {
        type: 'rescue',
        message: context.taskTitle
          ? `Hey, gently bringing you back. You were on: "${context.taskTitle}"`
          : `Noticed you drifted. Want to refocus?`,
        tone: 'gentle',
        action: { label: 'Refocus', callback: 'refocus' },
      };
    
    case 'celebrate':
      const streakMsg = context.streakCount && context.streakCount > 1
        ? ` That's ${context.streakCount} in a row! 🔥`
        : '';
      return {
        type: 'celebrate',
        message: `Done! ✓${streakMsg}`,
        tone: 'celebratory',
        action: { label: 'Next task', callback: 'nextTask' },
      };
    
    case 'break':
      return {
        type: 'break',
        message: context.userEnergy && context.userEnergy < 4
          ? `Energy's low. Take 10 minutes. Walk, snack, breathe. You've earned it.`
          : `Good stopping point. Take 5 minutes before the next one.`,
        tone: 'encouraging',
        action: { label: 'Start break timer', callback: 'startBreak' },
      };
    
    default:
      return {
        type: 'start',
        message: 'Ready when you are.',
        tone: 'encouraging',
      };
  }
}

/**
 * NEXT BEST ACTION
 */
export function determineNextBestAction(
  tasks: Task[],
  userProfile: UserProfile,
  context: ContextWindow,
  memory: Memory
): NextBestAction {
  const actionableTasks = tasks.filter(t => 
    t.status !== 'Done' && t.status !== 'Completed'
  );
  
  if (actionableTasks.length === 0) {
    return {
      id: 'no-tasks',
      action: 'Capture: What\'s on your mind that needs doing?',
      reasoning: 'No pending tasks found. Time to capture what\'s in your head.',
      estimatedTime: 5,
      energyRequired: 'low',
      impactScore: 5,
      contextFit: 10,
      alternativeActions: [],
    };
  }
  
  const scoredTasks = actionableTasks.map(task => {
    let score = 0;
    let contextFit = 5;
    
    const priorityScores = { critical: 40, high: 30, medium: 20, low: 10 };
    score += priorityScores[task.priority] || 15;
    
    if (task.dueDate) {
      const hoursUntilDue = (new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilDue < 0) score += 50;
      else if (hoursUntilDue < 24) score += 30;
      else if (hoursUntilDue < 72) score += 15;
    }
    
    const userEnergy = userProfile.emotionalBaseline.currentEnergyLevel;
    const taskEnergy = task.energyRequired || 'medium';
    const energyLevels = { low: 3, medium: 5, high: 7 };
    const energyMatch = Math.abs(userEnergy - energyLevels[taskEnergy]);
    contextFit += (5 - energyMatch);
    
    if (context.calendarContext.nextEvent) {
      const minutesUntilNext = (new Date(context.calendarContext.nextEvent.start).getTime() - Date.now()) / 60000;
      const taskMinutes = task.estimatedMinutes || 30;
      
      if (taskMinutes <= minutesUntilNext - 5) {
        contextFit += 3;
      } else {
        contextFit -= 2;
      }
    }
    
    const relevantPatterns = memory.patterns.filter(p => 
      p.type === 'productivity' && p.description.includes(task.title)
    );
    if (relevantPatterns.length > 0) {
      score += 10;
    }
    
    return { task, score, contextFit };
  });
  
  scoredTasks.sort((a, b) => (b.score + b.contextFit) - (a.score + a.contextFit));
  
  const best = scoredTasks[0];
  const alternatives = scoredTasks.slice(1, 4);
  
  return {
    id: best.task.id,
    action: best.task.title,
    reasoning: generateReasoning(best.task, best.score),
    estimatedTime: best.task.estimatedMinutes || 30,
    energyRequired: best.task.energyRequired || 'medium',
    impactScore: Math.min(10, Math.round(best.score / 10)),
    contextFit: best.contextFit,
    alternativeActions: alternatives.map(alt => ({
      action: alt.task.title,
      reason: alt.task.priority === 'high' ? 'Also important' : 'Good alternative',
    })),
  };
}

function generateReasoning(task: Task, score: number): string {
  const reasons: string[] = [];
  
  if (task.priority === 'critical' || task.priority === 'high') {
    reasons.push('high priority');
  }
  
  if (task.dueDate) {
    const hoursUntil = (new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < 0) reasons.push('overdue');
    else if (hoursUntil < 24) reasons.push('due soon');
  }
  
  if (task.energyRequired === 'low') {
    reasons.push('low energy needed');
  }
  
  if (reasons.length === 0) {
    return 'Good fit for right now.';
  }
  
  return `This is ${reasons.join(', ')}.`;
}

/**
 * SINGLE FOCUS MODE
 */
export interface SingleFocusState {
  active: boolean;
  currentTask: Task | null;
  microTasks: MicroTask[];
  currentMicroTaskIndex: number;
  sessionStart: Date | null;
  targetEnd: Date | null;
  isGeneratingMicroTasks: boolean;
}

export function enterSingleFocusMode(task: Task, durationMinutes: number = 25): SingleFocusState {
  // Return initial state - micro-tasks will be loaded async
  return {
    active: true,
    currentTask: task,
    microTasks: [],
    currentMicroTaskIndex: 0,
    sessionStart: new Date(),
    targetEnd: new Date(Date.now() + durationMinutes * 60 * 1000),
    isGeneratingMicroTasks: true,
  };
}

export async function enterSingleFocusModeWithAI(task: Task, durationMinutes: number = 25): Promise<SingleFocusState> {
  const state = enterSingleFocusMode(task, durationMinutes);
  
  try {
    // Get AI-generated micro-tasks
    const microTasks = await generateAIMicroTasks(task);
    return {
      ...state,
      microTasks,
      isGeneratingMicroTasks: false,
    };
  } catch (error) {
    // Fallback to template micro-tasks
    const microTasks = generateMicroTasks(task, {} as UserProfile);
    return {
      ...state,
      microTasks,
      isGeneratingMicroTasks: false,
    };
  }
}

export function exitSingleFocusMode(): SingleFocusState {
  return {
    active: false,
    currentTask: null,
    microTasks: [],
    currentMicroTaskIndex: 0,
    sessionStart: null,
    targetEnd: null,
    isGeneratingMicroTasks: false,
  };
}

/**
 * ADHD-SPECIFIC HELPERS
 */
export const adhdHelpers = {
  getJustOneThing(tasks: Task[], userEnergy: number): Task | null {
    const filtered = tasks.filter(t => t.status !== 'Done' && t.status !== 'Completed');
    
    if (filtered.length === 0) return null;
    
    if (userEnergy < 4) {
      const easy = filtered.filter(t => t.energyRequired === 'low' || t.complexity === 'simple');
      if (easy.length > 0) {
        return easy.sort((a, b) => {
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        })[0];
      }
    }
    
    return filtered.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })[0];
  },

  generateBodyDoublePrompt(task: Task): string {
    const prompts = [
      `I'm right here with you. Let's do "${task.title}" together.`,
      `You're not alone in this. I'll keep you company while you work on "${task.title}".`,
      `We've got this. I'm watching the clock so you can focus on "${task.title}".`,
      `Let's do this side by side. You work on "${task.title}", I'll handle the rest.`,
    ];
    return prompts[Math.floor(Math.random() * prompts.length)];
  },

  getMomentumMessage(completedCount: number): string {
    if (completedCount === 0) return "Let's get that first win!";
    if (completedCount === 1) return "One down! The hardest part is over.";
    if (completedCount === 2) return "Two done! You're building momentum.";
    if (completedCount === 3) return "Three! Now we're cooking. 🔥";
    if (completedCount < 6) return `${completedCount} completed! You're in the zone!`;
    return `${completedCount} done! You're absolutely crushing it! 🚀`;
  },

  getSimplifiedView(tasks: Task[]): { visible: Task; hiddenCount: number } | null {
    const pending = tasks.filter(t => t.status !== 'Done' && t.status !== 'Completed');
    if (pending.length === 0) return null;
    
    return {
      visible: pending[0],
      hiddenCount: pending.length - 1,
    };
  },
};
