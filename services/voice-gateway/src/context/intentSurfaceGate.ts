import { Intent } from './intentTypes.js';
import { UserMode } from './contextTypes.js';

export class IntentSurfaceGate {

    /**
     * Deterministic rule engine for surfacing intents.
     * 
     * @param intent The intent candidate to surface
     * @param mode The current user emotional mode
     * @returns boolean - allowed to surface?
     */
    canSurface(intent: Intent, mode: UserMode): boolean {
        // 1. Global Confidence Threshold
        if (intent.confidence < 0.40) {
            return false;
        }

        // 2. Mode-Based Filters
        switch (mode) {
            case UserMode.STRESSED:
                // STRESSED: ❌ No proactive surfacing of past goals. 
                // Only "Grounding" is allowed (which might be a new intent, not an old one).
                // Existing intents generally should NOT surface unless they are "implicit_goal" for stress reduction.
                if (intent.type === 'implicit_goal' && intent.inferred_goal.includes('Stress')) {
                    return true;
                }
                return false;

            case UserMode.URGENT:
                // URGENT: ✅ Direct surfacing if highly relevant (confidence > 0.8), 
                // NO meta commentary or "earlier you said".
                // If it's an urgent goal, yes.
                if (intent.type === 'urgent_goal') return true;
                return false;

            case UserMode.FOCUSED:
                // FOCUSED: ❌ No interruptions unless critical.
                if (intent.type === 'urgent_goal') return true;
                return false;

            case UserMode.CALM:
            default:
                // NEUTRAL/CALM: ✅ Optional resurfacing
                // If confidence is high (>= 0.70), allow it.
                // If confidence is medium (0.40 - 0.69), only surface if direct relevance (not handled here, mostly logic).
                return intent.confidence >= 0.70;
        }
    }
}

export const intentSurfaceGate = new IntentSurfaceGate();
