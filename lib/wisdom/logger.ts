// Experience Logger
// lib/wisdom/logger.ts

import { supabaseAdmin } from '@/lib/supabase';
import { ExperienceEventInput } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function logExperienceEvent(input: ExperienceEventInput) {
  const dbUserId = await resolveUserId(input.userId);

  const {
    source,
    kind,
    refType,
    refId,
    description,
    context,
    expectation,
    outcome,
    evaluation,
  } = input;

  const { error } = await supabaseAdmin
    .from('experience_events')
    .insert({
      user_id: dbUserId,
      source,
      kind,
      ref_type: refType ?? null,
      ref_id: refId ?? null,
      description,
      context: context ?? {},
      expectation: expectation ?? {},
      outcome: outcome ?? {},
      evaluation: evaluation ?? {},
    });

  if (error) {
    console.error('[Wisdom] Failed to log experience event', error);
    throw error;
  }
}


