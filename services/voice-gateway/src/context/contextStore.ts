import { CallContext, ContextPatch, IntentRecord, ToolResultRecord, UserMode, Utterance, ModeState, ConfirmationStyle, Verbosity, ResolvedEntity } from './contextTypes.js';

// Default configuration
const DEFAULT_MAX_HISTORY = 10;
const SESSION_TTL_MS = 1000 * 60 * 30; // 30 minutes

// Default Context State
const DEFAULT_MODE: ModeState = {
    current: UserMode.CALM,
    confidence: 1.0,
    reasons: ['default_init'],
    lastUpdated: Date.now()
};

const DEFAULT_PREFERENCES = {
    voiceProfileId: 'default',
    confirmationStyle: ConfirmationStyle.GENTLE,
    verbosity: Verbosity.NORMAL
};

class InMemoryContextStore {
    private store: Map<string, CallContext> = new Map();

    /**
     * Get or Create context for a call
     */
    get(callId: string): CallContext {
        if (!this.store.has(callId)) {
            this.create(callId);
        }
        return this.store.get(callId)!;
    }

    private create(callId: string): CallContext {
        const context: CallContext = {
            callId,
            startTime: Date.now(),
            lastActivity: Date.now(),
            mode: { ...DEFAULT_MODE },
            preferences: { ...DEFAULT_PREFERENCES },
            utterances: [],
            recentIntents: [],
            recentToolResults: [],
            resolvedEntities: []
        };
        this.store.set(callId, context);
        return context;
    }

    /**
     * Update specific fields (shallow merge for patchable fields)
     */
    update(callId: string, patch: ContextPatch): void {
        const context = this.get(callId);
        if (!context) return;

        Object.assign(context, patch);
        context.lastActivity = Date.now();
    }

    appendUtterance(callId: string, text: string, role: 'user' | 'assistant'): void {
        const context = this.get(callId);
        const utterance: Utterance = {
            role,
            content: text,
            timestamp: Date.now()
        };

        context.utterances.push(utterance);

        // Trim history
        if (context.utterances.length > DEFAULT_MAX_HISTORY) {
            context.utterances = context.utterances.slice(-DEFAULT_MAX_HISTORY);
        }
        context.lastActivity = Date.now();
    }

    appendIntent(callId: string, intent: IntentRecord): void {
        const context = this.get(callId);
        context.recentIntents.push(intent);
        if (context.recentIntents.length > DEFAULT_MAX_HISTORY) {
            context.recentIntents = context.recentIntents.slice(-DEFAULT_MAX_HISTORY);
        }
        context.lastActivity = Date.now();
    }

    appendToolResult(callId: string, result: ToolResultRecord): void {
        const context = this.get(callId);
        context.recentToolResults.push(result);
        if (context.recentToolResults.length > DEFAULT_MAX_HISTORY) {
            context.recentToolResults = context.recentToolResults.slice(-DEFAULT_MAX_HISTORY);
        }
        context.lastActivity = Date.now();
    }

    addResolvedEntity(callId: string, entity: ResolvedEntity): void {
        const context = this.get(callId);
        // Simple de-dupe by value + type, favor NEWEST
        context.resolvedEntities = context.resolvedEntities.filter(e =>
            !(e.type === entity.type && e.value === entity.value)
        );

        context.resolvedEntities.push(entity);

        // Keep strictly recent entities (e.g. last 10)
        if (context.resolvedEntities.length > DEFAULT_MAX_HISTORY) {
            context.resolvedEntities = context.resolvedEntities.slice(-DEFAULT_MAX_HISTORY);
        }
        context.lastActivity = Date.now();
    }

    /**
     * Retrieve resolve function wrapper (actual logic will be in ReferenceResolver, 
     * but Store holds the data needed for it).
     */
    getContextSnapshot(callId: string) {
        return this.get(callId);
    }

    cleanup(): void {
        const now = Date.now();
        for (const [key, ctx] of this.store.entries()) {
            if (now - ctx.lastActivity > SESSION_TTL_MS) {
                this.store.delete(key);
            }
        }
    }
}

export const contextStore = new InMemoryContextStore();
