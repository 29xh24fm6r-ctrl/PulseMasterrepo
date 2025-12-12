// Presence Executor - Turn Decisions into Real Output
// lib/presence/executor.ts

import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function executePresenceDecision(userId: string, decisionId: string, now: Date) {
  const dbUserId = await resolveUserId(userId);

  const { data: decisions } = await supabaseAdmin
    .from('presence_decisions')
    .select('*, presence_events(*)')
    .eq('id', decisionId)
    .eq('user_id', dbUserId)
    .limit(1);

  const decision = decisions?.[0] as any;
  if (!decision) return;

  if (decision.executed) return;

  const ev = decision.presence_events;

  try {
    switch (decision.chosen_channel) {
      case 'console':
      case null:
      case 'none':
        // create a pulse_brain_surface_events row; UI reads this.
        await supabaseAdmin
          .from('pulse_brain_surface_events')
          .insert({
            user_id: dbUserId,
            source: ev.source,
            origin_id: ev.origin_id ?? null,
            category: mapKindToCategory(ev.kind),
            title: ev.title,
            body: ev.body,
            importance: ev.importance,
            emotional_tone: null,
            delivery_channel: 'console',
            delivery_context: {},
          });
        break;

      case 'notification':
        // create a surface_event flagged as notification; frontend/mobile will display it.
        await supabaseAdmin
          .from('pulse_brain_surface_events')
          .insert({
            user_id: dbUserId,
            source: ev.source,
            origin_id: ev.origin_id ?? null,
            category: mapKindToCategory(ev.kind),
            title: ev.title,
            body: ev.body,
            importance: ev.importance,
            emotional_tone: null,
            delivery_channel: 'notification',
            delivery_context: {},
          });
        break;

      case 'email':
        // For now: insert an email-type surface_event; later, actual email sending integration.
        await supabaseAdmin
          .from('pulse_brain_surface_events')
          .insert({
            user_id: dbUserId,
            source: ev.source,
            origin_id: ev.origin_id ?? null,
            category: mapKindToCategory(ev.kind),
            title: ev.title,
            body: ev.body,
            importance: ev.importance,
            emotional_tone: null,
            delivery_channel: 'email',
            delivery_context: {},
          });
        break;

      case 'voice':
        // Future: queue voice output. For now, same as notification/console.
        await supabaseAdmin
          .from('pulse_brain_surface_events')
          .insert({
            user_id: dbUserId,
            source: ev.source,
            origin_id: ev.origin_id ?? null,
            category: mapKindToCategory(ev.kind),
            title: ev.title,
            body: ev.body,
            importance: ev.importance,
            emotional_tone: null,
            delivery_channel: 'notification',
            delivery_context: { voicePreferred: true },
          });
        break;
    }

    await supabaseAdmin
      .from('presence_decisions')
      .update({
        executed: true,
        executed_at: now.toISOString(),
      })
      .eq('id', decisionId);
  } catch (err: any) {
    await supabaseAdmin
      .from('presence_decisions')
      .update({
        executed: false,
        execution_error: String(err?.message ?? err),
      })
      .eq('id', decisionId);
  }
}

function mapKindToCategory(kind: string): string {
  switch (kind) {
    case 'risk_alert':
      return 'risk';
    case 'opportunity':
      return 'opportunity';
    case 'reminder':
      return 'status';
    case 'nudge':
      return 'reflection';
    case 'insight':
    default:
      return 'reflection';
  }
}


