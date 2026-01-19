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
};

export type AutonomyDecision = {
    autonomyLevel: AutonomyLevel;
    upgradedWriteMode?: 'auto' | 'confirm' | 'proposed';
    decisionReason: string;
    classKey?: string;
};
