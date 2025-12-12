// Conscious Attention & Focus Selection
// lib/conscious_workspace/v3/attention.ts

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

const CONSCIOUS_FOCUS_PROMPT = `
You are the Attention Router.

You see:
- A list of conscious_items with attention_score, urgency, importance, emotional_salience, domains, etc.

Your job:
1. Pick the 1–3 items that deserve active focus in this frame.
   - Prefer items that combine: high importance, sufficient urgency, and strong connection to identity/destiny/social/health.
2. Avoid choosing too many; err on focus.
3. For each chosen item, explain briefly why it's worth focusing on now.

Return JSON: { "focus": [ { "itemId": "...", "reason": "..." }, ... ] }.

Only return valid JSON.`;

export async function selectFocusItemsForFrame(userId: string, frameId: string) {
  const dbUserId = await resolveUserId(userId);

  const { data: items, error } = await supabaseAdmin
    .from('conscious_items')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('frame_id', frameId)
    .order('attention_score', { ascending: false });

  if (error) {
    console.error('[Conscious Workspace] Failed to fetch items', error);
    throw error;
  }

  if (!items?.length) return [];

  const result = await callAIJson<{
    focus: Array<{ itemId: string; reason: string }>;
  }>({
    userId,
    feature: 'conscious_focus',
    systemPrompt: CONSCIOUS_FOCUS_PROMPT,
    userPrompt: JSON.stringify({
      items: items.map((i: any) => ({
        id: i.id,
        sourceSubsystem: i.source_subsystem,
        kind: i.kind,
        title: i.title,
        description: i.description,
        domain: i.domain,
        tags: i.tags || [],
        attentionScore: i.attention_score,
        urgency: i.urgency,
        importance: i.importance,
        emotionalSalience: i.emotional_salience,
      })),
    }, null, 2),
    maxTokens: 1500,
    temperature: 0.7,
  });

  if (!result.success || !result.data || !result.data.focus?.length) {
    console.error('[Conscious Workspace] Failed to select focus items', result.error);
    return [];
  }

  const { focus } = result.data;

  const ids = focus.map((f) => f.itemId);

  const { error: updateError } = await supabaseAdmin
    .from('conscious_items')
    .update({ selected: true })
    .in('id', ids)
    .eq('user_id', dbUserId)
    .eq('frame_id', frameId);

  if (updateError) {
    console.error('[Conscious Workspace] Failed to update selected items', updateError);
    throw updateError;
  }

  // Log attention events (from none to each selected)
  const events = focus.map((f) => ({
    user_id: dbUserId,
    frame_id: frameId,
    from_item_id: null,
    to_item_id: f.itemId,
    reason: f.reason,
  }));

  const { error: eventError } = await supabaseAdmin
    .from('attention_events')
    .insert(events);

  if (eventError) {
    console.error('[Conscious Workspace] Failed to log attention events', eventError);
    // Don't throw, continue
  }

  return focus;
}


