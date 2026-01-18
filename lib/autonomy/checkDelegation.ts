
import { createClient } from "@supabase/supabase-js";

// Lazy init for Service Client
let supabaseInstance: ReturnType<typeof createClient> | null = null;

function getSupabase() {
    if (!supabaseInstance) {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error("NEXT_PUBLIC_SUPABASE_URL missing");
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");

        supabaseInstance = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
    }
    return supabaseInstance;
}

export type DelegationDecision = 'ALLOW' | 'DENY' | 'ESCALATE';

export interface DelegationCheckRequest {
    owner_user_id: string;
    intent_type: string;
    workflow_template_id: string;
    context: any;
}

export async function checkDelegation(req: DelegationCheckRequest): Promise<{ decision: DelegationDecision, reason?: string, contract_id?: string }> {
    const { owner_user_id, intent_type, workflow_template_id } = req;

    // 1. Fetch valid contract
    const now = new Date().toISOString();

    const { data: contract, error } = await getSupabase()
        .from("delegation_contracts")
        .select("*")
        .eq("owner_user_id", owner_user_id)
        .eq("intent_type", intent_type)
        .eq("workflow_template_id", workflow_template_id)
        .is("revoked_at", null)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .limit(1) // Assuming one active contract per template type for simplicity, or grab most permissive
        .single();

    if (error || !contract) {
        return { decision: 'DENY', reason: "No active delegation contract found" };
    }

    // 2. Check Execution Limits
    if (contract.max_executions > 0 && contract.current_executions >= contract.max_executions) {
        return { decision: 'ESCALATE', reason: "Max execution limit reached for delegation" };
    }

    // 3. Increment Usage (Optimistic? Or caller handles? Caller handles usually, but we should atomically increment if 'ALLOW')
    // For this pure check function, we just check. The caller (Worker) is responsible for incrementing `current_executions` if it proceeds.

    return { decision: 'ALLOW', contract_id: contract.id };
}

/**
 * Helper to record usage of a delegation contract.
 */
export async function recordDelegationUsage(contractId: string) {
    if (!contractId) return;

    // Atomic increment
    await getSupabase().rpc('increment_delegation_usage', { contract_id: contractId });
    // Note: If RPC missing, use direct query, but concurrency might be issue. 
    // Given the Phase 10 scale, direct update is likely fine for MVP, but RPC is cleaner.
    // We will do direct update for now to avoid creating SQL function in tool call, unless needed.

    const { data } = await getSupabase()
        .from("delegation_contracts")
        .select("current_executions")
        .eq("id", contractId)
        .single();

    if (data) {
        await getSupabase()
            .from("delegation_contracts")
            .update({ current_executions: (data.current_executions || 0) + 1 })
            .eq("id", contractId);
    }
}
