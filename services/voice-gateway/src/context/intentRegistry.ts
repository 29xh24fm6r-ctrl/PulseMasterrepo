import { Intent, IntentStatus, IntentType } from './intentTypes.js';

// Default TTLs in milliseconds
const TTL_MAP: Record<IntentType, number> = {
    "explicit_goal": 48 * 60 * 60 * 1000, // 48h
    "implicit_goal": 24 * 60 * 60 * 1000, // 24h
    "urgent_goal": 6 * 60 * 60 * 1000,    // 6h
    "aspiration": 12 * 60 * 60 * 1000     // 12h
};

export class IntentRegistry {
    private intents: Map<string, Intent> = new Map();

    /**
     * persistent registry singleton would be ideal, but for now in-memory per session 
     * or global across session if needed? 
     * The spec implies per-user persistence eventually, but Phase 7 is logic.
     * We'll assume this is instantiated per CallOrchestrator or global singleton?
     * The ContextStore is global-ish (by callId). 
     * Let's make this a class we can instantiate.
     */

    constructor() { }

    /**
     * Create and register a new intent
     */
    createIntent(
        source_utterance: string,
        inferred_goal: string,
        type: IntentType,
        confidence: number
    ): Intent {
        const now = Date.now();
        const ttl = TTL_MAP[type] || 24 * 60 * 60 * 1000;

        const intent: Intent = {
            intent_id: `intent-${now}-${Math.random().toString(36).substr(2, 9)}`,
            source_utterance,
            inferred_goal,
            type,
            confidence,
            created_at: new Date(now).toISOString(),
            expires_at: new Date(now + ttl).toISOString(),
            status: "active",
            requires_confirmation: true // Most new intents should be confirmed before action
        };

        this.intents.set(intent.intent_id, intent);
        return intent;
    }

    addIntent(intent: Intent): void {
        this.intents.set(intent.intent_id, intent);
    }

    getIntent(id: string): Intent | undefined {
        // Check expiry on access? Or purely background prune?
        // Let's check expiry to be safe.
        const intent = this.intents.get(id);
        if (intent && this.isExpired(intent)) {
            intent.status = "expired";
        }
        return intent;
    }

    updateStatus(id: string, status: IntentStatus): void {
        const intent = this.intents.get(id);
        if (intent) {
            intent.status = status;
        }
    }

    getActiveIntents(): Intent[] {
        this.pruneExpired();
        return Array.from(this.intents.values()).filter(i => i.status === "active");
    }

    /**
     * Mark expired intents
     */
    pruneExpired(): void {
        const now = new Date();
        for (const intent of this.intents.values()) {
            if (intent.status !== "expired" && intent.status !== "resolved" && intent.status !== "abandoned") {
                if (new Date(intent.expires_at) < now) {
                    intent.status = "expired";
                }
            }
        }
    }

    private isExpired(intent: Intent): boolean {
        return new Date(intent.expires_at) < new Date();
    }
}

// Global instance helper if needed, but Orchestrator might own it.
export const intentRegistry = new IntentRegistry();
