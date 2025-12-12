// Brain Error Logger
// lib/brain/registry/errors.ts

import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string | null | undefined): Promise<string | null> {
  if (!clerkId) return null;
  
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || null;
}

export async function logBrainErrorEvent(params: {
  userId?: string | null;
  subsystemId?: string | null;
  severity: 'info' | 'warning' | 'error' | 'critical';
  errorCode?: string | null;
  message: string;
  context?: any;
}) {
  const dbUserId = params.userId ? await resolveUserId(params.userId) : null;

  const { error } = await supabaseAdmin
    .from('brain_error_events')
    .insert({
      user_id: dbUserId,
      subsystem_id: params.subsystemId ?? null,
      severity: params.severity,
      error_code: params.errorCode ?? null,
      message: params.message,
      context: params.context ?? {},
    });

  if (error) {
    console.error('[Brain Registry] Failed to log error event', error);
    throw error;
  }
}


