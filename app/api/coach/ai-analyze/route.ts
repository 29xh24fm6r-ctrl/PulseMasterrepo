import { auth } from "@clerk/nextjs/server";
import { canMakeAICall, trackAIUsage } from "@/lib/services/usage";
import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { normalizeDatabaseId } from "@/app/lib/notion";
import OpenAI from "openai";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const TASKS_DB_RAW = process.env.NOTION_DATABASE_TASKS;
const SECOND_BRAIN_DB_RAW = process.env.NOTION_DATABASE_SECOND_BRAIN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!NOTION_API_KEY) {
  throw new Error("NOTION_API_KEY is not set");
}
if (!TASKS_DB_RAW) {
  throw new Error("NOTION_DATABASE_TASKS is not set");
}
if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}

const notion = new Client({ auth: NOTION_API_KEY });
const TASKS_DB = normalizeDatabaseId(TASKS_DB_RAW);
const SECOND_BRAIN_DB = SECOND_BRAIN_DB_RAW ? normalizeDatabaseId(SECOND_BRAIN_DB_RAW) : null;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

function getTitle(props: any, field: string = "Name"): string {
  const titleProp = props[field]?.title?.[0]?.plain_text;
  return titleProp || "Untitled";
}

function getText(props: any, field: string): string {
  return props[field]?.rich_text?.[0]?.plain_text || "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { dealId, dealName, dealStage, dealAmount, lastEdited } = body;

    if (!dealId || !dealName) {
      return NextResponse.json(
        { ok: false, error: "Missing deal info" },
        { status: 400 }
      );
    }

    // Get all tasks related to this deal
    const tasksResponse = await notion.databases.query({
      database_id: TASKS_DB,
    });

    const relatedTasks = (tasksResponse.results || [])
      .filter((page: any) => {
        const props = page.properties || {};
        const taskName = getTitle(props);
        return taskName.toLowerCase().includes(dealName.toLowerCase());
      })
      .map((page: any) => {
        const props = page.properties || {};
        return {
          name: getTitle(props),
          status: props["Status"]?.status?.name || props["Status"]?.select?.name || "Unknown",
          xp: props["XP"]?.number || 0,
        };
      });

    const completedTasks = relatedTasks.filter((t) =>
      ["Done", "Completed", "Complete"].includes(t.status)
    );
    const openTasks = relatedTasks.filter(
      (t) => !["Done", "Completed", "Complete"].includes(t.status)
    );

    // Calculate days since last edit
    const daysSinceEdit = lastEdited
      ? Math.floor(
          (Date.now() - new Date(lastEdited).getTime()) / (1000 * 60 * 60 * 24)
        )
      : 0;

    // Search Second Brain for related people/companies
    let secondBrainIntel = "";
    if (SECOND_BRAIN_DB) {
      try {
        const brainResponse = await notion.databases.query({
          database_id: SECOND_BRAIN_DB,
        });

        const relatedPeople = (brainResponse.results || []).filter((page: any) => {
          const props = page.properties || {};
          const name = getTitle(props, "Name");
          const company = getText(props, "Company");
          const rawData = getText(props, "Raw Data");
          
          // Match by deal name, company name, or mentions in raw data
          return (
            dealName.toLowerCase().includes(name.toLowerCase()) ||
            dealName.toLowerCase().includes(company.toLowerCase()) ||
            rawData.toLowerCase().includes(dealName.toLowerCase())
          );
        });

        if (relatedPeople.length > 0) {
          secondBrainIntel = "\n\n**SECOND BRAIN INTELLIGENCE:**\n";
          
          relatedPeople.forEach((person: any) => {
            const props = person.properties || {};
            const name = getTitle(props, "Name");
            const company = getText(props, "Company");
            const communicationStyle = getText(props, "Communication Style");
            const painPoints = getText(props, "Pain Points");
            const goals = getText(props, "Goals");
            const decisionPattern = getText(props, "Decision Making Pattern");
            const objections = getText(props, "Objection History");
            const buyingSignals = getText(props, "Buying Signals");
            const riskFactors = getText(props, "Risk Factors");
            const keyInsights = getText(props, "Key Insights");
            const nextActions = getText(props, "Next Best Actions");
            const winProb = props["Win Probability"]?.number;

            secondBrainIntel += `\n**${name} @ ${company}:**\n`;
            if (communicationStyle) secondBrainIntel += `- Communication Style: ${communicationStyle}\n`;
            if (painPoints) secondBrainIntel += `- Pain Points: ${painPoints}\n`;
            if (goals) secondBrainIntel += `- Goals: ${goals}\n`;
            if (decisionPattern) secondBrainIntel += `- Decision Making: ${decisionPattern}\n`;
            if (objections) secondBrainIntel += `- Objections: ${objections}\n`;
            if (buyingSignals) secondBrainIntel += `- Buying Signals: ${buyingSignals}\n`;
            if (riskFactors) secondBrainIntel += `- Risk Factors: ${riskFactors}\n`;
            if (keyInsights) secondBrainIntel += `- Key Insights: ${keyInsights}\n`;
            if (nextActions) secondBrainIntel += `- Recommended Actions: ${nextActions}\n`;
            if (winProb) secondBrainIntel += `- AI Win Probability: ${winProb}%\n`;
          });
        }
      } catch (err) {
        console.error("Second Brain lookup error:", err);
      }
    }

    // Build enhanced prompt
    const prompt = `You are an ELITE sales strategist with access to deep customer intelligence. Your goal is to provide PREDICTIVE, ACTIONABLE insights that will close this deal.

**DEAL INFORMATION:**
- Name: ${dealName}
- Stage: ${dealStage || "Unknown"}
- Amount: ${dealAmount ? `$${dealAmount.toLocaleString()}` : "Not set"}
- Days Since Last Edit: ${daysSinceEdit}
- Completed Tasks: ${completedTasks.length}
- Open Tasks: ${openTasks.length}

**RELATED TASKS:**
${relatedTasks.length > 0 ? relatedTasks.map((t) => `- ${t.name} (${t.status})`).join("\n") : "No related tasks found"}

${secondBrainIntel || "**No Second Brain intelligence available for this deal.**"}

**YOUR MISSION:**
Using ALL available intelligence above (especially Second Brain data), provide a DEEP, PREDICTIVE analysis that goes beyond surface-level advice.

**PROVIDE:**

1. **Predictive Risk Assessment** (3-4 sentences)
   - Based on their communication style, decision pattern, and history, what are the SPECIFIC risks?
   - What patterns suggest potential stalling or objections?
   - What's likely to derail this if we're not careful?

2. **Next 3 Actions** (hyper-specific, personalized to THEIR style and concerns)
   - Don't give generic advice - use what you know about THEM
   - Include timing, reasoning, and exact approach
   - Consider their decision-making pattern and communication style

3. **Conversation Strategy** (3-5 specific topics/questions)
   - What should be discussed in the next interaction?
   - What questions will move this forward based on THEIR goals and pain points?
   - What messaging will resonate with THEIR communication style?

4. **Win Probability** (honest assessment with reasoning)
   - Given ALL the intelligence, what % chance of closing?
   - What specific factors increase/decrease probability?
   - What would need to change to get to 90%+?

5. **Oracle Insight** (2-3 sentences)
   - What's the ONE thing that will make or break this deal?
   - What pattern or insight would most people miss?
   - What's your SECRET prediction about how this will unfold?

**FORMAT AS JSON:**
{
  "riskAssessment": "...",
  "nextActions": [
    "1. [Specific action] by [timing] - [why it will work for THEM]",
    "2. ...",
    "3. ..."
  ],
  "conversationStrategy": [
    "Topic/Question 1 - [why this matters to them]",
    "...",
  ],
  "winProbability": 75,
  "winProbabilityReasoning": "...",
  "oracleInsight": "..."
}

**CRITICAL:** Use THEIR intelligence. Be specific. Be predictive. Respond ONLY with valid JSON - no markdown, no code blocks.`;

    // Call OpenAI API
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

    return NextResponse.json({
      ok: true,
      analysis,
      hasSecondBrainData: !!secondBrainIntel,
    });
  } catch (err: any) {
    console.error("AI analyze error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to analyze deal",
      },
      { status: 500 }
    );
  }
}