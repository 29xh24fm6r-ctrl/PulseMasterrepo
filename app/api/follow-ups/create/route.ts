import { canMakeAICall, trackAIUsage } from "@/lib/services/usage";
import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { normalizeDatabaseId } from "@/app/lib/notion";
import OpenAI from "openai";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const FOLLOW_UPS_DB_RAW = process.env.NOTION_DATABASE_FOLLOW_UPS;
const SECOND_BRAIN_DB_RAW = process.env.NOTION_DATABASE_SECOND_BRAIN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!NOTION_API_KEY || !OPENAI_API_KEY) {
  throw new Error("Missing API keys");
}

const notion = new Client({ auth: NOTION_API_KEY });
const FOLLOW_UPS_DB = FOLLOW_UPS_DB_RAW ? normalizeDatabaseId(FOLLOW_UPS_DB_RAW) : null;
const SECOND_BRAIN_DB = SECOND_BRAIN_DB_RAW ? normalizeDatabaseId(SECOND_BRAIN_DB_RAW) : null;
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transcript, personId, personName, callType } = body;

    if (!transcript || !FOLLOW_UPS_DB) {
      return NextResponse.json(
        { ok: false, error: "Missing required data" },
        { status: 400 }
      );
    }

    console.log("🔍 Analyzing conversation for follow-ups...");

    // Get Second Brain intel if available
    let personIntel = "";
    if (personId && SECOND_BRAIN_DB) {
      try {
        const page = await notion.pages.retrieve({ page_id: personId });
        const props = (page as any).properties || {};
        
        const rawData = props["Raw Data"]?.rich_text?.[0]?.plain_text || "";
        const communicationStyle = props["Communication Style"]?.rich_text?.[0]?.plain_text || "";
        const painPoints = props["Pain Points"]?.rich_text?.[0]?.plain_text || "";
        const goals = props["Goals"]?.rich_text?.[0]?.plain_text || "";

        personIntel = `
**PERSON INTELLIGENCE:**
Name: ${personName}
Communication Style: ${communicationStyle}
Pain Points: ${painPoints}
Goals: ${goals}
Notes: ${rawData}
`;
      } catch (err) {
        console.error("Failed to get person intel:", err);
      }
    }

    const prompt = `You are an expert sales strategist analyzing a sales conversation to determine optimal follow-up strategy.

**CONVERSATION TRANSCRIPT:**
${transcript}

${personIntel}

**YOUR MISSION:**
Analyze this conversation and recommend 2-4 strategic follow-ups with perfect timing.

**DETERMINE:**
1. What type of conversation was this? (First Call, Demo, Proposal, Check-in, etc.)
2. What follow-ups are needed?
3. When should each follow-up happen?
4. What's the goal of each follow-up?

**FOLLOW-UP TIMING RULES:**
- **After First Call:** 2 hours (recap), 2 days (resource), 1 week (check-in)
- **After Demo:** 30 mins (materials), 1 day (questions), 3 days (case study), 1 week (next steps)
- **After Proposal:** 2 days (questions), 1 week (decision), 2 weeks (revisit)
- **After "Not Now":** 1 month, 3 months, 6 months
- **After Won Deal:** 1 day (next steps), 1 week (check-in), 1 month (review)
- **After Objection:** 2 days (address concern), 1 week (new angle)

**FORMAT AS JSON:**
{
  "conversationType": "First Call" | "Demo" | "Proposal" | "Check-in" | "Won Deal" | "Lost Deal",
  "followUps": [
    {
      "timing": "2 hours" | "1 day" | "2 days" | "3 days" | "1 week" | "2 weeks" | "1 month" | "3 months" | "6 months",
      "type": "Recap" | "Resource" | "Check-in" | "Next Steps" | "Decision Point" | "Re-engagement",
      "goal": "Brief description of what this follow-up should accomplish",
      "context": "Key details from conversation to reference",
      "priority": "High" | "Medium" | "Low",
      "channel": "Email" | "SMS" | "LinkedIn" | "Call"
    }
  ]
}

Be strategic and specific. Only recommend follow-ups that make sense based on the conversation.

Respond ONLY with valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    });

    let analysisText = completion.choices[0].message.content || "{}";
    analysisText = analysisText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const analysis = JSON.parse(analysisText);

    console.log(`✅ Detected ${analysis.followUps.length} follow-ups needed`);

    // Create follow-ups in Notion
    const createdFollowUps = [];

    for (const followUp of analysis.followUps) {
      const triggerDate = new Date();
      const dueDate = calculateDueDate(followUp.timing);

      try {
        const response = await notion.pages.create({
          parent: { database_id: FOLLOW_UPS_DB },
          properties: {
            Name: {
              title: [{ text: { content: `${followUp.type} - ${personName || "Unknown"}` } }],
            },
            ...(personId && SECOND_BRAIN_DB
              ? {
                  Person: {
                    relation: [{ id: personId }],
                  },
                }
              : {}),
            Type: {
              select: { name: analysis.conversationType },
            },
            "Trigger Date": {
              date: { start: triggerDate.toISOString() },
            },
            "Due Date": {
              date: { start: dueDate.toISOString() },
            },
            Status: {
              select: { name: "Pending" },
            },
            Context: {
              rich_text: [
                {
                  text: {
                    content: `Goal: ${followUp.goal}\n\nContext: ${followUp.context}`,
                  },
                },
              ],
            },
            Channel: {
              select: { name: followUp.channel },
            },
            Priority: {
              select: { name: followUp.priority },
            },
          },
        });

        createdFollowUps.push({
          id: response.id,
          type: followUp.type,
          timing: followUp.timing,
          dueDate: dueDate.toISOString(),
        });

        console.log(`✅ Created follow-up: ${followUp.type} (${followUp.timing})`);
      } catch (err) {
        console.error(`Failed to create follow-up:`, err);
      }
    }

    return NextResponse.json({
      ok: true,
      conversationType: analysis.conversationType,
      followUpsCreated: createdFollowUps.length,
      followUps: createdFollowUps,
    });
  } catch (err: any) {
    console.error("Follow-up creation error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to create follow-ups",
      },
      { status: 500 }
    );
  }
}

function calculateDueDate(timing: string): Date {
  const now = new Date();
  
  switch (timing) {
    case "2 hours":
      return new Date(now.getTime() + 2 * 60 * 60 * 1000);
    case "1 day":
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case "2 days":
      return new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    case "3 days":
      return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    case "1 week":
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case "2 weeks":
      return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    case "1 month":
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    case "3 months":
      return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    case "6 months":
      return new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}