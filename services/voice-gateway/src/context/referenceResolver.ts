import { contextStore } from './contextStore.js';
import { CallContext, ResolvedEntity, IntentRecord } from './contextTypes.js';

export interface ResolutionResult {
    resolvedText: string;
    entitiesFound: ResolvedEntity[];
    confidence: number;
    requiresClarification: boolean;
    clarificationPrompt?: string; // Internal hint only
    isRecurringSignal?: boolean;
}

export class ReferenceResolver {

    resolve(callId: string, text: string): ResolutionResult {
        const context = contextStore.get(callId);
        const lowerText = text.toLowerCase();

        let resolvedText = text;
        const entitiesFound: ResolvedEntity[] = [];
        let requiresClarification = false;
        let isRecurringSignal = false;

        // 1. "Again" detection
        if (lowerText.includes('again')) {
            isRecurringSignal = true;
            // "Again" is usually a signal to repeat the LAST intent but maybe with new params?
            // Or if "Add milk again", it means add milk.
            // We'll tag it and let Router/SuggestionEngine handle the "Repeat" logic if needed.
        }

        // 2. Pronoun: "That" / "This" / "It"
        // Resolves to: Last valid intent target OR last item entity
        if (/\b(that|this|it)\b/i.test(lowerText)) {
            const lastItem = this.findLastEntity(context, ['item', 'location']);
            const lastIntent = this.findLastIntentTarget(context);

            if (lastItem) {
                resolvedText = resolvedText.replace(/\b(that|this|it)\b/gi, `[${lastItem.value}]`);
                entitiesFound.push(lastItem);
            } else if (lastIntent) {
                // "Change [that] to 5pm" -> "Change [meeting with bob] to 5pm"
                resolvedText = resolvedText.replace(/\b(that|this|it)\b/gi, `[${lastIntent}]`);
            } else {
                // Low confidence if we can't find a referent
                // requiresClarification = true; // Optional: be aggressive or loose?
                // For now, leave as is, might be a filler word.
            }
        }

        // 3. Pronoun: "Her" / "Him" / "Them"
        // Resolves to: Last Person entity
        if (/\b(her|him|she|he)\b/i.test(lowerText)) {
            const lastPerson = this.findLastEntity(context, ['person']);
            if (lastPerson) {
                resolvedText = resolvedText.replace(/\b(her|him|she|he)\b/gi, `[${lastPerson.value}]`);
                entitiesFound.push(lastPerson);
            }
        }

        // 4. Temporal: "Later"
        // Resolves to: Default +3h or "evening"
        if (/\b(later)\b/i.test(lowerText)) {
            // We replace "later" with a structured hint for the LLM
            // "Remind me later" -> "Remind me [in 3 hours]"
            resolvedText = resolvedText.replace(/\b(later)\b/gi, '[in 3 hours]');

            // Or could trigger clarification:
            // requiresClarification = true;
        }

        return {
            resolvedText,
            entitiesFound,
            confidence: 1.0, // simplified for now
            requiresClarification,
            isRecurringSignal
        };
    }

    private findLastEntity(context: CallContext, types: string[]): ResolvedEntity | undefined {
        // Reverse search
        for (let i = context.resolvedEntities.length - 1; i >= 0; i--) {
            if (types.includes(context.resolvedEntities[i].type)) {
                return context.resolvedEntities[i];
            }
        }
        return undefined;
    }

    private findLastIntentTarget(context: CallContext): string | undefined {
        // Look at last intent, try to extract a meaningful "noun" from params
        const last = context.recentIntents[context.recentIntents.length - 1];
        if (!last) return undefined;

        // Naive heuristic: check for 'task_content', 'query', 'note', 'name'
        if (last.params?.task_content) return last.params.task_content;
        if (last.params?.content) return last.params.content;
        if (last.params?.name) return last.params.name;

        return undefined;
    }
}

export const referenceResolver = new ReferenceResolver();
