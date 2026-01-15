import { z } from "zod";
import { type IntentResult, IntentSchema } from "./schema.js";
import { LLMService } from "../llm/llmService.js";

const SYSTEM_PROMPT = `
You are the semantic router for Pulse Voice. 
Pulse is NOT a chatbot, robot, or task manager.
Pulse is a highly capable professional human assistant with a digital brain.

CORE PHILOSOPHY:
- Humans do NOT think or speak in commands. They speak in fragments, realizations, emotions, complaints, and cultural shorthand.
- Your job is to interpret MENTAL STATE and CONTEXT, not just classify sentences.
- Infer helpful actions, anticipate needs, and reduce cognitive load.
- Pulse speaks like a real executive assistant: calm, confident, concise, outcome-focused.

FORBIDDEN WORDS (Voice Prompt):
- Do NOT use: "task", "list", "note", "reminder", "tool", "system", "log", "create", "save".
- Do NOT describe mechanics.

INTENTS:
1. READ_TASKS: "Read my items", "What's on my plate?", "I'm overwhelmed."
2. ADD_TASK: "Remind me to...", "I keep forgetting to call Sarah", "Shit, I'm out of milk."
3. NEXT_MEETING: "What's up next?", "Where do I need to be?"
4. CAPTURE_NOTE: "Remember this idea", "Don't let me forget...", "I'm feeling anxious about..."
5. CONFIRM: "Yes", "Do it", "Confirm", "Sure", "Okay" (ONLY if confirming a pending action)
6. CANCEL: "No", "Don't do that", "Cancel", "Wait", "Stop", "Actually nevermind"
7. UNKNOWN: General conversation, questions without clear action.

OUTPUT FORMAT: JSON ONLY.
Structure:
{
  "type": "INTENT_NAME",
  "confidence": 0.0-1.0,
  "params": { ... }, 
  "reason": "Short explanation of classification involved",
  "internal_reason": "Debug reasoning (e.g. 'Inferred ADD_TASK from complaint regarding milk')",
  "suggested": boolean,      // TRUE if the user did NOT explicitly command it, but you inferred it.
  "requires_confirmation": boolean 
}

RULES:
1. Only ONE intent per turn. NO arrays.
2. If "suggested" is true -> "requires_confirmation" MUST be true.
3. If confidence < 0.85 for write ops (ADD, CAPTURE) -> "requires_confirmation" MUST be true.
4. DO NOT Generate confirmation prompts. The system handles that.

EXAMPLES:
User: "Shit, I'm out of milk."
JSON: { 
  "type": "ADD_TASK", 
  "confidence": 0.9, 
  "params": { "description": "Buy milk", "priority": "NORMAL" }, 
  "suggested": true, 
  "requires_confirmation": true, 
  "internal_reason": "User complained about lack of milk; inferred task." 
}

User: "Remind me to call Mom at 5."
JSON: { 
  "type": "ADD_TASK", 
  "confidence": 0.99, 
  "params": { "description": "Call Mom", "due": "5pm" }, 
  "suggested": false, 
  "requires_confirmation": false,
  "internal_reason": "Explicit command."
}

User: "I've got too much going on today."
JSON: {
  "type": "READ_TASKS",
  "confidence": 0.85,
  "suggested": true,
  "requires_confirmation": true,
  "internal_reason": "User expressed overwhelm; offering to review tasks."
}
`;

export class IntentRouter {
    private llm: LLMService;

    constructor() {
        this.llm = new LLMService();
    }

    async classify(transcript: string, contextSummary: any = {}): Promise<IntentResult> {
        console.log(`[Router] Classifying: "${transcript}"`);

        const start = Date.now();

        try {
            // Inject Context into the System or User scope
            const contextMsg = JSON.stringify(contextSummary, null, 2);

            const response = await this.llm.reply({
                requestId: `router-${Date.now()}`,
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "system", content: `CURRENT CALL CONTEXT:\n${contextMsg}\n\nUse this context to resolve references and detect mode. Do NOT mention the context in output.` },
                    { role: "user", content: transcript }
                ],
                modelOverride: "gemini-2.0-flash-exp" // Use fast model
            });

            // Clean JSON (Markdown stripping)
            let jsonStr = response.assistantText.trim();
            if (jsonStr.startsWith("```json")) {
                jsonStr = jsonStr.replace(/^```json/, "").replace(/```$/, "");
            } else if (jsonStr.startsWith("```")) {
                jsonStr = jsonStr.replace(/^```/, "").replace(/```$/, "");
            }

            const raw = JSON.parse(jsonStr);

            // Validate basic structure
            if (!IntentSchema.safeParse(raw.type).success) {
                console.warn("[Router] Invalid intent type returned:", raw.type);
                return { type: "UNKNOWN", confidence: 0 };
            }

            console.log(`[Router] Classified as ${raw.type} (Conf: ${raw.confidence}) - ReqConf: ${raw.requires_confirmation} (${Date.now() - start}ms)`);

            // STRICT RETURN: Strip any hallucinations (e.g. confirmation_prompt)
            return {
                type: raw.type,
                confidence: raw.confidence,
                params: raw.params,
                reason: raw.reason,
                internal_reason: raw.internal_reason,
                suggested: raw.suggested,
                requires_confirmation: raw.requires_confirmation
            } as IntentResult;

        } catch (err) {
            console.error("[Router] Classification failed:", err);
            return { type: "UNKNOWN", confidence: 0 };
        }
    }
}
