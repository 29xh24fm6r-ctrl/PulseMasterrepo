// Pulse Kernel: Anticipation Layer
// Predicts what you need before you ask for it
// Pattern detection, need forecasting, emotional inference

import {
  UserProfile,
  Memory,
  ContextWindow,
  PredictedNeed,
  DetectedPattern,
  CalendarEvent,
} from './types';

interface Deal {
  id: string;
  name: string;
  company: string;
  stage: string;
  value: number;
  lastContact: Date | null;
  nextAction?: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  project?: string;
}

interface FollowUp {
  id: string;
  personName: string;
  company?: string;
  dueDate: Date | null;
  status: string;
}

/**
 * ANTICIPATION ENGINE
 * Predicts user needs based on patterns, context, and memory
 */
export const anticipationEngine = {
  /**
   * Main prediction function - analyzes everything to predict needs
   */
  predictiveNeeds(
    userProfile: UserProfile,
    memory: Memory,
    context: ContextWindow,
    data: {
      tasks: Task[];
      deals: Deal[];
      followUps: FollowUp[];
      calendar: CalendarEvent[];
    }
  ): PredictedNeed[] {
    const predictions: PredictedNeed[] = [];

    // Run all prediction engines
    predictions.push(...this.predictFromPatterns(memory.patterns, context));
    predictions.push(...this.predictFromCalendar(data.calendar, context, memory));
    predictions.push(...this.predictFromDeals(data.deals, memory));
    predictions.push(...this.predictFromTasks(data.tasks, userProfile));
    predictions.push(...this.predictFromFollowUps(data.followUps));
    predictions.push(...this.predictEmotionalNeeds(userProfile, context, memory));
    predictions.push(...this.predictFromTimePatterns(userProfile, context, memory));

    // Sort by urgency and confidence
    return this.rankPredictions(predictions);
  },

  /**
   * Predict needs from detected behavioral patterns
   */
  predictFromPatterns(patterns: DetectedPattern[], context: ContextWindow): PredictedNeed[] {
    const predictions: PredictedNeed[] = [];
    const now = new Date();
    const dayOfWeek = now.getDay();
    const hour = now.getHours();

    for (const pattern of patterns) {
      if (!pattern.actionable || pattern.confidence < 0.6) continue;

      // Schedule patterns (e.g., "User always reviews tasks Monday morning")
      if (pattern.type === 'schedule') {
        predictions.push({
          id: `pattern-${pattern.id}`,
          type: 'reminder',
          title: pattern.suggestedAction || 'Time for your routine',
          description: pattern.description,
          confidence: pattern.confidence,
          urgency: 'soon',
          suggestedAction: pattern.suggestedAction || 'Start your routine',
          reasoning: `You usually do this at this time (${pattern.occurrences} times observed)`,
          preventiveValue: 'Maintains your productive routines',
        });
      }

      // Behavior patterns (e.g., "User gets distracted after lunch")
      if (pattern.type === 'behavior' && pattern.description.includes('distract')) {
        if (hour >= 13 && hour <= 15) { // Post-lunch
          predictions.push({
            id: `pattern-distraction-${pattern.id}`,
            type: 'focus',
            title: 'Focus protection time',
            description: 'This is typically a challenging time for focus',
            confidence: pattern.confidence,
            urgency: 'immediate',
            suggestedAction: 'Enter Single Focus Mode for the next task',
            reasoning: 'Pattern detected: focus tends to dip at this time',
            preventiveValue: 'Prevents afternoon productivity loss',
          });
        }
      }

      // Productivity patterns
      if (pattern.type === 'productivity') {
        predictions.push({
          id: `pattern-prod-${pattern.id}`,
          type: 'task',
          title: pattern.suggestedAction || 'Optimize your productivity',
          description: pattern.description,
          confidence: pattern.confidence,
          urgency: 'upcoming',
          suggestedAction: pattern.suggestedAction || 'Review your workflow',
          reasoning: `Based on ${pattern.occurrences} observations`,
          preventiveValue: 'Improves overall effectiveness',
        });
      }
    }

    return predictions;
  },

  /**
   * Predict preparation needs from calendar
   */
  predictFromCalendar(
    events: CalendarEvent[],
    context: ContextWindow,
    memory: Memory
  ): PredictedNeed[] {
    const predictions: PredictedNeed[] = [];
    const now = new Date();

    for (const event of events) {
      const eventStart = new Date(event.start);
      const minutesUntil = (eventStart.getTime() - now.getTime()) / 60000;

      // Meeting prep (30-60 minutes before)
      if (minutesUntil > 30 && minutesUntil <= 60 && event.type === 'meeting') {
        // Check if we have relationship data for attendees
        const attendeeInfo = event.attendees?.map(attendee => {
          const relationship = memory.relationships.find(r => 
            r.name.toLowerCase().includes(attendee.toLowerCase())
          );
          return relationship ? `${attendee}: ${relationship.relationship}` : attendee;
        });

        predictions.push({
          id: `prep-${event.id}`,
          type: 'preparation',
          title: `Prepare for: ${event.title}`,
          description: attendeeInfo 
            ? `Attendees: ${attendeeInfo.join(', ')}`
            : `Meeting in ${Math.round(minutesUntil)} minutes`,
          confidence: 0.9,
          urgency: 'soon',
          suggestedAction: 'Review notes and prep talking points',
          reasoning: 'Meeting coming up - preparation improves outcomes',
          preventiveValue: 'Go into meeting prepared and confident',
        });
      }

      // Deadline warning (24 hours before)
      if (event.type === 'deadline' && minutesUntil > 0 && minutesUntil <= 1440) {
        predictions.push({
          id: `deadline-${event.id}`,
          type: 'task',
          title: `Deadline approaching: ${event.title}`,
          description: `Due in ${Math.round(minutesUntil / 60)} hours`,
          confidence: 1.0,
          urgency: minutesUntil < 180 ? 'immediate' : 'soon',
          suggestedAction: 'Focus on completing this now',
          reasoning: 'Deadline is approaching',
          preventiveValue: 'Avoid missed deadline and associated stress',
        });
      }

      // Block time for focus before meetings
      if (minutesUntil > 60 && minutesUntil <= 120) {
        const availableMinutes = minutesUntil - 30; // Leave 30 min prep buffer
        if (availableMinutes >= 25) {
          predictions.push({
            id: `focus-window-${event.id}`,
            type: 'focus',
            title: `Focus window: ${Math.floor(availableMinutes)} minutes available`,
            description: `Before "${event.title}"`,
            confidence: 0.8,
            urgency: 'upcoming',
            suggestedAction: 'Use this time for deep work',
            reasoning: 'Identified free block before your next commitment',
            preventiveValue: 'Maximize productive time between meetings',
          });
        }
      }
    }

    return predictions;
  },

  /**
   * Predict deal-related needs
   */
  predictFromDeals(deals: Deal[], memory: Memory): PredictedNeed[] {
    const predictions: PredictedNeed[] = [];
    const now = new Date();

    for (const deal of deals) {
      // Skip closed deals
      if (['Closed Won', 'Closed Lost', 'Funded', 'Dead'].includes(deal.stage)) continue;

      // Stale deal detection
      if (deal.lastContact) {
        const daysSinceContact = Math.floor(
          (now.getTime() - new Date(deal.lastContact).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceContact >= 7 && daysSinceContact < 14) {
          predictions.push({
            id: `deal-stale-${deal.id}`,
            type: 'communication',
            title: `Touch base: ${deal.name}`,
            description: `${deal.company} - ${daysSinceContact} days since contact`,
            confidence: 0.85,
            urgency: 'soon',
            suggestedAction: 'Send a check-in message',
            reasoning: `${daysSinceContact} days without contact - deals go cold quickly`,
            preventiveValue: 'Keep deal momentum and prevent ghosting',
          });
        } else if (daysSinceContact >= 14) {
          predictions.push({
            id: `deal-cold-${deal.id}`,
            type: 'communication',
            title: `⚠️ Re-engage: ${deal.name}`,
            description: `${deal.company} - ${daysSinceContact} days since contact (URGENT)`,
            confidence: 0.95,
            urgency: 'immediate',
            suggestedAction: 'Call or send personalized outreach today',
            reasoning: 'Deal at risk of going cold - immediate action needed',
            preventiveValue: 'Save potentially lost revenue',
          });
        }
      }

      // Stage-specific predictions
      if (deal.stage === 'Proposal' || deal.stage === 'Application') {
        predictions.push({
          id: `deal-followup-${deal.id}`,
          type: 'task',
          title: `Follow up on ${deal.stage.toLowerCase()}: ${deal.name}`,
          description: deal.company,
          confidence: 0.8,
          urgency: 'upcoming',
          suggestedAction: 'Check status and address any questions',
          reasoning: `${deal.stage} stage typically needs proactive follow-up`,
          preventiveValue: 'Accelerate deal progress',
        });
      }
    }

    return predictions;
  },

  /**
   * Predict task-related needs
   */
  predictFromTasks(tasks: Task[], userProfile: UserProfile): PredictedNeed[] {
    const predictions: PredictedNeed[] = [];
    const now = new Date();

    // Group tasks by project to detect overwhelm
    const tasksByProject: Record<string, Task[]> = {};
    const pendingTasks = tasks.filter(t => t.status !== 'Done' && t.status !== 'Completed');

    for (const task of pendingTasks) {
      const project = task.project || 'No Project';
      if (!tasksByProject[project]) tasksByProject[project] = [];
      tasksByProject[project].push(task);
    }

    // Overwhelm detection
    if (pendingTasks.length > 15) {
      predictions.push({
        id: 'overwhelm-tasks',
        type: 'self-care',
        title: 'Task overwhelm detected',
        description: `${pendingTasks.length} pending tasks - let's prioritize`,
        confidence: 0.9,
        urgency: 'immediate',
        suggestedAction: 'Enter "Just One Thing" mode - pick the single most important task',
        reasoning: 'Too many open tasks creates decision paralysis',
        preventiveValue: 'Reduce anxiety and increase focus',
      });
    }

    // Overdue task clustering
    const overdueTasks = pendingTasks.filter(t => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < now;
    });

    if (overdueTasks.length >= 3) {
      predictions.push({
        id: 'overdue-cluster',
        type: 'task',
        title: `${overdueTasks.length} overdue tasks need attention`,
        description: 'Multiple items past due - block time to clear these',
        confidence: 0.95,
        urgency: 'immediate',
        suggestedAction: 'Schedule 2-hour "catch-up" block today',
        reasoning: 'Overdue tasks compound stress and risk',
        preventiveValue: 'Clear backlog and reduce mental burden',
      });
    }

    // Project with no recent progress
    for (const [project, projectTasks] of Object.entries(tasksByProject)) {
      if (project === 'No Project') continue;
      
      // Check if all tasks are stale (no completion recently)
      const hasRecentActivity = projectTasks.some(t => t.status === 'In Progress');
      if (!hasRecentActivity && projectTasks.length > 3) {
        predictions.push({
          id: `project-stale-${project}`,
          type: 'task',
          title: `Project needs attention: ${project}`,
          description: `${projectTasks.length} tasks with no recent progress`,
          confidence: 0.75,
          urgency: 'upcoming',
          suggestedAction: 'Review project status and next actions',
          reasoning: 'Stalled projects often indicate blockers or priority shifts',
          preventiveValue: 'Prevent project from falling through cracks',
        });
      }
    }

    return predictions;
  },

  /**
   * Predict follow-up needs
   */
  predictFromFollowUps(followUps: FollowUp[]): PredictedNeed[] {
    const predictions: PredictedNeed[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (const followUp of followUps) {
      if (followUp.status === 'done' || followUp.status === 'sent') continue;
      if (!followUp.dueDate) continue;

      const dueDate = new Date(followUp.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff < 0) {
        predictions.push({
          id: `followup-overdue-${followUp.id}`,
          type: 'communication',
          title: `Overdue: Follow up with ${followUp.personName}`,
          description: followUp.company ? `at ${followUp.company}` : '',
          confidence: 1.0,
          urgency: 'immediate',
          suggestedAction: 'Send follow-up today',
          reasoning: `${Math.abs(daysDiff)} days overdue`,
          preventiveValue: 'Maintain relationship and professionalism',
        });
      } else if (daysDiff === 0) {
        predictions.push({
          id: `followup-today-${followUp.id}`,
          type: 'communication',
          title: `Today: Follow up with ${followUp.personName}`,
          description: followUp.company ? `at ${followUp.company}` : '',
          confidence: 1.0,
          urgency: 'immediate',
          suggestedAction: 'Send follow-up now',
          reasoning: 'Due today',
          preventiveValue: 'Stay on top of commitments',
        });
      } else if (daysDiff === 1) {
        predictions.push({
          id: `followup-tomorrow-${followUp.id}`,
          type: 'communication',
          title: `Tomorrow: Follow up with ${followUp.personName}`,
          description: followUp.company ? `at ${followUp.company}` : '',
          confidence: 0.9,
          urgency: 'upcoming',
          suggestedAction: 'Prepare follow-up message',
          reasoning: 'Due tomorrow - prep now to avoid rush',
          preventiveValue: 'Be proactive instead of reactive',
        });
      }
    }

    return predictions;
  },

  /**
   * Predict emotional/self-care needs
   */
  predictEmotionalNeeds(
    userProfile: UserProfile,
    context: ContextWindow,
    memory: Memory
  ): PredictedNeed[] {
    const predictions: PredictedNeed[] = [];
    const { currentStressLevel, currentEnergyLevel } = userProfile.emotionalBaseline;

    // High stress detection
    if (currentStressLevel >= 7) {
      predictions.push({
        id: 'stress-high',
        type: 'self-care',
        title: 'Stress check-in',
        description: 'Your stress level seems elevated',
        confidence: 0.85,
        urgency: 'immediate',
        suggestedAction: 'Take a 5-minute breathing break, then tackle ONE thing',
        reasoning: 'High stress impairs decision-making and focus',
        preventiveValue: 'Prevent burnout and poor decisions',
      });
    }

    // Low energy detection
    if (currentEnergyLevel <= 3) {
      predictions.push({
        id: 'energy-low',
        type: 'self-care',
        title: 'Energy recharge needed',
        description: 'Your energy is running low',
        confidence: 0.8,
        urgency: 'soon',
        suggestedAction: 'Take a 15-minute break: walk, snack, or rest',
        reasoning: 'Low energy leads to poor work quality and procrastination',
        preventiveValue: 'Restore capacity for meaningful work',
      });
    }

    // End of day wind-down
    if (context.environmentalFactors.timeOfDay === 'evening') {
      predictions.push({
        id: 'wind-down',
        type: 'self-care',
        title: 'Time to wind down',
        description: 'Transitioning out of work mode',
        confidence: 0.7,
        urgency: 'upcoming',
        suggestedAction: 'Review tomorrow\'s priorities, then close work',
        reasoning: 'Evening rest improves tomorrow\'s performance',
        preventiveValue: 'Better sleep and recovery',
      });
    }

    // Pattern-based emotional predictions
    const emotionalPatterns = memory.patterns.filter(p => p.type === 'emotional');
    for (const pattern of emotionalPatterns) {
      if (pattern.confidence > 0.7 && pattern.actionable) {
        predictions.push({
          id: `emotional-pattern-${pattern.id}`,
          type: 'self-care',
          title: pattern.suggestedAction || 'Emotional pattern detected',
          description: pattern.description,
          confidence: pattern.confidence,
          urgency: 'upcoming',
          suggestedAction: pattern.suggestedAction || 'Take a moment to check in with yourself',
          reasoning: `Pattern observed ${pattern.occurrences} times`,
          preventiveValue: 'Stay ahead of emotional dips',
        });
      }
    }

    return predictions;
  },

  /**
   * Predict needs from time-of-day patterns
   */
  predictFromTimePatterns(
    userProfile: UserProfile,
    context: ContextWindow,
    memory: Memory
  ): PredictedNeed[] {
    const predictions: PredictedNeed[] = [];
    const hour = new Date().getHours();

    // Morning routine (if it's morning and they have patterns)
    if (hour >= 6 && hour <= 9) {
      const morningPatterns = memory.patterns.filter(
        p => p.type === 'schedule' && p.description.toLowerCase().includes('morning')
      );
      
      if (morningPatterns.length > 0) {
        predictions.push({
          id: 'morning-routine',
          type: 'reminder',
          title: 'Start your morning routine',
          description: 'Based on your usual patterns',
          confidence: 0.8,
          urgency: 'soon',
          suggestedAction: 'Begin with: Review calendar, check priorities, plan day',
          reasoning: 'Consistent morning routines improve daily outcomes',
          preventiveValue: 'Set yourself up for a productive day',
        });
      }
    }

    // Peak energy time
    if (userProfile.preferences.peakEnergyTimes) {
      const currentHourStr = hour.toString().padStart(2, '0') + ':00';
      if (userProfile.preferences.peakEnergyTimes.includes(currentHourStr)) {
        predictions.push({
          id: 'peak-energy',
          type: 'focus',
          title: 'Peak energy window',
          description: 'This is typically your most productive time',
          confidence: 0.85,
          urgency: 'immediate',
          suggestedAction: 'Tackle your hardest/most important task NOW',
          reasoning: 'Your energy patterns show peak performance at this time',
          preventiveValue: 'Maximize your best hours for highest impact work',
        });
      }
    }

    return predictions;
  },

  /**
   * Rank and filter predictions
   */
  rankPredictions(predictions: PredictedNeed[]): PredictedNeed[] {
    // Remove duplicates by ID
    const unique = predictions.filter((p, i, arr) => 
      arr.findIndex(x => x.id === p.id) === i
    );

    // Sort by urgency then confidence
    const urgencyOrder = { immediate: 0, soon: 1, upcoming: 2, background: 3 };
    
    return unique.sort((a, b) => {
      const urgencyDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (urgencyDiff !== 0) return urgencyDiff;
      return b.confidence - a.confidence;
    });
  },
};

/**
 * PATTERN DETECTOR
 * Learns patterns from user behavior over time
 */
export const patternDetector = {
  /**
   * Analyze interactions to detect patterns
   */
  detectPatterns(memory: Memory): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Analyze completion patterns by time
    const completionTimes = memory.recentInteractions
      .filter(i => i.type === 'task_completed')
      .map(i => ({
        hour: new Date(i.timestamp).getHours(),
        day: new Date(i.timestamp).getDay(),
      }));

    if (completionTimes.length >= 10) {
      // Find most productive hour
      const hourCounts: Record<number, number> = {};
      for (const ct of completionTimes) {
        hourCounts[ct.hour] = (hourCounts[ct.hour] || 0) + 1;
      }
      
      const peakHour = Object.entries(hourCounts)
        .sort(([, a], [, b]) => b - a)[0];
      
      if (peakHour && parseInt(peakHour[1].toString()) >= 5) {
        patterns.push({
          id: 'peak-productivity-hour',
          type: 'productivity',
          description: `Most productive at ${peakHour[0]}:00`,
          confidence: Math.min(0.9, parseInt(peakHour[1].toString()) / completionTimes.length + 0.3),
          occurrences: parseInt(peakHour[1].toString()),
          lastSeen: new Date(),
          actionable: true,
          suggestedAction: `Schedule important tasks around ${peakHour[0]}:00`,
        });
      }
    }

    // Detect procrastination patterns
    const deferrals = memory.recentInteractions.filter(i => i.type === 'task_deferred');
    if (deferrals.length >= 5) {
      // Check if certain types of tasks get deferred more
      const deferralTimes = deferrals.map(d => new Date(d.timestamp).getHours());
      const afternoonDeferrals = deferralTimes.filter(h => h >= 13 && h <= 16).length;
      
      if (afternoonDeferrals / deferrals.length > 0.5) {
        patterns.push({
          id: 'afternoon-procrastination',
          type: 'behavior',
          description: 'Tendency to defer tasks in the afternoon',
          confidence: 0.75,
          occurrences: afternoonDeferrals,
          lastSeen: new Date(),
          actionable: true,
          suggestedAction: 'Use Single Focus Mode in afternoons to maintain momentum',
        });
      }
    }

    // Detect communication patterns
    const communications = memory.recentInteractions.filter(i => i.type === 'communication');
    if (communications.length >= 10) {
      const morningComms = communications.filter(c => {
        const hour = new Date(c.timestamp).getHours();
        return hour >= 8 && hour <= 11;
      }).length;

      if (morningComms / communications.length > 0.6) {
        patterns.push({
          id: 'morning-communicator',
          type: 'schedule',
          description: 'You tend to handle communications in the morning',
          confidence: 0.8,
          occurrences: morningComms,
          lastSeen: new Date(),
          actionable: true,
          suggestedAction: 'Batch communications in morning, protect afternoon for deep work',
        });
      }
    }

    return patterns;
  },

  /**
   * Detect emotional patterns
   */
  detectEmotionalPatterns(memory: Memory): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Analyze emotional context from interactions
    const emotionalInteractions = memory.recentInteractions.filter(i => i.emotionalContext);
    
    if (emotionalInteractions.length >= 5) {
      // Group by day of week
      const stressByDay: Record<number, number> = {};
      for (const interaction of emotionalInteractions) {
        if (interaction.emotionalContext?.includes('stress')) {
          const day = new Date(interaction.timestamp).getDay();
          stressByDay[day] = (stressByDay[day] || 0) + 1;
        }
      }

      const highStressDays = Object.entries(stressByDay)
        .filter(([, count]) => count >= 2)
        .map(([day]) => parseInt(day));

      if (highStressDays.length > 0) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        patterns.push({
          id: 'weekly-stress-pattern',
          type: 'emotional',
          description: `Higher stress typically on ${highStressDays.map(d => dayNames[d]).join(', ')}`,
          confidence: 0.7,
          occurrences: highStressDays.reduce((sum, d) => sum + (stressByDay[d] || 0), 0),
          lastSeen: new Date(),
          actionable: true,
          suggestedAction: `Plan lighter workload or self-care on ${highStressDays.map(d => dayNames[d]).join(', ')}`,
        });
      }
    }

    return patterns;
  },
};
