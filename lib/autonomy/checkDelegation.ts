
import { findActiveDelegationContract, incrementDelegationUsage } from "@/lib/runtime/delegation.runtime";

export type DelegationDecision = 'ALLOW' | 'DENY' | 'ESCALATE';

export interface DelegationCheckRequest {
    owner_user_id: string;
    intent_type: string;
    workflow_template_id: string;
    context: any;
}

export async function checkDelegation(req: DelegationCheckRequest): Promise<{ decision: DelegationDecision, reason?: string, contract_id?: string }> {
    const { owner_user_id, intent_type, workflow_template_id } = req;

    // 1. Fetch valid contract via runtime helper
    const contract = await findActiveDelegationContract(owner_user_id, intent_type, workflow_template_id);

    if (!contract) {
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

    // Delegate to runtime enclave
    await incrementDelegationUsage(contractId);
}
