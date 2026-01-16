import { canMakeAICall, trackAIUsage } from "@/services/usage";
import { auth } from "@clerk/nextjs/server"; // Added auth import
import { NextResponse } from "next/server";
import { getContacts, type Contact } from "@/lib/data/journal";
import { getOpenAI } from "@/lib/llm/client";
// import OpenAI from "openai";

// const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// if (!OPENAI_API_KEY) {
//   throw new Error("Missing API keys");
// }

// const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { dealName, messageType, purpose } = body;

    if (!dealName) {
      return NextResponse.json(
        { ok: false, error: "Missing deal info" },
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
            Pain Points: ${Array.isArray(context.painPoints) ? context.painPoints.join(", ") : context.painPoints}
            Goals: ${Array.isArray(context.goals) ? context.goals.join(", ") : context.goals}
            Key Insights: ${context.keyInsights || "None"}
            `;
      }
    } catch (err) {
      console.error("Second Brain lookup error:", err);
    }

    const prompt = `You are an elite LinkedIn networking expert who writes messages that get responses.

**CONTEXT:**
- Person/Deal: ${dealName}
- Message Type: ${messageType || "Connection Request"}
- Purpose: ${purpose || "Build professional relationship"}

${personIntel || "**No Second Brain intelligence available.**"}

**YOUR MISSION:**
Write a LinkedIn message that:
1. Feels PROFESSIONAL but PERSONAL
2. Shows you actually looked at their profile
3. Provides VALUE or RELEVANCE immediately
4. Has a clear but soft call-to-action
5. Is concise

**FORMAT AS JSON:**
{
  "message": "...",
  "subjectLine": "Optional subject line if sending InMail",
  "reasoning": "Why this will get a response",
  "followUpTiming": "When to follow up if no response"
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