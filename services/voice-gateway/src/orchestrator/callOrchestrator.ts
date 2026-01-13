import { supabase } from "../lib/supabase.js";
import { env } from "../lib/env.js";
import { sendDtmf, sayText } from "../lib/twilioControl.js";
import { decideIvrAction } from "../ivr/ivrParser.js";
import { handleIvrPacket } from "../convo/handleIvrWebhook.js";
import type { IVRPacket } from "../convo/types.js";
import type { SttSegment } from "../stt/types.js";

type OrchestratorParams = {
    callSessionId: string;
    callSid: string;
    streamSid?: string;
    intentSummary: string;
};

export class CallOrchestrator {
    private callSessionId: string;
    private callSid: string;
    private intentSummary: string;

    private lastPrompt: string = "";
    private lastActionAt = 0;
    private turnIndex = 0;
    private isConversationMode = false;

    constructor(p: OrchestratorParams) {
        this.callSessionId = p.callSessionId;
        this.callSid = p.callSid;
        this.intentSummary = p.intentSummary;
    }

    async onSttSegment(seg: SttSegment) {
        // write transcript turns (store interim lightly, but only act on final)
        if (seg.text.trim().length === 0) return;

        // Persist turns
        await supabase.from("pulse_call_turns").insert({
            call_session_id: this.callSessionId,
            turn_index: this.turnIndex++,
            role: "ivr",
            content: seg.text,
            confidence: seg.confidence ?? null
        });

        if (!seg.isFinal) return;

        // Update last prompt buffer
        this.lastPrompt = seg.text;

        // If in conversation mode, bypass IVR heuristic and use LLM Loop
        if (this.isConversationMode) {
            await this.runConversationTurn(this.lastPrompt);
            return;
        }

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

            // Switch to conversation mode
            this.isConversationMode = true;

            // Persist mode change
            await supabase.from("pulse_call_sessions").update({
                mode: "CONVERSATION"
            }).eq("id", this.callSessionId);

            // Run first turn
            await this.runConversationTurn(this.lastPrompt);
            return;
        }

        // Persist parsed options + prompt in session for audit
        await supabase.from("pulse_call_sessions").update({
            ivr_last_prompt: decision.prompt,
            ivr_last_options: decision.options
        }).eq("id", this.callSessionId);

        // Execute action
        const redirectUrl = `${env("PULSE_VOICE_PUBLIC_BASE_URL")}/api/voice/webhook`;

        if (decision.type === "DTMF") {
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

    private async runConversationTurn(text: string) {
        const packet: IVRPacket = {
            callId: this.callSid,
            seq: this.turnIndex,
            isHuman: true,
            transcript: text,
            meta: {
                callSessionId: this.callSessionId,
                intentSummary: this.intentSummary
            }
        };

        const { speakText } = await handleIvrPacket(packet);

        if (speakText) {
            const redirectUrl = `${env("PULSE_VOICE_PUBLIC_BASE_URL")}/api/voice/webhook`;

            await supabase.from("pulse_voice_actions").insert({
                call_session_id: this.callSessionId,
                action_type: "SAY",
                payload: { text: speakText, reason: "LLM_RESPONSE", prompt: text },
                outcome: "PLANNED"
            });

            await sayText(this.callSid, speakText, redirectUrl);

            await supabase.from("pulse_call_events").insert({
                call_session_id: this.callSessionId,
                event_type: "IVR_ACTION_SAY",
                payload: { text: speakText, reason: "LLM_RESPONSE" }
            });

            // Mark SENT
            await supabase.from("pulse_voice_actions").update({ outcome: "SENT" })
                .eq("call_session_id", this.callSessionId)
                .order("created_at", { ascending: false })
                .limit(1);

            this.lastActionAt = Date.now();
        }
    }
}
