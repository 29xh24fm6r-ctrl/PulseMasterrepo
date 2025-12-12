// Ethnographic Intelligence - Cultural Highlights Generator
// lib/ethnography/highlights.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { CULTURAL_HIGHLIGHTS_PROMPT } from './prompts';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function refreshCulturalHighlightsForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const [{ data: profiles }, { data: snapshots }, { data: recentSignals }] = await Promise.all([
    supabaseAdmin
      .from('cultural_profiles')
      .select('*')
      .eq('user_id', dbUserId),
    supabaseAdmin
      .from('cultural_inference_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('cultural_signals')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const result = await callAIJson<{
    highlights: Array<{
      domain: string;
      title: string;
      description: string;
      importance: number;
      suggestion: any;
    }>;
  }>({
    userId,
    feature: 'ethnography_highlights',
    systemPrompt: CULTURAL_HIGHLIGHTS_PROMPT,
    userPrompt: JSON.stringify({
      profiles: profiles ?? [],
      snapshots: snapshots ?? [],
      recentSignals: recentSignals ?? [],
    }, null, 2),
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Ethnography] Failed to generate highlights', result.error);
    return;
  }

  const { highlights } = result.data;

  if (!highlights?.length) return;

  const rows = highlights.map((h) => ({
    user_id: dbUserId,
    domain: h.domain,
    title: h.title,
    description: h.description,
    importance: h.importance ?? 0.5,
    suggestion: h.suggestion ?? {},
  }));

  const { error } = await supabaseAdmin
    .from('cultural_highlights')
    .insert(rows);

  if (error) throw error;
}


