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
    const { dealName, purpose, urgency } = body;

    if (!dealName) {
      return NextResponse.json(
        { ok: false, error: "Missing deal info" },
        { status: 400 }
      );
    }

    // Search Second Brain
    let personIntel = "";
    let personName = "";

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
            Buying Signals: ${Array.isArray(context.buyingSignals) ? context.buyingSignals.join(", ") : context.buyingSignals}
            Key Insights: ${context.keyInsights || "None"}
            `;
      }
    } catch (err) {
      console.error("Second Brain lookup error:", err);
    }

    const prompt = `You are an expert at leaving voicemails that get callbacks.

**CONTEXT:**
- Person/Deal: ${dealName}
- Purpose: ${purpose || "Follow-up"}
- Urgency: ${urgency || "Normal"}

${personIntel || "**No Second Brain intelligence available.**"}

**YOUR MISSION:**
Write a voicemail script that:
1. Gets them to listen to the END
2. Creates CURIOSITY or provides immediate VALUE
3. Is BRIEF (20-30 seconds MAX)
4. Sounds NATURAL and conversational
5. Gives them a REASON to call back

**FORMAT AS JSON:**
{
  "script": "Full voicemail script (20-30 seconds when spoken)",
  "phoneNumber": "[Your Number] - said slowly and clearly",
  "backupMessage": "If they don't call back, send this text",
  "reasoning": "Why this will get a callback",
  "deliveryNotes": "How to say it (tone, pace, emphasis)"
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