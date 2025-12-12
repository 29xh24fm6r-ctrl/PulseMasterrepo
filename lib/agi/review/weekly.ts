// Weekly Review Builder - Strategic Reflection + Plan
// lib/agi/review/weekly.ts

import { WorldState, WeeklyReviewSummary } from '../types';
import { HorizonPlan } from '../planning/horizon';

export function buildWeeklyReviewSummary(
  world: WorldState,
  horizon: HorizonPlan,
  goals: any[], // loaded from agi_goals
  goalProgress: any[], // recent goal_progress
): WeeklyReviewSummary {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - 7);
  const start = startDate.toISOString().slice(0, 10);

  const highlights: string[] = [];
  const lowlights: string[] = [];
  const goalUpdates: WeeklyReviewSummary['goalUpdates'] = [];
  const upcomingRisks: string[] = [];
  const upcomingOpportunities: string[] = [];
  const focusRecommendations: string[] = [];

  // 1. Highlights (positive patterns)
  const overdueTasks = world.time.overdueTasks || [];
  const todayTasks = world.time.todayTasks || [];
  const emotionState = world.emotion?.currentState?.toLowerCase() || '';
  const emotionTrend = world.emotion?.recentTrend || 'stable';

  // If task load is manageable and emotion is positive
  if (overdueTasks.length <= 2 && todayTasks.length <= 8) {
    highlights.push(`Task load is manageable (${todayTasks.length} tasks today, ${overdueTasks.length} overdue)`);
  }

  // If emotion is positive or improving
  if (emotionState.includes('energized') || emotionState.includes('focused')) {
    highlights.push(`You're feeling ${emotionState} - good momentum`);
  } else if (emotionTrend === 'falling' && emotionState.includes('stressed')) {
    highlights.push('Stress levels are decreasing');
  }

  // If relationships are stable
  const atRiskRelationships = world.relationships.atRiskRelationships || [];
  if (atRiskRelationships.length === 0) {
    highlights.push('All key relationships are stable');
  }

  // If financial stress is low
  const stressSignals = world.finances.stressSignals || [];
  if (stressSignals.length === 0) {
    highlights.push('No financial stress signals detected');
  }

  // 2. Lowlights (areas needing attention)
  if (overdueTasks.length > 5) {
    lowlights.push(`${overdueTasks.length} overdue task(s) - task rollover pattern detected`);
  }

  const urgentEmails = world.email?.urgentThreads || [];
  const waitingOnUser = world.email?.waitingOnUser || [];
  if (urgentEmails.length + waitingOnUser.length > 5) {
    lowlights.push(`${urgentEmails.length + waitingOnUser.length} email thread(s) requiring attention`);
  }

  if (atRiskRelationships.length >= 3) {
    lowlights.push(`${atRiskRelationships.length} important relationship(s) at risk`);
  }

  if (stressSignals.length > 0) {
    lowlights.push(`${stressSignals.length} financial stress signal(s) detected`);
  }

  if (emotionState.includes('stressed') || emotionState.includes('overwhelmed')) {
    if (emotionTrend === 'rising') {
      lowlights.push(`Stress is rising (${emotionState}) - consider recovery actions`);
    } else {
      lowlights.push(`Feeling ${emotionState} - monitor and adjust workload`);
    }
  }

  // 3. Goal Updates
  for (const goal of goals) {
    if (goal.status !== 'active') continue;

    // Find most recent progress entry for this goal
    const recentProgress = goalProgress
      .filter((p: any) => p.goal_id === goal.id)
      .sort((a: any, b: any) => 
        new Date(b.snapshot_date).getTime() - new Date(a.snapshot_date).getTime()
      )[0];

    let progressNote = 'No progress data yet';
    if (recentProgress) {
      const config = goal.config || {};
      const baseline = config.baseline || 0;
      const target = config.target || 0;
      const currentValue = recentProgress.value ?? recentProgress.progress ?? 0;

      if (config.metric === 'task_rollover_reduction') {
        const reduction = baseline - currentValue;
        progressNote = `${reduction > 0 ? 'Reduced' : 'Current'} rollover: ${currentValue} tasks (target: ${target})`;
      } else if (config.metric === 'email_backlog_reduction') {
        const reduction = baseline - currentValue;
        progressNote = `${reduction > 0 ? 'Reduced' : 'Current'} backlog: ${currentValue} emails (target: ${target})`;
      } else if (config.metric === 'relationship_drift_reduction') {
        const reduction = baseline - currentValue;
        progressNote = `Drift score: ${(currentValue * 100).toFixed(0)}% (target: ${(target * 100).toFixed(0)}%)`;
      } else if (recentProgress.progress !== null) {
        progressNote = `${(recentProgress.progress * 100).toFixed(0)}% complete`;
      } else {
        progressNote = recentProgress.note || 'Progress tracked';
      }
    }

    goalUpdates.push({
      goalId: goal.id,
      title: goal.title,
      status: goal.status,
      progressNote,
    });
  }

  // 4. Upcoming Risks (from horizon insights)
  const riskInsights = horizon.insights.filter(i => 
    i.severity === 'high' || i.severity === 'medium'
  );
  
  for (const insight of riskInsights) {
    if (insight.type === 'overload' || insight.type === 'deadline_cluster') {
      upcomingRisks.push(insight.description);
    } else if (insight.type === 'financial_risk') {
      upcomingRisks.push(insight.description);
    } else if (insight.type === 'relationship_risk') {
      upcomingRisks.push(insight.description);
    }
  }

  // 5. Upcoming Opportunities (from horizon insights)
  const opportunityInsights = horizon.insights.filter(i => 
    i.type === 'underload'
  );
  
  for (const insight of opportunityInsights) {
    upcomingOpportunities.push(insight.description);
  }

  // If calendar is relatively open, suggest deep work
  const upcomingEvents = world.time.upcomingEvents || [];
  if (upcomingEvents.length < 10) {
    upcomingOpportunities.push('Light calendar ahead - good opportunity for deep work or larger projects');
  }

  // 6. Focus Recommendations (based on identity, priorities, and patterns)
  const priorities = world.identity.priorities || [];
  const blindspots = world.identity.blindspots || [];

  // If task avoidance is a blindspot
  if (blindspots.includes('task_avoidance') && overdueTasks.length > 3) {
    focusRecommendations.push('Focus on breaking down and completing overdue tasks to address task avoidance pattern');
  }

  // If relationship neglect is a blindspot
  if (blindspots.includes('relationship_neglect') && atRiskRelationships.length > 0) {
    focusRecommendations.push('Schedule relationship check-ins to address relationship neglect pattern');
  }

  // Based on priorities
  if (priorities.length > 0) {
    const topPriority = priorities[0];
    if (topPriority.toLowerCase().includes('work') || topPriority.toLowerCase().includes('career')) {
      focusRecommendations.push('Prioritize work goals and pipeline advancement');
    } else if (topPriority.toLowerCase().includes('family') || topPriority.toLowerCase().includes('relationship')) {
      focusRecommendations.push('Focus on relationship maintenance and quality time');
    }
  }

  // Based on horizon insights
  const deadlineCluster = horizon.insights.find(i => i.type === 'deadline_cluster');
  if (deadlineCluster) {
    focusRecommendations.push('Start preparing for upcoming deadline cluster early to avoid last-minute stress');
  }

  // Based on predictions
  const predictions = world.predictions;
  if (predictions?.likelyAfternoonStress === 'high') {
    focusRecommendations.push('Schedule demanding work in morning hours when stress is predicted to be lower');
  }

  return {
    periodStart: start,
    periodEnd: end,
    highlights,
    lowlights,
    goalUpdates,
    upcomingRisks,
    upcomingOpportunities,
    focusRecommendations,
  };
}


