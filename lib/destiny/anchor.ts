// Destiny Engine v2 - Anchor Manager
// lib/destiny/anchor.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { DestinyTimeline, DestinyAnchorChoice, AnchorStrength } from './types';

export async function setDestinyAnchor(params: {
  userId: string;
  timelineId: string;
  strength?: AnchorStrength;
  notes?: string;
}): Promise<void> {
  const { userId, timelineId, strength = 'soft', notes } = params;

  // Verify timeline exists and belongs to user
  const { data: timeline } = await supabaseAdmin
    .from('destiny_timelines')
    .select('*')
    .eq('id', timelineId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!timeline) {
    throw new Error('Timeline not found');
  }

  // Insert anchor choice
  await supabaseAdmin
    .from('destiny_anchor_choices')
    .insert({
      user_id: userId,
      timeline_id: timelineId,
      strength,
      notes: notes ?? null,
    });
}

export async function getCurrentDestinyAnchor(userId: string): Promise<DestinyTimeline | null> {
  // Get latest anchor choice
  const { data: anchor } = await supabaseAdmin
    .from('destiny_anchor_choices')
    .select('*, destiny_timelines(*)')
    .eq('user_id', userId)
    .order('chosen_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!anchor) {
    return null;
  }

  const timeline = (anchor as any).destiny_timelines;
  return timeline ?? null;
}


