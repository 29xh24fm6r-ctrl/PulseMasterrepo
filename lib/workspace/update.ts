// Workspace Update Engine (Event-driven)
// lib/workspace/update.ts

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

const WORKSPACE_UPDATE_SYSTEM_PROMPT = `
You are the Global Conscious Workspace.

You receive:
- The current workspace state
- Active threads
- A new brain event

Your job:
1. Decide if the event should:
   - be ignored at the conscious level,
   - update an existing thread,
   - create a new thread,
   - or trigger an interrupt (for highly urgent/severe issues).
2. Optionally adjust focusMode if needed (e.g., switch to 'fire_fighting' on emergencies).

Keep the total number of active threads between 3 and 7.

Return JSON:
{
  "update": {
    "focusMode": "...",
    "promoteThreads": [ { "threadId": "...", "importance": 0.9, "urgency": 0.9 } ],
    "demoteThreadIds": ["..."],
    "newThreads": [ { "kind": "...", "source": "...", "title": "...", "summary": "...", "importance": 0.8, "urgency": 0.7 } ],
    "createInterrupt": { "severity": 0.9, "summary": "...", "details": { ... } } | null
  }
}

Only return valid JSON.`;

export async function updateWorkspaceFromEvent(userId: string, event: any) {
  const dbUserId = await resolveUserId(userId);
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // 1. Load today's workspace_state + active threads
  const { data: stateRows } = await supabaseAdmin
    .from('workspace_state')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('state_date', todayStr)
    .limit(1);

  const state = stateRows?.[0];

  if (!state) {
    // No workspace state yet, skip update
    return;
  }

  const { data: threadRows } = await supabaseAdmin
    .from('workspace_threads')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('status', 'active')
    .order('last_touched_at', { ascending: false });

  // 2. Ask LLM if we should adjust threads/focus
  const result = await callAIJson<{
    update: {
      focusMode?: string;
      promoteThreads?: Array<{ threadId: string; importance: number; urgency: number }>;
      demoteThreadIds?: string[];
      newThreads?: Array<{
        kind: string;
        source: string;
        refType?: string;
        refId?: string;
        title: string;
        summary?: string;
        importance: number;
        urgency: number;
        emotionalValence?: number;
        attentionCostMinutes?: number;
      }>;
      createInterrupt?: {
        severity: number;
        summary: string;
        details: any;
      } | null;
    };
  }>({
    userId,
    feature: 'workspace_update',
    systemPrompt: WORKSPACE_UPDATE_SYSTEM_PROMPT,
    userPrompt: JSON.stringify({
      event,
      state: {
        focusMode: state.focus_mode,
        focusTheme: state.focus_theme,
        activeThreadIds: state.active_thread_ids,
      },
      activeThreads: (threadRows || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        kind: t.kind,
        importance: t.importance,
        urgency: t.urgency,
      })),
    }, null, 2),
    maxTokens: 1500,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Workspace] Failed to update workspace', result.error);
    return;
  }

  const { update } = result.data;

  // 3. Apply updates
  let newThreadIds: string[] = [...(state.active_thread_ids || [])];

  // Promote threads
  if (update.promoteThreads) {
    for (const promote of update.promoteThreads) {
      await supabaseAdmin
        .from('workspace_threads')
        .update({
          importance: promote.importance,
          urgency: promote.urgency,
          last_touched_at: new Date().toISOString(),
        })
        .eq('id', promote.threadId);
    }
  }

  // Demote threads (remove from active)
  if (update.demoteThreadIds) {
    for (const threadId of update.demoteThreadIds) {
      await supabaseAdmin
        .from('workspace_threads')
        .update({ status: 'snoozed' })
        .eq('id', threadId);
      
      newThreadIds = newThreadIds.filter(id => id !== threadId);
    }
  }

  // Create new threads
  if (update.newThreads && update.newThreads.length > 0) {
    const { data: newThreadRows } = await supabaseAdmin
      .from('workspace_threads')
      .insert(
        update.newThreads.map((t) => ({
          user_id: dbUserId,
          kind: t.kind,
          source: t.source,
          ref_type: t.refType ?? null,
          ref_id: t.refId ?? null,
          title: t.title,
          summary: t.summary ?? null,
          importance: t.importance,
          urgency: t.urgency,
          emotional_valence: t.emotionalValence ?? null,
          attention_cost_minutes: t.attentionCostMinutes ?? null,
          status: 'active',
        }))
      )
      .select('id');

    if (newThreadRows) {
      newThreadIds.push(...newThreadRows.map((r: any) => r.id));
    }
  }

  // Limit to 7 threads
  const finalThreadIds = newThreadIds.slice(0, 7);

  // Update workspace state
  await supabaseAdmin
    .from('workspace_state')
    .update({
      focus_mode: update.focusMode || state.focus_mode,
      active_thread_ids: finalThreadIds,
      attention_load: Math.min(1, finalThreadIds.length / 7),
      last_updated_at: new Date().toISOString(),
    })
    .eq('id', state.id);

  // Create interrupt if needed
  if (update.createInterrupt) {
    await supabaseAdmin
      .from('workspace_interrupts')
      .insert({
        user_id: dbUserId,
        source: event.source || 'system',
        severity: update.createInterrupt.severity,
        summary: update.createInterrupt.summary,
        details: update.createInterrupt.details || {},
      });
  }
}

