import { canMakeAICall, trackAIUsage } from "@/services/usage";
import { NextResponse } from "next/server";
import OpenAI from "openai";

// const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// if (!OPENAI_API_KEY) {
//   throw new Error("OPENAI_API_KEY is not set");
// }

// const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export async function POST(req: Request) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  try {
    const body = await req.json();
    const { transcript, personName, duration } = body;

    if (!transcript) {
      return NextResponse.json(
        { ok: false, error: "Missing transcript" },
        { status: 400 }
      );
    }

    console.log("📝 Generating call summary...");

    const prompt = `You are an executive assistant creating a comprehensive call summary.

**CALL DETAILS:**
Person: ${personName || "Unknown"}
Duration: ${duration || "Unknown"}

**FULL TRANSCRIPT:**
${transcript}

**CREATE A COMPREHENSIVE SUMMARY:**

1. **Executive Summary** (2-3 sentences)
   - What was this call about?
   - What was accomplished?

2. **Key Discussion Points** (5-7 bullet points)
   - Main topics covered
   - Important details mentioned

3. **Decisions Made** (If any)
   - What was decided?
   - Who agreed to what?

4. **Action Items** (Clear format: Who | What | When)
   - Extract ALL commitments
   - Format: "Person - Will do X by Y"
   - If none, say "None"

5. **Important Quotes** (2-3 memorable or important statements)
   - Direct quotes from the conversation

6. **Next Steps** (What should happen next?)
   - Immediate follow-up actions
   - Recommended next conversation topics

7. **Overall Sentiment** (How did it go?)
   - Positive, neutral, or negative
   - Brief explanation

8. **Deal Temperature** (If sales-related)
   - Hot, Warm, or Cold
   - Reasoning

**FORMAT AS JSON:**
{
  "executiveSummary": "...",
  "keyPoints": ["...", "...", "..."],
  "decisionsMade": ["..."],
  "actionItems": ["..."],
  "importantQuotes": ["...", "..."],
  "nextSteps": ["...", "..."],
  "sentiment": "Positive/Neutral/Negative",
  "sentimentReason": "...",
  "dealTemperature": "Hot/Warm/Cold",
  "dealReasoning": "..."
}

Respond ONLY with valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    });

    let summaryText = completion.choices[0].message.content || "{}";
    summaryText = summaryText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const summary = JSON.parse(summaryText);

    console.log("✅ Summary generated!");

    return NextResponse.json({
      ok: true,
      summary,
    });
  } catch (err: any) {
    console.error("Summary generation error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Summary failed",
      },
      { status: 500 }
    );
  }
}