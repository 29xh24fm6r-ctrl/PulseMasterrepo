
import { LifeStateSnapshot } from './types';

export type CoordinationEffect = {
    autonomyDampening: number; // 0.0 to 1.0 (1.0 = FULL STOP)
    notificationPolicy: 'silent' | 'normal' | 'active';
    allowedDomains: string[]; // List of domains allowed to act autonomously
};

export function getCoordinationPolicy(state: LifeStateSnapshot): CoordinationEffect {
    const policy: CoordinationEffect = {
        autonomyDampening: 0,
        notificationPolicy: 'normal',
        allowedDomains: ['tasks', 'chef', 'finance', 'health'] // All by default
    };

    // 1. High Stress Handling
    if (state.stress === 'high') {
        // When stressed, reduce noise. Only critical domains.
        // Dampen autonomy to require more confirmations (safety net).
        policy.autonomyDampening = 0.5;
        policy.notificationPolicy = 'silent';
        // Restrict domains to essentials
        policy.allowedDomains = ['health', 'finance', 'chef']; // Pause 'tasks' generation to avoid overwhelm
    }

    // 2. Low Energy Handling
    if (state.energy === 'low') {
        // User tired. Pulse should be helpful but not demanding.
        policy.autonomyDampening = Math.max(policy.autonomyDampening, 0.2); // Slight caution, preserve higher if set
        // Maybe allow tasks but prioritize "quick wins" (not handled here, but in domain logic)
    }

    // 3. Stalled Momentum
    if (state.momentum === 'stalled') {
        // System paused.
        // We might want to nudge? Or respect the stall?
        // Phase 26 invariant: "Silence as a Feature". Respect the stall.
        policy.notificationPolicy = 'silent';
    }

    // 4. Critical Risks
    if (state.riskFlags.includes('Autonomy Friction')) {
        // User is rejecting help. Back off hard.
        policy.autonomyDampening = Math.max(policy.autonomyDampening, 0.8); // Almost full stop
        policy.notificationPolicy = 'silent';
    }

    return policy;
}
