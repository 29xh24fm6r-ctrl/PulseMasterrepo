
import { LifeStateSnapshot, LifeContext } from './types';

/**
 * Aggregates various system signals into a coherent "Life State" model.
 * This determines how Pulse should behave (active vs quiet, bold vs cautious).
 */
export function aggregateLifeState(context: LifeContext): LifeStateSnapshot {
    const snapshot: LifeStateSnapshot = {
        energy: 'medium',
        stress: 'low',
        momentum: 'steady',
        riskFlags: [],
        lastUpdated: new Date().toISOString()
    };

    // 1. Calculate Stress
    // High task load or calendar density increases stress
    if (context.taskLoad > 10 || context.calendarDensity > 5) {
        snapshot.stress = 'high';
        snapshot.riskFlags.push('Overloaded');
    } else if (context.taskLoad > 5 || context.calendarDensity > 3) {
        snapshot.stress = 'medium';
    }

    // 2. Calculate Energy (Inverse of Stress + Reverts)
    // If stress is high, we assume energy might be draining.
    // If recent reverts are high, we assume user is "fighting" the system -> Low Energy/Patience.
    if (snapshot.stress === 'high' || context.recentReverts > 2) {
        snapshot.energy = 'low';
        if (context.recentReverts > 2) snapshot.riskFlags.push('Autonomy Friction');
    } else if (snapshot.stress === 'medium') {
        snapshot.energy = 'medium';
    } else {
        snapshot.energy = 'high';
    }

    // 3. Calculate Momentum
    // Low task load + low stress = Accelerating? Or Stalled?
    // Let's say: 
    // High Stress + Low Energy = Stalled
    // Low Stress + High Energy = Accelerating
    // Medium/Medium = Steady
    if (snapshot.stress === 'high' && snapshot.energy === 'low') {
        snapshot.momentum = 'stalled';
    } else if (snapshot.stress === 'low' && snapshot.energy === 'high') {
        snapshot.momentum = 'accelerating';
    }

    // 4. Critical Risk Flags
    if (context.chefInventoryGap > 50) {
        snapshot.riskFlags.push('Food Scarcity');
    }

    return snapshot;
}
