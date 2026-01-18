import { createClient } from '@/utils/supabase/server';

export async function acceptReadinessCandidate(ownerUserId: string, readinessId: string) {
    const supabase = await createClient();

    // 1. Verify Candidate
    const { data: candidate, error } = await supabase
        .from('delegation_readiness_cache')
        .select('*')
        .eq('id', readinessId)
        .eq('owner_user_id', ownerUserId)
        .is('dismissed_at', null)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

    if (error || !candidate) {
        throw new Error("Candidate invalid or expired.");
    }

    // 2. Create Delegation Edge (The Actual Write)
    // Needs `delegation_edges` table from Phase 13.
    // If target_principal_id is null, we might need to resolve it (e.g. to a default AI principal).
    // For Phase 14 spec, we assume it's resolved or we throw.
    if (!candidate.target_principal_id) {
        // Resolve to System/AI Principal provided we have one. 
        // For now, fail safe if no target.
        throw new Error("Cannot delegate to undefined target.");
    }

    const limits = candidate.signals_json?.constraints || {};

    const { error: edgeError } = await supabase.from('delegation_edges').insert({
        from_principal_id: candidate.actor_principal_id,
        to_principal_id: candidate.target_principal_id,
        scope: candidate.scope,
        constraints_json: limits,
        // created_by: ownerUserId -- handled by RLS/defaults if table supports it
    });

    if (edgeError) throw edgeError;

    // 3. Mark Accepted
    await supabase.from('delegation_readiness_cache').update({
        accepted_at: new Date().toISOString()
    }).eq('id', readinessId);

    // 4. Log Feedback
    await supabase.from('delegation_prediction_feedback').insert({
        owner_user_id: ownerUserId,
        readiness_id: readinessId,
        action: 'accepted'
    });
}

export async function dismissReadinessCandidate(ownerUserId: string, readinessId: string) {
    const supabase = await createClient();

    await supabase.from('delegation_readiness_cache').update({
        dismissed_at: new Date().toISOString()
    }).eq('id', readinessId).eq('owner_user_id', ownerUserId);

    await supabase.from('delegation_prediction_feedback').insert({
        owner_user_id: ownerUserId,
        readiness_id: readinessId,
        action: 'dismissed'
    });
}
