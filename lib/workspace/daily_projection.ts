// Conscious Workspace v1 - Daily Timeline Projection
// lib/workspace/daily_projection.ts

import { supabaseAdminClient } from '../../supabase/admin';
import { callAI } from '@/lib/ai/call';
import { DailyTimelineView, SuggestedAction } from './types';

export async function generateDailyTimelineView(params: {
  userId: string;
  date: Date;
  timelineId?: string;
  branchRunId?: string;
}): Promise<DailyTimelineView> {
  const { userId, date, timelineId, branchRunId } = params;
  const dateStr = date.toISOString().slice(0, 10);

  // 1. Get timeline context
  let timelineContext = '';
  let waypointsContext = '';
  let milestonesContext = '';

  if (timelineId) {
    const { data: timeline } = await supabaseAdminClient
      .from('destiny_timelines')
      .select('*')
      .eq('id', timelineId)
      .maybeSingle();

    if (timeline) {
      timelineContext = `Timeline: ${timeline.name}\nDescription: ${timeline.description ?? 'N/A'}\nHorizon: ${timeline.time_horizon_years} years\nDomains: ${timeline.primary_domains.join(', ')}`;

      // Get waypoints around this date
      const { data: waypoints } = await supabaseAdminClient
        .from('destiny_waypoints')
        .select('*')
        .eq('timeline_id', timelineId)
        .order('target_date', { ascending: true });

      if (waypoints) {
        waypointsContext = `Waypoints:\n${waypoints.map((w) => `- ${w.name} (target: ${w.target_date ?? 'TBD'})`).join('\n')}`;

        // Get milestones for waypoints near this date
        const waypointIds = waypoints.map((w) => w.id);
        const { data: milestones } = await supabaseAdminClient
          .from('destiny_milestones')
          .select('*, destiny_waypoints(*)')
          .in('waypoint_id', waypointIds)
          .eq('status', 'pending');

        if (milestones) {
          milestonesContext = `Upcoming Milestones:\n${milestones.map((m: any) => `- ${m.name} (${m.destiny_waypoints?.name ?? 'N/A'})`).join('\n')}`;
        }
      }
    }
  }

  if (branchRunId) {
    const { data: branchRun } = await supabaseAdminClient
      .from('branch_simulation_runs')
      .select('*, decision_tree_nodes(*)')
      .eq('id', branchRunId)
      .maybeSingle();

    if (branchRun) {
      timelineContext = `Branch Path: ${(branchRun as any).decision_tree_nodes?.map((n: any) => n.label).join(' → ') ?? 'N/A'}\nNarrative: ${branchRun.narrative_summary ?? 'N/A'}`;
    }
  }

  // 2. Get calendar events for the day
  const { data: calendarEvents } = await supabaseAdminClient
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .gte('start_time', `${dateStr}T00:00:00`)
    .lte('start_time', `${dateStr}T23:59:59`);

  // 3. Get tasks due/overdue
  const { data: tasks } = await supabaseAdminClient
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .or(`due_date.eq.${dateStr},due_date.lt.${dateStr}`)
    .eq('status', 'pending')
    .order('due_date', { ascending: true })
    .limit(20);

  // 4. Get deals needing attention
  const { data: deals } = await supabaseAdminClient
    .from('deals')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['active', 'negotiating'])
    .order('updated_at', { ascending: false })
    .limit(10);

  // 5. Get Civilization domain state
  const { data: domainStates } = await supabaseAdminClient
    .from('civilization_domain_state')
    .select('*, civilization_domains(*)')
    .eq('civilization_domains.user_id', userId)
    .order('snapshot_date', { ascending: false })
    .limit(10);

  // 6. Get Self Mirror facets
  const { data: facets } = await supabaseAdminClient
    .from('self_mirror_facets')
    .select('*')
    .eq('user_id', userId);

  // 7. Construct day scenario
  const calendarHours = calendarEvents?.reduce((sum, e) => {
    const duration = (new Date(e.end_time).getTime() - new Date(e.start_time).getTime()) / (1000 * 60 * 60);
    return sum + duration;
  }, 0) ?? 0;

  const availableFocusHours = Math.max(0, 8 - calendarHours); // Rough estimate

  // 8. Use LLM to generate summary and suggested actions
  const projectionPrompt = `Date: ${dateStr}
${timelineContext}
${waypointsContext}
${milestonesContext}

Calendar Events: ${calendarEvents?.length ?? 0} events (${calendarHours.toFixed(1)} hours)
Tasks Due: ${tasks?.length ?? 0} tasks
Active Deals: ${deals?.length ?? 0} deals
Available Focus Hours: ${availableFocusHours.toFixed(1)} hours

Civilization Domains:
${domainStates?.map((s: any) => `- ${s.civilization_domains?.name}: activity ${s.activity_score}/100, health ${s.health_score}/100`).join('\n') ?? 'None'}

Self Mirror Facets:
${facets?.map((f) => `- ${f.name}: ${f.score ?? 'N/A'}/100`).join('\n') ?? 'None'}

Generate:
1. A 1-2 paragraph summary: "If you live today as this timeline/path, here's what the day looks and feels like..."
2. Key metrics: { focus_blocks, sales_moves, relationship_moves, health_moves, stress_estimate }
3. 5-10 suggested actions for the day, structured as: [{label, type, domain, priority, estimated_minutes}]`;

  const result = await callAI({
    userId,
    feature: 'daily_timeline_projection',
    systemPrompt: 'You are a daily planning assistant. Generate a realistic, actionable day projection based on timeline context and current state.',
    userPrompt: projectionPrompt,
    maxTokens: 1500,
    temperature: 0.7,
  });

  if (!result.success || !result.content) {
    throw new Error('Failed to generate daily projection');
  }

  // Parse LLM response (simple extraction - could be improved)
  const content = result.content;
  const summaryMatch = content.match(/(?:summary|if you live today)[:\s]+(.+?)(?:\n\n|$)/is);
  const summary = summaryMatch ? summaryMatch[1].trim() : content.substring(0, 300);

  // Extract metrics (placeholder - would need structured parsing)
  const keyMetrics: any = {
    focus_blocks: Math.floor(availableFocusHours / 2),
    sales_moves: deals?.length ?? 0,
    relationship_moves: 0,
    health_moves: 0,
    stress_estimate: 5,
  };

  // Extract suggested actions (placeholder - would need structured parsing)
  const suggestedActions: SuggestedAction[] = [];
  if (tasks && tasks.length > 0) {
    for (const task of tasks.slice(0, 5)) {
      suggestedActions.push({
        id: task.id,
        label: task.title,
        type: 'task',
        domain: 'work',
        priority: task.priority as any,
        linked_task_id: task.id,
      });
    }
  }

  // 9. Upsert daily timeline view
  const { data: view, error } = await supabaseAdminClient
    .from('daily_timeline_views')
    .upsert(
      {
        user_id: userId,
        date: dateStr,
        timeline_id: timelineId ?? null,
        branch_run_id: branchRunId ?? null,
        mode: 'day_projection',
        summary,
        key_metrics: keyMetrics,
        suggested_actions: suggestedActions,
      },
      { onConflict: 'user_id,date,timeline_id,branch_run_id,mode' }
    )
    .select('*')
    .single();

  if (error) throw error;
  return view;
}


