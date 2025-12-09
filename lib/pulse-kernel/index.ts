// Pulse Kernel: Main Orchestrator
// The brain of the world's greatest personal assistant
// Optimized for ADHD and distracted users
// Updated: Caching layer + AI micro-task generation

import {
  UserProfile,
  Memory,
  ContextWindow,
  PredictedNeed,
  ProactiveAction,
  AttentionState,
  NextBestAction,
  AssistantResponse,
  MicroTask,
  FocusPrompt,
} from './types';

import { anticipationEngine, patternDetector } from './anticipation';
import { proactiveEngine, messageDrafter } from './proactive';
import { 
  attentionManager, 
  generateMicroTasks, 
  generateAIMicroTasks,
  generateFocusPrompt, 
  determineNextBestAction, 
  adhdHelpers, 
  enterSingleFocusMode,
  enterSingleFocusModeWithAI, 
  exitSingleFocusMode, 
  SingleFocusState 
} from './attention';
import { contextEngine, createContextSnapshot, restoreContextSnapshot } from './context';
import { memoryContinuum, relationshipTracker } from './memory-continuum';
import { logistics } from './modules/logistics';
import * as persona from './persona';

// ============================================
// CACHING LAYER
// ============================================
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 60 * 1000; // 60 seconds
const apiCache: Map<string, CacheEntry<any>> = new Map();

export const cacheManager = {
  /**
   * Get cached data or fetch fresh
   */
  async fetchWithCache<T>(url: string, fallback: T): Promise<T> {
    const now = Date.now();
    const cached = apiCache.get(url);
    
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      console.log(`📦 Kernel Cache HIT: ${url}`);
      return cached.data;
    }
    
    console.log(`🌐 Kernel Cache MISS: ${url}`);
    
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      apiCache.set(url, { data, timestamp: now });
      return data;
    } catch (err) {
      console.error(`Kernel fetch failed ${url}:`, err);
      return fallback;
    }
  },

  /**
   * Invalidate specific or all cache entries
   */
  invalidate(url?: string): void {
    if (url) {
      apiCache.delete(url);
      console.log(`🗑️ Kernel Cache invalidated: ${url}`);
    } else {
      apiCache.clear();
      console.log(`🗑️ Kernel Cache cleared`);
    }
  },

  /**
   * Get cache stats
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: apiCache.size,
      keys: Array.from(apiCache.keys()),
    };
  },
};

/**
 * PULSE KERNEL
 * The main interface to the personal assistant engine
 */
export const pulse = {
  // Sub-systems
  kernel: {
    anticipation: anticipationEngine,
    proactive: proactiveEngine,
    attention: attentionManager,
    context: contextEngine,
    memoryContinuum,
    patternDetector,
    persona,
    cache: cacheManager,
  },

  // Modules
  modules: {
    logistics,
    relationships: relationshipTracker,
    messaging: messageDrafter,
  },

  // Helpers
  helpers: {
    adhd: adhdHelpers,
    microTasks: generateMicroTasks,
    aiMicroTasks: generateAIMicroTasks,
    focusPrompt: generateFocusPrompt,
  },

  // State
  _initialized: false,
  _userProfile: null as UserProfile | null,
  _currentFocusState: null as SingleFocusState | null,

  /**
   * Initialize the kernel
   */
  async initialize(userId: string, profile?: Partial<UserProfile>): Promise<void> {
    await memoryContinuum.initialize(userId);

    this._userProfile = {
      id: userId,
      name: profile?.name || 'User',
      preferences: {
        workingHours: { start: '09:00', end: '17:00' },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        communicationStyle: 'brief',
        adhdMode: true,
        focusSessionLength: 25,
        peakEnergyTimes: ['09:00', '10:00', '14:00'],
        useAIMicroTasks: true, // NEW: Enable AI micro-tasks by default
        ...profile?.preferences,
      },
      patterns: {
        typicalTaskDuration: {},
        procrastinationTriggers: [],
        focusKillers: [],
        motivators: [],
        completionPatterns: [],
        ...profile?.patterns,
      },
      emotionalBaseline: {
        currentStressLevel: 5,
        currentEnergyLevel: 5,
        currentMoodIndicators: [],
        ...profile?.emotionalBaseline,
      },
    };

    this._initialized = true;
    console.log('🧠 Pulse Kernel initialized');
  },

  /**
   * Main update loop - call this regularly (e.g., every minute)
   * Now with caching support
   */
  async tick(rawInputs: {
    tasks?: any[];
    deals?: any[];
    followUps?: any[];
    calendarEvents?: any[];
    emails?: any[];
    recentActivity?: any[];
    location?: string;
    activeApp?: string;
    forceRefresh?: boolean;
  }): Promise<{
    context: ContextWindow;
    predictions: PredictedNeed[];
    proactiveActions: ProactiveAction[];
    attentionState: AttentionState;
    nextBestAction: NextBestAction;
  }> {
    if (!this._initialized || !this._userProfile) {
      throw new Error('Pulse kernel not initialized');
    }

    // Clear cache if force refresh requested
    if (rawInputs.forceRefresh) {
      cacheManager.invalidate();
    }

    // Use cached data if inputs not provided
    const tasks = rawInputs.tasks ?? (await cacheManager.fetchWithCache('/api/tasks/pull', { tasks: [] })).tasks ?? [];
    const deals = rawInputs.deals ?? (await cacheManager.fetchWithCache('/api/deals/pull', { deals: [] })).deals ?? [];
    const followUps = rawInputs.followUps ?? (await cacheManager.fetchWithCache('/api/follow-ups/pull', { followUps: [] })).followUps ?? [];

    // 1. Collect and infer context
    const context = await contextEngine.collect({
      timestamp: new Date(),
      location: rawInputs.location,
      activeApp: rawInputs.activeApp,
      calendarEvents: rawInputs.calendarEvents,
      recentActivity: rawInputs.recentActivity,
    });

    const memory = memoryContinuum._memory;
    const enrichedContext = contextEngine.infer(context, memory, this._userProfile);

    // 2. Anticipate needs
    const predictions = anticipationEngine.predictiveNeeds(
      this._userProfile,
      memory,
      enrichedContext,
      {
        tasks,
        deals,
        followUps,
        calendar: enrichedContext.calendarContext.todaysEvents,
      }
    );

    // 3. Generate proactive actions
    const proactiveActions = await proactiveEngine.proactiveAct(
      this._userProfile,
      memory,
      enrichedContext,
      {
        tasks,
        deals,
        followUps,
        calendar: enrichedContext.calendarContext.todaysEvents,
        emails: rawInputs.emails,
      }
    );

    // 4. Assess attention state
    const attentionState = attentionManager.getState(this._userProfile, enrichedContext);

    // 5. Determine next best action
    const nextBestAction = determineNextBestAction(
      tasks,
      this._userProfile,
      enrichedContext,
      memory
    );

    return {
      context: enrichedContext,
      predictions,
      proactiveActions,
      attentionState,
      nextBestAction,
    };
  },

  /**
   * Get personalized greeting
   */
  getGreeting(): AssistantResponse {
    if (!this._userProfile) {
      return { message: "Hello! Let's get started.", tone: 'calm', suggestedActions: [] };
    }

    const context = contextEngine.getCurrent();
    return persona.generateGreeting({
      userName: this._userProfile.name,
      timeOfDay: context?.environmentalFactors.timeOfDay || 'morning',
      userStressLevel: this._userProfile.emotionalBaseline.currentStressLevel,
      userEnergyLevel: this._userProfile.emotionalBaseline.currentEnergyLevel,
      recentWins: [],
      relationshipHistory: 'familiar',
    });
  },

  /**
   * Handle user feeling overwhelmed
   */
  handleOverwhelm(): AssistantResponse {
    const response = persona.generateResponse('overwhelm', {
      userStressLevel: this._userProfile?.emotionalBaseline.currentStressLevel,
    });

    response.suggestedActions = [
      { label: 'Show me ONE thing', action: 'single_focus', primary: true },
      { label: 'Clear my head first', action: 'brain_dump' },
      { label: 'I need a break', action: 'break' },
    ];

    return response;
  },

  /**
   * Enter single focus mode (ADHD-optimized)
   * Now with AI-generated micro-tasks
   */
  async enterFocus(task: any, durationMinutes?: number): Promise<{
    focusState: SingleFocusState;
    prompt: FocusPrompt;
    bodyDouble: string;
  }> {
    const duration = durationMinutes || this._userProfile?.preferences.focusSessionLength || 25;
    const useAI = this._userProfile?.preferences.useAIMicroTasks !== false;

    // Start with immediate state (loading)
    let focusState: SingleFocusState;
    
    if (useAI) {
      // Use AI-generated micro-tasks
      focusState = await enterSingleFocusModeWithAI(task, duration);
      console.log('🧠 Focus mode started with AI micro-tasks');
    } else {
      // Use template-based micro-tasks
      focusState = enterSingleFocusMode(task, duration);
      focusState.microTasks = generateMicroTasks(task, this._userProfile!);
      focusState.isGeneratingMicroTasks = false;
    }
    
    this._currentFocusState = focusState;

    // Start the attention session
    attentionManager.startSession(task, duration);

    return {
      focusState,
      prompt: generateFocusPrompt('start', { taskTitle: task.title }),
      bodyDouble: adhdHelpers.generateBodyDoublePrompt(task),
    };
  },

  /**
   * Exit focus mode
   */
  exitFocus(completed: boolean): {
    session: any;
    prompt: FocusPrompt;
    streak: number;
  } {
    const session = attentionManager.endSession(completed);
    this._currentFocusState = exitSingleFocusMode();

    const streak = attentionManager.getStreakCount();
    const prompt = completed
      ? generateFocusPrompt('celebrate', { streakCount: streak })
      : generateFocusPrompt('break', {});

    if (this._initialized) {
      memoryContinuum.recordInteraction({
        type: 'focus_session',
        content: session?.taskTitle || 'Unknown task',
        timestamp: new Date(),
        outcome: completed ? 'success' : 'partial',
      });
    }

    // Invalidate cache after completing to get fresh data
    if (completed) {
      cacheManager.invalidate();
    }

    return { session, prompt, streak };
  },

  /**
   * Get just one thing (ADHD helper)
   */
  getJustOneThing(tasks: any[]): {
    task: any | null;
    message: AssistantResponse;
  } {
    const energy = this._userProfile?.emotionalBaseline.currentEnergyLevel || 5;
    const task = adhdHelpers.getJustOneThing(tasks, energy);

    if (!task) {
      return {
        task: null,
        message: {
          message: "Nothing pending! Time to capture what's on your mind, or enjoy the freedom.",
          tone: 'calm',
          suggestedActions: [{ label: 'Capture something', action: 'capture' }],
        },
      };
    }

    return {
      task,
      message: {
        message: `Your ONE thing: "${task.title}". Nothing else exists right now.`,
        tone: 'direct',
        suggestedActions: [
          { label: "Let's do it", action: 'start_focus', primary: true },
          { label: 'Different one', action: 'skip' },
        ],
      },
    };
  },

  /**
   * Get momentum message after completion
   */
  getMomentumMessage(completedCount: number): AssistantResponse {
    return {
      message: adhdHelpers.getMomentumMessage(completedCount),
      tone: completedCount >= 3 ? 'celebratory' : 'encouraging',
      suggestedActions: [
        { label: 'Keep going', action: 'next', primary: true },
        { label: 'Take a break', action: 'break' },
      ],
    };
  },

  /**
   * Break down task into micro-steps
   * Now supports AI generation
   */
  async breakDownTask(task: any, useAI: boolean = true): Promise<{
    microTasks: MicroTask[];
    message: AssistantResponse;
  }> {
    let microTasks: MicroTask[];
    
    if (useAI) {
      microTasks = await generateAIMicroTasks(task);
    } else {
      microTasks = generateMicroTasks(task, this._userProfile!);
    }
    
    return {
      microTasks,
      message: {
        message: `I've broken "${task.title}" into ${microTasks.length} small steps. First up: "${microTasks[0]?.title || 'Get started'}"`,
        tone: 'encouraging',
        suggestedActions: [
          { label: 'Start first step', action: 'start_micro', primary: true },
          { label: 'Show all steps', action: 'show_steps' },
        ],
      },
    };
  },

  /**
   * Complete a micro-task
   */
  completeMicroTask(microTaskId: string): {
    reward: string;
    nextMicroTask: MicroTask | null;
    allComplete: boolean;
    streakMessage: string;
  } {
    if (!this._currentFocusState) {
      return {
        reward: '✓',
        nextMicroTask: null,
        allComplete: true,
        streakMessage: '',
      };
    }

    const currentIndex = this._currentFocusState.currentMicroTaskIndex;
    const microTasks = this._currentFocusState.microTasks;
    
    if (microTasks[currentIndex]) {
      microTasks[currentIndex].completed = true;
    }

    const reward = microTasks[currentIndex]?.dopamineReward || '✓';

    this._currentFocusState.currentMicroTaskIndex++;
    const nextMicroTask = microTasks[this._currentFocusState.currentMicroTaskIndex] || null;
    const allComplete = this._currentFocusState.currentMicroTaskIndex >= microTasks.length;

    const streak = attentionManager.getStreakCount();
    const streakMessage = streak > 1 ? `🔥 ${streak} streak!` : '';

    return { reward, nextMicroTask, allComplete, streakMessage };
  },

  /**
   * Rescue attention (when distracted)
   */
  rescueAttention(): AssistantResponse {
    const currentTask = this._currentFocusState?.currentTask?.title || 'your task';
    const attentionState = attentionManager.getState(
      this._userProfile!,
      contextEngine.getCurrent()!
    );

    return persona.generateAttentionRescue(currentTask, attentionState);
  },

  /**
   * Update user state
   */
  updateUserState(updates: {
    stressLevel?: number;
    energyLevel?: number;
    mood?: string[];
  }): void {
    if (!this._userProfile) return;

    if (updates.stressLevel !== undefined) {
      this._userProfile.emotionalBaseline.currentStressLevel = updates.stressLevel;
    }
    if (updates.energyLevel !== undefined) {
      this._userProfile.emotionalBaseline.currentEnergyLevel = updates.energyLevel;
    }
    if (updates.mood) {
      this._userProfile.emotionalBaseline.currentMoodIndicators = updates.mood;
    }
  },

  /**
   * Get emotional support
   */
  getEmotionalSupport(emotion: 'stressed' | 'anxious' | 'frustrated' | 'unmotivated'): AssistantResponse {
    const tasks: any[] = [];
    const easyTask = adhdHelpers.getJustOneThing(tasks, 3)?.title;

    return persona.generateEmotionalSupport(
      emotion,
      {
        userStressLevel: this._userProfile?.emotionalBaseline.currentStressLevel,
        userEnergyLevel: this._userProfile?.emotionalBaseline.currentEnergyLevel,
      },
      easyTask
    );
  },

  /**
   * Get end of day summary
   */
  getEndOfDaySummary(completedTasks: string[]): AssistantResponse {
    const wins = completedTasks.slice(0, 5);

    return persona.generateEndOfDaySummary(
      completedTasks,
      wins,
      {
        userName: this._userProfile?.name || 'friend',
        timeOfDay: 'evening',
        userStressLevel: this._userProfile?.emotionalBaseline.currentStressLevel || 5,
        userEnergyLevel: this._userProfile?.emotionalBaseline.currentEnergyLevel || 5,
        recentWins: wins,
        relationshipHistory: 'familiar',
      }
    );
  },

  /**
   * Record a completed task
   */
  recordCompletion(taskTitle: string, taskType: string = 'task'): void {
    memoryContinuum.recordInteraction({
      type: 'task_completed',
      content: taskTitle,
      timestamp: new Date(),
      outcome: 'success',
    });
    // Invalidate cache after completion
    cacheManager.invalidate();
  },

  /**
   * Record a deferred task
   */
  recordDeferral(taskTitle: string, reason?: string): void {
    memoryContinuum.recordInteraction({
      type: 'task_deferred',
      content: taskTitle,
      timestamp: new Date(),
      emotionalContext: reason,
    });
  },

  /**
   * Get simplified view (reduces overwhelm)
   */
  getSimplifiedView(tasks: any[]): {
    visible: any;
    hiddenCount: number;
    message: string;
  } | null {
    const result = adhdHelpers.getSimplifiedView(tasks);
    if (!result) return null;

    return {
      ...result,
      message: result.hiddenCount > 0
        ? `Focus on this. (${result.hiddenCount} others hidden)`
        : 'Just this one.',
    };
  },

  /**
   * Force refresh all cached data
   */
  forceRefresh(): void {
    cacheManager.invalidate();
    console.log('🔄 Pulse Kernel: Cache cleared, next tick will fetch fresh data');
  },

  /**
   * Get current focus state
   */
  getCurrentFocusState(): SingleFocusState | null {
    return this._currentFocusState;
  },

  /**
   * Check if AI micro-tasks are enabled
   */
  isAIMicroTasksEnabled(): boolean {
    return this._userProfile?.preferences.useAIMicroTasks !== false;
  },

  /**
   * Toggle AI micro-tasks
   */
  setAIMicroTasks(enabled: boolean): void {
    if (this._userProfile) {
      this._userProfile.preferences.useAIMicroTasks = enabled;
    }
  },
};

// Export types
export * from './types';

// Export sub-modules for direct access
export { anticipationEngine } from './anticipation';
export { proactiveEngine, messageDrafter } from './proactive';
export { 
  attentionManager, 
  generateMicroTasks, 
  generateAIMicroTasks,
  generateFocusPrompt, 
  determineNextBestAction, 
  adhdHelpers 
} from './attention';
export { contextEngine } from './context';
export { memoryContinuum, relationshipTracker } from './memory-continuum';
export { logistics } from './modules/logistics';
export * as persona from './persona';

// Default export
export default pulse;
