// Presence State Builder
// lib/presence/state.ts

import { supabaseAdmin } from '@/lib/supabase';
import { PresenceContext } from './types';
import { getOrCreateBrainPreferences } from '../meet_pulse/preferences';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function buildPresenceContext(userId: string, now: Date): Promise<PresenceContext> {
  const dbUserId = await resolveUserId(userId);
  const day = now.toISOString().slice(0, 10);

  const [prefs, emotion, somatic, focus] = await Promise.all([
    getOrCreateBrainPreferences(userId),
    supabaseAdmin
      .from('emotion_state_daily')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('date', day)
      .maybeSingle(),
    supabaseAdmin
      .from('somatic_state_daily')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('date', day)
      .maybeSingle(),
    // For now, we'll use a simple heuristic for focus mode
    // In production, this would query a focus_mode_state table
    Promise.resolve({ data: null }),
  ]);

  let focusMode: 'normal' | 'deep_work' | 'off_hours' = 'normal';
  const hour = now.getHours();

  // Simple heuristic: off-hours if before 6am or after 10pm
  if (hour < 6 || hour >= 22) {
    focusMode = 'off_hours';
  }

  // TODO: Check for deep work mode from focus_mode_state table
  // const fm = focus?.data?.[0];
  // if (fm?.mode === 'deep_work') focusMode = 'deep_work';

  return {
    userId,
    now,
    prefs,
    emotionState: emotion?.data ?? null,
    somaticState: somatic?.data ?? null,
    calendarState: null, // TODO: implement calendar_state_snapshots
    focusMode,
  };
}


