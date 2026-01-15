import { ContinuityThread } from './intentTypes.js';
import { IntentRegistry, intentRegistry } from './intentRegistry.js';

export class ThreadManager {
    private threads: Map<string, ContinuityThread> = new Map();
    private activeThreadId: string | null = null;
    private registry: IntentRegistry;

    constructor(registry: IntentRegistry = intentRegistry) {
        this.registry = registry;
    }

    /**
     * Get or create the main thread for a session
     */
    ensureActiveThread(label: string = "main"): ContinuityThread {
        if (this.activeThreadId) {
            const t = this.threads.get(this.activeThreadId);
            if (t) {
                // Decay check? (7 days default)
                if (Date.now() - new Date(t.last_touched_at).getTime() > 7 * 24 * 60 * 60 * 1000) {
                    // Too old, archive it, start new? 
                    // For Phase 7, just update lastTouched.
                }
                t.last_touched_at = new Date().toISOString();
                return t;
            }
        }
        return this.createThread(label);
    }

    createThread(label: string): ContinuityThread {
        const id = `thread-${Date.now()}`;
        const thread: ContinuityThread = {
            thread_id: id,
            label,
            active_intents: [],
            created_at: new Date().toISOString(),
            last_touched_at: new Date().toISOString(),
            is_active: true
        };
        this.threads.set(id, thread);
        this.activeThreadId = id;
        return thread;
    }

    switchThread(threadId: string): void {
        if (this.threads.has(threadId)) {
            // Pause current thread intents?
            // "Switching threads requires explicit user signal"
            this.activeThreadId = threadId;
            const t = this.threads.get(threadId)!;
            t.last_touched_at = new Date().toISOString();
            t.is_active = true;
        }
    }

    /**
     * Attach an intent to the current thread
     */
    attachIntent(intentId: string): void {
        const thread = this.ensureActiveThread();
        if (!thread.active_intents.includes(intentId)) {
            thread.active_intents.push(intentId);
            thread.last_touched_at = new Date().toISOString();
        }
    }

    /**
     * Handle interruption: Pause active intents in current thread
     */
    handleInterruption(): void {
        if (!this.activeThreadId) return;
        const thread = this.threads.get(this.activeThreadId);
        if (!thread) return;

        for (const intentId of thread.active_intents) {
            this.registry.updateStatus(intentId, "paused");
        }
        // Thread remains "active" as context, but intents are paused waiting for resumption
    }

    getActiveThread(): ContinuityThread | undefined {
        if (!this.activeThreadId) return undefined;
        return this.threads.get(this.activeThreadId);
    }
}

export const threadManager = new ThreadManager();
