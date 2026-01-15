import { CallContext, IntentRecord, UserMode } from '../context/contextTypes.js';
import { IntentResult } from './schema.js';

export class SuggestionEngine {

    /**
     * Propose an action based on context, mode, and explicit 'unknown' state.
     * Returns null if no suggestion.
     */
    propose(context: CallContext, currentText: string, routerResult?: IntentResult): IntentResult | null {
        const lower = currentText.toLowerCase();

        // 1. "Don't let me forget" (Capture trigger)
        if (lower.includes("don't let me forget") || lower.includes("remind me")) {
            // If router failed to catch this (unlikely if simple, but possible if vague)
            if (!routerResult || routerResult.type === 'UNKNOWN') {
                return {
                    type: 'CAPTURE_NOTE',
                    params: { content: currentText },
                    confidence: 0.85,
                    suggested: true,
                    requires_confirmation: true,
                    internal_reason: 'Trigger phrase "Don\'t let me forget" detected.'
                };
            }
        }

        // 2. STRESSED Mode -> Propose Review
        // Only if user didn't just ask for it, and haven't suggested it recently?
        if (context.mode.current === UserMode.STRESSED) {
            // Check if we just did a READ_TASKS
            const recentRead = context.recentIntents.some(i => i.intent === 'READ_TASKS');
            if (!recentRead && (!routerResult || routerResult.type === 'UNKNOWN')) {
                return {
                    type: 'READ_TASKS',
                    params: {},
                    confidence: 0.9,
                    suggested: true,
                    requires_confirmation: true,
                    internal_reason: 'User is STRESSED; suggesting task review to unload mind.'
                };
            }
        }

        // 3. Recurring Pattern: "Again"
        // If user says "Add milk again", reference resolver might flag it, 
        // but if Router missed it, we can recover.
        // Or if user says "Again" explicitly.
        if (lower === 'again' || lower.includes('do it again')) {
            const lastAction = context.recentIntents.find(i => ['ADD_TASK', 'CAPTURE_NOTE'].includes(i.intent));
            if (lastAction) {
                return {
                    type: lastAction.intent,
                    params: lastAction.params,
                    confidence: 0.8,
                    suggested: true,
                    requires_confirmation: true,
                    internal_reason: 'User said "again"; repeating last action.'
                };
            }
        }

        // 4. "Out of X" pattern (Simple heuristic)
        // Router should catch "I'm out of milk" as ADD_TASK usually.
        // But if we want to reinforce it contextually?
        // Let's rely on Router for that, stick to *Meta-Suggestions* here.

        return null;
    }
}

export const suggestionEngine = new SuggestionEngine();
