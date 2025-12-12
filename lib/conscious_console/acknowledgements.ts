// Conscious Console - Acknowledgements
// lib/conscious_console/acknowledgements.ts

import { supabaseAdmin } from '@/lib/supabase';
import { updateBrainPreferences } from '../meet_pulse/preferences';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function acknowledgeSurfaceEvent(
  userId: string,
  surfaceEventId: string,
  reaction: 'liked' | 'dismissed' | 'acted' | 'snoozed',
  notes?: string,
  followupPrefsPatch?: any
) {
  const dbUserId = await resolveUserId(userId);

  const { error } = await supabaseAdmin
    .from('pulse_insight_acknowledgements')
    .insert({
      user_id: dbUserId,
      surface_event_id: surfaceEventId,
      reaction,
      notes: notes ?? null,
      followup_preferences: followupPrefsPatch ?? {},
    });

  if (error) throw error;

  await supabaseAdmin
    .from('pulse_brain_surface_events')
    .update({ dismissed: true })
    .eq('id', surfaceEventId)
    .eq('user_id', dbUserId);

  if (followupPrefsPatch) {
    await updateBrainPreferences(userId, followupPrefsPatch);
  }
}


