// Conscious Console - Status Builder
// lib/conscious_console/status.ts

import { getLatestBrainStatusForUser } from '../brain/registry/context_read';
import { getOrCreateBrainPreferences } from '../meet_pulse/preferences';
import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function buildConsciousConsolePayload(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const [brainStatus, prefs, latestReflections, recentSurfaceEvents] = await Promise.all([
    getLatestBrainStatusForUser(userId),
    getOrCreateBrainPreferences(userId),
    supabaseAdmin
      .from('cognitive_self_reflections')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabaseAdmin
      .from('pulse_brain_surface_events')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('dismissed', false)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return {
    brainStatus,
    prefs,
    reflections: latestReflections?.data ?? [],
    surfaceEvents: recentSurfaceEvents?.data ?? [],
  };
}


