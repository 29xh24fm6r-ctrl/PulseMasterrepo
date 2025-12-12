// Meet the Strategist UX - Session Management
// lib/strategic_mind/v1/strategist_ux/session.ts

import { supabaseAdmin } from '@/lib/supabase';
import { buildStrategicExplanation } from './explain';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function startStrategistSession(userId: string) {
  const dbUserId = await resolveUserId(userId);
  const explanation = await buildStrategicExplanation(userId);

  const { data, error } = await supabaseAdmin
    .from('strategist_sessions')
    .insert({
      user_id: dbUserId,
      snapshot_id: explanation.snapshot?.id ?? null,
      equilibrium_id: explanation.equilibrium?.id ?? null,
      intro_narrative: explanation.introNarrative,
      key_points: explanation.keyPoints,
    })
    .select('id');

  if (error) throw error;
  const sessionId = data?.[0]?.id as string;

  // Record what we showed
  const reviewEvents: any[] = [];

  if (explanation.equilibrium) {
    reviewEvents.push({
      session_id: sessionId,
      user_id: dbUserId,
      event_type: 'equilibrium_summary',
      ref_id: explanation.equilibrium.id,
      payload: explanation.equilibrium,
    });
  }

  for (const c of explanation.conflicts ?? []) {
    reviewEvents.push({
      session_id: sessionId,
      user_id: dbUserId,
      event_type: 'conflict',
      ref_id: c.id,
      payload: c,
    });
  }

  for (const r of explanation.recommendations ?? []) {
    reviewEvents.push({
      session_id: sessionId,
      user_id: dbUserId,
      event_type: 'recommendation',
      ref_id: r.id,
      payload: r,
    });
  }

  if (reviewEvents.length) {
    const { error: eventsError } = await supabaseAdmin
      .from('strategic_review_events')
      .insert(reviewEvents);

    if (eventsError) {
      console.error('[Strategist UX] Failed to insert review events', eventsError);
      // Don't throw - session is still created
    }
  }

  return {
    sessionId,
    explanation,
  };
}

export async function completeStrategistSession(
  userId: string,
  sessionId: string,
  userReaction?: any
) {
  const dbUserId = await resolveUserId(userId);

  const { error } = await supabaseAdmin
    .from('strategist_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      user_reaction: userReaction ?? {},
    })
    .eq('id', sessionId)
    .eq('user_id', dbUserId);

  if (error) throw error;
}


