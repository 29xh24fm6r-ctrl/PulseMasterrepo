import { auth } from "@clerk/nextjs/server";
import { canMakeAICall, trackAIUsage } from "@/services/usage";
import { NextResponse } from "next/server";
import { getContacts, type Contact } from "@/lib/data/journal";
import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error("Missing API keys");
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

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

    // Search Second Brain
    let personIntel = "";
    let personName = "the prospect";

    try {
      const contacts = await getContacts(userId);
      const relatedPerson = contacts.find((c: Contact) => {
        const nameMatch = c.name?.toLowerCase().includes(dealName.toLowerCase());
        const companyMatch = c.company?.toLowerCase() && dealName.toLowerCase().includes(c.company.toLowerCase());
        return nameMatch || companyMatch;
      });

      if (relatedPerson) {
        personName = relatedPerson.name;
        const context = relatedPerson.context || {};

        const communicationStyle = context.communicationStyle || "Unknown";
        const painPoints = Array.isArray(context.painPoints) ? context.painPoints.join(", ") : context.painPoints;
        const goals = Array.isArray(context.goals) ? context.goals.join(", ") : context.goals;
        const decisionPattern = context.decisionMakingPattern || "Unknown";
        const objections = Array.isArray(context.objectionHistory) ? context.objectionHistory.join(", ") : context.objectionHistory;
        const nextActions = Array.isArray(context.nextBestActions) ? context.nextBestActions.join(", ") : context.nextBestActions;
        const keyInsights = context.keyInsights || "None";

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

    const prompt = `You are an elite meeting strategist. Create a strategic meeting agenda designed to move this deal forward.

**MEETING CONTEXT:**
- Deal: ${dealName}
- Stage: ${dealStage || "Unknown"}
- Meeting Type: ${meetingType || "Discovery/Strategy Call"}
- Duration: ${duration || "30"} minutes

${personIntel || "**No Second Brain intelligence available.**"}

**YOUR MISSION:**
Create a meeting agenda that:
1. Is strategically designed to achieve YOUR objective
2. Respects THEIR communication style and decision-making pattern
3. Addresses THEIR pain points and goals naturally
4. Handles THEIR likely objections proactively
5. Creates momentum and commitment

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