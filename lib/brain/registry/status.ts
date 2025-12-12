// Brain Subsystem Status Updater
// lib/brain/registry/status.ts

import { supabaseAdmin } from '@/lib/supabase';
import { BrainSubsystemStatusInput } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function updateSubsystemStatusForUser(
  userId: string,
  input: BrainSubsystemStatusInput
) {
  const dbUserId = await resolveUserId(userId);
  const nowIso = new Date().toISOString();

  const { data: existing } = await supabaseAdmin
    .from('brain_subsystem_status')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('subsystem_id', input.subsystemId)
    .limit(1);

  const payload = {
    user_id: dbUserId,
    subsystem_id: input.subsystemId,
    status: input.status,
    updated_at: nowIso,
    last_ok_at:
      input.status === 'active' || input.status === 'partial'
        ? input.lastOkAt ?? nowIso
        : existing?.[0]?.last_ok_at ?? null,
    last_error_at:
      input.status === 'error' || input.status === 'degraded'
        ? input.lastErrorAt ?? nowIso
        : existing?.[0]?.last_error_at ?? null,
    last_run_at: input.lastRunAt ?? nowIso,
    health_score: input.healthScore ?? existing?.[0]?.health_score ?? null,
    details: input.details ?? existing?.[0]?.details ?? {},
  };

  if (existing?.[0]) {
    const { error } = await supabaseAdmin
      .from('brain_subsystem_status')
      .update(payload)
      .eq('id', existing[0].id);
    if (error) throw error;
    return existing[0].id as string;
  } else {
    const { data, error } = await supabaseAdmin
      .from('brain_subsystem_status')
      .insert({
        ...payload,
        created_at: nowIso,
      })
      .select('id');
    if (error) throw error;
    return data?.[0]?.id as string;
  }
}

// Convenience wrapper for backward compatibility
export async function updateSubsystemStatus(
  userId: string,
  subsystemId: string,
  status: BrainSubsystemStatusInput['status'],
  version?: string,
  healthScore?: number
) {
  return updateSubsystemStatusForUser(userId, {
    subsystemId,
    status,
    healthScore: healthScore ?? null,
    details: version ? { version } : {},
  });
}


