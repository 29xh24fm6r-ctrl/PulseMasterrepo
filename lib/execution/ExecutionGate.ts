import { createClient } from "@/lib/supabase/client";
import { ExecutionIntentType } from "./ExecutionIntent";
import { computeSuggestionEligibility, TrustContext } from "../trust/computeSuggestionEligibility";
import { v4 as uuidv4 } from "uuid";

// Types
export type ExecutionToken = {
    token_id: string;
    user_id: string;
    intent_type: ExecutionIntentType;
    issued_at: string; // ISO
    expires_at: string; // ISO
    trust_level: "HIGH" | "MEDIUM" | "LOW";
};

export class ExecutionGate {
    private static TOKEN_VALIDITY_MS = 5 * 60 * 1000; // 5 minutes

    /**
     * REQUEST EXECUTION TOKEN
     * 
     * The ONLY way to get permission to execute a side-effect.
     * Verifies that a human confirmation exists in the DB for this intent.
     */
    static async request(
        userId: string,
        intent: ExecutionIntentType,
        trustContext: TrustContext
    ): Promise<ExecutionToken> {
        // 1. Check Eligibility
        const eligibility = computeSuggestionEligibility(trustContext);
        if (!eligibility.allowed) {
            throw new Error(`[EXECUTION BLOCKED] Trust level insufficient for intent ${intent}. Reason: ${eligibility.reason}`);
        }

        // 2. Verify Confirmation in DB
        const supabase = createClient();

        // We look for a confirmation in the last 5 minutes
        const windowStart = new Date(Date.now() - this.TOKEN_VALIDITY_MS).toISOString();

        const { data: confirmations, error } = await supabase
            .from("execution_confirmations")
            .select("*")
            .eq("user_id", userId)
            .eq("intent_type", intent)
            .gte("confirmed_at", windowStart)
            .order("confirmed_at", { ascending: false })
            .limit(1);

        if (error) {
            console.error("ExecutionGate DB Error:", error);
            throw new Error("[EXECUTION GATE] Failed to verify confirmation.");
        }

        if (!confirmations || confirmations.length === 0) {
            throw new Error(`[HUMAN AGENCY LOCK] No human confirmation found for ${intent} in the last 5 minutes.`);
        }

        const confirmation = confirmations[0];

        // 3. Issue Token
        const token: ExecutionToken = {
            token_id: uuidv4(),
            user_id: userId,
            intent_type: intent,
            issued_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + this.TOKEN_VALIDITY_MS).toISOString(),
            trust_level: (confirmation.trust_level as any) || "LOW" // Default safer
        };

        // 4. Log issuance
        console.log(`[EXECUTION GRANT] Token ${token.token_id} issued for ${intent} (User: ${userId})`);

        return token;
    }

    /**
     * VERIFY TOKEN (Executor Side)
     */
    static verify(token: ExecutionToken, requiredIntent: ExecutionIntentType): boolean {
        if (token.intent_type !== requiredIntent) return false;
        if (new Date(token.expires_at).getTime() < Date.now()) return false;
        return true;
    }
}
