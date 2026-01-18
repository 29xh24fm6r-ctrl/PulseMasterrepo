import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { AutonomyDecision, AutonomyLevel } from "./types";

export async function checkEligibility(args: {
    owner_user_id: string;
    intent_type: string;
    confidence: number;
}): Promise<AutonomyDecision> {
    const supabase = getSupabaseAdmin();

    // Fetch policy
    const { data: score } = await supabase
        .from("autonomy_scores")
        .select("*")
        .eq("owner_user_id", args.owner_user_id)
        .eq("intent_type", args.intent_type)
        .single();

    const level: AutonomyLevel = score?.autonomy_level || 'l0'; // Default to Suggest Only

    // L0: Always propose
    if (level === 'l0') {
        return { decision: 'PROPOSE', reason: 'Autonomy Level is L0 (Suggest Only)' };
    }

    // L1: Check constraints
    if (level === 'l1') {
        // Hard constraint: Confidence must be high enough for L1
        if (args.confidence < 0.85) {
            return { decision: 'PROPOSE', reason: 'Confidence too low for L1 execution' };
        }

        return { decision: 'ALLOW', reason: 'L1 Autonomy Authorized' };
    }

    // None or blocked
    return { decision: 'DENY', reason: 'Autonomy disabled for this intent' };
}
