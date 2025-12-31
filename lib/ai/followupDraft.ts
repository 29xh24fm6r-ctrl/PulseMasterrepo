import crypto from "crypto";
import OpenAI from "openai";
import type { VoiceProfile } from "./voiceProfiles";
import type { CrmContactContext } from "./crmEnrich";
import type { OpenThreadContext } from "./openThreads";

export type FollowupDraftInput = {
    sender_email: string;
    sender_name?: string | null;
    subject?: string | null;
    snippet?: string | null;

    voice?: VoiceProfile;
    crm?: CrmContactContext | null;
    open_thread?: OpenThreadContext | null;

    prompt_version?: string;
};

export type FollowupDraftOutput = {
    subject: string;
    body_text: string;
    meta: {
        model: string;
        prompt_hash: string;
        prompt_version: string;
        usage?: any;
    };
};

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error(`${label}: timeout after ${ms}ms`)), ms);
        p.then(
            (v) => {
                clearTimeout(t);
                resolve(v);
            },
            (e) => {
                clearTimeout(t);
                reject(e);
            }
        );
    });
}

function safeString(x: any, max = 6000) {
    const s = (x ?? "").toString();
    return s.length > max ? s.slice(0, max) : s;
}

function sha256(s: string) {
    return crypto.createHash("sha256").update(s).digest("hex");
}

function extractJson(text: string): any | null {
    const trimmed = text.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
            return JSON.parse(trimmed);
        } catch { }
    }
    const m = trimmed.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
        return JSON.parse(m[0]);
    } catch {
        return null;
    }
}

function formatVoice(voice?: VoiceProfile) {
    if (!voice) return "Voice: concise, friendly follow-up.";
    const sig = voice.signature;
    const sigLines = [
        sig.name,
        sig.title ? sig.title : null,
        sig.company ? sig.company : null,
        sig.phone ? sig.phone : null,
        sig.email ? sig.email : null,
    ].filter(Boolean);

    return [
        `Voice profile: ${voice.name} (${voice.id})`,
        "Style rules:",
        ...voice.style.map((s) => `- ${s}`),
        "Signature (append at end):",
        ...sigLines.map((s) => `- ${s}`),
    ].join("\n");
}

function formatCrm(crm?: CrmContactContext | null) {
    if (!crm) return "CRM: no match found.";
    return [
        "CRM context (use only if relevant; do not invent facts):",
        `- name: ${crm.full_name ?? crm.first_name ?? "(unknown)"}`,
        `- first_name: ${crm.first_name ?? "(unknown)"}`,
        `- company: ${crm.company ?? "(unknown)"}`,
        `- title: ${crm.title ?? "(unknown)"}`,
        `- last_interaction_at: ${crm.last_interaction_at ?? "(unknown)"}`,
        `- notes: ${crm.relationship_notes ? safeString(crm.relationship_notes, 400) : "(none)"}`,
    ].join("\n");
}

function formatThread(thread?: OpenThreadContext | null) {
    if (!thread) return "Open Thread: none.";
    const ctx = thread.context ?? {};
    return [
        "Open Thread context (use only if relevant; do not invent facts):",
        `- status: ${thread.status}`,
        `- topic: ${safeString(ctx.topic ?? "", 140) || "(unknown)"}`,
        `- last_discussed: ${safeString(ctx.last_discussed ?? "", 200) || "(unknown)"}`,
        `- waiting_on: ${safeString(ctx.waiting_on ?? "", 80) || "(unknown)"}`, // "them" | "me" | "unknown"
        `- last_outgoing_at: ${thread.last_outgoing_at ?? "(unknown)"}`,
        `- last_incoming_at: ${thread.last_incoming_at ?? "(unknown)"}`,
    ].join("\n");
}

export async function generateAiFollowupDraft(input: FollowupDraftInput): Promise<FollowupDraftOutput> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("generateAiFollowupDraft: OPENAI_API_KEY missing");

    const model = process.env.FOLLOWUP_AI_MODEL || "gpt-4o-mini";
    const timeoutMs = Number(process.env.FOLLOWUP_AI_TIMEOUT_MS || 12000);
    const prompt_version = input.prompt_version ?? "followup_v3_voice_crm_threads";

    const sender_email = safeString(input.sender_email, 320);
    const sender_name = safeString(input.sender_name ?? "", 120);
    const subject = safeString(input.subject ?? "", 300);
    const snippet = safeString(input.snippet ?? "", 1200);

    const voiceBlock = formatVoice(input.voice);
    const crmBlock = formatCrm(input.crm);
    const threadBlock = formatThread(input.open_thread);

    const prompt = [
        "You write concise, human email follow-ups.",
        "Return ONLY valid JSON with keys: subject, body_text.",
        "",
        "Hard constraints:",
        "- Plain text only. No markdown.",
        "- <= 120 words.",
        "- Friendly, confident, not salesy.",
        "- Do not invent facts; use only provided snippet/context.",
        "- Include ONE clear next step (a question OR a proposed time).",
        "- Give an easy out if they’re busy (one short sentence).",
        "",
        voiceBlock,
        "",
        crmBlock,
        "",
        threadBlock,
        "",
        "Latest email context:",
        `sender_email: ${sender_email}`,
        `sender_name: ${sender_name || "(unknown)"}`,
        `original_subject: ${subject || "(none)"}`,
        `original_snippet: ${snippet || "(none)"}`,
        "",
        "Output JSON schema:",
        '{ "subject": "...", "body_text": "..." }',
    ].join("\n");

    const prompt_hash = sha256(prompt);

    const client = new OpenAI({ apiKey });

    const req = client.chat.completions.create({
        model,
        temperature: 0.35,
        messages: [
            { role: "system", content: "You write email drafts and must output JSON only." },
            { role: "user", content: prompt },
        ],
    });

    const res = await withTimeout(req, timeoutMs, "followup_ai");

    const text = res.choices?.[0]?.message?.content ?? "";
    const json = extractJson(text);
    if (!json || typeof json !== "object") {
        throw new Error("generateAiFollowupDraft: model did not return valid JSON");
    }

    const outSubject = safeString(json.subject ?? "", 300).trim();
    const outBody = safeString(json.body_text ?? "", 6000).trim();

    if (!outSubject || !outBody) {
        throw new Error("generateAiFollowupDraft: missing subject/body_text in JSON");
    }

    return {
        subject: outSubject,
        body_text: outBody,
        meta: {
            model,
            prompt_hash,
            prompt_version,
            usage: (res as any).usage ?? undefined,
        },
    };
}
