// src/app/api/email/draft/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { auth } from "@clerk/nextjs/server";
import { ensureReplySubject, buildQuoteBlock } from "@/lib/email/replyFormat";
import { buildSmartFollowUp } from "@/lib/email/smartFollowUp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Evidence = Record<string, unknown>;

function sha256(input: string) {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function isObj(x: any): x is Record<string, unknown> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

function isEffectivelyEmptyBody(s?: string) {
  if (!s) return true;
  const t = s.replace(/\s+/g, " ").trim();
  if (!t) return true;
  // treat tiny placeholders as empty
  return t === "-" || t.toLowerCase() === "n/a";
}

function fallbackDraft(args: {
  subject: string;
  fromDisplay: string;
  userGoal?: string;
  lastSnippet?: string;
}) {
  const goal = args.userGoal?.trim() || "respond clearly and helpfully";
  const snippet = args.lastSnippet?.trim() || "(no snippet provided)";

  const body = [
    `Hi ${args.fromDisplay || "there"},`,
    ``,
    `Thanks for reaching out. I wanted to follow up on your message:`,
    `"${snippet}"`,
    ``,
    `My goal is to ${goal}.`,
    ``,
    `Can you confirm the following so I can proceed?`,
    `- (add 1-2 clarifying questions here)`,
    ``,
    `Thanks,`,
    `Matt`,
  ].join("\n");

  return { subject: args.subject || "Re:", body_text: body };
}

async function maybeOpenAIDraft(input: {
  subject: string;
  fromDisplay: string;
  lastSnippet: string;
  userGoal?: string;
  tone?: string;
}) {
  // Uses direct HTTP to OpenAI Chat Completions API if OPENAI_API_KEY is present.
  // If not present, caller will use fallbackDraft.
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const tone = input.tone?.trim() || "clear, concise, professional";
  const goal = input.userGoal?.trim() || "move the conversation forward with minimal back-and-forth";

  const prompt = [
    `You are an email assistant. Write a reply email.`,
    ``,
    `Tone: ${tone}`,
    `Goal: ${goal}`,
    ``,
    `Incoming sender display: ${input.fromDisplay || "Unknown"}`,
    `Subject: ${input.subject || "Re:"}`,
    ``,
    `Most recent snippet/context:`,
    input.lastSnippet || "(none)",
    ``,
    `Return JSON with keys: subject, body_text`,
    `Rules:`,
    `- Do NOT include markdown.`,
    `- Keep under 180 words unless necessary.`,
    `- End with "Matt".`,
  ].join("\n");

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
    });

    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error(`openai_draft_failed: ${r.status} ${t || r.statusText}`);
    }

    const json: any = await r.json().catch(() => null);
    if (!json) throw new Error("openai_draft_failed: invalid_json");

    const content = json?.choices?.[0]?.message?.content || "";

    // We asked for JSON. Try parse; if fail, treat as body text.
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object") {
        return {
          subject: typeof parsed.subject === "string" ? parsed.subject : input.subject || "Re:",
          body_text: typeof parsed.body_text === "string" ? parsed.body_text : String(content || ""),
        };
      }
    } catch {}

    return {
      subject: input.subject || "Re:",
      body_text: String(content || "").trim(),
    };
  } catch (e: any) {
    // If AI fails, return null to trigger fallback
    return null;
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);

  const email_thread_id = body?.email_thread_id ? String(body.email_thread_id).trim() : "";
  const to_email = body?.to_email ? String(body.to_email).trim() : "";
  const subject = body?.subject ? String(body.subject).trim() : "";
  const user_body = body?.body ? String(body.body).trim() : "";
  const from_display = body?.from_display ? String(body.from_display).trim() : "";
  const last_snippet = body?.last_snippet ? String(body.last_snippet).trim() : "";
  const user_goal = body?.user_goal ? String(body.user_goal).trim() : "";
  const tone = body?.tone ? String(body.tone).trim() : "";

  // NEW: reply/thread headers (optional)
  const in_reply_to = body?.in_reply_to ? String(body.in_reply_to).trim() || null : null;
  const references = Array.isArray(body?.references)
    ? body.references.map((r: any) => String(r).trim()).filter(Boolean)
    : null;

  // NEW: quoting controls
  const is_reply = body?.is_reply ?? !!in_reply_to;
  const include_quote = body?.include_quote ?? (is_reply ? true : false);
  const quote_from = body?.quote_from ? String(body.quote_from).trim() || null : null;
  const quote_date = body?.quote_date ? String(body.quote_date).trim() || null : null;
  const quote_snippet = body?.quote_snippet ? String(body.quote_snippet).trim() || null : null;

  // NEW: smart follow-up hint
  const smart_follow_up = body?.smart_follow_up ?? (is_reply && isEffectivelyEmptyBody(user_body));

  const evidence: Evidence = isObj(body?.evidence) ? body.evidence : { source: "compose_ui" };

  if (!email_thread_id) {
    return NextResponse.json({ ok: false, error: "missing_email_thread_id" }, { status: 400 });
  }
  if (!to_email) {
    return NextResponse.json(
      { ok: false, error: "missing_to_email", hint: "Pass to_email from the selected thread row." },
      { status: 400 }
    );
  }

  // Determine base subject (ensure "Re:" for replies)
  const baseSubject = subject || "(no subject)";
  const finalSubject = is_reply ? ensureReplySubject(baseSubject) : baseSubject;

  // Determine body content (smart follow-up or user-provided)
  let baseDraft: string;
  if (smart_follow_up) {
    baseDraft = buildSmartFollowUp({
      tone: tone || undefined,
      goal: user_goal || undefined,
      quoteFrom: quote_from || from_display || null,
      quoteDate: quote_date || null,
      quoteSnippet: quote_snippet || last_snippet || null,
      seed: user_body || null,
    });
  } else if (user_body) {
    baseDraft = user_body;
  } else {
    // Fallback to old behavior if OpenAI was available, otherwise use smart follow-up
    try {
      const aiDraft = await maybeOpenAIDraft({
        subject: finalSubject,
        fromDisplay: from_display || to_email,
        lastSnippet: last_snippet || "",
        userGoal: user_goal || "",
        tone: tone || "",
      });
      if (aiDraft) {
        baseDraft = aiDraft.body_text;
      } else {
        baseDraft = fallbackDraft({
          subject: finalSubject,
          fromDisplay: from_display || to_email,
          userGoal: user_goal || "",
          lastSnippet: last_snippet || "",
        }).body_text;
      }
    } catch {
      baseDraft = buildSmartFollowUp({
        tone: tone || undefined,
        goal: user_goal || undefined,
        quoteFrom: quote_from || from_display || null,
        quoteDate: quote_date || null,
        quoteSnippet: quote_snippet || last_snippet || null,
      });
    }
  }

  // Build quote block if needed
  const quoteBlock = include_quote
    ? buildQuoteBlock({
        from: quote_from || from_display || null,
        dateIso: quote_date || null,
        snippet: quote_snippet || last_snippet || null,
      })
    : "";

  const finalBody = `${baseDraft}${quoteBlock}`;

  // SAFE MODE checksum — server issues this, client must present it to send.
  // IMPORTANT: include thread headers in the checksum so they can't be tampered with client-side.
  // The quote is already included in finalBody (body_text), so we don't need separate quote fields.
  const safe_checksum = sha256(
    JSON.stringify({
      email_thread_id,
      to_email,
      subject: finalSubject,
      body_text: finalBody,
      in_reply_to: in_reply_to ?? null,
      references: references ?? null,
      v: 2,
    })
  );

  // Persist draft (best-effort)
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("email_drafts")
    .insert({
      user_id: userId,
      email_thread_id,
      to_email,
      subject: finalSubject,
      body_text: finalBody,
      safe_checksum,
      evidence,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    // Still return the draft even if persistence fails
    return NextResponse.json({
      ok: true,
      draft: {
        draft_id: null,
        email_thread_id,
        to_email,
        subject: finalSubject,
        body_text: finalBody,
        safe_checksum,
        persisted: false,
      },
      warn: `draft_not_persisted: ${error.message}`,
      include_quote: include_quote,
      quoted_message: quoteBlock || null,
      smart_follow_up_applied: smart_follow_up,
    });
  }

  return NextResponse.json({
    ok: true,
    draft: {
      draft_id: data?.id ? String(data.id) : null,
      email_thread_id,
      to_email,
      subject: finalSubject,
      body_text: finalBody,
      safe_checksum,
      persisted: true,
    },
    include_quote: include_quote,
    quoted_message: quoteBlock || null,
    smart_follow_up_applied: smart_follow_up,
  });
}

