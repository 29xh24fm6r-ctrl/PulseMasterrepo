import { SignalBundle } from './types';
import { getTasks } from '@/lib/data/tasks';
import { getJournalEntries } from '@/lib/data/journal';

// Adapts real app data into the signal bundle format
export async function buildSignalBundle(userId: string): Promise<SignalBundle> {
    const now = Date.now();

    // 1. Fetch Data Parallel
    // We need:
    // - Active tasks
    // - Recent journal entries (context)
    // - Recent Bridge Events (for cooldowns)
    const [tasks, journalEntries, bridgeEvents] = await Promise.all([
        getTasks(userId),
        getJournalEntries(userId, 5),
        fetchBridgeEvents(userId)
    ]);

    // 2. Adapt to Schema

    // Actions: Active tasks that are NOT blocked
    // Map DB tasks to schema
    const actions = tasks
        .filter((t: any) => t.status !== 'done' && t.status !== 'blocked')
        .map((t: any) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            project: t.project,
            priority: t.priority,
            due_at: t.due_at
        }));

    // Blockers: Tasks with status 'blocked'
    const blockers = tasks
        .filter((t: any) => t.status === 'blocked')
        .map((t: any) => ({
            id: t.id,
            title: t.title,
            status: 'active',
            created_at: undefined // tasks don't have created_at in the map? we can add if needed
        }));

    // Sessions: Using journal entries as proxy
    const sessions = journalEntries.map((e: any) => ({
        id: e.id,
        title: e.title,
        status: 'active',
        created_at: e.created_at
    }));

    // Decisions: Placeholder
    const decisions: any[] = [];

    // Dependencies: Placeholder
    const dependencies: any[] = [];

    // Map bridge events
    const user_events = bridgeEvents.map((e: any) => {
        let payload = {};
        try { payload = JSON.parse(e.content); } catch { }
        // Tag format is: system, bridge, TYPE. We assume TYPE is the 3rd tag or we check title
        // or we check the tags array.
        const type = e.tags?.find((t: string) => ['DEFER_NOW', 'EXECUTED_ACTION', 'OVERRIDE_NOW'].includes(t)) || 'UNKNOWN';

        return {
            type,
            timestamp: e.created_at,
            payload
        };
    });

    return {
        now,
        active_surface: 'bridge',
        active_environment: process.env.NODE_ENV || 'production',

        sessions,
        threads: [],
        actions,
        decisions,
        blockers,
        dependencies,

        user_events,
        ignored_candidates: []
    };
}

import { supabaseAdmin } from '@/lib/supabase';

async function fetchBridgeEvents(userId: string) {
    // Fetch last 24h of bridge events
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data } = await supabaseAdmin
        .from('journal_entries')
        .select('*')
        .eq('user_id_uuid', userId)
        .contains('tags', ['bridge']) // filtered by 'bridge' tag
        .gte('created_at', oneDayAgo)
        .order('created_at', { ascending: false });

    return (data || []).map((row: any) => ({
        ...row,
        content: row.transcript // standardize to 'content' for our internal mapper if needed, but we used transcript above
    }));
}
