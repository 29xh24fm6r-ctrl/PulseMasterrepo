import { createClient } from '@/lib/supabase/server';
import { type UUID } from 'crypto';
import { type DelegationDenialSignal } from './denialSignals';
import { getLikelyScopeForPath } from './scopeMap';

export type ReadinessCandidate = {
    id: string; // generated on insert, but useful for typings
    actor_principal_id: string;
    target_principal_id?: string;
    scope: string;
    reason: string;
    context_path: string;
    confidence: number;
    signals_json: Record<string, any>;
    expires_at: string;
};

// Configuration
const SURFACING_THRESHOLD = 0.7;
const STORAGE_THRESHOLD = 0.5;
const COOLDOWN_MINUTES = 10;
const MAX_SHOW_COUNT = 3;

// Inputs for deterministic generation
type ReadinessInputs = {
    denialSignal?: DelegationDenialSignal;
    isHelpRequest?: boolean; // Trigger B
};

/**
 * Deterministically generates candidates based on REAL signals.
 * Replaces previous mock logic.
 */
export async function generateReadinessCandidates(
    ownerUserId: string,
    contextPath: string,
    currentPrincipalId: string,
    inputs: ReadinessInputs = {}
): Promise<void> {
    const supabase = await createClient();
    const candidates: Omit<ReadinessCandidate, 'id'>[] = [];
    const now = Date.now();

    // TRIGGER A: Delegation Denial Signal
    // If a recent error occurred that is strictly a delegation denial
    if (inputs.denialSignal) {
        const { code, scope, target_principal_id } = inputs.denialSignal;

        if (scope) {
            candidates.push({
                actor_principal_id: currentPrincipalId,
                target_principal_id: target_principal_id, // Might be undefined -> UI handles "Choose"
                scope: scope,
                reason: `I encountered a permission issue (${code}). Enable access to fix this?`,
                context_path: contextPath,
                confidence: 0.95, // High confidence on explicit denial
                signals_json: { trigger: 'denial_error', code },
                expires_at: new Date(now + 60 * 60 * 1000).toISOString() // 1 hour TTL for error recovery
            });
        }
    }

    // TRIGGER B: Explicit Help Request on Scoped Page
    // Only if user clicked "Copy for help" or focused QuickTalk (passed as isHelpRequest)
    if (inputs.isHelpRequest) {
        const likelyScope = getLikelyScopeForPath(contextPath);
        if (likelyScope) {
            candidates.push({
                actor_principal_id: currentPrincipalId,
                target_principal_id: undefined, // Usually unknown in generic help request
                scope: likelyScope,
                reason: `I can help manage your ${likelyScope.split('.')[0]} if you allow access.`,
                context_path: contextPath,
                confidence: 0.85, // Good confidence if they asked for help on a specific page
                signals_json: { trigger: 'help_request', route: contextPath },
                expires_at: new Date(now + 15 * 60 * 1000).toISOString() // 15 min TTL for immediate help
            });
        }
    }

    // 2. Filter & Store (Standard Logic)
    for (const cand of candidates) {
        if (cand.confidence < STORAGE_THRESHOLD) continue;

        // Dedup: Check if similar active candidate exists
        const { data: existing } = await supabase
            .from('delegation_readiness_cache')
            .select('id')
            .eq('owner_user_id', ownerUserId)
            .eq('scope', cand.scope)
            .eq('context_path', cand.context_path)
            .gt('expires_at', new Date().toISOString())
            .is('dismissed_at', null)
            .is('accepted_at', null)
            .single();

        if (!existing) {
            await supabase.from('delegation_readiness_cache').insert({
                owner_user_id: ownerUserId,
                actor_principal_id: cand.actor_principal_id,
                target_principal_id: cand.target_principal_id,
                scope: cand.scope,
                reason: cand.reason,
                context_path: cand.context_path,
                confidence: cand.confidence,
                signals_json: cand.signals_json,
                expires_at: cand.expires_at
            });
        }
    }
}

/**
 * Retrieves the single best candidate for the current context.
 * Enforces Rate Limits, TTL, and Opening Gates.
 */
export async function getTopCandidate(
    ownerUserId: string,
    contextPath: string
): Promise<ReadinessCandidate | null> {
    const supabase = await createClient();
    const now = new Date().toISOString();
    const cooldownCuttoff = new Date(Date.now() - COOLDOWN_MINUTES * 60 * 1000).toISOString();

    // Query for valid candidates
    const { data: candidates, error } = await supabase
        .from('delegation_readiness_cache')
        .select('*')
        .eq('owner_user_id', ownerUserId)
        .eq('context_path', contextPath) // Strict context match for Phase 14
        .gt('expires_at', now)
        .gte('confidence', SURFACING_THRESHOLD)
        .is('dismissed_at', null)
        .is('accepted_at', null)
        .lt('shown_count', MAX_SHOW_COUNT)
        .or(`last_shown_at.is.null,last_shown_at.lt.${cooldownCuttoff}`)
        .order('confidence', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1);

    if (error || !candidates || candidates.length === 0) {
        return null;
    }

    return candidates[0] as ReadinessCandidate;
}

export async function markCandidateShown(ownerUserId: string, readinessId: string) {
    const supabase = await createClient();

    // Atomic increment
    await supabase.rpc('increment_readiness_shown', {
        row_id: readinessId
    }).catch(async () => {
        // Fallback since we might not have created the RPC yet (it wasn't in the spec, but good practice)
        // Manual update
        const { data } = await supabase.from('delegation_readiness_cache').select('shown_count').eq('id', readinessId).single();
        if (data) {
            await supabase.from('delegation_readiness_cache').update({
                shown_count: data.shown_count + 1,
                last_shown_at: new Date().toISOString()
            }).eq('id', readinessId).eq('owner_user_id', ownerUserId);
        }
    });
}
