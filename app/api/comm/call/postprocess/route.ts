// POST /api/comm/call/postprocess - AI summarization of call transcript
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getCallSession, updateCallSession } from "@/lib/comm/store";

const openai = new OpenAI();

export async function POST(request: Request) {
  try {
    const { callSessionId, transcriptText } = await request.json();

    if (!callSessionId) {
      return NextResponse.json({ error: "callSessionId required" }, { status: 400 });
    }

    const session = await getCallSession(callSessionId);
    if (!session) {
      return NextResponse.json({ error: "Call session not found" }, { status: 404 });
    }

    // Use provided transcript or existing one
    const transcript = transcriptText || session.transcriptText;
    
    if (!transcript || transcript.includes("not yet implemented")) {
      return NextResponse.json(
        { error: "No transcript available to process" },
        { status: 400 }
      );
    }

    // Use OpenAI to analyze the transcript
    const prompt = `Analyze this phone call transcript and provide:
TRANSCRIPT:
${transcript}
Respond in JSON format with these exact fields:
{
  "summaryShort": "1-2 sentence summary",
  "summaryDetailed": "Detailed summary with key points",
  "sentiment": "positive" | "neutral" | "negative",
  "tags": ["array", "of", "relevant", "tags"],
  "actions": [{"action": "description", "priority": "high|medium|low"}]
}
Only respond with valid JSON, no other text.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.3,
    });

    const responseText = completion.choices[0]?.message?.content || "{}";
    
    // Parse the JSON response
    let analysis;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      analysis = {
        summaryShort: "Unable to generate summary.",
        summaryDetailed: responseText,
        sentiment: "neutral",
        tags: [],
        actions: [],
      };
    }

    // Update the call session with analysis results
    await updateCallSession(callSessionId, {
      summaryShort: analysis.summaryShort,
      summaryDetailed: analysis.summaryDetailed,
      sentiment: analysis.sentiment,
      tags: analysis.tags,
      actionsJson: analysis.actions,
    });

    return NextResponse.json({
      success: true,
      callSessionId,
      analysis,
    });
  } catch (error: any) {
    console.error("Postprocess error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process transcript" },
      { status: 500 }
    );
  }
}
