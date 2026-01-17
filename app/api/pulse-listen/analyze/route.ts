import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getContact } from "@/lib/data/journal";
import { getOpenAI } from "@/services/ai/openai";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";



export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { transcript, personId } = body;

    if (!transcript) {
      return NextResponse.json(
        { ok: false, error: "Missing transcript" },
        { status: 400 }
      );
    }

    console.log("🧠 Analyzing call with AI...");

    // Get Second Brain intel if personId provided
    let personIntel = "";
    if (personId) {
      try {
        const contact = await getContact(userId, personId);
        if (contact) {
          const context = contact.context || {};
          personIntel = `
            **SECOND BRAIN INTELLIGENCE:**
            Communication Style: ${context.communicationStyle || "Unknown"}
            Pain Points: ${Array.isArray(context.painPoints) ? context.painPoints.join(", ") : context.painPoints}
            Goals: ${Array.isArray(context.goals) ? context.goals.join(", ") : context.goals}
            Raw Data: ${JSON.stringify(context.rawData || {})}
            `;
        }
      } catch (err) {
        console.error("Failed to get Second Brain intel:", err);
      }
    }

    const prompt = `You are an elite sales coach analyzing a call transcript. Provide BRUTAL HONESTY and ACTIONABLE coaching.

**CALL TRANSCRIPT:**
${transcript}

${personIntel || "**No Second Brain intelligence available.**"}

**YOUR MISSION:**
Analyze this call and provide a comprehensive performance review.

**FORMAT AS JSON:**
{
  "performanceScore": 75,
  "whatWentWell": ["...", "..."],
  "criticalMistakes": [
    {
      "quote": "...",
      "why": "...",
      "shouldHaveSaid": "..."
    }
  ],
  "missedOpportunities": ["..."],
  "talkRatio": "...",
  "objectionHandling": "...",
  "nextBestActions": ["..."],
  "followUpMessage": "...",
  "keyInsights": "...",
  "coachBrutalTruth": "..."
}

Respond ONLY with valid JSON.`;

    const openai = await getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    });

    let analysisText = completion.choices[0].message.content || "{}";
    analysisText = analysisText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const analysis = JSON.parse(analysisText);

    return NextResponse.json({
      ok: true,
      analysis,
    });
  } catch (err: any) {
    console.error("Call analysis error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Analysis failed",
      },
      { status: 500 }
    );
  }
}
