export type AutonomyLevel = 'L0' | 'L1';

export type AutonomyClass = {
    classKey: string;
    domain: string;
    effectType: string;
    fingerprint: string;
    status: 'locked' | 'eligible' | 'paused';
    eligibilityScore: number;
    stats: {
        successes: number;
        confirmations: number;
        rejections: number;
        reverts: number;
        confusionEvents: number;
        ippBlocks: number;
    };
    // Phase 22 extensions
    user_paused?: boolean;
    display_name?: string;
    description?: string;
};

export type AutonomyDecision = {
    autonomyLevel: AutonomyLevel;
    upgradedWriteMode?: 'auto' | 'confirm' | 'proposed';
    decisionReason: string;
    classKey?: string;
};
