// Destiny Engine v2 - Timeline Builder
// lib/destiny/builder.ts

import { supabaseAdminClient } from '../../supabase/admin';
import { callAIJson } from '@/lib/ai/call';
import { DestinyTimeline, DestinyWaypoint } from './types';

export async function createTimelineFromObjective(params: {
  userId: string;
  objectiveId: string;
  baseKey?: string;
}): Promise<DestinyTimeline> {
  const { userId, objectiveId, baseKey } = params;

  // Get strategic objective
  const { data: objective } = await supabaseAdminClient
    .from('strategic_objectives')
    .select('*')
    .eq('id', objectiveId)
    .maybeSingle();

  if (!objective) {
    throw new Error('Strategic objective not found');
  }

  // Infer time horizon from objective
  let timeHorizonYears: number | null = null;
  if (objective.timeframe) {
    // Try to parse timeframe (e.g., "3 years", "6 months")
    const timeframeStr = objective.timeframe.toLowerCase();
    if (timeframeStr.includes('year')) {
      const match = timeframeStr.match(/(\d+)/);
      if (match) {
        timeHorizonYears = parseFloat(match[1]);
      }
    } else if (timeframeStr.includes('month')) {
      const match = timeframeStr.match(/(\d+)/);
      if (match) {
        timeHorizonYears = parseFloat(match[1]) / 12;
      }
    }
  }
  if (!timeHorizonYears) {
    timeHorizonYears = 3.0; // Default
  }

  // Infer primary domains from objective
  const primaryDomains: string[] = [];
  const objectiveText = `${objective.title} ${objective.description ?? ''}`.toLowerCase();
  if (objectiveText.includes('work') || objectiveText.includes('career') || objectiveText.includes('job')) {
    primaryDomains.push('work');
  }
  if (objectiveText.includes('family') || objectiveText.includes('kids') || objectiveText.includes('spouse')) {
    primaryDomains.push('family');
  }
  if (objectiveText.includes('money') || objectiveText.includes('finance') || objectiveText.includes('revenue')) {
    primaryDomains.push('money');
  }
  if (objectiveText.includes('health') || objectiveText.includes('fitness') || objectiveText.includes('wellness')) {
    primaryDomains.push('health');
  }
  if (objectiveText.includes('pulse') || objectiveText.includes('product') || objectiveText.includes('startup')) {
    primaryDomains.push('pulse');
  }

  // Create timeline
  const { data: timeline, error } = await supabaseAdminClient
    .from('destiny_timelines')
    .insert({
      user_id: userId,
      key: baseKey ?? null,
      name: objective.title,
      description: objective.description ?? null,
      time_horizon_years: timeHorizonYears,
      primary_domains: primaryDomains.length > 0 ? primaryDomains : ['work'],
    })
    .select('*')
    .single();

  if (error) throw error;

  // Optionally generate default waypoints
  await generateDefaultWaypointsForTimeline(timeline.id);

  return timeline;
}

export async function createCustomTimeline(params: {
  userId: string;
  name: string;
  description?: string;
  timeHorizonYears?: number;
  primaryDomains?: string[];
  archetype?: string;
  mythicFrame?: string;
}): Promise<DestinyTimeline> {
  const { userId, name, description, timeHorizonYears = 3.0, primaryDomains = ['work'], archetype, mythicFrame } = params;

  const { data: timeline, error } = await supabaseAdminClient
    .from('destiny_timelines')
    .insert({
      user_id: userId,
      name,
      description: description ?? null,
      time_horizon_years: timeHorizonYears,
      primary_domains: primaryDomains,
      archetype: archetype ?? null,
      mythic_frame: mythicFrame ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return timeline;
}

export async function generateDefaultWaypointsForTimeline(timelineId: string): Promise<DestinyWaypoint[]> {
  // Get timeline
  const { data: timeline } = await supabaseAdminClient
    .from('destiny_timelines')
    .select('*')
    .eq('id', timelineId)
    .maybeSingle();

  if (!timeline) {
    throw new Error('Timeline not found');
  }

  // Get related strategic objectives
  const { data: objectives } = await supabaseAdminClient
    .from('strategic_objectives')
    .select('*')
    .eq('user_id', timeline.user_id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Get Third Brain graph nodes related to primary domains
  const { data: nodes } = await supabaseAdminClient
    .from('knowledge_nodes')
    .select('*')
    .eq('user_id', timeline.user_id)
    .overlaps('tags', timeline.primary_domains)
    .order('importance', { ascending: false })
    .limit(10);

  // Use LLM to generate waypoints
  const contextPrompt = `Timeline: ${timeline.name}
Description: ${timeline.description ?? 'N/A'}
Time Horizon: ${timeline.time_horizon_years} years
Primary Domains: ${timeline.primary_domains.join(', ')}

Related Objectives:
${objectives?.map((o) => `- ${o.title}: ${o.description ?? ''}`).join('\n') ?? 'None'}

Related Nodes:
${nodes?.map((n) => `- ${n.title} (${n.kind})`).join('\n') ?? 'None'}`;

  const result = await callAIJson<{
    waypoints: Array<{
      name: string;
      description: string;
      ordering: number;
      target_date_hint?: string;
    }>;
  }>({
    userId: timeline.user_id,
    feature: 'destiny_waypoints',
    systemPrompt: 'Generate 3-7 waypoints (key markers) for a future timeline. Each waypoint should be a significant milestone along the path.',
    userPrompt: `${contextPrompt}\n\nGenerate waypoints that break down this timeline into meaningful phases.`,
    maxTokens: 1000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    return [];
  }

  const waypoints: DestinyWaypoint[] = [];

  for (const wp of result.data.waypoints) {
    // Calculate target date
    let targetDate: string | null = null;
    if (timeline.time_horizon_years) {
      const totalDays = timeline.time_horizon_years * 365;
      const waypointDays = (wp.ordering / result.data.waypoints.length) * totalDays;
      const targetDateObj = new Date();
      targetDateObj.setDate(targetDateObj.getDate() + waypointDays);
      targetDate = targetDateObj.toISOString().slice(0, 10);
    }

    const { data: waypoint, error } = await supabaseAdminClient
      .from('destiny_waypoints')
      .insert({
        timeline_id: timelineId,
        ordering: wp.ordering,
        name: wp.name,
        description: wp.description,
        target_date: targetDate,
      })
      .select('*')
      .single();

    if (error) {
      console.error(`Failed to create waypoint: ${wp.name}`, error);
      continue;
    }

    if (waypoint) {
      waypoints.push(waypoint);
    }
  }

  return waypoints;
}


