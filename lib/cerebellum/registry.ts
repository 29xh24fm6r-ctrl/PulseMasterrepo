// Cerebellum Routine Registry
// lib/cerebellum/registry.ts

import { supabaseAdmin } from '@/lib/supabase';
import { MotorRoutineConfig } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function upsertMotorRoutine(
  userId: string,
  config: MotorRoutineConfig
) {
  const dbUserId = await resolveUserId(userId);

  if (config.key) {
    const { data: existing } = await supabaseAdmin
      .from('motor_routines')
      .select('id')
      .eq('user_id', dbUserId)
      .eq('key', config.key)
      .limit(1);

    if (existing?.[0]) {
      const { error } = await supabaseAdmin
        .from('motor_routines')
        .update({
          name: config.name,
          description: config.description ?? null,
          domain: config.domain ?? null,
          category: config.category ?? null,
          source: config.source ?? 'user_defined',
          config: config.config ?? {},
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing[0].id);

      if (error) throw error;
      return existing[0].id as string;
    }
  }

  const { data, error } = await supabaseAdmin
    .from('motor_routines')
    .insert({
      user_id: dbUserId,
      key: config.key ?? null,
      name: config.name,
      description: config.description ?? null,
      domain: config.domain ?? null,
      category: config.category ?? null,
      source: config.source ?? 'user_defined',
      config: config.config ?? {},
    })
    .select('id');

  if (error) throw error;
  return data?.[0]?.id as string;
}


