import { canMakeAICall, trackAIUsage } from "@/lib/services/usage";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { recentTranscript } = body;

    if (!recentTranscript) {
      return NextResponse.json(
        { ok: false, error: "Missing transcript" },
        { status: 400 }
      );
    }

    const prompt = `You are an elite sales coach providing INSTANT real-time feedback.

**LAST FEW SECONDS OF CONVERSATION:**
${recentTranscript}

**PROVIDE ONE INSTANT TACTICAL SUGGESTION:**
- Keep it to ONE sentence (15 words max)
- Be ULTRA specific
- Focus on the IMMEDIATE next move
- Use command language

Examples of good responses:
- "Ask them: 'What's your timeline for making this decision?'"
- "Stop talking - let them respond to your question"
- "Pivot back to their pain point with: 'You mentioned...'"
- "They just gave a buying signal - ask for the close"
- "Challenge that assumption: 'Help me understand why...'"
- "Use their exact words back: 'You said X was critical...'"
- "Ask for specifics: 'What does success look like specifically?'"
- "Redirect: 'Before we go there, let me understand...'"

**CRITICAL RULES:**
- ONE sentence only
- Make it actionable RIGHT NOW
- Focus on what they should SAY or DO immediately
- No explanations, just the directive
- Be aggressive and specific

Respond with ONLY the coaching sentence. No JSON, no formatting, just the raw coaching text.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using mini for speed
      messages: [{ role: "user", content: prompt }],
      max_tokens: 50,
      temperature: 0.7,
    });

    const coaching = completion.choices[0].message.content?.trim() || "Keep going...";

    return NextResponse.json({
      ok: true,
      coaching,
    });
  } catch (err: any) {
    console.error("Quick coach error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Quick coaching failed",
      },
      { status: 500 }
    );
  }
}