import { canMakeAICall, trackAIUsage } from "@/lib/services/usage";
import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { normalizeDatabaseId } from "@/app/lib/notion";
import OpenAI from "openai";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const SECOND_BRAIN_DB_RAW = process.env.NOTION_DATABASE_SECOND_BRAIN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!NOTION_API_KEY || !OPENAI_API_KEY) {
  throw new Error("Missing API keys");
}

const notion = new Client({ auth: NOTION_API_KEY });
const SECOND_BRAIN_DB = SECOND_BRAIN_DB_RAW ? normalizeDatabaseId(SECOND_BRAIN_DB_RAW) : null;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

function getText(props: any, field: string): string {
  return props[field]?.rich_text?.[0]?.plain_text || "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transcript, personId, dealName } = body;

    if (!transcript) {
      return NextResponse.json(
        { ok: false, error: "Missing transcript" },
        { status: 400 }
      );
    }

    console.log("🧠 Analyzing call with AI...");

    // Get Second Brain intel if personId provided
    let personIntel = "";
    if (personId && SECOND_BRAIN_DB) {
      try {
        const page = await notion.pages.retrieve({ page_id: personId });
        const props = (page as any).properties || {};
        
        const rawData = getText(props, "Raw Data");
        const communicationStyle = getText(props, "Communication Style");
        const painPoints = getText(props, "Pain Points");
        const goals = getText(props, "Goals");

        personIntel = `
**SECOND BRAIN INTELLIGENCE:**
Communication Style: ${communicationStyle}
Pain Points: ${painPoints}
Goals: ${goals}
Raw Data: ${rawData}
`;
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

**ANALYZE:**

1. **Performance Score** (0-100)
   - Overall effectiveness of the call

2. **What Went Well** (3-5 specific moments)
   - Quote what they said that was effective
   - Why it worked

3. **Critical Mistakes** (3-5 specific moments)
   - Quote what they said that was problematic
   - Why it failed
   - What they should have said instead

4. **Missed Opportunities** (3-5 specific)
   - What signals did they miss?
   - What questions should they have asked?
   - What topics should they have explored?

5. **Talk Ratio Analysis**
   - Did they talk too much or too little?
   - Ideal balance for this type of call?

6. **Objection Handling** (if any objections came up)
   - How did they handle objections?
   - What should they have done differently?

7. **Next Best Actions** (3-5 specific, tactical actions)
   - What should they do immediately after this call?
   - What should they say in follow-up?

8. **Follow-Up Message Draft**
   - Write a perfect follow-up email/text based on this conversation

9. **Key Insights**
   - What was the most important moment in the call?
   - What does this tell us about the relationship?
   - What's the likelihood of closing this?

10. **Coach's Brutal Truth** (2-3 sentences)
    - What's the ONE thing they MUST fix?
    - What will make or break this deal?

**FORMAT AS JSON:**
{
  "performanceScore": 75,
  "whatWentWell": ["...", "...", "..."],
  "criticalMistakes": [
    {
      "quote": "What they said",
      "why": "Why it was bad",
      "shouldHaveSaid": "Better approach"
    }
  ],
  "missedOpportunities": ["...", "...", "..."],
  "talkRatio": "Analysis of talk time",
  "objectionHandling": "How they handled objections",
  "nextBestActions": ["...", "...", "..."],
  "followUpMessage": "Draft message",
  "keyInsights": "Most important takeaways",
  "coachBrutalTruth": "The hard truth they need to hear"
}

Respond ONLY with valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    });

    let analysisText = completion.choices[0].message.content || "{}";
    analysisText = analysisText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const analysis = JSON.parse(analysisText);

    console.log("✅ Call analysis complete!");
    console.log(`📊 Performance Score: ${analysis.performanceScore}/100`);

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
