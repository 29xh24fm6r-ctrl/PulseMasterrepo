import { canMakeAICall, trackAIUsage } from "@/services/usage";
import { auth } from "@clerk/nextjs/server";
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

    const body = await req.json();
    const { dealName, videoLength, purpose } = body;

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

    const prompt = `You are an expert at creating engaging video messages.

**CONTEXT:**
- Person/Deal: ${dealName}
- Video Length: ${videoLength || "2"} minutes
- Purpose: ${purpose || "Personalized follow-up"}

${personIntel || "**No Second Brain intelligence available.**"}

**YOUR MISSION:**
Write a video script that:
1. HOOKS them in first 3 seconds
2. Feels PERSONAL and AUTHENTIC
3. Matches THEIR communication style
4. Delivers VALUE

**FORMAT AS JSON:**
{
  "title": "Compelling video title",
  "hook": "[0:00-0:05] What to say in first 5 seconds",
  "body": "[0:05-1:45] Main content with bullet points",
  "callToAction": "[1:45-2:00] How to close",
  "visualNotes": "What to show on screen",
  "energyLevel": "High/Medium/Low",
  "reasoning": "Why this approach will work for them"
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