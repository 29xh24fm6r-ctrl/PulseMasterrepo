import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { SubscriptionContext, PlanTier } from "./types";

const ENV_PLUS_USERS = (process.env.PULSE_PLUS_USER_IDS || "").split(",");
const ENV_PRO_USERS = (process.env.PULSE_PRO_USER_IDS || "").split(",");

export async function resolveSubscription(userId: string): Promise<SubscriptionContext> {
    // 1. Check Env Overrides
    if (ENV_PRO_USERS.includes(userId)) return createContext('Pro');
    if (ENV_PLUS_USERS.includes(userId)) return createContext('Plus');

    // 2. Check DB
    try {
        const { data } = await getSupabaseAdminRuntimeClient()
            .from('user_profiles')
            .select('plan')
            .eq('user_id_uuid', userId)
            .single();

        if (data?.plan === 'pulse_plus') return createContext('Plus');
        if (data?.plan === 'pulse_pro') return createContext('Pro');
    } catch (e) {
        // Fallback to Free on error
        console.error("Subscription resolution failed, defaulting to Free", e);
    }

    // Default
    return createContext('Free');
}

function createContext(plan: PlanTier): SubscriptionContext {
    const isFree = plan === 'Free';

    // Capabilities
    const capabilities = {
        bridgeUnlimited: !isFree,
        autonomyL1: !isFree,
        observerFull: !isFree
    };

    // Limits
    const limits: SubscriptionContext['limits'] = {};
    if (isFree) {
        limits.bridgeMessagesPerDay = 10;
    }

    return { plan, capabilities, limits };
}
