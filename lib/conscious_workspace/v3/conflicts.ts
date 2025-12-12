// Conscious Conflict Detection
// lib/conscious_workspace/v3/conflicts.ts

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

const CONSCIOUS_CONFLICTS_PROMPT = `
You are the Conflict Detector.

You see:
- All conscious_items in this frame (plans, risks, desires, social tensions, etc.).

Your job:
1. Identify pairs of items that are in meaningful tension, such as:
   - values_vs_plan
   - destiny_vs_short_term
   - relationship_vs_work
   - health_vs_overwork
   - multiple high-urgency items competing for limited time/energy.

2. For each conflict:
   - itemAId, itemBId
   - conflictKind
   - severity (0..1)
   - description: explain clearly what the tension is.
   - suggestedResolutions: 2–5 high-level strategies (e.g. "defer X", "change Y scope", "have conversation with Z").

Be honest but kind. Focus on conflicts that *matter*, not every tiny tradeoff.

Return JSON: { "conflicts": [ ... ] }.

Only return valid JSON.`;

export async function detectConflictsForFrame(userId: string, frameId: string) {
  const dbUserId = await resolveUserId(userId);

  const { data: items, error } = await supabaseAdmin
    .from('conscious_items')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('frame_id', frameId);

  if (error) {
    console.error('[Conscious Workspace] Failed to fetch items for conflict detection', error);
    throw error;
  }

  if (!items?.length) return;

  const result = await callAIJson<{
    conflicts: Array<{
      itemAId: string;
      itemBId: string;
      conflictKind: string;
      severity: number;
      description: string;
      suggestedResolutions?: any;
    }>;
  }>({
    userId,
    feature: 'conscious_conflicts',
    systemPrompt: CONSCIOUS_CONFLICTS_PROMPT,
    userPrompt: JSON.stringify({
      items: items.map((i: any) => ({
        id: i.id,
        sourceSubsystem: i.source_subsystem,
        kind: i.kind,
        title: i.title,
        description: i.description,
        domain: i.domain,
        tags: i.tags || [],
        urgency: i.urgency,
        importance: i.importance,
        payload: i.payload || {},
      })),
    }, null, 2),
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data || !result.data.conflicts?.length) {
    // No conflicts detected is fine
    return;
  }

  const { conflicts } = result.data;

  const rows = conflicts.map((c) => ({
    user_id: dbUserId,
    frame_id: frameId,
    item_a_id: c.itemAId,
    item_b_id: c.itemBId,
    conflict_kind: c.conflictKind,
    severity: c.severity,
    description: c.description,
    suggested_resolutions: c.suggestedResolutions ?? {},
  }));

  const { error: insertError } = await supabaseAdmin
    .from('conscious_conflicts')
    .insert(rows);

  if (insertError) {
    console.error('[Conscious Workspace] Failed to insert conflicts', insertError);
    throw insertError;
  }
}


