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

function getText(props: any, field: string): string {
  return props[field]?.rich_text?.[0]?.plain_text || "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transcript, personId } = body;

    if (!transcript) {
      return NextResponse.json(
        { ok: false, error: "Missing transcript" },
        { status: 400 }
      );
    }

    console.log("🧠 Deep analyzing conversation...");

    // Get Second Brain intel if personId provided
    let personIntel = "";
    let personName = "Unknown";
    
    if (personId && SECOND_BRAIN_DB) {
      try {
        const page = await notion.pages.retrieve({ page_id: personId });
        const props = (page as any).properties || {};
        
        personName = props["Name"]?.title?.[0]?.plain_text || "Unknown";
        const rawData = getText(props, "Raw Data");
        const communicationStyle = getText(props, "Communication Style");
        const painPoints = getText(props, "Pain Points");
        const goals = getText(props, "Goals");

        personIntel = `
**PERSON: ${personName}**
Communication Style: ${communicationStyle}
Pain Points: ${painPoints}
Goals: ${goals}
Intelligence: ${rawData}
`;
      } catch (err) {
        console.error("Failed to get Second Brain intel:", err);
      }
    }

    const prompt = `You are an ELITE sales coach and communication expert providing REAL-TIME coaching during a live call. You are AGGRESSIVE, TACTICAL, and SPECIFIC.

**CURRENT CONVERSATION TRANSCRIPT:**
${transcript}

${personIntel || "**No person intelligence available.**"}

**YOUR MISSION:**
Provide IMMEDIATE, TACTICAL coaching that will help them WIN this conversation RIGHT NOW.

**ANALYZE AND PROVIDE:**

1. **Conversation Control Assessment** (1 sentence)
   - Who is controlling the conversation right now?
   - Is this good or bad?

2. **Immediate Action Commands** (5-7 SPECIFIC actions - be DIRECTIVE)
   - Use command language: "Ask...", "Pivot to...", "Challenge them on..."
   - Be specific about EXACTLY what to say or do
   - Include open-ended questions they should ask
   - Include objection handling if any resistance detected
   - Include control tactics if they're losing the conversation
   - Examples:
     * "Ask: 'What would success look like for you in 90 days?'"
     * "Pivot back to budget with: 'Before we go further, help me understand...'"
     * "When they mention price, say: 'Price makes sense to discuss, but first...'"

3. **Open-Ended Questions to Ask** (3-5 powerful questions)
   - Questions that create deep engagement
   - Questions that uncover pain/needs
   - Questions that advance the sale
   - Format: Exact question to ask

4. **Objection Handling** (If any resistance/objections detected)
   - What objection did you detect?
   - Exact response to use
   - Follow-up question to ask after handling it
   - If no objections: "None detected yet - stay alert"

5. **Control Tactics** (If they're losing control)
   - Are they rambling? Going off-track? Taking over?
   - Exact phrases to regain control:
     * "I appreciate that context. Let me ask you..."
     * "That's interesting. To make sure I understand your priorities..."
     * "Before we get too far down that path, can we..."
   - If control is good: "Control is good - maintain pace"

6. **What's Going Well** (2-3 things - be specific)
   - Quote what they said that was effective
   - Why it worked

7. **Critical Mistakes** (Any mistakes being made RIGHT NOW)
   - What are they doing wrong?
   - What to do instead
   - If none: "No critical mistakes"

8. **Red Flags & Buying Signals** 
   - Red flags: Warning signs in conversation
   - Buying signals: Signs of interest/readiness
   - What to do about each

9. **Talk Ratio Analysis**
   - Estimate: "You: X% | Them: Y%"
   - Is this good or bad for this stage?
   - Specific action if ratio is wrong

10. **Conversation Stage Assessment**
   - What stage are we in? (Discovery, Pitch, Negotiation, Close)
   - What should happen next to advance?

11. **Key Information Captured** (Important facts/details mentioned)
    - Extract critical data points
    - Note commitments, timelines, budget hints

12. **Action Items Detected** (Any commitments made)
    - Format: "Who - What - When"
    - If none: "None yet"

13. **Next 30 Seconds** (ONE specific directive)
    - EXACTLY what they should do/say in the next 30 seconds
    - Be ultra-specific

**IMPORTANT COACHING PRINCIPLES:**
- If they're talking too much (>70%): Give them control tactics and questions
- If they're passive: Give them aggressive conversation drivers
- If they're off-topic: Give them redirect phrases
- If they're handling objections poorly: Give them exact objection responses
- If they're missing buying signals: Point them out explicitly
- Be TACTICAL, not theoretical
- Every suggestion should be copy-paste ready

**FORMAT AS JSON:**
{
  "controlAssessment": "...",
  "immediateActions": ["Ask: '...'", "Pivot to: '...'", "Say: '...'"],
  "openEndedQuestions": ["...", "...", "..."],
  "objectionHandling": {
    "detected": "...",
    "response": "...",
    "followUp": "..."
  },
  "controlTactics": ["...", "..."],
  "goingWell": ["...", "..."],
  "criticalMistakes": ["..."],
  "redFlags": ["..."],
  "buyingSignals": ["..."],
  "talkRatio": "You: X% | Them: Y%",
  "talkRatioComment": "...",
  "conversationStage": "...",
  "stageAction": "...",
  "keyInformation": ["...", "..."],
  "actionItems": ["..."],
  "next30Seconds": "..."
}

Be AGGRESSIVE, SPECIFIC, and TACTICAL. This is real-time coaching - every second counts!

Respond ONLY with valid JSON.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
    });

    let analysisText = completion.choices[0].message.content || "{}";
    analysisText = analysisText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    const analysis = JSON.parse(analysisText);

    console.log("✅ Deep analysis complete!");

    return NextResponse.json({
      ok: true,
      analysis,
      personName,
    });
  } catch (err: any) {
    console.error("Deep analysis error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Analysis failed",
      },
      { status: 500 }
    );
  }
}