// Self Mirror Highlights Generator
// lib/self_mirror/highlights.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const SELF_MIRROR_HIGHLIGHTS_PROMPT = `
You are the Self Mirror Highlighter.

You see:
- A current snapshot of the user's self state.
- Optionally a delta describing how they've changed.

Your job:
- Produce 3–12 key highlights:
  - wins,
  - risks,
  - emerging patterns,
  - pivots,
  - breakthroughs.

Each highlight should:
- be kind but honest,
- give the user a way to act (suggestedAction where appropriate),
- prioritize what's most important, not everything.

Return JSON: { "highlights": [ ... ] }.

Only return valid JSON.`;

export async function createSelfMirrorHighlightsForUser(userId: string, snapshotId?: string, deltaId?: string) {
  const dbUserId = await resolveUserId(userId);

  const [snapshotRes, deltaRes] = await Promise.all([
    snapshotId
      ? supabaseAdmin
          .from('self_mirror_snapshots')
          .select('*')
          .eq('user_id', dbUserId)
          .eq('id', snapshotId)
          .limit(1)
      : Promise.resolve({ data: null }),
    deltaId
      ? supabaseAdmin
          .from('self_mirror_deltas')
          .select('*')
          .eq('user_id', dbUserId)
          .eq('id', deltaId)
          .limit(1)
      : Promise.resolve({ data: null }),
  ]);

  const snapshot = snapshotRes.data?.[0] ?? null;
  const delta = deltaRes.data?.[0] ?? null;

  if (!snapshot && !delta) {
    console.warn('[Self Mirror] No snapshot or delta provided for highlights');
    return;
  }

  const result = await callAIJson<{
    highlights: Array<{
      kind: string;
      label: string;
      description: string;
      domain?: string;
      importance: number;
      suggestedAction?: any;
    }>;
  }>({
    userId,
    feature: 'self_mirror_highlights',
    systemPrompt: SELF_MIRROR_HIGHLIGHTS_PROMPT,
    userPrompt: JSON.stringify({
      snapshot: snapshot ? {
        overallAlignment: snapshot.overall_alignment,
        driftScore: snapshot.drift_score,
        selfCompassionScore: snapshot.self_compassion_score,
        narrativeSummary: snapshot.narrative_summary,
        mirrorInsights: snapshot.mirror_insights || {},
      } : null,
      delta: delta ? {
        alignmentChange: delta.alignment_change,
        driftChange: delta.drift_change,
        selfCompassionChange: delta.self_compassion_change,
        summary: delta.summary,
        identityShifts: delta.identity_shifts || {},
        behaviorShifts: delta.behavior_shifts || {},
      } : null,
    }, null, 2),
    maxTokens: 2500,
    temperature: 0.7,
  });

  if (!result.success || !result.data || !result.data.highlights?.length) {
    console.error('[Self Mirror] Failed to generate highlights', result.error);
    return;
  }

  const { highlights } = result.data;

  const rows = highlights.map((h) => ({
    user_id: dbUserId,
    snapshot_id: snapshotId ?? null,
    delta_id: deltaId ?? null,
    kind: h.kind,
    label: h.label,
    description: h.description,
    domain: h.domain ?? null,
    importance: h.importance ?? 0.5,
    suggested_action: h.suggestedAction ?? {},
  }));

  const { error } = await supabaseAdmin
    .from('self_mirror_highlights')
    .insert(rows);

  if (error) {
    console.error('[Self Mirror] Failed to insert highlights', error);
    throw error;
  }
}


