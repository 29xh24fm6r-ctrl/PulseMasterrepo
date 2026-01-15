
/**
 * Pulse Second-Order Effects Engine
 * lib/brain/secondOrder.ts
 * 
 * Provides heuristic analysis of downstream impacts for proposed intents.
 * These are deterministic "Physics" checks, independent of AI hallucination.
 */

// ============================================
// TYPES
// ============================================

export interface ImpactAnalysis {
    time_debt: 'low' | 'medium' | 'high';
    energy_cost: 'low' | 'medium' | 'high';
    social_impact: 'positive' | 'neutral' | 'negative';
    effects: string[];
}

// ============================================
// LOGIC
// ============================================

export function assessSecondOrderEffects(intentTitle: string, toolName?: string): ImpactAnalysis {
    const effects: string[] = [];
    const lowerTitle = intentTitle.toLowerCase();

    // 1. Time Debt Analysis
    let time_debt: 'low' | 'medium' | 'high' = 'low';
    if (toolName === 'create_task' || lowerTitle.includes('schedule') || lowerTitle.includes('meeting')) {
        time_debt = 'medium';
        effects.push("Increases future calendar density.");
    }
    if (lowerTitle.includes('project') || lowerTitle.includes('launch')) {
        time_debt = 'high';
        effects.push("Creates significant recurring maintenance overhead.");
    }

    // 2. Energy Cost
    let energy_cost: 'low' | 'medium' | 'high' = 'low';
    if (lowerTitle.includes('context switch') || lowerTitle.includes('urgent')) {
        energy_cost = 'high';
        effects.push("Cognitive switching cost is expensive.");
    }

    // 3. Social Impact
    let social_impact: 'positive' | 'neutral' | 'negative' = 'neutral';
    if (lowerTitle.includes('email') || lowerTitle.includes('call') || lowerTitle.includes('message')) {
        social_impact = 'positive';
        effects.push("Strengthens social graph connectivity.");
    }
    if (lowerTitle.includes('cancel') || lowerTitle.includes('decline')) {
        social_impact = 'negative';
        effects.push("Potential social friction risk.");
    }

    return {
        time_debt,
        energy_cost,
        social_impact,
        effects
    };
}
