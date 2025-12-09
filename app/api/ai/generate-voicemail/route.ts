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
    const { dealName, purpose, urgency } = body;

    if (!dealName) {
      return NextResponse.json(
        { ok: false, error: "Missing deal info" },
        { status: 400 }
      );
    }

    // Search Second Brain for related people
    let personIntel = "";
    let personName = "";
    
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

    const prompt = `You are an expert at leaving voicemails that get callbacks. Most voicemails get deleted - yours get action.

**CONTEXT:**
- Person/Deal: ${dealName}
- Purpose: ${purpose || "Follow-up"}
- Urgency: ${urgency || "Normal"}

${personIntel || "**No Second Brain intelligence available.**"}

**YOUR MISSION:**
Write a voicemail script that:
1. Gets them to listen to the END (most people delete after 5 seconds)
2. Creates CURIOSITY or provides immediate VALUE
3. Is BRIEF (20-30 seconds MAX - people are busy)
4. Sounds NATURAL and conversational (not scripted)
5. Gives them a REASON to call back
6. Makes callback EASY (clear next step)
7. Matches THEIR communication style

**VOICEMAIL PSYCHOLOGY:**

**First 5 Seconds = CRITICAL:**
- Use their name
- State your name clearly
- Create curiosity or value immediately
- If they don't care by second 5, they hang up

**The Hook (5-15 seconds):**
- One compelling reason they should care
- Reference something specific about them
- Mention mutual connection or relevance
- Create a knowledge gap (make them want to know more)

**The Close (15-25 seconds):**
- Clear, simple callback request
- Your number (SLOWLY - people need to write it down)
- Optional: alternative contact method
- End on a high note

**VOICEMAIL STRATEGIES:**

**Value-First:**
"Hey Sarah - it's [Name]. Saw your post about pipeline challenges. I have a 2-minute solution that worked for 3 companies in your exact situation. Call me at [number] - I'll walk you through it."

**Curiosity-Based:**
"Marcus - [Name] here. Got an interesting perspective on your Q1 board presentation that could increase your forecast accuracy by 30%. Let's talk - [number]."

**Urgency-Based (if appropriate):**
"Hi [Name] - quick heads up on something time-sensitive related to [deal/topic]. Call me today if possible - [number]. Thanks!"

**Relationship-Based:**
"Hey [Name]! Thinking about you and your team's [challenge]. Have you considered [approach]? Would love to share - call me at [number]."

**DELIVERY TIPS:**
- Smile when you talk (they can hear it)
- Speak clearly but naturally
- Slow down on your phone number
- Sound energetic but not manic
- Leave room to breathe

**FORMAT AS JSON:**
{
  "script": "Full voicemail script (20-30 seconds when spoken)",
  "phoneNumber": "[Your Number] - said slowly and clearly",
  "backupMessage": "If they don't call back, send this text",
  "reasoning": "Why this will get a callback",
  "deliveryNotes": "How to say it (tone, pace, emphasis)"
}

**CRITICAL:** Voicemail is HARD. Most people ignore them. Your job is to be the ONE they actually call back. Be interesting. Be brief. Be clear.

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

    let voicemailData = completion.choices[0].message.content || "{}";
    voicemailData = voicemailData.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const voicemail = JSON.parse(voicemailData);

    return NextResponse.json({
      ok: true,
      voicemail: {
        script: voicemail.script,
        phoneNumber: voicemail.phoneNumber,
        backupMessage: voicemail.backupMessage,
        reasoning: voicemail.reasoning,
        deliveryNotes: voicemail.deliveryNotes,
        recipientName: personName,
      },
    });
  } catch (err: any) {
    console.error("Voicemail generation error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to generate voicemail script",
      },
      { status: 500 }
    );
  }
}