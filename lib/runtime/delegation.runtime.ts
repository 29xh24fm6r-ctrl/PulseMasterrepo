
import { createClient } from "@supabase/supabase-js";

// Service Role Client (Runtime Enclave)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Checks for a valid delegation contract for the given intent.
 */
export async function findActiveDelegationContract(
    owner_user_id: string,
    intent_type: string,
    workflow_template_id: string
) {
    const now = new Date().toISOString();

    const { data: contract, error } = await supabase
        .from("delegation_contracts")
        .select("*")
        .eq("owner_user_id", owner_user_id)
        .eq("intent_type", intent_type)
        .eq("workflow_template_id", workflow_template_id)
        .is("revoked_at", null)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .limit(1)
        .single();

    if (error) {
        if (error.code !== 'PGRST116') console.error("Error finding contract", error);
        return null; // Treat error as no contract found
    }
    return contract;
}

/**
 * Increment usage count on a contract.
 */
export async function incrementDelegationUsage(contractId: string) {
    // Try RPC first if it existed, but fallback to read-update or simple update
    // We'll do direct update for now as per original code pattern

    // Fetch first to get current (concurrency risk accepted for MVP)
    const { data } = await supabase
        .from("delegation_contracts")
        .select("current_executions")
        .eq("id", contractId)
        .single();

    if (data) {
        await supabase
            .from("delegation_contracts")
            .update({ current_executions: (data.current_executions || 0) + 1 })
            .eq("id", contractId);
    }
}
