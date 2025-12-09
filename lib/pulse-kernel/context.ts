// Pulse Kernel: Contextual Understanding Layer
// Collects, infers, and maintains real-time context awareness

import {
  ContextWindow,
  UserProfile,
  Memory,
  CalendarEvent,
  RecentAction,
  CalendarContext,
  TimeSlot,
} from './types';

interface RawContextInput {
  timestamp?: Date;
  location?: string;
  deviceType?: 'mobile' | 'desktop';
  activeApp?: string;
  calendarEvents?: any[];
  tasks?: any[];
  recentActivity?: any[];
  userInputs?: { type: string; content: string; timestamp: Date }[];
}

/**
 * CONTEXT ENGINE
 * Maintains real-time awareness of user's situation
 */
export const contextEngine = {
  // Current context state
  _currentContext: null as ContextWindow | null,
  _lastUpdate: null as Date | null,

  /**
   * Collect context from all available sources
   */
  async collect(inputs: RawContextInput): Promise<ContextWindow> {
    const now = inputs.timestamp || new Date();
    
    // Build calendar context
    const calendarContext = this.buildCalendarContext(inputs.calendarEvents || [], now);
    
    // Determine environmental factors
    const environmentalFactors = this.inferEnvironment(now, calendarContext, inputs);
    
    // Process recent actions
    const recentActions = this.processRecentActions(inputs.recentActivity || []);
    
    const context: ContextWindow = {
      timestamp: now,
      location: inputs.location,
      deviceType: inputs.deviceType || 'desktop',
      currentActivity: this.inferCurrentActivity(inputs, calendarContext),
      recentActions,
      activeApps: inputs.activeApp ? [inputs.activeApp] : undefined,
      calendarContext,
      environmentalFactors,
    };

    this._currentContext = context;
    this._lastUpdate = now;
    
    return context;
  },

  /**
   * Infer additional context from available signals
   */
  infer(context: ContextWindow, memory: Memory, userProfile: UserProfile): ContextWindow {
    const enrichedContext = { ...context };

    // Infer focus state from recent actions
    const focusSignals = this.inferFocusState(context.recentActions, memory);
    
    // Infer stress level from behavior patterns
    const stressSignals = this.inferStressLevel(context, memory);
    
    // Infer productivity state
    const productivityState = this.inferProductivityState(context, userProfile);

    // Add inferences to context (stored in a custom property for use by other systems)
    (enrichedContext as any).inferences = {
      focusLevel: focusSignals.level,
      focusActivity: focusSignals.activity,
      apparentStress: stressSignals,
      productivityState,
      suggestedMode: this.suggestMode(context, userProfile, focusSignals, stressSignals),
    };

    return enrichedContext;
  },

  /**
   * Update context in real-time (lightweight update)
   */
  updateRealTime(partialUpdate: Partial<RawContextInput>): ContextWindow | null {
    if (!this._currentContext) return null;

    const updated = { ...this._currentContext };
    
    // Update timestamp
    updated.timestamp = new Date();
    
    // Apply partial updates
    if (partialUpdate.location) {
      updated.location = partialUpdate.location;
    }
    
    if (partialUpdate.activeApp) {
      updated.activeApps = [partialUpdate.activeApp];
      updated.currentActivity = this.activityFromApp(partialUpdate.activeApp);
    }
    
    if (partialUpdate.recentActivity) {
      const newActions = this.processRecentActions(partialUpdate.recentActivity);
      updated.recentActions = [...newActions, ...updated.recentActions].slice(0, 50);
    }

    // Update environmental factors based on time
    updated.environmentalFactors = {
      ...updated.environmentalFactors,
      timeOfDay: this.getTimeOfDay(updated.timestamp),
    };

    this._currentContext = updated;
    this._lastUpdate = updated.timestamp;
    
    return updated;
  },

  /**
   * Get current context (cached)
   */
  getCurrent(): ContextWindow | null {
    return this._currentContext;
  },

  /**
   * Build calendar context from events
   */
  buildCalendarContext(events: any[], now: Date): CalendarContext {
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Filter to today's events
    const todaysEvents: CalendarEvent[] = events
      .filter(e => {
        const start = new Date(e.start);
        return start >= todayStart && start <= todayEnd;
      })
      .map(e => ({
        id: e.id,
        title: e.title || e.summary,
        start: new Date(e.start),
        end: new Date(e.end),
        attendees: e.attendees,
        type: this.inferEventType(e),
      }))
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    // Find current event
    const currentEvent = todaysEvents.find(e => 
      e.start <= now && e.end > now
    );

    // Find next event
    const nextEvent = todaysEvents.find(e => e.start > now);

    // Find free slots
    const freeSlots = this.findFreeSlots(todaysEvents, now, todayEnd);

    // Find upcoming deadlines (from events marked as deadlines)
    const upcomingDeadlines = todaysEvents
      .filter(e => e.type === 'deadline')
      .map(e => ({
        id: e.id,
        title: e.title,
        dueDate: e.start,
        priority: 'high' as const,
      }));

    return {
      currentEvent,
      nextEvent,
      todaysEvents,
      upcomingDeadlines,
      freeSlots,
    };
  },

  /**
   * Infer event type from event data
   */
  inferEventType(event: any): 'meeting' | 'focus' | 'personal' | 'deadline' {
    const title = (event.title || event.summary || '').toLowerCase();
    
    if (title.includes('deadline') || title.includes('due')) return 'deadline';
    if (title.includes('focus') || title.includes('deep work') || title.includes('block')) return 'focus';
    if (title.includes('personal') || title.includes('lunch') || title.includes('break')) return 'personal';
    if (event.attendees && event.attendees.length > 1) return 'meeting';
    
    return 'meeting'; // Default to meeting
  },

  /**
   * Find free time slots
   */
  findFreeSlots(events: CalendarEvent[], now: Date, endOfDay: Date): TimeSlot[] {
    const slots: TimeSlot[] = [];
    let currentTime = new Date(now);

    // Sort events by start time
    const sortedEvents = [...events]
      .filter(e => e.end > now) // Only future/current events
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    for (const event of sortedEvents) {
      // If there's a gap before this event
      if (event.start > currentTime) {
        const duration = Math.floor((event.start.getTime() - currentTime.getTime()) / 60000);
        if (duration >= 15) { // Minimum 15-minute slot
          slots.push({
            start: new Date(currentTime),
            end: new Date(event.start),
            duration,
          });
        }
      }
      // Move current time to end of this event
      if (event.end > currentTime) {
        currentTime = new Date(event.end);
      }
    }

    // Add remaining time until end of day
    if (currentTime < endOfDay) {
      const duration = Math.floor((endOfDay.getTime() - currentTime.getTime()) / 60000);
      if (duration >= 15) {
        slots.push({
          start: new Date(currentTime),
          end: new Date(endOfDay),
          duration,
        });
      }
    }

    return slots;
  },

  /**
   * Infer current activity
   */
  inferCurrentActivity(inputs: RawContextInput, calendar: CalendarContext): string | undefined {
    // If in a meeting, that's the activity
    if (calendar.currentEvent?.type === 'meeting') {
      return `Meeting: ${calendar.currentEvent.title}`;
    }

    // If in focus time
    if (calendar.currentEvent?.type === 'focus') {
      return 'Focus time';
    }

    // Infer from active app
    if (inputs.activeApp) {
      return this.activityFromApp(inputs.activeApp);
    }

    // Infer from recent activity
    if (inputs.recentActivity && inputs.recentActivity.length > 0) {
      const mostRecent = inputs.recentActivity[0];
      return mostRecent.type || 'Working';
    }

    return undefined;
  },

  /**
   * Map app to activity
   */
  activityFromApp(app: string): string {
    const appLower = app.toLowerCase();
    
    if (appLower.includes('slack') || appLower.includes('teams')) return 'Communication';
    if (appLower.includes('chrome') || appLower.includes('safari') || appLower.includes('firefox')) return 'Browsing';
    if (appLower.includes('code') || appLower.includes('sublime') || appLower.includes('vim')) return 'Coding';
    if (appLower.includes('word') || appLower.includes('docs') || appLower.includes('notion')) return 'Writing';
    if (appLower.includes('excel') || appLower.includes('sheets')) return 'Spreadsheets';
    if (appLower.includes('mail') || appLower.includes('outlook') || appLower.includes('gmail')) return 'Email';
    if (appLower.includes('zoom') || appLower.includes('meet')) return 'Video call';
    if (appLower.includes('figma') || appLower.includes('sketch')) return 'Design';
    
    return 'Working';
  },

  /**
   * Process recent actions into standardized format
   */
  processRecentActions(activity: any[]): RecentAction[] {
    return activity.slice(0, 50).map(a => ({
      type: a.type || 'unknown',
      target: a.target || a.content || '',
      timestamp: new Date(a.timestamp || Date.now()),
      duration: a.duration,
    }));
  },

  /**
   * Infer environmental factors
   */
  inferEnvironment(
    now: Date,
    calendar: CalendarContext,
    inputs: RawContextInput
  ): ContextWindow['environmentalFactors'] {
    const day = now.getDay();
    const isWeekend = day === 0 || day === 6;
    
    return {
      timeOfDay: this.getTimeOfDay(now),
      dayType: isWeekend ? 'weekend' : 'workday',
      isInMeeting: calendar.currentEvent?.type === 'meeting',
      focusModeActive: calendar.currentEvent?.type === 'focus',
    };
  },

  /**
   * Get time of day category
   */
  getTimeOfDay(date: Date): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  },

  /**
   * Infer focus state from recent actions
   */
  inferFocusState(
    actions: RecentAction[],
    memory: Memory
  ): { level: number; activity: string | null } {
    if (actions.length === 0) {
      return { level: 5, activity: null };
    }

    // Look at last 10 actions
    const recent = actions.slice(0, 10);
    
    // Check for app switching (sign of distraction)
    const uniqueTargets = new Set(recent.map(a => a.target));
    const switchingFactor = Math.min(10, uniqueTargets.size);
    
    // Check time between actions
    const timeBetweenActions = recent.slice(0, -1).map((a, i) => {
      const next = recent[i + 1];
      return a.timestamp.getTime() - next.timestamp.getTime();
    });
    
    const avgTimeBetween = timeBetweenActions.length > 0
      ? timeBetweenActions.reduce((a, b) => a + b, 0) / timeBetweenActions.length
      : 60000;
    
    // High frequency switching = low focus
    // Long periods on same thing = high focus
    let focusLevel = 5;
    
    // Penalize for many switches
    focusLevel -= Math.min(3, (switchingFactor - 2) * 0.5);
    
    // Reward for sustained activity
    if (avgTimeBetween > 120000) focusLevel += 2; // More than 2 min average
    if (avgTimeBetween > 300000) focusLevel += 2; // More than 5 min average
    
    // Clamp to 0-10
    focusLevel = Math.max(0, Math.min(10, focusLevel));
    
    // Determine primary activity
    const primaryTarget = recent[0]?.target || null;
    
    return { level: focusLevel, activity: primaryTarget };
  },

  /**
   * Infer stress level from behavior
   */
  inferStressLevel(context: ContextWindow, memory: Memory): number {
    let stress = 5; // Baseline

    // Many meetings increase stress
    const meetingsToday = context.calendarContext.todaysEvents
      .filter(e => e.type === 'meeting').length;
    if (meetingsToday > 5) stress += 2;
    else if (meetingsToday > 3) stress += 1;

    // Deadlines increase stress
    const urgentDeadlines = context.calendarContext.upcomingDeadlines
      .filter(d => {
        const hoursUntil = (d.dueDate.getTime() - Date.now()) / (1000 * 60 * 60);
        return hoursUntil < 24;
      }).length;
    stress += Math.min(3, urgentDeadlines);

    // No free time increases stress
    const totalFreeMinutes = context.calendarContext.freeSlots
      .reduce((sum, slot) => sum + slot.duration, 0);
    if (totalFreeMinutes < 60) stress += 1;

    // Clamp to 0-10
    return Math.max(0, Math.min(10, stress));
  },

  /**
   * Infer productivity state
   */
  inferProductivityState(
    context: ContextWindow,
    userProfile: UserProfile
  ): 'peak' | 'normal' | 'low' | 'recovery' {
    const hour = context.timestamp.getHours();
    const hourStr = hour.toString().padStart(2, '0') + ':00';

    // Check if this is a peak energy time
    if (userProfile.preferences.peakEnergyTimes?.includes(hourStr)) {
      return 'peak';
    }

    // Post-lunch dip
    if (hour >= 13 && hour <= 15) {
      return 'low';
    }

    // Evening wind-down
    if (context.environmentalFactors.timeOfDay === 'evening') {
      return 'recovery';
    }

    return 'normal';
  },

  /**
   * Suggest optimal mode based on context
   */
  suggestMode(
    context: ContextWindow,
    userProfile: UserProfile,
    focusSignals: { level: number; activity: string | null },
    stressLevel: number
  ): 'deep_focus' | 'light_work' | 'meetings' | 'break' | 'wind_down' {
    // If in a meeting, that's the mode
    if (context.environmentalFactors.isInMeeting) {
      return 'meetings';
    }

    // If stress is very high, suggest break
    if (stressLevel >= 8) {
      return 'break';
    }

    // Evening = wind down
    if (context.environmentalFactors.timeOfDay === 'evening' ||
        context.environmentalFactors.timeOfDay === 'night') {
      return 'wind_down';
    }

    // If focus is high and in peak time, encourage deep focus
    const hour = context.timestamp.getHours();
    const hourStr = hour.toString().padStart(2, '0') + ':00';
    const isPeakTime = userProfile.preferences.peakEnergyTimes?.includes(hourStr);

    if (isPeakTime || focusSignals.level >= 7) {
      return 'deep_focus';
    }

    // If many meetings coming up, light work
    const meetingsInNextHour = context.calendarContext.todaysEvents
      .filter(e => {
        const start = new Date(e.start);
        const hourFromNow = new Date(Date.now() + 60 * 60 * 1000);
        return e.type === 'meeting' && start > new Date() && start < hourFromNow;
      }).length;

    if (meetingsInNextHour > 0) {
      return 'light_work';
    }

    // Default based on time
    if (hour >= 9 && hour <= 11) return 'deep_focus';
    if (hour >= 14 && hour <= 16) return 'deep_focus';
    
    return 'light_work';
  },
};

/**
 * CONTEXT SNAPSHOT
 * For saving and restoring context
 */
export function createContextSnapshot(context: ContextWindow): string {
  return JSON.stringify({
    ...context,
    timestamp: context.timestamp.toISOString(),
    calendarContext: {
      ...context.calendarContext,
      currentEvent: context.calendarContext.currentEvent ? {
        ...context.calendarContext.currentEvent,
        start: context.calendarContext.currentEvent.start.toISOString(),
        end: context.calendarContext.currentEvent.end.toISOString(),
      } : undefined,
      nextEvent: context.calendarContext.nextEvent ? {
        ...context.calendarContext.nextEvent,
        start: context.calendarContext.nextEvent.start.toISOString(),
        end: context.calendarContext.nextEvent.end.toISOString(),
      } : undefined,
    },
  });
}

export function restoreContextSnapshot(snapshot: string): ContextWindow {
  const data = JSON.parse(snapshot);
  return {
    ...data,
    timestamp: new Date(data.timestamp),
    calendarContext: {
      ...data.calendarContext,
      currentEvent: data.calendarContext.currentEvent ? {
        ...data.calendarContext.currentEvent,
        start: new Date(data.calendarContext.currentEvent.start),
        end: new Date(data.calendarContext.currentEvent.end),
      } : undefined,
      nextEvent: data.calendarContext.nextEvent ? {
        ...data.calendarContext.nextEvent,
        start: new Date(data.calendarContext.nextEvent.start),
        end: new Date(data.calendarContext.nextEvent.end),
      } : undefined,
    },
  };
}
