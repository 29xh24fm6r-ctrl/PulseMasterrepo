// Life Canon v1 - Identity Shift Detector
// lib/life_canon/v1/identity_shift_detector.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { callAIJson } from '@/lib/ai/call';
import { IDENTITY_SHIFT_DETECTOR_PROMPT } from './narrative_prompts';
import { buildLifeCanonContext } from './context';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function detectIdentityShiftsForUser(userId: string, now: Date) {
  const dbUserId = await resolveUserId(userId);
  const context = await buildLifeCanonContext(userId, now);

  // Get last identity transform
  const { data: lastTransform } = await supabaseAdmin
    .from('identity_transforms')
    .select('*')
    .eq('user_id', dbUserId)
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const result = await callAIJson<{
    hasShift: boolean;
    previousIdentity?: any;
    newIdentity?: any;
    catalysts?: any[];
    emotions?: any;
    narrativeExplanation?: string;
  }>({
    userId,
    feature: 'life_canon_identity',
    systemPrompt: IDENTITY_SHIFT_DETECTOR_PROMPT,
    userPrompt: `Context:\n${JSON.stringify({
      ...context,
      lastIdentityTransform: lastTransform,
    }, null, 2)}`,
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    throw new Error(`Failed to detect identity shift: ${result.error}`);
  }

  const { hasShift, previousIdentity, newIdentity, catalysts, emotions, narrativeExplanation } =
    result.data;

  if (!hasShift) {
    return null;
  }

  // Insert identity transform
  const { data: inserted, error } = await supabaseAdmin
    .from('identity_transforms')
    .insert({
      user_id: dbUserId,
      previous_identity: previousIdentity ?? {},
      new_identity: newIdentity ?? {},
      catalysts: catalysts ?? [],
      emotions: emotions ?? {},
      narrative_explanation: narrativeExplanation ?? null,
    })
    .select('id');

  if (error) throw error;

  return inserted?.[0]?.id as string;
}


