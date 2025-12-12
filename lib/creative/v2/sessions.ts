// Creative Session Management
// lib/creative/v2/sessions.ts

import { supabaseAdmin } from '@/lib/supabase';
import { CreativeSessionContext } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function createCreativeSessionForUser(
  userId: string,
  ctx: CreativeSessionContext
) {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('creative_sessions')
    .insert({
      user_id: dbUserId,
      topic: ctx.topic,
      goal: ctx.goal ?? null,
      domain: ctx.domain ?? null,
      mode: ctx.mode ?? 'brainstorm',
      context: {
        workspaceThreadId: ctx.workspaceThread?.id ?? null,
        destiny: ctx.destinyContext ?? null,
        timeline: ctx.timelineContext ?? null,
        cultureContexts: ctx.cultureContexts ?? [],
      },
      meta: {
        emotionState: ctx.emotionState ?? null,
        somaticState: ctx.somaticState ?? null,
      },
    })
    .select('id');

  if (error) {
    console.error('[Creative Cortex] Failed to create session', error);
    throw error;
  }
  return data?.[0]?.id as string;
}


