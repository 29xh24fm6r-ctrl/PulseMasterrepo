import { LifeState } from '@/lib/life-state/types';

export interface Insight {
    id: string;
    severity: number; // 0-1
    confidence: number; // 0-1
    title: string;
    description: string;
    domains: string[]; // Must be >= 2
    causal_chain: string[]; // e.g. ["Chef", "Finance", "Energy"]
    timestamp: string;
}

// Logic to generate insights based on LifeState rules
export function generateInsights(state: LifeState): Insight[] {
    const insights: Insight[] = [];

    // Finance-Aware Rules (Real Logic)

    // Rule 1: Finance + Stress (The Spiral)
    if (state.financial_pressure > 0.7 && state.stress_index > 0.6) {
        insights.push({
            id: 'fin-stress-spiral',
            severity: 0.95,
            confidence: 0.88,
            title: 'Stress-Spend Spiral',
            description: 'High financial pressure is correlating with peak stress. Risk of reactive spending to soothe stress detected.',
            domains: ['Finance', 'Health'],
            causal_chain: ['Finance', 'Stress', 'Spend'],
            timestamp: new Date().toISOString()
        });
    }

    // Rule 2: Time + Finance (Convenience Leak)
    if (state.time_pressure > 0.8 && state.financial_pressure > 0.5) {
        insights.push({
            id: 'conv-leak',
            severity: 0.7,
            confidence: 0.82,
            title: 'Convenience Leak',
            description: 'Extreme time scarcity is likely forcing high-cost convenience spending (delivery/transport).',
            domains: ['Time', 'Finance'],
            causal_chain: ['Time', 'Logistics', 'Finance'],
            timestamp: new Date().toISOString()
        });
    }

    // Rule 3: Momentum + Finance (Investment Window)
    if (state.momentum_score > 0.6 && state.financial_pressure < 0.4) {
        insights.push({
            id: 'invest-win',
            severity: 0.5,
            confidence: 0.9,
            title: 'Capital Deployment',
            description: 'Stable finance and high momentum active. Safe to deploy capital for acceleration.',
            domains: ['Finance', 'Momentum'],
            causal_chain: ['Momentum', 'Finance', 'Growth'],
            timestamp: new Date().toISOString()
        });
    }

    // Fallback Rule: Generic Burnout (if finance is okay but other things aren't)
    if (state.time_pressure > 0.7 && state.energy_level < 0.4 && state.financial_pressure < 0.6) {
        insights.push({
            id: 'burnout-risk',
            severity: 0.85,
            confidence: 0.92,
            title: 'Burnout Trajectory',
            description: 'Schedule density is incompatible with current energy reserves. Failure likely in 3 days.',
            domains: ['Time', 'Energy'],
            causal_chain: ['Time', 'Energy', 'Burnout'],
            timestamp: new Date().toISOString()
        });
    }

    // Fallback Rule: Deep Work
    if (state.momentum_score > 0.5 && state.energy_level > 0.7 && insights.length < 3) {
        insights.push({
            id: 'flow-opp',
            severity: 0.6,
            confidence: 0.75,
            title: 'Deep Work Window',
            description: 'High energy and strong momentum detected. Ideal conditions for Phase 14 planning.',
            domains: ['Momentum', 'Work'],
            causal_chain: ['Momentum', 'Energy', 'Work'],
            timestamp: new Date().toISOString()
        });
    }

    return insights.sort((a, b) => b.severity - a.severity).slice(0, 3);
}
