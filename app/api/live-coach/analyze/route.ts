import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getContact } from "@/lib/data/journal";
import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error("Missing API keys");
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { transcript, personId } = body; // personId is expected to be a UUID (Supabase ID) now

    if (!transcript) {
      return NextResponse.json(
        { ok: false, error: "Missing transcript" },
        { status: 400 }
      );
    }

    console.log("🧠 Deep analyzing conversation...");

    // Get Second Brain intel if personId provided
    let personIntel = "";
    let personName = "Unknown";

    if (personId) {
      try {
        const contact = await getContact(userId, personId);
        if (contact) {
          personName = contact.name;
          const context = contact.context || {};

          personIntel = `
            **PERSON: ${personName}**
            Communication Style: ${context.communicationStyle || "Unknown"}
            Pain Points: ${Array.isArray(context.painPoints) ? context.painPoints.join(", ") : context.painPoints}
            Goals: ${Array.isArray(context.goals) ? context.goals.join(", ") : context.goals}
            Intelligence: ${JSON.stringify(context.rawData || {})}
            `;
        }
      } catch (err) {
        console.error("Failed to get Second Brain intel:", err);
      }
    }

    const prompt = `You are an ELITE sales coach and communication expert providing REAL-TIME coaching.
    
**CURRENT CONVERSATION TRANSCRIPT:**
${transcript}

${personIntel || "**No person intelligence available.**"}

**YOUR MISSION:**
Provide IMMEDIATE, TACTICAL coaching that will help them WIN this conversation RIGHT NOW.

**FORMAT AS JSON:**
{
  "controlAssessment": "...",
  "immediateActions": ["Ask: '...'", "Pivot to: '...'", "Say: '...'"],
  "openEndedQuestions": ["...", "...", "..."],
  "objectionHandling": {
    "detected": "...",
    "response": "...",
    "followUp": "..."
  },
  "controlTactics": ["...", "..."],
  "goingWell": ["...", "..."],
  "criticalMistakes": ["..."],
  "redFlags": ["..."],
  "buyingSignals": ["..."],
  "talkRatio": "You: X% | Them: Y%",
  "talkRatioComment": "...",
  "conversationStage": "...",
  "stageAction": "...",
  "keyInformation": ["...", "..."],
  "actionItems": ["..."],
  "next30Seconds": "..."
}

Respond ONLY with valid JSON.`;

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
      personName,
    });
  } catch (err: any) {
    console.error("Deep analysis error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Analysis failed",
      },
      { status: 500 }
    );
  }
}