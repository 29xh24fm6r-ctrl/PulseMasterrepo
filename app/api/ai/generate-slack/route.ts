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
    const body = await req.json();
    const { dealName, recipientRole, purpose, urgency } = body;

    if (!dealName) {
      return NextResponse.json(
        { ok: false, error: "Missing info" },
        { status: 400 }
      );
    }

    // Search Second Brain for related people
    let personIntel = "";
    let personName = "there";
    
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
          const keyInsights = getText(props, "Key Insights");

          personIntel = `
**PERSON INTELLIGENCE:**
Name: ${personName}
Communication Style: ${communicationStyle}
Key Insights: ${keyInsights}
`;
        }
      } catch (err) {
        console.error("Second Brain lookup error:", err);
      }
    }

    const prompt = `You are an expert at internal workplace communication. Write perfect Slack/Teams messages.

**CONTEXT:**
- Person/Topic: ${dealName}
- Recipient Role: ${recipientRole || "Colleague"}
- Purpose: ${purpose || "Request/Update"}
- Urgency: ${urgency || "Normal"}

${personIntel || "**No Second Brain intelligence available.**"}

**YOUR MISSION:**
Write a Slack/Teams message that:
1. Gets READ immediately (strong opening)
2. Gets to the point FAST (respect their time)
3. Makes the ask/update CRYSTAL CLEAR
4. Makes it easy for them to respond
5. Matches workplace communication norms
6. Is appropriately casual or formal based on recipient
7. Uses formatting (bullets, bold) effectively

**MESSAGE STRATEGIES:**

**To Your Boss:**
- Lead with the conclusion/ask
- Provide context concisely
- Show you've thought it through
- Make their decision easy
- Respect their time

**To Colleagues:**
- Be collaborative, not demanding
- Acknowledge their workload
- Make asks specific
- Offer to help back
- Keep it friendly

**Urgent Requests:**
- State urgency clearly upfront
- Give context briefly
- Specific deadline
- What you need from them
- Why it matters

**FORMATTING TIPS:**
- Use *bold* for key points
- Use bullets for multiple items
- Keep paragraphs short (2-3 lines max)
- Use emoji sparingly and appropriately
- Add relevant context links

**FORMAT AS JSON:**
{
  "message": "...",
  "reasoning": "Why this approach works",
  "alternativeApproach": "If they prefer different style",
  "followUpStrategy": "If no response"
}

**CRITICAL:** Workplace messages need to balance efficiency with relationship-building. Be clear, be kind, be concise.

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

    let slackData = completion.choices[0].message.content || "{}";
    slackData = slackData.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const slack = JSON.parse(slackData);

    return NextResponse.json({
      ok: true,
      slack: {
        message: slack.message,
        reasoning: slack.reasoning,
        alternativeApproach: slack.alternativeApproach,
        followUpStrategy: slack.followUpStrategy,
        recipientName: personName,
      },
    });
  } catch (err: any) {
    console.error("Slack generation error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to generate Slack message",
      },
      { status: 500 }
    );
  }
}