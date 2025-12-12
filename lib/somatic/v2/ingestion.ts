// Raw Device Event Ingestion
// lib/somatic/v2/ingestion.ts

import { supabaseAdmin } from '@/lib/supabase';
import { RawDeviceEvent } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function ingestRawDeviceEvents(
  userId: string,
  events: RawDeviceEvent[]
) {
  if (!events.length) return;

  const dbUserId = await resolveUserId(userId);

  const rows = events.map((e) => ({
    user_id: dbUserId,
    occurred_at: e.occurredAt.toISOString(),
    source: e.source,
    kind: e.kind,
    metadata: e.metadata ?? {},
  }));

  const { error } = await supabaseAdmin
    .from('somatic_raw_device_events')
    .insert(rows);

  if (error) {
    console.error('[Somatic v2] Failed to ingest device events', error);
    throw error;
  }
}


