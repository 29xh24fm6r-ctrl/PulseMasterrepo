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
    const usageCheck = await canMakeAICall(userId, "generate_email", 3);
    if (!usageCheck.allowed) return NextResponse.json({ error: usageCheck.reason, requiresUpgrade: usageCheck.requiresUpgrade }, { status: 402 });

    const body = await req.json();
    const { dealName, dealStage, dealAmount, purpose } = body;

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
          const objections = getText(props, "Objection History");
          const nextActions = getText(props, "Next Best Actions");
          const keyInsights = getText(props, "Key Insights");

          personIntel = `
**PERSON INTELLIGENCE:**
Name: ${personName}
Communication Style: ${communicationStyle}
Pain Points: ${painPoints}
Goals: ${goals}
Key Insights: ${keyInsights}
Objections They've Raised: ${objections}
Recommended Next Actions: ${nextActions}
`;
        }
      } catch (err) {
        console.error("Second Brain lookup error:", err);
      }
    }

    const prompt = `You are an elite sales communication expert. Write a highly personalized, effective email.

**DEAL CONTEXT:**
- Deal: ${dealName}
- Stage: ${dealStage || "Unknown"}
- Amount: ${dealAmount ? `$${dealAmount.toLocaleString()}` : "Not specified"}
- Purpose: ${purpose || "Move deal forward"}

${personIntel || "**No Second Brain intelligence available - write a professional, engaging email.**"}

**YOUR MISSION:**
Write an email that:
1. Matches THEIR communication style perfectly
2. Addresses THEIR specific pain points and concerns
3. References THEIR goals and motivations
4. Handles THEIR objections proactively
5. Proposes clear next steps
6. Feels authentic and personal (NOT sales-y or generic)
7. Is concise but complete

**TONE GUIDELINES:**
- If they're analytical: Lead with data and ROI
- If they're relationship-focused: Be warm and conversational
- If they're direct: Get to the point fast
- If they're risk-averse: Address concerns upfront

**EMAIL STRUCTURE:**
- Subject line that grabs attention (based on their style)
- Opening that shows you understand them
- Body that addresses their needs
- Clear call-to-action
- Professional but friendly close

**FORMAT AS JSON:**
{
  "subject": "...",
  "body": "...",
  "reasoning": "2-3 sentences explaining why this approach will work for THEM"
}

**CRITICAL:** Make it feel like it was written specifically for them, not a template. Use their name. Reference their specific situation. Be authentic.

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

    let emailText = completion.choices[0].message.content || "{}";
    emailText = emailText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const email = JSON.parse(emailText);

    return NextResponse.json({
      ok: true,
      email: {
        subject: email.subject,
        body: email.body,
        reasoning: email.reasoning,
        recipientName: personName,
      },
    });
  } catch (err: any) {
    console.error("Email generation error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to generate email",
      },
      { status: 500 }
    );
  }
}
