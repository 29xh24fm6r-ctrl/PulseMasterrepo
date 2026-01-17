import { auth } from "@clerk/nextjs/server";
import { canMakeAICall, trackAIUsage } from "@/services/usage";
import { NextResponse } from "next/server";
import { getContacts, type Contact } from "@/lib/data/journal";
import { getOpenAI } from "@/services/ai/openai";

// ... existing code ...

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

    // Search Second Brain (Supabase Contacts)
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
            Buying Signals: ${Array.isArray(context.buyingSignals) ? context.buyingSignals.join(", ") : context.buyingSignals}
            Key Insights: ${context.keyInsights || "None"}
            `;
      }
    } catch (err) {
      console.error("Second Brain lookup error:", err);
    }

    const prompt = `You are an elite relationship-builder who writes perfect text messages.

**CONTEXT:**
- Deal: ${dealName}
- Purpose: ${purpose || "Check in and build rapport"}

${personIntel || "**No Second Brain intelligence available.**"}

**YOUR MISSION:**
Write a text message that:
1. Feels PERSONAL and AUTHENTIC
2. Matches THEIR communication style
3. Is brief but impactful
4. Builds rapport and trust

**FORMAT AS JSON:**
{
  "message": "...",
  "reasoning": "1-2 sentences on why this will work for them",
  "bestTimeToSend": "Morning/Afternoon/Evening"
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
