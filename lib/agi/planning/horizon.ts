// Long-Horizon Planning Engine - 7/30/90 Day Strategic Analysis
// lib/agi/planning/horizon.ts

import { WorldState } from '../types';

export interface HorizonWindow {
  label: string;          // '7d', '30d', '90d'
  start: string;          // ISO date string
  end: string;            // ISO date string
}

export interface HorizonInsight {
  window: '7d' | '30d' | '90d';
  type: 'overload' | 'underload' | 'deadline_cluster' | 'travel' | 'relationship_risk' | 'financial_risk' | 'habit_risk';
  label: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface HorizonPlan {
  insights: HorizonInsight[];
  recommendedActions: any[]; // later mapped into AGIAction by an agent
}

export function computeHorizonWindows(now: Date = new Date()): HorizonWindow[] {
  const base = new Date(now);
  const startIso = (d: Date) => d.toISOString();

  const mkWindow = (days: number): HorizonWindow => {
    const start = new Date(base);
    const end = new Date(base);
    end.setDate(end.getDate() + days);
    return { label: `${days}d`, start: startIso(start), end: startIso(end) };
  };

  return [mkWindow(7), mkWindow(30), mkWindow(90)];
}

export function analyzeHorizon(world: WorldState, now: Date = new Date()): HorizonPlan {
  const windows = computeHorizonWindows(now);
  const insights: HorizonInsight[] = [];

  // Analyze calendar events across horizons
  const upcomingEvents = world.time.upcomingEvents || [];
  const keyDeadlines = world.work.keyDeadlines || [];
  const upcomingBills = world.finances.upcomingBills || [];

  // 1. Overload detection (7d, 30d)
  for (const window of windows.slice(0, 2)) { // 7d and 30d
    const windowStart = new Date(window.start);
    const windowEnd = new Date(window.end);
    
    const eventsInWindow = upcomingEvents.filter((e: any) => {
      const eventDate = e.start ? new Date(e.start) : null;
      return eventDate && eventDate >= windowStart && eventDate <= windowEnd;
    });

    const deadlinesInWindow = keyDeadlines.filter((d: any) => {
      const deadlineDate = d.dueDate ? new Date(d.dueDate) : null;
      return deadlineDate && deadlineDate >= windowStart && deadlineDate <= windowEnd;
    });

    const totalCommitments = eventsInWindow.length + deadlinesInWindow.length;
    
    // Threshold: more than 15 commitments in 7d, or 40 in 30d
    const threshold = window.label === '7d' ? 15 : 40;
    if (totalCommitments > threshold) {
      insights.push({
        window: window.label as '7d' | '30d',
        type: 'overload',
        label: `High commitment load in next ${window.label}`,
        description: `${totalCommitments} events and deadlines in the next ${window.label}. Consider deferring non-urgent items or breaking large tasks into smaller chunks.`,
        severity: totalCommitments > threshold * 1.5 ? 'high' : 'medium',
      });
    }
  }

  // 2. Deadline clustering (7d, 30d)
  for (const window of windows.slice(0, 2)) {
    const windowStart = new Date(window.start);
    const windowEnd = new Date(window.end);
    
    const deadlinesInWindow = keyDeadlines.filter((d: any) => {
      const deadlineDate = d.dueDate ? new Date(d.dueDate) : null;
      return deadlineDate && deadlineDate >= windowStart && deadlineDate <= windowEnd;
    });

    // Check for clustering: multiple deadlines within 3-5 days
    if (deadlinesInWindow.length >= 3) {
      const sortedDeadlines = deadlinesInWindow
        .map((d: any) => new Date(d.dueDate))
        .sort((a, b) => a.getTime() - b.getTime());

      let clusterFound = false;
      for (let i = 0; i < sortedDeadlines.length - 2; i++) {
        const daysDiff = (sortedDeadlines[i + 2].getTime() - sortedDeadlines[i].getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff <= 5) {
          clusterFound = true;
          break;
        }
      }

      if (clusterFound) {
        insights.push({
          window: window.label as '7d' | '30d',
          type: 'deadline_cluster',
          label: `Deadline cluster in next ${window.label}`,
          description: `${deadlinesInWindow.length} key deadlines clustered in the next ${window.label}. Consider starting prep work early to avoid last-minute stress.`,
          severity: deadlinesInWindow.length >= 5 ? 'high' : 'medium',
        });
      }
    }
  }

  // 3. Financial risk (30d, 90d)
  for (const window of windows.slice(1)) { // 30d and 90d
    const windowStart = new Date(window.start);
    const windowEnd = new Date(window.end);
    
    const billsInWindow = upcomingBills.filter((b: any) => {
      const billDate = b.dueDate ? new Date(b.dueDate) : null;
      return billDate && billDate >= windowStart && billDate <= windowEnd;
    });

    const totalBillAmount = billsInWindow.reduce((sum: number, b: any) => sum + (b.amount || 0), 0);
    
    // Check for financial stress signals
    const stressSignals = world.finances.stressSignals || [];
    const hasStressSignals = stressSignals.length > 0;

    // If many bills in a short window or stress signals present
    if (billsInWindow.length >= 5 || (hasStressSignals && billsInWindow.length >= 3)) {
      insights.push({
        window: window.label as '30d' | '90d',
        type: 'financial_risk',
        label: `Financial pressure in next ${window.label}`,
        description: `${billsInWindow.length} bills totaling $${totalBillAmount.toFixed(2)} due in the next ${window.label}. ${hasStressSignals ? 'Financial stress signals detected.' : ''} Consider reviewing cashflow and prioritizing payments.`,
        severity: totalBillAmount > 5000 || billsInWindow.length >= 8 ? 'high' : 'medium',
      });
    }
  }

  // 4. Relationship risk (30d, 90d)
  const atRiskRelationships = world.relationships.atRiskRelationships || [];
  const relationshipDrift = world.relationships.relationshipDrift || 0;

  if (atRiskRelationships.length >= 3 || relationshipDrift > 0.3) {
    insights.push({
      window: '30d',
      type: 'relationship_risk',
      label: 'Relationship drift detected',
      description: `${atRiskRelationships.length} important relationships are at risk. Overall drift score: ${(relationshipDrift * 100).toFixed(0)}%. Consider scheduling check-ins or touchpoints.`,
      severity: atRiskRelationships.length >= 5 || relationshipDrift > 0.5 ? 'high' : 'medium',
    });
  }

  // 5. Habit risk (30d, 90d) - if habits/health data available
  if (world.habitsAndHealth?.riskSignals && world.habitsAndHealth.riskSignals.length > 0) {
    insights.push({
      window: '30d',
      type: 'habit_risk',
      label: 'Habit maintenance risk',
      description: `${world.habitsAndHealth.riskSignals.length} habit risk signal(s) detected. Review your routine patterns and consider adjustments.`,
      severity: world.habitsAndHealth.riskSignals.length >= 3 ? 'high' : 'medium',
    });
  }

  // 6. Underload detection (30d, 90d) - if calendar is unusually sparse
  for (const window of windows.slice(1)) {
    const windowStart = new Date(window.start);
    const windowEnd = new Date(window.end);
    
    const eventsInWindow = upcomingEvents.filter((e: any) => {
      const eventDate = e.start ? new Date(e.start) : null;
      return eventDate && eventDate >= windowStart && eventDate <= windowEnd;
    });

    // If very few events in a 30d or 90d window, might indicate opportunity for planning
    const daysInWindow = (windowEnd.getTime() - windowStart.getTime()) / (1000 * 60 * 60 * 24);
    const eventsPerWeek = (eventsInWindow.length / daysInWindow) * 7;
    
    if (eventsPerWeek < 2 && window.label === '30d') {
      insights.push({
        window: '30d',
        type: 'underload',
        label: 'Light calendar in next 30 days',
        description: `Your calendar is relatively open in the next 30 days (${eventsInWindow.length} events). This could be a good opportunity for deep work, planning, or tackling larger projects.`,
        severity: 'low',
      });
    }
  }

  return {
    insights,
    recommendedActions: [], // Will be populated by agents based on insights
  };
}


