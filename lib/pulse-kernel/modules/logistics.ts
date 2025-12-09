// Pulse Kernel: Logistics & Automation Layer
// Modules for scheduling, travel, budgeting, relationship mgmt, home mgmt
// Available under pulse.modules.logistics.*

import { UserProfile, Memory, ContextWindow, CalendarEvent, TimeSlot } from '../types';

/**
 * SCHEDULING MODULE
 * Smart calendar management
 */
export const scheduling = {
  /**
   * Find optimal time for a new event
   */
  findOptimalSlot(
    duration: number, // minutes
    context: ContextWindow,
    preferences: {
      preferMorning?: boolean;
      preferAfternoon?: boolean;
      avoidBackToBack?: boolean;
      energyRequired?: 'low' | 'medium' | 'high';
    } = {}
  ): TimeSlot | null {
    const freeSlots = context.calendarContext.freeSlots
      .filter(slot => slot.duration >= duration);

    if (freeSlots.length === 0) return null;

    // Score each slot
    const scoredSlots = freeSlots.map(slot => {
      let score = 0;
      const hour = slot.start.getHours();

      // Morning preference (9-12)
      if (preferences.preferMorning && hour >= 9 && hour < 12) {
        score += 10;
      }

      // Afternoon preference (14-17)
      if (preferences.preferAfternoon && hour >= 14 && hour < 17) {
        score += 10;
      }

      // Avoid very early or very late
      if (hour < 8 || hour >= 18) {
        score -= 5;
      }

      // High energy tasks should be scheduled at peak times
      if (preferences.energyRequired === 'high' && (hour === 9 || hour === 10 || hour === 14)) {
        score += 5;
      }

      // Low energy tasks can be scheduled anywhere
      if (preferences.energyRequired === 'low') {
        score += 3;
      }

      // Avoid back-to-back if requested
      if (preferences.avoidBackToBack) {
        // Check if this slot is right after another event
        // Simplified check: give bonus to slots starting at :30
        if (slot.start.getMinutes() === 30) {
          score += 2;
        }
      }

      // Prefer longer slots (more flexibility)
      if (slot.duration > duration + 30) {
        score += 3;
      }

      return { slot, score };
    });

    // Return the best slot
    scoredSlots.sort((a, b) => b.score - a.score);
    return scoredSlots[0]?.slot || null;
  },

  /**
   * Suggest rescheduling for overloaded days
   */
  suggestRescheduling(
    events: CalendarEvent[],
    maxMeetingsPerDay: number = 5
  ): { event: CalendarEvent; reason: string; suggestedAction: string }[] {
    const suggestions: { event: CalendarEvent; reason: string; suggestedAction: string }[] = [];

    // Group by day
    const byDay: Record<string, CalendarEvent[]> = {};
    for (const event of events) {
      const day = event.start.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(event);
    }

    // Check each day
    for (const [day, dayEvents] of Object.entries(byDay)) {
      const meetings = dayEvents.filter(e => e.type === 'meeting');
      
      if (meetings.length > maxMeetingsPerDay) {
        // Suggest rescheduling the lowest priority ones
        const toReschedule = meetings.slice(maxMeetingsPerDay);
        for (const event of toReschedule) {
          suggestions.push({
            event,
            reason: `${day} has ${meetings.length} meetings (max recommended: ${maxMeetingsPerDay})`,
            suggestedAction: 'Consider moving to a lighter day',
          });
        }
      }

      // Check for back-to-back meetings
      const sortedMeetings = meetings.sort((a, b) => a.start.getTime() - b.start.getTime());
      for (let i = 0; i < sortedMeetings.length - 1; i++) {
        const current = sortedMeetings[i];
        const next = sortedMeetings[i + 1];
        const gap = (next.start.getTime() - current.end.getTime()) / 60000;
        
        if (gap < 10) { // Less than 10 minutes between
          suggestions.push({
            event: next,
            reason: 'Back-to-back meeting with no break',
            suggestedAction: 'Add 15-minute buffer before this meeting',
          });
        }
      }
    }

    return suggestions;
  },

  /**
   * Calculate available deep work time
   */
  calculateDeepWorkTime(context: ContextWindow): {
    totalMinutes: number;
    blocks: TimeSlot[];
    suggestion: string;
  } {
    // Deep work needs at least 60-minute blocks
    const deepWorkSlots = context.calendarContext.freeSlots.filter(slot => slot.duration >= 60);
    
    const totalMinutes = deepWorkSlots.reduce((sum, slot) => sum + slot.duration, 0);

    let suggestion = '';
    if (totalMinutes < 60) {
      suggestion = 'Very limited deep work time today. Consider declining a meeting or blocking tomorrow morning.';
    } else if (totalMinutes < 120) {
      suggestion = 'Limited deep work time. Use it wisely on your most important task.';
    } else if (totalMinutes < 240) {
      suggestion = 'Good amount of deep work time available. Plan 2-3 focused sessions.';
    } else {
      suggestion = 'Plenty of deep work time! Great day for tackling complex projects.';
    }

    return {
      totalMinutes,
      blocks: deepWorkSlots,
      suggestion,
    };
  },
};

/**
 * TRAVEL MODULE
 * Trip planning and logistics
 */
export const travel = {
  /**
   * Create pre-trip checklist
   */
  createTripChecklist(trip: {
    destination: string;
    departureDate: Date;
    returnDate: Date;
    purpose: 'business' | 'personal' | 'mixed';
    international: boolean;
  }): { category: string; items: { task: string; dueBeforeDays: number }[] }[] {
    const checklist: { category: string; items: { task: string; dueBeforeDays: number }[] }[] = [];

    // Documents
    const documents = {
      category: 'Documents',
      items: [
        { task: 'Check passport expiration (6+ months validity)', dueBeforeDays: 30 },
        { task: 'Confirm flight bookings', dueBeforeDays: 7 },
        { task: 'Print/download boarding passes', dueBeforeDays: 1 },
        { task: 'Hotel confirmations', dueBeforeDays: 3 },
      ],
    };

    if (trip.international) {
      documents.items.push({ task: 'Check visa requirements', dueBeforeDays: 45 });
      documents.items.push({ task: 'Register with embassy (if required)', dueBeforeDays: 14 });
    }

    checklist.push(documents);

    // Business specific
    if (trip.purpose === 'business' || trip.purpose === 'mixed') {
      checklist.push({
        category: 'Business',
        items: [
          { task: 'Prepare meeting materials', dueBeforeDays: 3 },
          { task: 'Confirm meeting schedules', dueBeforeDays: 2 },
          { task: 'Pack business attire', dueBeforeDays: 1 },
          { task: 'Set out-of-office replies', dueBeforeDays: 1 },
          { task: 'Brief team on coverage', dueBeforeDays: 2 },
        ],
      });
    }

    // Packing
    checklist.push({
      category: 'Packing',
      items: [
        { task: 'Check weather at destination', dueBeforeDays: 3 },
        { task: 'Pack essentials', dueBeforeDays: 1 },
        { task: 'Chargers and electronics', dueBeforeDays: 1 },
        { task: 'Toiletries', dueBeforeDays: 1 },
        { task: 'Medications', dueBeforeDays: 2 },
      ],
    });

    // Home
    checklist.push({
      category: 'Home',
      items: [
        { task: 'Arrange pet/plant care', dueBeforeDays: 7 },
        { task: 'Hold mail or arrange pickup', dueBeforeDays: 3 },
        { task: 'Check home security', dueBeforeDays: 1 },
        { task: 'Take out trash', dueBeforeDays: 1 },
      ],
    });

    return checklist;
  },

  /**
   * Calculate travel buffer time
   */
  calculateTravelBuffer(
    eventStart: Date,
    travelMode: 'driving' | 'transit' | 'walking',
    estimatedTravelMinutes: number
  ): { leaveBy: Date; bufferMinutes: number; suggestion: string } {
    // Add buffer based on mode
    const bufferMultipliers = {
      driving: 1.3, // 30% buffer for traffic
      transit: 1.25, // 25% buffer for delays
      walking: 1.1, // 10% buffer
    };

    const buffer = Math.ceil(estimatedTravelMinutes * bufferMultipliers[travelMode]);
    const leaveBy = new Date(eventStart.getTime() - buffer * 60 * 1000);

    return {
      leaveBy,
      bufferMinutes: buffer - estimatedTravelMinutes,
      suggestion: `Leave by ${leaveBy.toLocaleTimeString()} to arrive with ${buffer - estimatedTravelMinutes} minutes buffer`,
    };
  },
};

/**
 * BUDGETING MODULE
 * Personal finance tracking
 */
export const budgeting = {
  /**
   * Analyze spending patterns
   */
  analyzeSpending(transactions: {
    date: Date;
    amount: number;
    category: string;
    description: string;
  }[]): {
    byCategory: Record<string, number>;
    total: number;
    topCategories: { category: string; amount: number; percentage: number }[];
    anomalies: { transaction: typeof transactions[0]; reason: string }[];
  } {
    const byCategory: Record<string, number> = {};
    let total = 0;

    for (const tx of transactions) {
      byCategory[tx.category] = (byCategory[tx.category] || 0) + tx.amount;
      total += tx.amount;
    }

    const topCategories = Object.entries(byCategory)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: Math.round((amount / total) * 100),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    // Find anomalies (unusually large transactions)
    const avgTransaction = total / transactions.length;
    const anomalies = transactions
      .filter(tx => tx.amount > avgTransaction * 3)
      .map(tx => ({
        transaction: tx,
        reason: `Unusually large (${Math.round(tx.amount / avgTransaction)}x average)`,
      }));

    return { byCategory, total, topCategories, anomalies };
  },

  /**
   * Create budget alerts
   */
  createBudgetAlerts(
    budget: Record<string, number>, // category -> monthly limit
    spent: Record<string, number>   // category -> amount spent this month
  ): { category: string; spent: number; budget: number; percentage: number; alert: string }[] {
    const alerts: { category: string; spent: number; budget: number; percentage: number; alert: string }[] = [];

    for (const [category, limit] of Object.entries(budget)) {
      const amount = spent[category] || 0;
      const percentage = Math.round((amount / limit) * 100);

      if (percentage >= 100) {
        alerts.push({
          category,
          spent: amount,
          budget: limit,
          percentage,
          alert: `⚠️ Over budget! Spent ${percentage}% of ${category} budget`,
        });
      } else if (percentage >= 80) {
        alerts.push({
          category,
          spent: amount,
          budget: limit,
          percentage,
          alert: `⚡ Approaching limit: ${percentage}% of ${category} budget used`,
        });
      }
    }

    return alerts.sort((a, b) => b.percentage - a.percentage);
  },
};

/**
 * RELATIONSHIP MANAGEMENT MODULE
 * Keeping in touch with important people
 */
export const relationshipMgmt = {
  /**
   * Calculate relationship health score
   */
  calculateHealthScore(relationship: {
    name: string;
    importance: 'high' | 'medium' | 'low';
    lastContact: Date | null;
    interactionCount: number;
  }): { score: number; status: string; suggestion: string } {
    const now = new Date();
    const daysSinceContact = relationship.lastContact
      ? Math.floor((now.getTime() - relationship.lastContact.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // Expected contact frequency based on importance
    const expectedFrequency = {
      high: 14,    // Every 2 weeks
      medium: 30,  // Monthly
      low: 90,     // Quarterly
    };

    const expected = expectedFrequency[relationship.importance];
    const ratio = daysSinceContact / expected;

    let score: number;
    let status: string;
    let suggestion: string;

    if (ratio <= 0.5) {
      score = 100;
      status = '🟢 Strong';
      suggestion = 'Relationship is healthy. Keep it up!';
    } else if (ratio <= 1) {
      score = 80;
      status = '🟢 Good';
      suggestion = 'On track. Consider reaching out soon.';
    } else if (ratio <= 1.5) {
      score = 60;
      status = '🟡 Needs attention';
      suggestion = `It's been ${daysSinceContact} days. Time to reconnect.`;
    } else if (ratio <= 2) {
      score = 40;
      status = '🟠 At risk';
      suggestion = `${daysSinceContact} days since contact. Reach out this week.`;
    } else {
      score = 20;
      status = '🔴 Dormant';
      suggestion = `Relationship has gone cold (${daysSinceContact} days). Send a message today.`;
    }

    return { score, status, suggestion };
  },

  /**
   * Generate conversation starters based on context
   */
  generateConversationStarters(person: {
    name: string;
    interests?: string[];
    lastTopics?: string[];
    company?: string;
    role?: string;
  }): string[] {
    const starters: string[] = [];
    const firstName = person.name.split(' ')[0];

    // Generic openers
    starters.push(`Hey ${firstName}, how have you been?`);
    starters.push(`Hi ${firstName}! Been thinking about you - how's everything going?`);

    // Interest-based
    if (person.interests && person.interests.length > 0) {
      const interest = person.interests[0];
      starters.push(`Hey ${firstName}! Saw something about ${interest} and thought of you. How's that going?`);
    }

    // Work-based
    if (person.company) {
      starters.push(`Hi ${firstName}! How are things at ${person.company}?`);
    }

    // Last topic follow-up
    if (person.lastTopics && person.lastTopics.length > 0) {
      const topic = person.lastTopics[0];
      starters.push(`Hey ${firstName}! Following up on our chat about ${topic} - any updates?`);
    }

    return starters;
  },
};

/**
 * HOME MANAGEMENT MODULE
 * Household tasks and maintenance
 */
export const homeManagement = {
  /**
   * Generate recurring maintenance schedule
   */
  generateMaintenanceSchedule(): {
    frequency: string;
    tasks: { task: string; lastDone?: Date; nextDue: Date }[];
  }[] {
    const now = new Date();
    
    return [
      {
        frequency: 'Weekly',
        tasks: [
          { task: 'Vacuum/mop floors', nextDue: getNextWeekday(now, 6) }, // Saturday
          { task: 'Clean bathrooms', nextDue: getNextWeekday(now, 6) },
          { task: 'Laundry', nextDue: getNextWeekday(now, 0) }, // Sunday
          { task: 'Meal prep', nextDue: getNextWeekday(now, 0) },
        ],
      },
      {
        frequency: 'Monthly',
        tasks: [
          { task: 'Deep clean kitchen', nextDue: getFirstOfMonth(now, 1) },
          { task: 'Check smoke detectors', nextDue: getFirstOfMonth(now, 1) },
          { task: 'Clean air filters', nextDue: getFirstOfMonth(now, 1) },
          { task: 'Review subscriptions', nextDue: getFirstOfMonth(now, 1) },
        ],
      },
      {
        frequency: 'Quarterly',
        tasks: [
          { task: 'Clean gutters', nextDue: getQuarterStart(now, 1) },
          { task: 'HVAC maintenance', nextDue: getQuarterStart(now, 1) },
          { task: 'Rotate mattress', nextDue: getQuarterStart(now, 1) },
          { task: 'Deep clean appliances', nextDue: getQuarterStart(now, 1) },
        ],
      },
      {
        frequency: 'Annually',
        tasks: [
          { task: 'Roof inspection', nextDue: new Date(now.getFullYear() + 1, 3, 1) }, // April
          { task: 'Pest inspection', nextDue: new Date(now.getFullYear() + 1, 4, 1) }, // May
          { task: 'Clean dryer vent', nextDue: new Date(now.getFullYear() + 1, 0, 1) }, // January
        ],
      },
    ];
  },

  /**
   * Suggest bulk shopping list
   */
  suggestShoppingList(preferences: {
    dietaryRestrictions?: string[];
    householdSize: number;
  }): { category: string; items: string[] }[] {
    return [
      {
        category: 'Pantry Staples',
        items: ['Rice', 'Pasta', 'Olive oil', 'Salt', 'Pepper', 'Canned tomatoes', 'Beans'],
      },
      {
        category: 'Proteins',
        items: ['Chicken', 'Ground beef', 'Eggs', 'Tofu', 'Fish'],
      },
      {
        category: 'Produce',
        items: ['Onions', 'Garlic', 'Potatoes', 'Carrots', 'Leafy greens', 'Tomatoes', 'Fruits'],
      },
      {
        category: 'Dairy',
        items: ['Milk', 'Cheese', 'Butter', 'Yogurt'],
      },
      {
        category: 'Household',
        items: ['Paper towels', 'Toilet paper', 'Dish soap', 'Laundry detergent', 'Trash bags'],
      },
    ];
  },
};

// Helper functions
function getNextWeekday(from: Date, targetDay: number): Date {
  const result = new Date(from);
  const currentDay = result.getDay();
  const daysUntil = (targetDay - currentDay + 7) % 7 || 7;
  result.setDate(result.getDate() + daysUntil);
  return result;
}

function getFirstOfMonth(from: Date, monthsAhead: number): Date {
  const result = new Date(from);
  result.setMonth(result.getMonth() + monthsAhead);
  result.setDate(1);
  return result;
}

function getQuarterStart(from: Date, quartersAhead: number): Date {
  const result = new Date(from);
  const currentQuarter = Math.floor(result.getMonth() / 3);
  const targetQuarter = (currentQuarter + quartersAhead) % 4;
  const targetYear = result.getFullYear() + Math.floor((currentQuarter + quartersAhead) / 4);
  return new Date(targetYear, targetQuarter * 3, 1);
}

/**
 * Export all logistics modules
 */
export const logistics = {
  scheduling,
  travel,
  budgeting,
  relationshipMgmt,
  homeManagement,
};
