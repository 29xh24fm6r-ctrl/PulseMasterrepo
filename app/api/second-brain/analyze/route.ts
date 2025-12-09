import { canMakeAICall, trackAIUsage } from "@/lib/services/usage";
import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { normalizeDatabaseId } from "@/app/lib/notion";
import OpenAI from "openai";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const SECOND_BRAIN_DB_RAW = process.env.NOTION_DATABASE_SECOND_BRAIN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!NOTION_API_KEY) {
  throw new Error("NOTION_API_KEY is not set");
}
if (!SECOND_BRAIN_DB_RAW) {
  throw new Error("NOTION_DATABASE_SECOND_BRAIN is not set");
}
if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}

const notion = new Client({ auth: NOTION_API_KEY });
const SECOND_BRAIN_DB = normalizeDatabaseId(SECOND_BRAIN_DB_RAW);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { personId } = body;

    if (!personId) {
      return NextResponse.json(
        { ok: false, error: "Missing personId" },
        { status: 400 }
      );
    }

    // Get the person's data from Notion
    const page = await notion.pages.retrieve({ page_id: personId });
    const props = (page as any).properties || {};

    const name = props["Name"]?.title?.[0]?.plain_text || "Unknown";
    const company = props["Company"]?.rich_text?.[0]?.plain_text || "Unknown Company";
    const rawData = props["Raw Data"]?.rich_text?.[0]?.plain_text || "";

    if (!rawData) {
      return NextResponse.json(
        { ok: false, error: "No raw data to analyze" },
        { status: 400 }
      );
    }

    // Build comprehensive AI prompt
    const prompt = `You are an elite sales intelligence analyst with deep expertise in relationship dynamics, communication patterns, and deal psychology.

**YOUR MISSION:** Analyze all available data about this person/company and extract ACTIONABLE intelligence that will help close deals.

**PERSON/COMPANY:**
- Name: ${name}
- Company: ${company}

**ALL AVAILABLE DATA:**
${rawData}

**EXTRACT THE FOLLOWING (be specific, insightful, and actionable):**

1. **Communication Style** (2-3 sentences)
   - How do they communicate? (Direct? Analytical? Relationship-focused?)
   - What communication approach will resonate with them?

2. **Pain Points** (bullet points)
   - What problems are they facing?
   - What keeps them up at night?
   - What are they trying to solve?

3. **Goals & Motivations** (bullet points)
   - What are they trying to achieve?
   - What would success look like for them?
   - What are they measured on?

4. **Decision Making Pattern** (2-3 sentences)
   - How do they make decisions?
   - Who else needs to be involved?
   - What do they need to see to say yes?

5. **Key Insights** (2-3 sentences)
   - What's the most important thing to know about them?
   - What would most people miss?

6. **Objection History** (bullet points)
   - What concerns have they raised?
   - What objections have come up?
   - What are they worried about?

7. **Buying Signals** (bullet points)
   - What signals indicate they're interested?
   - What actions have they taken that show intent?

8. **Risk Factors** (bullet points)
   - What could derail this deal?
   - What are the red flags?
   - What should we be worried about?

9. **Next Best Actions** (3-5 specific, tactical actions with timing)
   - What should be done next?
   - When should it be done?
   - Why will it work?

10. **Optimal Contact Strategy** (2-3 sentences)
    - When is the best time to reach out?
    - What's the best channel?
    - What should the message focus on?

11. **Win Probability** (number 0-100 and 2-3 sentence reasoning)
    - What's the likelihood of closing this?
    - What would increase the probability?

12. **Strategic Insight** (2-3 sentences)
    - What's the ONE thing that will make or break this deal?
    - What's the secret to winning this?

**FORMAT YOUR RESPONSE AS JSON:**
{
  "communicationStyle": "...",
  "painPoints": ["...", "...", "..."],
  "goals": ["...", "...", "..."],
  "decisionMakingPattern": "...",
  "keyInsights": "...",
  "objectionHistory": ["...", "...", "..."],
  "buyingSignals": ["...", "...", "..."],
  "riskFactors": ["...", "...", "..."],
  "nextBestActions": [
    "1. [Action] by [date/timing] - [why]",
    "2. [Action] by [date/timing] - [why]",
    "..."
  ],
  "optimalContactStrategy": "...",
  "winProbability": 75,
  "winProbabilityReasoning": "...",
  "strategicInsight": "..."
}

**CRITICAL:** Respond ONLY with valid JSON. No markdown, no code blocks, no explanations - just raw JSON.`;

    // Call OpenAI API with o1 model
    const completion = await openai.chat.completions.create({
      model: "o1",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    let analysisText = completion.choices[0].message.content || "{}";

    // Strip markdown if present
    analysisText = analysisText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const analysis = JSON.parse(analysisText);

    // Save analysis back to Notion
    await notion.pages.update({
      page_id: personId,
      properties: {
        "Communication Style": {
          rich_text: [{ text: { content: analysis.communicationStyle || "" } }],
        },
        "Pain Points": {
          rich_text: [{ text: { content: analysis.painPoints?.join("\n• ") || "" } }],
        },
        "Goals": {
          rich_text: [{ text: { content: analysis.goals?.join("\n• ") || "" } }],
        },
        "Decision Making Pattern": {
          rich_text: [{ text: { content: analysis.decisionMakingPattern || "" } }],
        },
        "Key Insights": {
          rich_text: [{ text: { content: analysis.keyInsights || "" } }],
        },
        "Objection History": {
          rich_text: [{ text: { content: analysis.objectionHistory?.join("\n• ") || "" } }],
        },
        "Buying Signals": {
          rich_text: [{ text: { content: analysis.buyingSignals?.join("\n• ") || "" } }],
        },
        "Risk Factors": {
          rich_text: [{ text: { content: analysis.riskFactors?.join("\n• ") || "" } }],
        },
        "Next Best Actions": {
          rich_text: [{ text: { content: analysis.nextBestActions?.join("\n") || "" } }],
        },
        "Optimal Contact Strategy": {
          rich_text: [{ text: { content: analysis.optimalContactStrategy || "" } }],
        },
        "Win Probability": {
          number: analysis.winProbability || 0,
        },
        "AI Analysis": {
          rich_text: [
            {
              text: {
                content: `Win Probability: ${analysis.winProbability}%\n\nReasoning: ${analysis.winProbabilityReasoning}\n\nStrategic Insight: ${analysis.strategicInsight}`,
              },
            },
          ],
        },
        "Last AI Analysis": {
          date: { start: new Date().toISOString() },
        },
      },
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