// Presence Decider - LLM-Driven Decision Making
// lib/presence/decider.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { PresenceContext } from './types';
import { buildPresenceContext } from './state';
import { PRESENCE_DECIDER_PROMPT } from './prompts';
import { executePresenceDecision } from './executor';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function runPresenceDeciderForUser(userId: string, now: Date) {
  const dbUserId = await resolveUserId(userId);
  const ctx: PresenceContext = await buildPresenceContext(userId, now);

  // Get unconsumed events
  const { data: events } = await supabaseAdmin
    .from('presence_events')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('consumed', false)
    .order('created_at', { ascending: true })
    .limit(50);

  if (!events?.length) return;

  const result = await callAIJson<{
    decisions: Array<{
      eventId: string;
      decision: 'send_now' | 'schedule' | 'bundle' | 'suppress';
      chosenChannel?: 'console' | 'notification' | 'email' | 'voice' | 'none';
      scheduledFor?: string | null;
      rationale?: any;
    }>;
  }>({
    userId,
    feature: 'presence_decider',
    systemPrompt: PRESENCE_DECIDER_PROMPT,
    userPrompt: JSON.stringify({
      context: ctx,
      events,
    }, null, 2),
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Presence Orchestrator] Failed to generate decisions', result.error);
    return;
  }

  const { decisions } = result.data;

  if (!decisions?.length) return;

  for (const d of decisions) {
    const ev = events.find((e: any) => e.id === d.eventId);
    if (!ev) continue;

    const { data, error } = await supabaseAdmin
      .from('presence_decisions')
      .insert({
        presence_event_id: ev.id,
        user_id: dbUserId,
        decision: d.decision,
        chosen_channel: d.chosenChannel ?? null,
        scheduled_for: d.scheduledFor ? new Date(d.scheduledFor).toISOString() : null,
        rationale: d.rationale ?? {},
        state_snapshot: {
          focusMode: ctx.focusMode,
          prefs: ctx.prefs,
        },
      })
      .select('id');

    if (error) throw error;

    const decisionId = data?.[0]?.id as string;

    // Mark event as consumed so it won't be re-decided
    await supabaseAdmin
      .from('presence_events')
      .update({ consumed: true })
      .eq('id', ev.id);

    // Optional: immediate execution for send_now
    if (d.decision === 'send_now') {
      await executePresenceDecision(userId, decisionId, now);
    }
  }
}


