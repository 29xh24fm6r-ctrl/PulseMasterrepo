import { supabase } from "../lib/supabase.js";
import { env } from "../lib/env.js";
import { sendDtmf, sayText } from "../lib/twilioControl.js";
import { decideIvrAction } from "../ivr/ivrParser.js";
import { handleIvrPacket } from "../convo/handleIvrWebhook.js";
import type { IVRPacket } from "../convo/types.js";
import type { SttSegment } from "../stt/types.js";

import { IntentRouter } from "../agency/router.js";
import { tools } from "../agency/tools.js";

import { VoiceSettings, type VoiceConfig } from "../tts/voiceSettings.js";

// Phase 6 Context Imports
import { contextStore } from "../context/contextStore.js";
import { modeDetector } from "../context/modeDetector.js";
import { referenceResolver } from "../context/referenceResolver.js";
import { buildContextSummary } from "../agency/contextSummary.js";
import { suggestionEngine } from "../agency/suggestionEngine.js";
import { UserMode, ConfirmationStyle, Verbosity, type CallContext } from "../context/contextTypes.js";
import { intentExtractor } from "../context/intentExtractor.js";
import { threadManager } from "../context/threadManager.js";
import { intentRegistry } from "../context/intentRegistry.js";
import { intentSurfaceGate } from "../context/intentSurfaceGate.js";

// Phase 8/9 Deep Cognition Imports
import { identityStore } from "../identity/identityStore.js";
import { trajectoryEngine } from "../identity/trajectoryEngine.js";
import { geminiGate } from "../identity/geminiGate.js";
import { narrativeStore } from "../memory/narrativeStore.js";
import { GeminiInsightEnvelope } from "../identity/identityTypes.js";

// Phase 5 FINAL: Speech Authority
type OrchestratorParams = {
    callSessionId: string;
    callSid: string;
    streamSid?: string;
    intentSummary: string;
    initialMode?: string;
    onAudio?: (text: string, options?: VoiceConfig) => Promise<void>;
};

// SINGLE SOURCE of human-facing output.
export enum SpeechSignal {
    CONFIRM_INFERRED = "CONFIRM_INFERRED",
    EXECUTION_SUCCESS = "EXECUTION_SUCCESS",
    EXECUTION_ERROR = "EXECUTION_ERROR",
    NO_TASKS = "NO_TASKS",
    HAS_TASKS = "HAS_TASKS",
    CALENDAR_STUB = "CALENDAR_STUB",
    CLARIFY_AMBIGUOUS = "CLARIFY_AMBIGUOUS",
    SUGGESTION_PROMPT = "SUGGESTION_PROMPT"
}

// Phase 6: Mode-Aware Phrase Set
const PHRASE_BOOK: Record<SpeechSignal, Partial<Record<UserMode, string[]>>> = {
    [SpeechSignal.CONFIRM_INFERRED]: {
        [UserMode.CALM]: [
            "I can take care of that. Should I?",
            "Do you want me to handle that?",
            "I've got it — proceed?"
        ],
        [UserMode.FOCUSED]: [
            "Shall I do that?",
            "Proceed?",
            "Confirm?"
        ],
        [UserMode.URGENT]: [
            "Do it?",
            "Confirm?"
        ],
        [UserMode.STRESSED]: [
            "I can take that off your plate. Should I?",
            "Let me handle that for you. Okay?"
        ]
    },
    [SpeechSignal.EXECUTION_SUCCESS]: {
        [UserMode.CALM]: [
            "All set.",
            "Consider it done.",
            "Handled."
        ],
        [UserMode.FOCUSED]: [
            "Done.",
            "Sorted."
        ],
        [UserMode.URGENT]: [
            "Done."
        ],
        [UserMode.STRESSED]: [
            "I've taken care of that.",
            "It's done. You don't need to worry about it."
        ]
    },
    [SpeechSignal.EXECUTION_ERROR]: {
        [UserMode.CALM]: [
            "I ran into an issue with that.",
            "I couldn't complete that request."
        ],
        [UserMode.URGENT]: [
            "Failed.",
            "Could not complete."
        ]
    },
    [SpeechSignal.NO_TASKS]: {
        [UserMode.CALM]: ["Your plate is clear."],
        [UserMode.STRESSED]: ["Good news - your plate is clear."]
    },
    [SpeechSignal.HAS_TASKS]: {
        [UserMode.CALM]: ["Here is what is pending."],
        [UserMode.URGENT]: ["Pending items:"], // Brief
    },
    [SpeechSignal.CALENDAR_STUB]: {
        [UserMode.CALM]: ["I can't check that just yet."],
        [UserMode.URGENT]: ["Cannot check calendar."]
    },
    [SpeechSignal.CLARIFY_AMBIGUOUS]: {
        [UserMode.CALM]: ["I'm not sure I caught that. Could you clarify?"],
        [UserMode.URGENT]: ["Clarify?"],
        [UserMode.STRESSED]: ["Take your time. What was that?"]
    },
    [SpeechSignal.SUGGESTION_PROMPT]: {
        [UserMode.STRESSED]: ["Would you like to review what's on your plate?"],
        [UserMode.CALM]: ["Should we review your tasks?"]
    }
};

// ABSOLUTE FIREWALL
const FORBIDDEN_WORDS = ["task", "list", "note", "reminder", "tool", "add", "create", "save", "log"];

export function speakResponse(signal: SpeechSignal, ctx?: { mode?: UserMode, count?: number }): string {
    const mode = ctx?.mode || UserMode.CALM;
    const modePhrases = PHRASE_BOOK[signal]?.[mode] || PHRASE_BOOK[signal]?.[UserMode.CALM] || [];

    if (modePhrases.length === 0) return "I am unsure.";

    let phrase = modePhrases[Math.floor(Math.random() * modePhrases.length)];

    // Context Injection (Careful with strings!)
    if (signal === SpeechSignal.HAS_TASKS && ctx?.count) {
        if (mode === UserMode.URGENT) {
            phrase = `${ctx.count} items.`;
        } else {
            phrase = `You have ${ctx.count} items.`;
        }
    }

    // RUNTIME FIREWALL CHECK
    const lower = phrase.toLowerCase();
    for (const word of FORBIDDEN_WORDS) {
        if (lower.split(/\b/).includes(word)) { // Strict word boundary check
            throw new Error(`FIREWALL BREACH: Forbidden word '${word}' detected in output: "${phrase}"`);
        }
    }

    return phrase;
}

export class CallOrchestrator {
    private callSessionId: string;
    private callSid: string;
    private intentSummary: string;
    private onAudio?: (text: string, options?: VoiceConfig) => Promise<void>;

    private lastPrompt: string = "";
    private lastActionAt = 0;
    private turnIndex = 0;
    private isConversationMode = false;
    private isThinking = false;
    private router: IntentRouter;

    // Phase 4.6: Confirmation State & User Context
    private ownerUserId: string | null = null;
    // Phase 6: Removed local pendingConfirmation in favor of ContextStore, 
    // BUT we need local reference or checks. 
    // Actually ContextStore handles persistence, but we can query it.

    // Phase 5: Voice & Idempotency
    private executedKeys = new Set<string>(); // Prevent dupes locally

    constructor(p: OrchestratorParams) {
        this.callSessionId = p.callSessionId;
        this.callSid = p.callSid;
        this.intentSummary = p.intentSummary;
        this.onAudio = p.onAudio;
        this.router = new IntentRouter();

        this.initOwner(); // Async init pattern

        // Initialize Context
        contextStore.get(this.callSessionId);

        if (p.initialMode === 'DYNAMIC' || p.initialMode === 'CONVERSATION') {
            this.isConversationMode = true;
            console.log(`[CallOrchestrator] Started in ${p.initialMode} mode (Conversation Active)`);
        }
    }

    private async initOwner() {
        const { data } = await supabase
            .from("pulse_call_sessions")
            .select("owner_user_id")
            .eq("id", this.callSessionId)
            .single();

        if (data?.owner_user_id) {
            this.ownerUserId = data.owner_user_id;
            console.log("[CallOrchestrator] Linked to Owner:", this.ownerUserId);
        } else {
            console.warn("[CallOrchestrator] No Owner linked to session.");
        }
    }

    async onSttSegment(seg: SttSegment) {
        if (seg.text.trim().length === 0) return;

        if (seg.isFinal) {
            console.log(`[CallOrchestrator] STT Final: "${seg.text}"`);
        }

        // Persist turns
        await supabase.from("pulse_call_turns").insert({
            call_session_id: this.callSessionId,
            turn_index: this.turnIndex++,
            role: "ivr",
            content: seg.text,
            confidence: seg.confidence ?? null
        });

        if (!seg.isFinal) return;

        // Wake Word Robustness
        let cleanText = seg.text;
        if (/^(pause|pauls|puls|polse)\b/i.test(cleanText)) {
            console.log(`[CallOrchestrator] Wake Word Correction: "${cleanText}" -> "Pulse..."`);
            cleanText = cleanText.replace(/^(pause|pauls|puls|polse)\b/i, "Pulse");
        }

        this.lastPrompt = cleanText;

        // Add to Context Store (User Utterance)
        contextStore.appendUtterance(this.callSessionId, cleanText, 'user');

        // If in conversation mode, bypass IVR heuristic and use LLM Loop
        if (this.isConversationMode) {
            await this.runConversationTurn(cleanText);
            return;
        }

        // ... (Keep existing IVR Logic - mostly unchanged) ... 
        // Rate limit actions to avoid double-firing
        const now = Date.now();
        if (now - this.lastActionAt < 1500) return;

        const decision = decideIvrAction(this.lastPrompt, this.intentSummary);

        if (decision.type === "WAIT") {
            await supabase.from("pulse_call_events").insert({
                call_session_id: this.callSessionId,
                event_type: "IVR_WAIT",
                payload: { reason: decision.reason, lastPrompt: this.lastPrompt }
            });
            return;
        }

        if (decision.type === "HUMAN_DETECTED") {
            await supabase.from("pulse_call_events").insert({
                call_session_id: this.callSessionId,
                event_type: "HUMAN_DETECTED",
                payload: { reason: decision.reason, prompt: decision.prompt }
            });

            this.isConversationMode = true;
            await supabase.from("pulse_call_sessions").update({
                mode: "CONVERSATION"
            }).eq("id", this.callSessionId);

            await this.runConversationTurn(this.lastPrompt);
            return;
        }

        await supabase.from("pulse_call_sessions").update({
            ivr_last_prompt: decision.prompt,
            ivr_last_options: decision.options
        }).eq("id", this.callSessionId);

        // Execute action
        const redirectUrl = `${env("PULSE_VOICE_PUBLIC_BASE_URL")}/api/voice/webhook`;

        if (decision.type === "DTMF") {
            // ... (keep existing) ...
            await supabase.from("pulse_voice_actions").insert({
                call_session_id: this.callSessionId,
                action_type: "DTMF",
                payload: { digits: decision.digits, reason: decision.reason, prompt: decision.prompt },
                outcome: "PLANNED"
            });

            await sendDtmf(this.callSid, decision.digits, redirectUrl);

            await supabase.from("pulse_voice_actions").update({ outcome: "SENT" })
                .eq("call_session_id", this.callSessionId)
                .order("created_at", { ascending: false })
                .limit(1);

            await supabase.from("pulse_call_events").insert({
                call_session_id: this.callSessionId,
                event_type: "IVR_ACTION_DTMF",
                payload: { digits: decision.digits, reason: decision.reason }
            });

            this.lastActionAt = Date.now();
            return;
        }

        if (decision.type === "SAY") {
            await supabase.from("pulse_voice_actions").insert({
                call_session_id: this.callSessionId,
                action_type: "SAY",
                payload: { text: decision.text, reason: decision.reason, prompt: decision.prompt },
                outcome: "PLANNED"
            });

            await sayText(this.callSid, decision.text, redirectUrl);

            await supabase.from("pulse_call_events").insert({
                call_session_id: this.callSessionId,
                event_type: "IVR_ACTION_SAY",
                payload: { text: decision.text, reason: decision.reason }
            });

            this.lastActionAt = Date.now();
            return;
        }
    }

    async notifyInterruption() {
        if (this.isThinking) {
            console.log("[CallOrchestrator] Interruption: Cancelling thought process");
            this.isThinking = false;
        }
    }

import { TraceStore } from "../../../../../lib/trace/TraceStore.js";
import type { DecisionTrace } from "../../../../../lib/trace/DecisionTrace.js";
import { validateNonDirective } from "../../../../../lib/voice/validateNonDirective.js";
import { v4 as uuidv4 } from "uuid";

// ... existing imports ...

    private async runConversationTurn(text: string) {
    if (this.isThinking) return;
    this.isThinking = true;

    const llmStart = Date.now();
    let speakText = "";
    let intentToExecute = null;
    let context = contextStore.get(this.callSessionId);

    // TRACE INIT
    const currentTrace: DecisionTrace = {
        trace_id: uuidv4(),
        user_id: this.ownerUserId || "00000000-0000-0000-0000-000000000000", // Fallback if no owner yet
        created_at: new Date().toISOString(),
        detected_intent: null,
        confidence_score: 0,
        trust_level: "HIGH", // Default, should pull from Trust Engine
        user_mode: context.mode.current,
        gates: { trust_gate: "pass", agency_gate: "pass", safety_gate: "pass" },
        outcome: "silent",
        explanation_summary: ""
    };

    // 1. Detect Mode
    const modeUpdate = modeDetector.detect(this.callSessionId, text);
    contextStore.update(this.callSessionId, { mode: modeUpdate });
    currentTrace.user_mode = modeUpdate.current; // Update trace

    if (modeUpdate.current !== UserMode.CALM) {
        console.log(`[CallOrchestrator] Mode: ${modeUpdate.current} (Reason: ${modeUpdate.reasons.join(', ')})`);
    }

    // 2. Resolve References
    // e.g. "Add that to my tasks" -> "Add [milk] to my tasks"
    const resolved = referenceResolver.resolve(this.callSessionId, text);
    const processingText = resolved.resolvedText;
    if (resolved.entitiesFound.length > 0) {
        console.log(`[CallOrchestrator] Resolved References: "${text}" -> "${processingText}"`);
    }

    // >>> PHASE 7: INTENT & CONTINUITY <<<
    // 1. Extract Intents (Background Memory)
    const extraction = await intentExtractor.extract(processingText, context);
    if (extraction.intents.length > 0) {
        console.log(`[CallOrchestrator] Captured Intents: ${extraction.intents.length}`);
    }

    // 2. Thread Management (Active Thread)
    const activeThread = threadManager.ensureActiveThread();

    // 3. Interruption Check (Simple Heuristic for now)
    // If UserMode is URGENT, pause all non-urgent intents
    if (context.mode.current === UserMode.URGENT) {
        threadManager.handleInterruption();
    }

    // 3. Resolve Confirmation State (using ContextStore)
    if (context.pendingConfirmation) {
        // Check expiry
        // (Store doesn't auto-expire pending item, need check)
        if (Date.now() - context.pendingConfirmation.timestamp > 20000) {
            contextStore.update(this.callSessionId, { pendingConfirmation: undefined });
        } else {
            // Check Confirm/Cancel
            // Naive classifier for confirm/cancel to save LLM round trip or just context check strings
            const lower = processingText.toLowerCase();
            if (['yes', 'sure', 'do it', 'confirm', 'okay'].some(w => lower.includes(w))) {
                intentToExecute = { ...context.pendingConfirmation, type: context.pendingConfirmation.intent };
                contextStore.update(this.callSessionId, { pendingConfirmation: undefined });
                console.log("[CallOrchestrator] Pending Action Confirmed");
            } else if (['no', 'cancel', 'stop', 'wait'].some(w => lower.includes(w))) {
                contextStore.update(this.callSessionId, { pendingConfirmation: undefined });
                speakText = "Okay, cancelled.";
            } else {
                // Implicit cancel via new command?
                // We'll let Router decide below. If it returns a new intent, we drop the old one.
                contextStore.update(this.callSessionId, { pendingConfirmation: undefined });
            }
        }
    }

    // 4. Classify (if not already confirmed)
    if (!speakText && !intentToExecute) {
        const contextSummary = buildContextSummary(contextStore.get(this.callSessionId));
        const classification = await this.router.classify(processingText, contextSummary);

        // TRACE UPDATE
        currentTrace.detected_intent = classification.type;
        currentTrace.confidence_score = classification.confidence;

        if (classification.type === "UNKNOWN") {

            // >>> PHASE 7: MEMORY SURFACING <<<
            let surfacedIntent = null;
            const activeThread = threadManager.getActiveThread();
            if (activeThread) {
                for (const id of activeThread.active_intents) {
                    const intent = intentRegistry.getIntent(id);
                    if (intent && intent.status === 'paused') {
                        if (intentSurfaceGate.canSurface(intent, context.mode.current)) {
                            surfacedIntent = intent;
                            break;
                        }
                    }
                }
            }

            if (surfacedIntent) {
                console.log(`[CallOrchestrator] Resurfacing Intent: ${surfacedIntent.inferred_goal}`);
                // Construct a gentle continuity prompt (Speech Authority Approved)
                speakText = `Earlier you mentioned you wanted to ${surfacedIntent.inferred_goal}. Should we get back to that?`;
            } else {
                // Try Suggestion Engine
                const suggestion = suggestionEngine.propose(context, processingText, classification);
                if (suggestion) {
                    console.log(`[CallOrchestrator] Suggestion Triggered: ${suggestion.type}`);
                    contextStore.update(this.callSessionId, {
                        pendingConfirmation: {
                            intent: suggestion.type,
                            params: suggestion.params,
                            timestamp: Date.now()
                        }
                    });
                    // Prompt for confirmation
                    speakText = speakResponse(SpeechSignal.SUGGESTION_PROMPT, { mode: context.mode.current });
                    if (speakText === "I am unsure.") {
                        // Fallback manual prompt if no phrase map
                        speakText = "Should I handle that for you?";
                    }
                } else {
                    // Fallback to chat / clarification
                    // Or if mode is STRESSED, be gentle
                    if (context.mode.current === UserMode.STRESSED) {
                        speakText = speakResponse(SpeechSignal.CLARIFY_AMBIGUOUS, { mode: UserMode.STRESSED });
                    } else {
                        // Standard fallback (IVR or generic)
                        speakText = speakResponse(SpeechSignal.CLARIFY_AMBIGUOUS, { mode: context.mode.current });
                    }
                }
            }
        } else if (classification.type === "CONFIRM" || classification.type === "CANCEL") {
            // Should have been handled above, but if Router catches it late:
            speakText = "Okay.";
        } else {
            // Agency Logic
            if (classification.suggested || classification.requires_confirmation) {
                contextStore.update(this.callSessionId, {
                    pendingConfirmation: {
                        intent: classification.type,
                        params: classification.params,
                        timestamp: Date.now()
                    }
                });
                speakText = speakResponse(SpeechSignal.CONFIRM_INFERRED, { mode: context.mode.current });
            } else {
                intentToExecute = classification;
            }
        }

        // Store Intent History
        contextStore.appendIntent(this.callSessionId, {
            intent: classification.type,
            params: classification.params || {},
            confidence: classification.confidence,
            suggested: classification.suggested || false,
            confirmed: false,
            timestamp: Date.now()
        });
    }

    // 5. Execute Tool
    if (intentToExecute) {
        const idempotencyKey = `${this.callSessionId}:${this.turnIndex}:${intentToExecute.type}`;

        if (this.executedKeys.has(idempotencyKey)) {
            console.warn("[CallOrchestrator] Duplicate execution prevented:", idempotencyKey);
            speakText = "I believe I've already done that.";
        } else {
            console.log(`[CallOrchestrator] Executing Action: ${intentToExecute.type}`);
            this.executedKeys.add(idempotencyKey);

            if (!this.ownerUserId) {
                speakText = "I'm sorry, I can't access your account details right now.";
            } else {
                try {
                    let toolResult;
                    switch (intentToExecute.type) {
                        case "READ_TASKS":
                            toolResult = await tools.readTasks(this.ownerUserId, idempotencyKey);
                            break;
                        case "ADD_TASK":
                            toolResult = await tools.addTask(this.ownerUserId, intentToExecute.params.description, intentToExecute.params.priority, idempotencyKey);
                            break;
                        case "NEXT_MEETING":
                            toolResult = await tools.nextMeeting(this.ownerUserId, idempotencyKey);
                            break;
                        case "CAPTURE_NOTE":
                            toolResult = await tools.captureNote(this.ownerUserId, intentToExecute.params.content, idempotencyKey);
                            break;
                    }

                    // Store Result
                    if (toolResult) {
                        contextStore.appendToolResult(this.callSessionId, {
                            toolName: intentToExecute.type,
                            status: toolResult.success ? 'success' : 'error',
                            data: toolResult.data,
                            timestamp: Date.now()
                        });

                        if (toolResult.success) {
                            if (intentToExecute.type === "READ_TASKS") {
                                const tasks = toolResult.data || [];
                                const count = tasks.length;
                                if (count === 0) {
                                    speakText = speakResponse(SpeechSignal.NO_TASKS, { mode: context.mode.current });
                                } else {
                                    speakText = speakResponse(SpeechSignal.HAS_TASKS, { mode: context.mode.current, count });
                                }
                            } else if (intentToExecute.type === "NEXT_MEETING") {
                                speakText = speakResponse(SpeechSignal.CALENDAR_STUB, { mode: context.mode.current });
                            } else {
                                speakText = speakResponse(SpeechSignal.EXECUTION_SUCCESS, { mode: context.mode.current });
                            }
                        } else {
                            speakText = speakResponse(SpeechSignal.EXECUTION_ERROR, { mode: context.mode.current });
                        }
                    }
                } catch (err) {
                    console.error("[CallOrchestrator] Tool Execution Failed:", err);
                    speakText = "I encountered an error trying to do that.";
                    this.executedKeys.delete(idempotencyKey);
                }
            }
        }
    }

    // 6. Output Speech & PERSIST TRACE
    if (speakText) {
        contextStore.appendUtterance(this.callSessionId, speakText, 'assistant');
        await this.speak(speakText, llmStart, text);
        currentTrace.outcome = "spoken";
    } else {
        currentTrace.outcome = "silent";
    }

    // 7. Explananation Generation (Dynamic)
    // Required Format: "I noticed... I considered... [Logic]... Next time..."
    const shortInput = text.length > 50 ? text.substring(0, 47) + "..." : text;
    const shortIntent = currentTrace.detected_intent || "unknown intent";

    let explanation = "";
    if (speakText) {
        explanation = `I noticed you said '${shortInput}'. I considered executing '${shortIntent}' with confidence ${currentTrace.confidence_score.toFixed(2)}. My trust settings allowed me to respond. Next time I will do the same if conditions match.`;
    } else {
        explanation = `I noticed you said '${shortInput}'. I considered '${shortIntent}' but my confidence ${currentTrace.confidence_score.toFixed(2)} was too low or I deemed it safer to say nothing. Next time, try being more specific.`;
    }

    currentTrace.explanation_summary = explanation;

    // PERSIST TRACE
    // Fire & Forget so we don't block the loop
    TraceStore.persist(currentTrace).catch(err => console.error("Trace persist failed", err));

    this.isThinking = false;
}

    private async speak(text: string, startTime: number, prompt: string) {
    const redirectUrl = `${env("PULSE_VOICE_PUBLIC_BASE_URL")}/api/voice/webhook`;

    // Phase 16 Safeguard
    validateNonDirective(text, "CallOrchestrator Output");

    await supabase.from("pulse_voice_actions").insert({
        call_session_id: this.callSessionId,
        action_type: "SAY",
        payload: { text: text, reason: "LLM_RESPONSE", prompt: prompt },
        outcome: "PLANNED"
    });

    const ttsStart = Date.now();
    const voiceConfig = VoiceSettings.getProfile();

    if (this.onAudio) {
        await this.onAudio(text, voiceConfig);
    } else {
        await sayText(this.callSid, text, redirectUrl);
    }

    const ttsEnd = Date.now();
    const llmLatency = ttsStart - startTime;
    const ttsLatency = ttsEnd - ttsStart;
    const totalLatency = ttsEnd - startTime;

    console.log(`[CallOrchestrator] Turn Metrics - LLM: ${llmLatency}ms | TTS: ${ttsLatency}ms | Total: ${totalLatency}ms`);

    await supabase.from("pulse_call_events").insert({
        call_session_id: this.callSessionId,
        event_type: "TURN_METRICS",
        payload: {
            llmLatency,
            ttsLatency,
            totalLatency,
            provider: "dynamic",
            voice: voiceConfig.id
        }
    });

    await supabase.from("pulse_call_events").insert({
        call_session_id: this.callSessionId,
        event_type: "IVR_ACTION_SAY",
        payload: { text: text, reason: "LLM_RESPONSE" }
    });

    await supabase.from("pulse_voice_actions").update({ outcome: "SENT" })
        .eq("call_session_id", this.callSessionId)
        .order("created_at", { ascending: false })
        .limit(1);

    this.lastActionAt = Date.now();
}

    // Phase 8: Mock Gemini Analysis (Data Contract Enforced)
    private async runGeminiAnalysis(text: string, context: CallContext) {
    // MOCK: Simulate Gemini producing an Envelope
    // This is where the LLM call would happen.
    const mockEnvelope: GeminiInsightEnvelope = {
        identity_signals: [],
        trajectory_deltas: [],
        confidence_summary: { overall_confidence: 0.0, data_sufficiency: "low" },
        generated_at: new Date().toISOString()
    };

    // Example trigger for testing verification script later
    if (text.includes("I always value freedom")) {
        mockEnvelope.identity_signals = [{
            signal_id: "sig_mock_1",
            category: "value",
            description: "Values personal freedom",
            confidence: 0.95,
            evidence_refs: [],
            first_observed_at: new Date().toISOString(),
            last_confirmed_at: new Date().toISOString()
        }];
        mockEnvelope.confidence_summary = { overall_confidence: 0.9, data_sufficiency: "high" };
    }

    // GATEKEEPER CHECK
    const validated = geminiGate.validateEnvelope(mockEnvelope);
    if (validated) {
        console.log(`[DeepCognition] Valid Envelope Received.`);
        if (validated.identity_signals) {
            validated.identity_signals.forEach(s => identityStore.addSignal(s));
        }
        if (validated.trajectory_deltas) {
            validated.trajectory_deltas.forEach(d => trajectoryEngine.addDelta(d));
        }
    }
}
}
