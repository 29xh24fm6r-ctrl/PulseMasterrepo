import { canMakeAICall, trackAIUsage } from "@/services/usage";
import { NextResponse } from "next/server";
import OpenAI from "openai";

// const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export async function POST(req: Request) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  try {
    const body = await req.json();
    const { transcript, title, type } = body;

    if (!transcript) {
      return NextResponse.json(
        { ok: false, error: "Missing transcript" },
        { status: 400 }
      );
    }

    console.log("🧠 Analyzing content with AI...");

    const prompt = `You are an elite knowledge extraction expert. Analyze this content and extract ACTIONABLE intelligence.

**CONTENT TYPE:** ${type || "Unknown"}
**TITLE:** ${title || "Untitled"}

**FULL TRANSCRIPT:**
${transcript}

**YOUR MISSION:**
Extract the most valuable, actionable intelligence from this content.

**EXTRACT:**

1. **Executive Summary** (3-4 sentences)
   - What is this about?
   - Why does it matter?

2. **Key Insights** (5-7 bullet points)
   - The most important takeaways
   - Things you need to remember
   - Concepts that change how you think

3. **Actionable Items** (3-5 specific actions)
   - What can you DO with this information?
   - How can you apply it?
   - Next steps

4. **Best Quotes** (3-5 quotes)
   - Most impactful statements
   - Quotable wisdom
   - Lines worth remembering

5. **Topics & Tags** (5-10 keywords)
   - Main topics covered
   - Categories this fits into

6. **Related Concepts** (3-5 items)
   - What does this relate to?
   - What other knowledge connects?
   - Who should hear this?

7. **One-Sentence Value** (1 sentence)
   - If you could only remember ONE thing, what is it?

**FORMAT AS JSON:**
{
  "summary": "...",
  "keyInsights": ["...", "...", "..."],
  "actionableItems": ["...", "...", "..."],
  "quotes": ["...", "...", "..."],
  "tags": ["...", "...", "..."],
  "relatedConcepts": ["...", "...", "..."],
  "oneSentenceValue": "..."
}

**CRITICAL:** Be specific, actionable, and insightful. This knowledge will be used to make better decisions.

Respond ONLY with valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    });

    let analysisText = completion.choices[0].message.content || "{}";
    analysisText = analysisText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const analysis = JSON.parse(analysisText);

    console.log("✅ Knowledge analysis complete!");

    return NextResponse.json({
      ok: true,
      analysis,
    });
  } catch (err: any) {
    console.error("Knowledge analysis error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Analysis failed",
      },
      { status: 500 }
    );
  }
}
