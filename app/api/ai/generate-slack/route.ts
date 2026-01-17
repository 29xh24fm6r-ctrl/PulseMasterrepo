import { canMakeAICall, trackAIUsage } from "@/services/usage";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getContacts, type Contact } from "@/lib/data/journal";
import OpenAI from "openai";

import { getOpenAI } from "@/services/ai/openai";

// ... existing code ...

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { dealName, recipientRole, purpose, urgency } = body;

    if (!dealName) {
      return NextResponse.json(
        { ok: false, error: "Missing info" },
        { status: 400 }
      );
    }

    // Search Second Brain
    let personIntel = "";
    let personName = "there";

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

        personIntel = `
            **PERSON INTELLIGENCE:**
            Name: ${personName}
            Communication Style: ${context.communicationStyle || "Unknown"}
            Key Insights: ${context.keyInsights || "None"}
            `;
      }
    } catch (err) {
      console.error("Second Brain lookup error:", err);
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
1. Gets READ immediately
2. Gets to the point FAST
3. Makes the ask/update CRYSTAL CLEAR
4. Matches workplace communication norms

**FORMAT AS JSON:**
{
  "message": "...",
  "reasoning": "Why this approach works",
  "alternativeApproach": "If they prefer different style",
  "followUpStrategy": "If no response"
}

Respond ONLY with valid JSON.`;

    const openai = getOpenAI();
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