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
    const { dealName, messageType, purpose } = body;

    if (!dealName) {
      return NextResponse.json(
        { ok: false, error: "Missing deal info" },
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
          const painPoints = getText(props, "Pain Points");
          const goals = getText(props, "Goals");
          const keyInsights = getText(props, "Key Insights");

          personIntel = `
**PERSON INTELLIGENCE:**
Name: ${personName}
Communication Style: ${communicationStyle}
Pain Points: ${painPoints}
Goals: ${goals}
Key Insights: ${keyInsights}
`;
        }
      } catch (err) {
        console.error("Second Brain lookup error:", err);
      }
    }

    const prompt = `You are an elite LinkedIn networking expert who writes messages that get responses.

**CONTEXT:**
- Person/Deal: ${dealName}
- Message Type: ${messageType || "Connection Request"}
- Purpose: ${purpose || "Build professional relationship"}

${personIntel || "**No Second Brain intelligence available.**"}

**YOUR MISSION:**
Write a LinkedIn message that:
1. Feels PROFESSIONAL but PERSONAL (not generic or salesy)
2. Shows you actually looked at their profile
3. Provides VALUE or RELEVANCE immediately
4. Has a clear but soft call-to-action
5. Is concise (LinkedIn has character limits!)
6. Stands out from the 100 other connection requests they got

**LINKEDIN MESSAGE TYPES:**

**Connection Request (300 char max):**
- Mention something specific from their profile
- Common ground or mutual interest
- Clear reason for connecting
- No hard sell

**Follow-up Message:**
- Reference previous interaction
- Provide value (article, insight, intro)
- Natural next step
- Not pushy

**Value-First Outreach:**
- Lead with something helpful
- Show you understand their world
- Soft intro to what you do
- Easy way to engage

**BEST PRACTICES:**
- Use their first name
- Mention their company, role, or recent post
- Be human, not corporate
- Ask a question or offer value
- Keep it under 200 words

**FORMAT AS JSON:**
{
  "message": "...",
  "subjectLine": "Optional subject line if sending InMail",
  "reasoning": "Why this will get a response",
  "followUpTiming": "When to follow up if no response"
}

**CRITICAL:** Make them feel like you actually care about connecting with THEM specifically. Be authentic. Be valuable.

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

    let linkedinData = completion.choices[0].message.content || "{}";
    linkedinData = linkedinData.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const linkedin = JSON.parse(linkedinData);

    return NextResponse.json({
      ok: true,
      linkedin: {
        message: linkedin.message,
        subjectLine: linkedin.subjectLine,
        reasoning: linkedin.reasoning,
        followUpTiming: linkedin.followUpTiming,
        recipientName: personName,
      },
    });
  } catch (err: any) {
    console.error("LinkedIn generation error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to generate LinkedIn message",
      },
      { status: 500 }
    );
  }
}