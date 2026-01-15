import { IntentExtractionResult, IntentType, Intent } from './intentTypes.js';
import { CallContext, UserMode } from './contextTypes.js';
import { intentRegistry } from './intentRegistry.js';
import { threadManager } from './threadManager.js';

export class IntentExtractor {

    /**
     * Extract potential intents from an utterance.
     * In a full implementation, this uses an LLM.
     * For Phase 7 logic, we use regex/heuristics to prove the architecture.
     */
    async extract(transcript: string, context: CallContext): Promise<IntentExtractionResult> {
        const lower = transcript.toLowerCase();
        const extracted: Intent[] = [];

        // 1. Explicit Goals ("I need to...", "I want to...")
        if (lower.includes('need to') || lower.includes('want to') || lower.includes('goal is')) {
            // Very naive extraction for logic proof
            const goal = transcript.replace(/.*(need to|want to|goal is)/i, '').trim();
            if (goal.length > 3) {
                const intent = intentRegistry.createIntent(
                    transcript,
                    goal,
                    "explicit_goal",
                    0.85
                );
                threadManager.attachIntent(intent.intent_id);
                extracted.push(intent);
            }
        }

        // 2. Urgent Goals ("Stop everything", "Urgent")
        if (context.mode.current === UserMode.URGENT || lower.includes('urgent')) {
            const intent = intentRegistry.createIntent(
                transcript,
                "Handle Urgent Situation",
                "urgent_goal",
                0.95
            );
            threadManager.attachIntent(intent.intent_id);
            extracted.push(intent);
        }

        // 3. Implicit Stress ("I can't take this") -> Goal: Reduce Stress
        if (context.mode.current === UserMode.STRESSED) {
            // Check if we already have an active stress intent?
            const thread = threadManager.getActiveThread();
            let hasStressIntent = false;

            if (thread) {
                for (const id of thread.active_intents) {
                    const existing = intentRegistry.getIntent(id);
                    if (existing && existing.type === 'implicit_goal' && existing.status === 'active') {
                        hasStressIntent = true;
                        break;
                    }
                }
            }

            if (!hasStressIntent) {
                const intent = intentRegistry.createIntent(
                    transcript,
                    "Reduce User Stress",
                    "implicit_goal",
                    0.8 // High confidence because mode is detected
                );
                threadManager.attachIntent(intent.intent_id);
                extracted.push(intent);
            }
        }

        return { intents: extracted };
    }
}

export const intentExtractor = new IntentExtractor();
