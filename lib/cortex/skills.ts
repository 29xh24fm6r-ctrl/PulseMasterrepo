// Neocortex Skills Engine
// lib/cortex/skills.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { CortexSkill } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const WORK_SKILLS_SYSTEM_PROMPT = `
You are the Neocortex for an AI life operating system.
You see sequences of work events on days where the user performs exceptionally well.

Your job:
1. Identify reusable routines and workflows that seem to contribute to good outcomes.
2. Convert them into "skills" or "playbooks":
   - name
   - description
   - trigger (conditions, schedule, context)
   - ordered steps (each step is a clear action the system could help the user perform)

Keep triggers and steps as concrete as possible.
Return JSON: { "skills": [ ... ] }

Only return valid JSON.`;

function extractExampleDatesFromPatterns(patterns: any[]): string[] {
  const dates: string[] = [];
  patterns.forEach(p => {
    if (p.examples && Array.isArray(p.examples)) {
      p.examples.forEach((ex: any) => {
        if (ex.windowDate && !dates.includes(ex.windowDate)) {
          dates.push(ex.windowDate);
        }
      });
    }
  });
  return dates.slice(0, 10); // Limit to 10 dates
}

function buildEventSequencesSummaryForLLM(events: any[], patterns: any[]): string {
  // Group events by date
  const byDate: Record<string, any[]> = {};
  
  events.forEach(e => {
    const date = new Date(e.event_time).toISOString().slice(0, 10);
    if (!byDate[date]) {
      byDate[date] = [];
    }
    byDate[date].push({
      time: e.event_time,
      type: e.event_type,
      source: e.source,
      context: e.context_type,
    });
  });

  // Sort events within each date by time
  Object.keys(byDate).forEach(date => {
    byDate[date].sort((a, b) => 
      new Date(a.time).getTime() - new Date(b.time).getTime()
    );
  });

  const summary = {
    patterns: patterns.map(p => ({
      key: p.key,
      name: p.name,
      strength: p.strength,
    })),
    exemplarDays: Object.entries(byDate).map(([date, eventSeq]) => ({
      date,
      eventSequence: eventSeq,
    })),
  };

  return JSON.stringify(summary, null, 2);
}

export async function refreshWorkSkillsForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  // 1. Load strong positive patterns
  const { data: patterns, error: patternsError } = await supabaseAdmin
    .from('cortex_patterns')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('area_key', 'work')
    .gt('strength', 0.6);

  if (patternsError) throw patternsError;

  if (!patterns || patterns.length === 0) {
    console.log('[Cortex] No strong patterns found for skill extraction');
    return;
  }

  // 2. Load exemplar days' events
  const exampleDates = extractExampleDatesFromPatterns(patterns);

  if (exampleDates.length === 0) {
    console.log('[Cortex] No example dates found in patterns');
    return;
  }

  const { data: events, error: eventsError } = await supabaseAdmin
    .from('cortex_events')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('area_key', 'work')
    .in('event_time::date', exampleDates);

  if (eventsError) throw eventsError;

  if (!events || events.length === 0) {
    console.log('[Cortex] No events found for exemplar days');
    return;
  }

  // 3. Build LLM input
  const summaryInput = buildEventSequencesSummaryForLLM(events, patterns);

  // 4. Call LLM
  const result = await callAIJson<{ skills: CortexSkill[] }>({
    userId,
    feature: 'cortex_skills',
    systemPrompt: WORK_SKILLS_SYSTEM_PROMPT,
    userPrompt: `Extract skills from these exemplar days:\n\n${summaryInput}`,
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Cortex] Failed to generate skills', result.error);
    return;
  }

  const { skills } = result.data;

  if (!skills || skills.length === 0) {
    console.log('[Cortex] No skills detected by LLM');
    return;
  }

  // 5. Upsert into cortex_skills
  const patternIdMap = new Map(patterns.map(p => [p.key, p.id]));

  const rows = skills.map((s) => ({
    user_id: dbUserId,
    area_key: s.areaKey,
    key: s.key,
    name: s.name,
    description: s.description,
    trigger: s.trigger || {},
    steps: s.steps || [],
    derived_from_pattern_ids: s.derivedFromPatternIds?.map(id => 
      patternIdMap.get(id) || id
    ).filter(Boolean) || [],
  }));

  const { error: upsertError } = await supabaseAdmin
    .from('cortex_skills')
    .upsert(rows, { onConflict: 'user_id,area_key,key' });

  if (upsertError) throw upsertError;
}


