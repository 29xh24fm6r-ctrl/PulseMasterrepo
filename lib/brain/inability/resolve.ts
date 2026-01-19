import { InabilityToProceed } from './types';

export function resolveInabilityToProceed(ctx: {
    hasOwnerId: boolean;
    networkOk: boolean;
    permissionOk: boolean;
}): InabilityToProceed | null {

    if (!ctx.hasOwnerId) {
        return {
            reason: 'AUTH_MISSING',
            explanation:
                "I can’t continue yet because I don’t know who you are in this environment.",
            suggestedAction: {
                label: 'Set Dev User & Continue',
                action: 'SET_DEV_USER',
            },
            confidence: 'high',
        };
    }

    if (!ctx.networkOk) {
        return {
            reason: 'NETWORK_UNAVAILABLE',
            explanation:
                "I’m having trouble reaching the network right now.",
            suggestedAction: {
                label: 'Retry',
                action: 'RETRY',
            },
            confidence: 'medium',
        };
    }

    if (!ctx.permissionOk) {
        return {
            reason: 'FEATURE_GATED',
            explanation:
                "This feature isn’t available in your current mode.",
            suggestedAction: {
                label: 'Go Back',
                action: 'NAVIGATE',
            },
            confidence: 'high',
        };
    }

    return null;
}
