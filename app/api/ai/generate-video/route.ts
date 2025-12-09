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
    const { dealName, videoLength, purpose } = body;

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

    const prompt = `You are an expert at creating engaging video messages (Loom, BombBomb, etc.) that get watched and drive action.

**CONTEXT:**
- Person/Deal: ${dealName}
- Video Length: ${videoLength || "2"} minutes
- Purpose: ${purpose || "Personalized follow-up"}

${personIntel || "**No Second Brain intelligence available.**"}

**YOUR MISSION:**
Write a video script that:
1. HOOKS them in first 3 seconds (so they don't skip)
2. Feels PERSONAL and AUTHENTIC (not scripted or corporate)
3. Matches THEIR communication style and interests
4. Delivers VALUE or addresses THEIR pain points
5. Has natural energy and personality
6. Ends with a clear call-to-action
7. Stays within time limit (people have short attention spans!)

**VIDEO SCRIPT STRUCTURE:**

**HOOK (0:00-0:05) - CRITICAL:**
- Use their name immediately
- Reference something specific about them
- Create curiosity or provide value upfront
- Examples:
  - "Hey Sarah - saw your LinkedIn post about [topic]..."
  - "Marcus! Quick follow-up on that board presentation..."
  - "I was thinking about your team's challenge with [pain point]..."

**BODY (0:05-1:45):**
- One key message or value proposition
- Show, don't just tell (screen share, demo, walk-through)
- Address their specific situation
- Be conversational (like talking to a friend)
- Use their language and references

**CALL-TO-ACTION (1:45-2:00):**
- One clear next step
- Make it easy for them to respond
- Create urgency if appropriate
- End on a personal note

**VIDEO BEST PRACTICES:**
- Smile and show energy
- Use hand gestures naturally
- Look at the camera (not the screen)
- Pause for emphasis
- Be yourself, not a robot
- If analytical: show data/screen
- If relationship-focused: keep it warm and personal

**TIMING MARKERS:**
Break script into sections with time stamps so you know pacing

**FORMAT AS JSON:**
{
  "title": "Compelling video title",
  "hook": "[0:00-0:05] What to say in first 5 seconds",
  "body": "[0:05-1:45] Main content with bullet points",
  "callToAction": "[1:45-2:00] How to close",
  "visualNotes": "What to show on screen (if screen sharing)",
  "energyLevel": "High/Medium/Low - based on their style",
  "reasoning": "Why this approach will work for them"
}

**CRITICAL:** Video is POWERFUL because it's personal. Use that advantage. Show up as human, not corporate. Make them feel like you made this JUST for them.

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

    let videoData = completion.choices[0].message.content || "{}";
    videoData = videoData.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const video = JSON.parse(videoData);

    return NextResponse.json({
      ok: true,
      video: {
        title: video.title,
        hook: video.hook,
        body: video.body,
        callToAction: video.callToAction,
        visualNotes: video.visualNotes,
        energyLevel: video.energyLevel,
        reasoning: video.reasoning,
        recipientName: personName,
      },
    });
  } catch (err: any) {
    console.error("Video generation error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to generate video script",
      },
      { status: 500 }
    );
  }
}