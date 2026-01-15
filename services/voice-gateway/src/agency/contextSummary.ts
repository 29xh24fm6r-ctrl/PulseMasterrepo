import { CallContext, UserMode } from '../context/contextTypes.js';

export interface ContextSummary {
    recent_utterances: string[]; // "User: ..." or "Pulse: ..."
    previous_intent: string | null;
    mode: UserMode;
    resolved_entities: Record<string, string>; // { "person": "Sarah", "item": "Milk" }
    pending_confirmation: string | null;
}

export function buildContextSummary(context: CallContext): ContextSummary {
    // 1. Utterances (Last 3)
    const recent_utterances = context.utterances
        .slice(-3)
        .map(u => `${u.role === 'user' ? 'User' : 'Pulse'}: ${u.content}`);

    // 2. Previous Intent (Last 1)
    const lastIntent = context.recentIntents.length > 0
        ? context.recentIntents[context.recentIntents.length - 1].intent
        : null;

    // 3. Resolved Entities (Flattened for easy LLM consumption)
    const resolved_entities: Record<string, string> = {};
    context.resolvedEntities.forEach(e => {
        // e.g. "person": "Sarah"
        resolved_entities[e.type] = e.value;
    });

    // 4. Pending Confirmation
    const pending_confirmation = context.pendingConfirmation
        ? `${context.pendingConfirmation.intent} (${JSON.stringify(context.pendingConfirmation.params)})`
        : null;

    return {
        recent_utterances,
        previous_intent: lastIntent,
        mode: context.mode.current,
        resolved_entities,
        pending_confirmation
    };
}
