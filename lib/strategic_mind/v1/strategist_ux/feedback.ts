// Meet the Strategist UX - Feedback Handler
// lib/strategic_mind/v1/strategist_ux/feedback.ts

import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function submitStrategyFeedback(
  userId: string,
  params: {
    recommendationId: string;
    sessionId?: string;
    reaction: 'accept' | 'reject' | 'modify' | 'defer';
    notes?: string;
    prefsPatch?: any;
  }
) {
  const dbUserId = await resolveUserId(userId);
  const { recommendationId, sessionId, reaction, notes, prefsPatch } = params;

  const { error } = await supabaseAdmin
    .from('strategy_feedback')
    .insert({
      user_id: dbUserId,
      recommendation_id: recommendationId,
      session_id: sessionId ?? null,
      reaction,
      notes: notes ?? null,
      prefs_patch: prefsPatch ?? {},
    });

  if (error) throw error;

  // Update recommendation status
  let status: string = 'pending';
  if (reaction === 'accept') status = 'accepted';
  if (reaction === 'reject') status = 'rejected';
  if (reaction === 'defer') status = 'pending'; // but we log that it was deferred

  const { error: updateError } = await supabaseAdmin
    .from('strategy_recommendations')
    .update({
      status,
      status_context: {
        lastReaction: reaction,
        updatedAt: new Date().toISOString(),
      },
    })
    .eq('id', recommendationId)
    .eq('user_id', dbUserId);

  if (updateError) throw updateError;

  // If prefsPatch provided, route to brain preferences / presence / etc.
  if (prefsPatch && Object.keys(prefsPatch).length > 0) {
    try {
      const { updateBrainPreferences } = await import('../../../meet_pulse/preferences');
      await updateBrainPreferences(userId, prefsPatch);
    } catch (err) {
      console.error('[Strategist UX] Failed to update brain preferences', err);
      // Don't throw - feedback is still recorded
    }
  }
}


