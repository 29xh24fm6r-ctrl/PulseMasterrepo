import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { updateContact, getContact } from "@/lib/data/journal";
import OpenAI from "openai";

// const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export async function POST(req: Request) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { contactId, rawData: inputRawData } = body;
    // rawData might come from frontend if we are analyzing text directly, 
    // OR we might need to pull it from the contact context if not filtering.
    // For this refactor, let's assume we are analyzing existing contact info + optionally new raw data.

    if (!contactId) {
      return NextResponse.json(
        { ok: false, error: "Missing contactId" },
        { status: 400 }
      );
    }

    // Get contact
    const contact = await getContact(userId, contactId);
    if (!contact) {
      return NextResponse.json({ ok: false, error: "Contact not found" }, { status: 404 });
    }

    const name = contact.name || "Unknown";
    const company = contact.company || "Unknown Company";

    // Combine context raw data + input
    const context = contact.context || {};
    const existingRaw = JSON.stringify(context);
    const rawData = inputRawData ? `${inputRawData}\n\nExisting Data:\n${existingRaw}` : existingRaw;

    if (!rawData || rawData.length < 10) {
      return NextResponse.json(
        { ok: false, error: "Not enough data to analyze" },
        { status: 400 }
      );
    }

    // Build comprehensive AI prompt
    const prompt = `You are an elite sales intelligence analyst with deep expertise in relationship dynamics, communication patterns, and deal psychology.

**YOUR MISSION:** Analyze all available data about this person/company and extract ACTIONABLE intelligence.

**PERSON/COMPANY:**
- Name: ${name}
- Company: ${company}

**ALL DATA:**
${rawData.substring(0, 10000)}

**EXTRACT THE FOLLOWING (be specific, insightful, and actionable):**

1. **Communication Style** (2-3 sentences)
2. **Pain Points** (bullet points)
3. **Goals & Motivations** (bullet points)
4. **Decision Making Pattern** (2-3 sentences)
5. **Key Insights** (2-3 sentences)
6. **Objection History** (bullet points)
7. **Buying Signals** (bullet points)
8. **Risk Factors** (bullet points)
9. **Next Best Actions** (3-5 specific, tactical actions with timing)
10. **Optimal Contact Strategy** (2-3 sentences)
11. **Win Probability** (number 0-100 and 2-3 sentence reasoning)
12. **Strategic Insight** (2-3 sentences)

**FORMAT YOUR RESPONSE AS JSON:**
{
  "communicationStyle": "...",
  "painPoints": ["...", "..."],
  "goals": ["...", "..."],
  "decisionMakingPattern": "...",
  "keyInsights": "...",
  "objectionHistory": ["...", "..."],
  "buyingSignals": ["...", "..."],
  "riskFactors": ["...", "..."],
  "nextBestActions": ["..."],
  "optimalContactStrategy": "...",
  "winProbability": 75,
  "winProbabilityReasoning": "...",
  "strategicInsight": "..."
}

**CRITICAL:** Respond ONLY with valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // using 4o for JSON reliability
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    let analysisText = completion.choices[0].message.content || "{}";
    analysisText = analysisText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const analysis = JSON.parse(analysisText);

    // Save back to Context
    const updatedContext = {
      ...context,
      ...analysis, // Access top level keys like painPoints etc. directly
      lastAnalysis: new Date().toISOString(),
      rawData: rawData // persist the raw data aggregated? Or maybe separate? Let's keep it simple.
    };

    // Update AI Insights summary field too
    const ai_insights = `Win Probability: ${analysis.winProbability}%\nStragegy: ${analysis.strategicInsight}`;

    await updateContact(userId, contactId, {
      context: updatedContext,
      ai_insights
    });

    return NextResponse.json({
      ok: true,
      analysis,
    });
  } catch (err: any) {
    console.error("Second Brain analyze error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to analyze",
      },
      { status: 500 }
    );
  }
}