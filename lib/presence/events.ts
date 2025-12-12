// Presence Events - Enqueue Candidate Events
// lib/presence/events.ts

import { supabaseAdmin } from '@/lib/supabase';
import { PresenceEventInput } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function enqueuePresenceEvent(
  userId: string,
  input: PresenceEventInput
): Promise<string> {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('presence_events')
    .insert({
      user_id: dbUserId,
      source: input.source,
      origin_id: input.originId ?? null,
      kind: input.kind,
      title: input.title,
      body: input.body,
      importance: input.importance,
      urgency: input.urgency,
      domain: input.domain ?? null,
      suggested_channel: input.suggestedChannel ?? null,
      suggested_time_window: input.suggestedTimeWindow ?? {},
      context: input.context ?? {},
    })
    .select('id');

  if (error) throw error;
  return data?.[0]?.id as string;
}


