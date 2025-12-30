import { auth } from "@clerk/nextjs/server";
import { canMakeAICall } from "@/lib/services/usage";
import { NextResponse } from "next/server";
import { getContacts } from "@/lib/data/journal";
import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const usageCheck = await canMakeAICall(userId, "generate_email", 3);
    if (!usageCheck.allowed) return NextResponse.json({ error: usageCheck.reason, requiresUpgrade: usageCheck.requiresUpgrade }, { status: 402 });

    const body = await req.json();
    const { dealName, dealStage, dealAmount, purpose, personName: inputName } = body;

    if (!dealName) {
      return NextResponse.json(
        { ok: false, error: "Missing deal info" },
        { status: 400 }
      );
    }

    // Search Second Brain (Supabase Contacts) for related people
    let personIntel = "";
    let personName = inputName || "there";

    try {
      const contacts = await getContacts(userId);

      // Fuzzy match logic - finding related contact
      const relatedPerson = contacts.find(c => {
        const nameMatch = c.name?.toLowerCase().includes(dealName.toLowerCase());
        const companyMatch = c.company?.toLowerCase() && dealName.toLowerCase().includes(c.company.toLowerCase());
        return nameMatch || companyMatch;
      });

      if (relatedPerson) {
        personName = relatedPerson.name;
        const context = relatedPerson.context || {};

        const communicationStyle = context.communicationStyle || "Unknown";
        const painPoints = Array.isArray(context.painPoints) ? context.painPoints.join(", ") : (context.painPoints || "None detected");
        const goals = Array.isArray(context.goals) ? context.goals.join(", ") : (context.goals || "None detected");
        const objections = Array.isArray(context.objectionHistory) ? context.objectionHistory.join(", ") : (context.objectionHistory || "None");

        personIntel = `
            **PERSON INTELLIGENCE:**
            Name: ${personName}
            Communication Style: ${communicationStyle}
            Pain Points: ${painPoints}
            Goals: ${goals}
            Objections They've Raised: ${objections}
            `;
      }
    } catch (err) {
      console.error("Second Brain lookup error:", err);
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

**FORMAT AS JSON:**
{
  "subject": "...",
  "body": "...",
  "reasoning": "2-3 sentences explaining why this approach will work for THEM"
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
