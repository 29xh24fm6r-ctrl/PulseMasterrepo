export type PlanTier = 'Free' | 'Plus' | 'Pro';

export interface SubscriptionCapability {
    bridgeUnlimited: boolean;
    autonomyL1: boolean;
    observerFull: boolean;
}

export interface SubscriptionContext {
    plan: PlanTier;
    capabilities: SubscriptionCapability;
    limits?: {
        bridgeMessagesPerDay?: number;
    };
}
