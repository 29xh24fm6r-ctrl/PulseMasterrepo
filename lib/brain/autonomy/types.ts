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
    user_paused?: boolean;
    display_name?: string;
    description?: string;
    // Phase 23 extensions
    last_success_at?: string; // ISO date
    last_confirm_at?: string;
    last_decay_at?: string;
    decay_score?: number;
    context_hash?: string;
};

export type AutonomyDecision = {
    autonomyLevel: AutonomyLevel;
    upgradedWriteMode?: 'auto' | 'confirm' | 'proposed';
    decisionReason: string;
    classKey?: string;
};
