// Strategic Narrative Generator - Human-Readable Explanations
// lib/agi/narrative/strategic.ts

import { WorldState, WeeklyReviewSummary } from '../types';
import { HorizonPlan } from '../planning/horizon';
import { callAI } from '@/lib/ai/call';

export async function generateWeeklyNarrative(
  userId: string,
  world: WorldState,
  summary: WeeklyReviewSummary,
  horizon?: HorizonPlan,
): Promise<string> {
  // Build context for LLM
  const highlightsText = summary.highlights.length > 0
    ? `Highlights:\n${summary.highlights.map(h => `- ${h}`).join('\n')}`
    : 'No major highlights this week.';

  const lowlightsText = summary.lowlights.length > 0
    ? `Areas needing attention:\n${summary.lowlights.map(l => `- ${l}`).join('\n')}`
    : 'No major concerns this week.';

  const goalUpdatesText = summary.goalUpdates.length > 0
    ? `Goal progress:\n${summary.goalUpdates.map(g => `- ${g.title}: ${g.progressNote}`).join('\n')}`
    : 'No active goals to track.';

  const risksText = summary.upcomingRisks.length > 0
    ? `Upcoming risks:\n${summary.upcomingRisks.map(r => `- ${r}`).join('\n')}`
    : 'No major risks identified.';

  const opportunitiesText = summary.upcomingOpportunities.length > 0
    ? `Upcoming opportunities:\n${summary.upcomingOpportunities.map(o => `- ${o}`).join('\n')}`
    : 'No specific opportunities identified.';

  const focusText = summary.focusRecommendations.length > 0
    ? `Focus recommendations:\n${summary.focusRecommendations.map(f => `- ${f}`).join('\n')}`
    : 'Continue current trajectory.';

  const systemPrompt = `You are Pulse, an AI life intelligence system. You help users understand their life patterns and make strategic decisions. Write a warm, insightful weekly review narrative (3-6 paragraphs) that:

1. Summarizes what happened this week (highlights and lowlights)
2. Explains how they're tracking vs their goals
3. Identifies patterns and trends
4. Highlights upcoming risks and opportunities
5. Provides clear focus recommendations for next week

Be conversational, empathetic, and actionable. Use "you" and "your" (not "the user"). Keep it concise but meaningful.`;

  const userPrompt = `Write a weekly review narrative for the period ${summary.periodStart} to ${summary.periodEnd}.

${highlightsText}

${lowlightsText}

${goalUpdatesText}

${risksText}

${opportunitiesText}

${focusText}

User context:
- Roles: ${world.identity.roles.join(', ') || 'Not specified'}
- Priorities: ${world.identity.priorities.join(', ') || 'Not specified'}
- Current emotion: ${world.emotion?.currentState || 'Not specified'}
- Task load: ${world.time.todayTasks.length} tasks today, ${world.time.overdueTasks.length} overdue

Write a narrative that ties these together into a coherent story about their week and what's ahead.`;

  try {
    const result = await callAI({
      userId,
      model: 'gpt-4o-mini',
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      maxTokens: 1500,
      feature: 'agi_weekly_review',
    });

    if (result.success && result.content) {
      return result.content;
    } else {
      // Fallback to structured summary if LLM fails
      return generateFallbackNarrative(summary, world);
    }
  } catch (error: any) {
    console.error('[AGI][Narrative] Failed to generate weekly narrative:', error);
    return generateFallbackNarrative(summary, world);
  }
}

function generateFallbackNarrative(summary: WeeklyReviewSummary, world: WorldState): string {
  const paragraphs: string[] = [];

  // Paragraph 1: Week summary
  if (summary.highlights.length > 0 || summary.lowlights.length > 0) {
    paragraphs.push(
      `This week (${summary.periodStart} to ${summary.periodEnd}) had its ups and downs. ` +
      (summary.highlights.length > 0
        ? `On the positive side: ${summary.highlights.join('; ')}. `
        : '') +
      (summary.lowlights.length > 0
        ? `Areas needing attention: ${summary.lowlights.join('; ')}.`
        : '')
    );
  }

  // Paragraph 2: Goal progress
  if (summary.goalUpdates.length > 0) {
    paragraphs.push(
      `Your goals are progressing: ${summary.goalUpdates.map(g => `${g.title} (${g.progressNote})`).join('; ')}.`
    );
  }

  // Paragraph 3: Upcoming
  if (summary.upcomingRisks.length > 0 || summary.upcomingOpportunities.length > 0) {
    paragraphs.push(
      `Looking ahead: ` +
      (summary.upcomingRisks.length > 0
        ? `Watch out for ${summary.upcomingRisks.slice(0, 2).join(' and ')}. `
        : '') +
      (summary.upcomingOpportunities.length > 0
        ? `Opportunities: ${summary.upcomingOpportunities.slice(0, 2).join(' and ')}.`
        : '')
    );
  }

  // Paragraph 4: Focus
  if (summary.focusRecommendations.length > 0) {
    paragraphs.push(
      `For next week, focus on: ${summary.focusRecommendations.slice(0, 3).join('; ')}.`
    );
  }

  return paragraphs.join('\n\n') || 'Weekly review summary generated.';
}


