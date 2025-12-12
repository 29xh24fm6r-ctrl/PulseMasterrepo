// Goal Synthesis Engine - Generate Goals from WorldState + Horizon + Profile
// lib/agi/goals/engine.ts

import { WorldState } from '../types';
import { HorizonPlan } from '../planning/horizon';
import { AGIUserProfile } from '../settings';

export interface CandidateGoal {
  title: string;
  description: string;
  domain: string; // 'work' | 'finance' | 'relationships' | 'health' | 'personal_growth'
  horizonDays: number;
  identityTags: string[];
  config: any;
}

export function synthesizeCandidateGoals(
  world: WorldState,
  horizon: HorizonPlan,
  profile: AGIUserProfile,
): CandidateGoal[] {
  const goals: CandidateGoal[] = [];
  const priorities = profile.priorities || {};
  const hardLimits = profile.hard_limits || {};

  // Helper: Check if domain is allowed
  const isDomainAllowed = (domain: string): boolean => {
    if (hardLimits[`no_${domain}_goals`]) return false;
    return priorities[domain] !== false; // Default to allowed if not explicitly disabled
  };

  // 1. Task Rollover Reduction (work domain)
  const overdueTasks = world.time.overdueTasks || [];
  const todayTasks = world.time.todayTasks || [];
  const totalTasks = overdueTasks.length + todayTasks.length;

  if (isDomainAllowed('work') && overdueTasks.length >= 3) {
    const rolloverRate = overdueTasks.length / Math.max(totalTasks, 1);
    if (rolloverRate > 0.2) { // More than 20% rollover
      goals.push({
        title: 'Reduce task rollover',
        description: `You currently have ${overdueTasks.length} overdue task(s), indicating a pattern of tasks rolling over. This goal focuses on improving task completion rates and reducing backlog.`,
        domain: 'work',
        horizonDays: 30,
        identityTags: world.identity.priorities || [],
        config: {
          metric: 'task_rollover_reduction',
          baseline: overdueTasks.length,
          target: Math.max(1, Math.floor(overdueTasks.length * 0.5)), // Reduce by 50%
        },
      });
    }
  }

  // 2. Email Backlog Stabilization (work/communication domain)
  const urgentEmails = world.email?.urgentThreads || [];
  const waitingOnUser = world.email?.waitingOnUser || [];
  const totalEmailBacklog = urgentEmails.length + waitingOnUser.length;

  if (isDomainAllowed('work') && totalEmailBacklog >= 5) {
    goals.push({
      title: 'Stabilize email inbox',
      description: `You have ${totalEmailBacklog} email thread(s) requiring attention (${urgentEmails.length} urgent, ${waitingOnUser.length} waiting on you). This goal focuses on maintaining a responsive inbox and preventing backlog buildup.`,
      domain: 'work',
      horizonDays: 30,
      identityTags: world.identity.priorities || [],
      config: {
        metric: 'email_backlog_reduction',
        baseline: totalEmailBacklog,
        target: Math.max(2, Math.floor(totalEmailBacklog * 0.6)), // Reduce by 40%
      },
    });
  }

  // 3. Relationship Maintenance (relationships domain)
  const atRiskRelationships = world.relationships.atRiskRelationships || [];
  const relationshipDrift = world.relationships.relationshipDrift || 0;

  if (isDomainAllowed('relationships') && (atRiskRelationships.length >= 2 || relationshipDrift > 0.25)) {
    goals.push({
      title: 'Strengthen key relationships',
      description: `${atRiskRelationships.length} important relationship(s) are at risk (drift score: ${(relationshipDrift * 100).toFixed(0)}%). This goal focuses on proactive relationship maintenance and regular check-ins.`,
      domain: 'relationships',
      horizonDays: 30,
      identityTags: world.identity.values || world.identity.priorities || [],
      config: {
        metric: 'relationship_drift_reduction',
        baseline: relationshipDrift,
        target: Math.max(0, relationshipDrift - 0.2), // Reduce drift by 0.2
        atRiskCount: atRiskRelationships.length,
      },
    });
  }

  // 4. Financial Stability (finance domain)
  const stressSignals = world.finances.stressSignals || [];
  const upcomingBills = world.finances.upcomingBills || [];
  const spendingDrift = world.finances.spendingDrift || 0;

  if (isDomainAllowed('finance') && (stressSignals.length > 0 || spendingDrift > 0.15)) {
    goals.push({
      title: 'Smooth cashflow and reduce financial stress',
      description: `Financial stress signals detected (${stressSignals.length} signal(s)). ${upcomingBills.length} upcoming bill(s). Spending drift: ${(spendingDrift * 100).toFixed(0)}%. This goal focuses on improving cashflow predictability and reducing financial stress.`,
      domain: 'finance',
      horizonDays: 30,
      identityTags: world.identity.priorities || [],
      config: {
        metric: 'financial_stress_reduction',
        baseline: stressSignals.length,
        target: 0, // Eliminate stress signals
        spendingDriftBaseline: spendingDrift,
        spendingDriftTarget: Math.max(0, spendingDrift - 0.1),
      },
    });
  }

  // 5. Calendar Overload Management (work domain)
  const overloadInsight = horizon.insights.find(i => i.type === 'overload');
  if (isDomainAllowed('work') && overloadInsight && overloadInsight.severity !== 'low') {
    goals.push({
      title: 'Manage calendar overload',
      description: `High commitment load detected in the next ${overloadInsight.window}. ${overloadInsight.description}`,
      domain: 'work',
      horizonDays: overloadInsight.window === '7d' ? 7 : 30,
      identityTags: world.identity.priorities || [],
      config: {
        metric: 'calendar_overload_reduction',
        window: overloadInsight.window,
        severity: overloadInsight.severity,
      },
    });
  }

  // 6. Deadline Cluster Preparation (work domain)
  const deadlineClusterInsight = horizon.insights.find(i => i.type === 'deadline_cluster');
  if (isDomainAllowed('work') && deadlineClusterInsight) {
    goals.push({
      title: 'Prepare for deadline cluster',
      description: deadlineClusterInsight.description,
      domain: 'work',
      horizonDays: deadlineClusterInsight.window === '7d' ? 7 : 30,
      identityTags: world.identity.priorities || [],
      config: {
        metric: 'deadline_cluster_preparation',
        window: deadlineClusterInsight.window,
        severity: deadlineClusterInsight.severity,
      },
    });
  }

  // 7. Habit Consistency (health domain)
  const habitRiskSignals = world.habitsAndHealth?.riskSignals || [];
  if (isDomainAllowed('health') && habitRiskSignals.length >= 2) {
    goals.push({
      title: 'Maintain habit consistency',
      description: `${habitRiskSignals.length} habit risk signal(s) detected. This goal focuses on stabilizing your routine and maintaining key habits.`,
      domain: 'health',
      horizonDays: 30,
      identityTags: world.identity.priorities || [],
      config: {
        metric: 'habit_consistency',
        baseline: habitRiskSignals.length,
        target: 0, // Eliminate risk signals
      },
    });
  }

  // Filter goals based on user priorities (prefer domains they care about)
  const prioritizedGoals = goals.filter(g => {
    // If user has explicit priorities, prefer those domains
    if (Object.keys(priorities).length > 0) {
      return priorities[g.domain] === true || priorities[g.domain] === undefined;
    }
    return true; // If no explicit priorities, include all allowed goals
  });

  // Limit to top 5 goals to avoid overwhelming the user
  return prioritizedGoals.slice(0, 5);
}


