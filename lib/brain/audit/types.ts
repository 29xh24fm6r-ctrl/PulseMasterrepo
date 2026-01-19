
export type AutonomyExplanation = {
    summary: string;
    autonomyLevel: 'L0' | 'L1';
    routine?: string;
    eligibilityScore?: number;
    decayState?: string;
    healthState?: string;
    contextFactors: string[];
    safeguardsApplied: string[];
    followUpActions?: string[];
};
