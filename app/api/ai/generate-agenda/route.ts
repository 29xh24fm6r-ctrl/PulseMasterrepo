import { auth } from "@clerk/nextjs/server";
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

function getTitle(props: any, field: string = "Name"): string {
  const titleProp = props[field]?.title?.[0]?.plain_text;
  return titleProp || "Untitled";
}

function getText(props: any, field: string): string {
  return props[field]?.rich_text?.[0]?.plain_text || "";
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const usageCheck = await canMakeAICall(userId, "generate_agenda", 3);
    if (!usageCheck.allowed) return NextResponse.json({ error: usageCheck.reason, requiresUpgrade: usageCheck.requiresUpgrade }, { status: 402 });

    const body = await req.json();
    const { dealName, dealStage, meetingType, duration } = body;

    if (!dealName) {
      return NextResponse.json(
        { ok: false, error: "Missing deal info" },
        { status: 400 }
      );
    }

    // Search Second Brain for related people
    let personIntel = "";
    let personName = "the prospect";
    
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
          
          return (
            dealName.toLowerCase().includes(name.toLowerCase()) ||
            dealName.toLowerCase().includes(company.toLowerCase()) ||
            rawData.toLowerCase().includes(dealName.toLowerCase())
          );
        });

        if (relatedPeople.length > 0) {
          const person = relatedPeople[0];
          const props = (person as any).properties || {};
          
          personName = getTitle(props, "Name");
          const communicationStyle = getText(props, "Communication Style");
          const painPoints = getText(props, "Pain Points");
          const goals = getText(props, "Goals");
          const decisionPattern = getText(props, "Decision Making Pattern");
          const objections = getText(props, "Objection History");
          const nextActions = getText(props, "Next Best Actions");
          const keyInsights = getText(props, "Key Insights");

          personIntel = `
**PERSON INTELLIGENCE:**
Name: ${personName}
Communication Style: ${communicationStyle}
Pain Points: ${painPoints}
Goals: ${goals}
Decision Making Pattern: ${decisionPattern}
Past Objections: ${objections}
Key Insights: ${keyInsights}
Recommended Next Actions: ${nextActions}
`;
        }
      } catch (err) {
        console.error("Second Brain lookup error:", err);
      }
    }

    const prompt = `You are an elite meeting strategist. Create a strategic meeting agenda designed to move this deal forward.

**MEETING CONTEXT:**
- Deal: ${dealName}
- Stage: ${dealStage || "Unknown"}
- Meeting Type: ${meetingType || "Discovery/Strategy Call"}
- Duration: ${duration || "30"} minutes

${personIntel || "**No Second Brain intelligence available.**"}

**YOUR MISSION:**
Create a meeting agenda that:
1. Is strategically designed to achieve YOUR objective (move deal forward)
2. Respects THEIR communication style and decision-making pattern
3. Addresses THEIR pain points and goals naturally
4. Handles THEIR likely objections proactively
5. Creates momentum and commitment
6. Leaves them feeling heard and understood
7. Results in clear next steps

**AGENDA STRUCTURE:**
- Opening (2-5 min): How to start based on their style
- Main Topics (with time allocation)
- Questions to ask (that drive toward your outcome)
- Expected objections and how to handle them
- Closing (with commitment ask)

**STRATEGIC NOTES:**
- If they're analytical: Come prepared with data, ROI, proof
- If they're relationship-focused: Build rapport first, then business
- If they're consensus-driven: Identify who else needs to be involved
- If they're direct: Get to the point, respect their time

**FORMAT AS JSON:**
{
  "agendaTitle": "Meeting with [Name] - [Purpose]",
  "opening": {
    "timeAllocation": "5 min",
    "approach": "How to open based on their style",
    "icebreaker": "Optional personal connection point"
  },
  "mainTopics": [
    {
      "topic": "...",
      "timeAllocation": "X min",
      "objective": "What you want to accomplish",
      "keyQuestions": ["Question 1", "Question 2"]
    }
  ],
  "objectionHandling": [
    {
      "likelyObjection": "...",
      "response": "How to handle it"
    }
  ],
  "closing": {
    "timeAllocation": "5 min",
    "commitmentAsk": "Specific next step you want",
    "fallbackAsk": "If they can't commit to primary ask"
  },
  "prepNeeded": ["What to prepare before the meeting"],
  "successMetrics": "How you'll know if the meeting was successful"
}

**CRITICAL:** Design this agenda to WIN. Be strategic. Know your objective. Lead the conversation.

Respond ONLY with valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    let agendaText = completion.choices[0].message.content || "{}";
    agendaText = agendaText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const agenda = JSON.parse(agendaText);

    return NextResponse.json({
      ok: true,
      agenda: {
        ...agenda,
        recipientName: personName,
      },
    });
  } catch (err: any) {
    console.error("Agenda generation error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to generate agenda",
      },
      { status: 500 }
    );
  }
}