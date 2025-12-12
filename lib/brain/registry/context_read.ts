// Brain Registry Context Reader (for UI & Other Systems)
// lib/brain/registry/context_read.ts

import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function getLatestBrainStatusForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const [{ data: subsystems }, { data: statusRows }, { data: snapshotRows }] = await Promise.all([
    supabaseAdmin.from('brain_subsystems').select('*'),
    supabaseAdmin
      .from('brain_subsystem_status')
      .select('*')
      .eq('user_id', dbUserId),
    supabaseAdmin
      .from('brain_health_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(1),
  ]);

  const snapshot = snapshotRows?.[0] ?? null;
  const statusById: Record<string, any> = {};
  for (const s of statusRows ?? []) statusById[s.subsystem_id] = s;

  return {
    snapshot,
    subsystems: subsystems ?? [],
    statusById,
  };
}


