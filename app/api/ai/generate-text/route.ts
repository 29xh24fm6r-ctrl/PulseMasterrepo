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
    const usageCheck = await canMakeAICall(userId, "generate_text", 3);
    if (!usageCheck.allowed) return NextResponse.json({ error: usageCheck.reason, requiresUpgrade: usageCheck.requiresUpgrade }, { status: 402 });

    const body = await req.json();
    const { dealName, purpose } = body;

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
          const buyingSignals = getText(props, "Buying Signals");
          const keyInsights = getText(props, "Key Insights");

          personIntel = `
**PERSON INTELLIGENCE:**
Name: ${personName}
Communication Style: ${communicationStyle}
Pain Points: ${painPoints}
Buying Signals: ${buyingSignals}
Key Insights: ${keyInsights}
`;
        }
      } catch (err) {
        console.error("Second Brain lookup error:", err);
      }
    }

    const prompt = `You are an elite relationship-builder who writes perfect text messages.

**CONTEXT:**
- Deal: ${dealName}
- Purpose: ${purpose || "Check in and build rapport"}

${personIntel || "**No Second Brain intelligence available.**"}

**YOUR MISSION:**
Write a text message that:
1. Feels PERSONAL and AUTHENTIC (like texting a friend)
2. Matches THEIR communication style
3. Is brief but impactful (texts should be short!)
4. Builds rapport and trust
5. Has a clear purpose but doesn't feel pushy
6. Uses appropriate emoji if they're relationship-focused (not if they're formal/analytical)

**TEXT MESSAGE GUIDELINES:**
- Keep it under 160 characters if possible (or 2-3 short sentences max)
- Use their first name naturally
- Be conversational, not corporate
- Include a question or soft CTA
- Match their energy/style

**EXAMPLES OF GOOD TEXTS:**
Analytical person: "Hey Sarah - sent over that ROI breakdown. Quick question when you have 2 min?"
Relationship person: "Marcus! Hope your week is going well 🙌 Quick thought on that board deck - can I share?"
Direct person: "Hey - have 3 min for a quick call today?"

**FORMAT AS JSON:**
{
  "message": "...",
  "reasoning": "1-2 sentences on why this will work for them",
  "bestTimeToSend": "Morning/Afternoon/Evening - based on their style"
}

**CRITICAL:** Make it sound like YOU, not a template. Be human. Be brief. Be real.

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

    let textData = completion.choices[0].message.content || "{}";
    textData = textData.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const text = JSON.parse(textData);

    return NextResponse.json({
      ok: true,
      text: {
        message: text.message,
        reasoning: text.reasoning,
        bestTimeToSend: text.bestTimeToSend,
        recipientName: personName,
      },
    });
  } catch (err: any) {
    console.error("Text generation error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to generate text",
      },
      { status: 500 }
    );
  }
}
