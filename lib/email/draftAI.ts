import OpenAI from "openai";

export type AIDraftInput = {
  userTone?: string; // optional user style
  goal?: string; // optional objective
  toEmail: string;
  subject: string;
  sourceSnippet: string;
  threadSummary: string; // from buildThreadSummary()
};

export type AIDraftOutput = {
  subject: string;
  body: string;
  why: string;
  model: string;
  raw?: string;
};

export async function generateThreadAwareReply(input: AIDraftInput): Promise<AIDraftOutput> {
  if (!process.env.OPENAI_API_KEY) throw new Error("missing_OPENAI_API_KEY");
  if (String(process.env.EMAIL_AI_DRAFTING_ENABLED || "false") !== "true") throw new Error("ai_drafting_disabled");

  const model = String(process.env.EMAIL_AI_MODEL || "gpt-4.1");

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // We ask for a strict JSON object. We still tolerate malformed output with fallback parsing.
  const system = [
    "You are an expert executive assistant drafting email replies.",
    "Write clear, professional, brief replies that directly answer the sender.",
    "Do NOT invent facts. If missing info, ask a short clarifying question.",
    "Output MUST be JSON with keys: subject, body, why.",
    "body must be plain text email content (no markdown).",
  ].join("\n");

  const tone = (input.userTone || "friendly, concise, confident").trim();
  const goal = (input.goal || "Reply helpfully and move the thread forward.").trim();

  const user = [
    `TONE: ${tone}`,
    `GOAL: ${goal}`,
    ``,
    `RECIPIENT: ${input.toEmail}`,
    `CURRENT SUBJECT: ${input.subject}`,
    ``,
    `LATEST INBOUND SNIPPET:`,
    input.sourceSnippet || "(none)",
    ``,
    `THREAD SUMMARY (most recent first):`,
    input.threadSummary || "(no thread history)",
    ``,
    `Return JSON only.`,
  ].join("\n");

  // Note: OpenAI Responses API may not be available in all SDK versions
  // Fallback to chat.completions if responses.create doesn't exist
  let raw = "";
  try {
    // @ts-expect-error - Responses API may be available in newer SDK versions
    if (typeof client.responses?.create === "function") {
      const resp = await client.responses.create({
        model,
        input: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
      // @ts-expect-error - output_text exists in Responses SDK
      raw = typeof resp?.output_text === "string" ? resp.output_text : (resp as any)?.output?.[0]?.content?.[0]?.text || "";
    } else {
      // Fallback to standard chat.completions API
      const resp = await client.chat.completions.create({
        model: model === "gpt-4.1" ? "gpt-4o" : model, // Map to available model
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
      });
      raw = resp.choices[0]?.message?.content || "";
    }
  } catch (e: any) {
    throw new Error(`openai_api_error:${e?.message || "unknown"}`);
  }

  const parsed = tryParseJson(raw);
  if (parsed?.subject && parsed?.body) {
    return {
      subject: String(parsed.subject),
      body: String(parsed.body),
      why: String(parsed.why || "AI generated based on thread context."),
      model,
      raw,
    };
  }

  // Fallback: keep subject, use raw as body
  return {
    subject: input.subject,
    body: raw || `Hi,\n\nThanks for your note — can you clarify next steps/timing?\n\nThanks,\n`,
    why: "AI generated (fallback parse).",
    model,
    raw,
  };
}

function tryParseJson(s: string): any | null {
  const t = (s || "").trim();
  if (!t) return null;

  // Try direct parse
  try {
    return JSON.parse(t);
  } catch {}

  // Try extracting first {...}
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const slice = t.slice(start, end + 1);
    try {
      return JSON.parse(slice);
    } catch {}
  }

  return null;
}

