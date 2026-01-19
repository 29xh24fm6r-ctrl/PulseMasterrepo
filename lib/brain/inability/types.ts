export type InabilityReason =
    | 'AUTH_MISSING'
    | 'IDENTITY_MISSING'
    | 'NETWORK_UNAVAILABLE'
    | 'FEATURE_GATED'
    | 'UNKNOWN';

export type InabilityAction =
    | 'SET_DEV_USER'
    | 'RETRY'
    | 'NAVIGATE'
    | 'NONE';

export type InabilityToProceed = {
    reason: InabilityReason;
    explanation: string;              // Human-readable, calm
    suggestedAction?: {
        label: string;
        action: InabilityAction;
    };
    confidence: 'high' | 'medium';
};
