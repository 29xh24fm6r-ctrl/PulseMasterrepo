// Desire Signal Recording
// lib/desire/signals.ts

import { supabaseAdmin } from '@/lib/supabase';
import { DesireSignal, DesireEntityType } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function recordDesireSignal(signal: DesireSignal) {
  const dbUserId = await resolveUserId(signal.userId);

  const {
    entityType,
    entityId,
    source,
    signalTime,
    context,
    kind,
    description,
    features,
    valence,
    weight,
  } = signal;

  const { error } = await supabaseAdmin
    .from('desire_signals')
    .insert({
      user_id: dbUserId,
      entity_type: entityType,
      entity_id: entityId,
      source,
      signal_time: signalTime.toISOString(),
      context: context ?? null,
      kind,
      description: description ?? null,
      features: features ?? {},
      valence: valence ?? null,
      weight: weight ?? 1,
    });

  if (error) {
    console.error('[Desire] Failed to record signal', error);
    throw error;
  }
}

export async function recordSelfChoice(params: {
  userId: string;
  context: string;
  description: string;
  positive: boolean;
  features?: any;
}) {
  const dbUserId = await resolveUserId(params.userId);

  await recordDesireSignal({
    userId: params.userId,
    entityType: 'self',
    entityId: dbUserId,
    source: 'manual',
    signalTime: new Date(),
    context: params.context,
    kind: params.positive ? 'chose' : 'avoided',
    description: params.description,
    features: params.features ?? {},
    valence: params.positive ? 0.5 : -0.5,
    weight: 1,
  });
}

export async function recordContactInteraction(params: {
  userId: string;
  contactId: string;
  context: string;
  kind: string;           // 'replied_quickly', 'ignored', 'pushed_back', etc.
  description?: string;
  valence?: number;
  features?: any;
}) {
  await recordDesireSignal({
    userId: params.userId,
    entityType: 'contact',
    entityId: params.contactId,
    source: 'interaction',
    signalTime: new Date(),
    context: params.context,
    kind: params.kind,
    description: params.description,
    features: params.features ?? {},
    valence: params.valence ?? 0,
    weight: 1,
  });
}


