import { CortexContext, CortexResponse, CortexSignal, CortexSideEffect } from "./types";
import { ingestRawEvent } from "@/lib/cognitive-mesh";
// We will import specific "Hands" here to execute side effects
import { draftShadowEmail } from "./hands/email";

/**
 * THE CORTEX - God Mode Middleware
 * Intercepts every action, logs it to the Mesh, and triggers Agentic responses.
 */
export const PulseCortex = {
    /**
     * The main entry point for wrapping API routes.
     * @param signal The raw signal from the API route
     * @param handler The original API logic (passthrough)
     */
    async intercept<T>(
        signal: CortexSignal,
        handler: () => Promise<T>
    ): Promise<T> {
        const startTime = Date.now();
        console.log(`⚡ [CORTEX] Intercepting: ${signal.type} from ${signal.context.source}`);

        // 1. ASYNC: Feed the Cognitive Mesh (Holographic Memory)
        // We don't await this to keep the UI snappy
        this.feedMemory(signal).catch(err =>
            console.error(`[CORTEX] Memory Feed Failed:`, err)
        );

        // 2. ASYNC: Trigger Shadow Work (Agentic Side Effects)
        this.triggerShadowWork(signal).catch(err =>
            console.error(`[CORTEX] Shadow Work Failed:`, err)
        );

        // 3. EXECUTE: Run the original handler
        try {
            const result = await handler();
            const duration = Date.now() - startTime;
            console.log(`✅ [CORTEX] Action Complete (${duration}ms)`);
            return result;
        } catch (error) {
            console.error(`❌ [CORTEX] Action Failed:`, error);
            throw error;
        }
    },

    /**
     * Log the event to the Third Brain (Cognitive Mesh)
     */
    async feedMemory(signal: CortexSignal) {
        await ingestRawEvent(signal.context.userId, {
            source: "cortex_interceptor",
            source_id: signal.context.source,
            payload: {
                type: signal.type,
                data: signal.payload,
                metadata: signal.context.metadata
            },
            occurred_at: signal.context.timestamp.toISOString()
        });
    },

    /**
     * The "Agentic" Logic - Decides if Pulse should DO something about this.
     */
    async triggerShadowWork(signal: CortexSignal) {
        const sideEffects: CortexSideEffect[] = [];

        // --- LOGIC RULES (Prototype for God Mode) ---

        // RULE 1: Introduction Email Draft
        // If a new Deal is created, draft an intro email.
        if (signal.type === "deal_created" || signal.type === "deal_updated") {
            const deal = signal.payload;
            if (deal.stage === "new" || deal.stage === "discovery") {
                console.log(`🤖 [CORTEX] Detecting New Deal. Engaging Shadow Drafter...`);
                await draftShadowEmail(signal.context.userId, {
                    dealName: deal.title,
                    dealStage: deal.stage,
                    dealAmount: deal.value,
                    personName: deal.contactName // Assessing from payload
                });
            }
        }

        // RULE 2: Journal Reflection
        // If user logs a "Low Energy" journal entry, Schedule "Deep Rest"
        if (signal.type === "journal_entry") {
            const entry = signal.payload;
            if (entry.mood && ["exhausted", "burned_out", "tired"].includes(entry.mood.toLowerCase())) {
                console.log(`🤖 [CORTEX] Detecting Burnout. Suggesting Rest Protocol...`);
                // TODO: Call Calendar Hand to block time
            }
        }
    }
};
