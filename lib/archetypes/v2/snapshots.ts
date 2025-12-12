// Archetype Engine v2 - Snapshot Builder
// lib/archetypes/v2/snapshots.ts

import { supabaseAdminClient } from '../../supabase/admin';
import { callAIJson } from '@/lib/ai/call';
import { ARCHETYPE_ANALYZER_PROMPT } from './prompts';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function runArchetypeSnapshotForUser(userId: string, now: Date) {
  const dbUserId = await resolveUserId(userId);

  // Gather context: last 30 days of canon events, decisions, life_canon snapshot etc
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

  const [canonSnapshotRes, eventsRes] = await Promise.all([
    supabaseAdminClient
      .from('life_canon_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdminClient
      .from('canon_events')
      .select('*')
      .eq('user_id', dbUserId)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  const snapshot = canonSnapshotRes.data;
  const events = eventsRes.data ?? [];

  const result = await callAIJson<{
    currentMix: Array<{
      id: string;
      strength: number;
      mode: 'healthy' | 'shadow';
      notes?: string;
    }>;
    rising: string[];
    fading: string[];
    suppressed: string[];
    narrativeSummary: string;
  }>({
    userId,
    feature: 'archetype_snapshot',
    systemPrompt: ARCHETYPE_ANALYZER_PROMPT,
    userPrompt: `Context:\n${JSON.stringify({
      canonSnapshot: snapshot,
      recentEvents: events,
    }, null, 2)}`,
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    throw new Error(`Failed to analyze archetypes: ${result.error}`);
  }

  const { currentMix, rising, fading, suppressed, narrativeSummary } = result.data;

  // Insert snapshot
  const { error: snapshotError } = await supabaseAdminClient
    .from('archetype_snapshots')
    .insert({
      user_id: dbUserId,
      snapshot_time: now.toISOString(),
      current_mix: currentMix ?? [],
      rising_archetypes: rising ?? [],
      fading_archetypes: fading ?? [],
      narrative_summary: narrativeSummary ?? '',
    });

  if (snapshotError) throw snapshotError;

  // Update user_archetype_profiles
  const { error: profileError } = await supabaseAdminClient
    .from('user_archetype_profiles')
    .upsert(
      {
        user_id: dbUserId,
        dominant_archetypes: currentMix ?? [],
        suppressed_archetypes: suppressed ?? [],
        context_notes: {
          lastUpdated: now.toISOString(),
          fromSnapshotId: snapshot?.id ?? null,
        },
        updated_at: now.toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (profileError) throw profileError;

  return {
    currentMix,
    rising,
    fading,
    suppressed,
    narrativeSummary,
  };
}


