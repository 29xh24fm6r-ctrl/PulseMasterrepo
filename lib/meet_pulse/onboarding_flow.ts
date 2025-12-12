// Meet Pulse Orchestration
// lib/meet_pulse/onboarding_flow.ts

import { supabaseAdmin } from '@/lib/supabase';
import { BirthExperienceContext, IntroStep } from './types';
import { buildMeetPulseScript } from './scripts';
import { getOrCreateBrainPreferences, updateBrainPreferences } from './preferences';
import { getLatestBrainStatusForUser } from '../brain/registry/context_read';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function startMeetPulseSession(userId: string, now: Date) {
  const dbUserId = await resolveUserId(userId);

  // Create session row
  const { data, error } = await supabaseAdmin
    .from('pulse_introduction_sessions')
    .insert({
      user_id: dbUserId,
      status: 'in_progress',
    })
    .select('id');

  if (error) throw error;
  const sessionId = data?.[0]?.id as string;

  const ctx: BirthExperienceContext = { userId, now };
  const script = await buildMeetPulseScript(userId, ctx);
  const brainStatus = await getLatestBrainStatusForUser(userId);
  const prefs = await getOrCreateBrainPreferences(userId);

  // Update session with initial snapshots
  await supabaseAdmin
    .from('pulse_introduction_sessions')
    .update({
      initial_brain_summary: brainStatus as any,
      initial_preferences: prefs as any,
      narrative_intro: script.narrativeIntro,
    })
    .eq('id', sessionId);

  return { sessionId, script };
}

// Called as user completes steps; update preferences based on choice steps.
export async function applyMeetPulseStepResponse(
  userId: string,
  sessionId: string,
  step: IntroStep,
  response: any
) {
  const dbUserId = await resolveUserId(userId);

  // Get current steps_completed
  const { data: session } = await supabaseAdmin
    .from('pulse_introduction_sessions')
    .select('steps_completed')
    .eq('id', sessionId)
    .eq('user_id', dbUserId)
    .limit(1);

  const currentSteps = (session?.[0]?.steps_completed as any[]) ?? [];

  // Append new step completion
  const updatedSteps = [
    ...currentSteps,
    { stepId: step.id, response, at: new Date().toISOString() },
  ];

  await supabaseAdmin
    .from('pulse_introduction_sessions')
    .update({
      steps_completed: updatedSteps,
    })
    .eq('id', sessionId);

  // Map preference_choice steps into pulse_brain_preferences
  if (step.type === 'preference_choice') {
    const patch = mapStepToPreferencePatch(step, response);
    if (patch) {
      await updateBrainPreferences(userId, patch);
    }
  }
}

function mapStepToPreferencePatch(step: IntroStep, response: any): any {
  // Map step.id to preference fields
  const mapping: Record<string, string> = {
    'presence_level': 'presence_level',
    'proactivity_level': 'proactivity_level',
    'emotional_intensity': 'emotional_intensity',
    'depth_of_reflection': 'depth_of_reflection',
    'privacy_sensitivity': 'privacy_sensitivity',
    'preferred_persona_style': 'preferred_persona_style',
    'ui_mode': 'ui_mode',
  };

  const prefKey = mapping[step.id];
  if (!prefKey) return null;

  // Extract value from response
  let value: any = null;
  if (response?.key) {
    // If response has a key, map it to a numeric value
    // For now, simple mapping: 'low' -> 0.3, 'medium' -> 0.5, 'high' -> 0.7
    const keyMap: Record<string, number> = {
      'low': 0.3,
      'medium': 0.5,
      'high': 0.7,
      'minimal': 0.2,
      'standard': 0.5,
      'intensive': 0.8,
    };
    value = keyMap[response.key] ?? response.key;
  } else if (typeof response === 'number') {
    value = response;
  } else if (typeof response === 'string') {
    value = response;
  }

  if (value === null) return null;

  return { [prefKey]: value };
}

export async function completeMeetPulseSession(
  userId: string,
  sessionId: string,
  userReaction: any
) {
  const dbUserId = await resolveUserId(userId);

  await supabaseAdmin
    .from('pulse_introduction_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      user_reaction: userReaction ?? {},
    })
    .eq('id', sessionId)
    .eq('user_id', dbUserId);
}

export async function ensureMeetPulseIfNeeded(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const { data } = await supabaseAdmin
    .from('pulse_introduction_sessions')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('status', 'completed')
    .limit(1);

  return !data?.[0]; // Returns true if user needs to complete Meet Pulse
}


