import { ActionItem, Session, UserEvent } from './types';
import { supabaseAdmin } from '@/lib/supabase';

// This module handles side-effects of user actions on the Bridge

export async function logUserEvent(userId: string, type: 'DEFER_NOW' | 'OVERRIDE_NOW' | 'EXECUTED_ACTION', payload: any) {
    // In V1, we might not have a dedicated 'user_events' table, 
    // but the spec implies we need to persist "DEFER_NOW" to respect cooldown.
    // Let's assume we create a table `bridge_events` or reuse `journal_entries` with a special tag?
    // For "Gemini-ready", strict correctness is better. 
    // I will write to a new table `bridge_log` if it existed, but as I can't migrate DB now easily,
    // I will use `journal_entries` with a system tag `#meta #bridge-event` as a generic event store.

    // Better yet: Just local state? No, engine is server-side.
    // Let's use `journal_entries` with a structured title/content for V1.
    // Title: "Bridge Event: DEFER_NOW"
    // Content: JSON payload
    // Tags: ["system", "bridge", "event"]

    const { error } = await supabaseAdmin.from('journal_entries').insert({
        title: `Bridge Event: ${type}`,
        transcript: JSON.stringify(payload),
        tags: ['system', 'bridge', type],
        user_id_uuid: userId,
        owner_user_id_legacy: userId,
        // mood, xp_earned: 0 
    });

    if (error) console.error("Failed to log bridge event", error);
}

export async function performAction(userId: string, actionPayload: any) {
    // Determine op
    const { op, ref_id } = actionPayload;

    if (op === 'complete_action') {
        const { error } = await supabaseAdmin.from('tasks').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', ref_id).eq('user_id_uuid', userId);
        if (error) throw error;
    }

    // Other ops: 'resolve_blocker', 'resume_session' (maybe create new journal entry linked to old?)
    // For V1, primarily handle 'complete_action'
}
