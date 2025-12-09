// POST /api/comm/call/transcribe - Transcribe and analyze call, save to Second Brain
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { triggerAutoFollowupForCall } from "@/lib/delegation/auto-followup";
import { getCallSession, updateCallSession } from "@/lib/comm/store";
import { logThirdBrainEvent, upsertMemory } from "@/lib/third-brain/service";

const openai = new OpenAI();

export async function POST(request: Request) {
  try {
    const { sessionId, recordingUrl } = await request.json();

    if (!sessionId || !recordingUrl) {
      return NextResponse.json({ error: "Missing sessionId or recordingUrl" }, { status: 400 });
    }

    const session = await getCallSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    console.log(`🎤 Transcribing call: ${sessionId}`);

    // Download recording with Twilio auth
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const audioResponse = await fetch(recordingUrl, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!audioResponse.ok) {
      throw new Error(`Failed to download recording: ${audioResponse.status}`);
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    const audioFile = new File([audioBuffer], "recording.mp3", { type: "audio/mpeg" });

    // Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      response_format: "verbose_json",
    });

    const transcriptText = transcription.text;
    console.log(`📝 Transcription: ${transcriptText.substring(0, 100)}...`);

    // Update session with transcript
    await updateCallSession(sessionId, { transcriptText });

    // Analyze with GPT
    const analysis = await analyzeCall(session, transcriptText);

    // Update session with analysis
    await updateCallSession(sessionId, {
      summaryShort: analysis.summaryShort,
      summaryDetailed: analysis.summaryDetailed,
      sentiment: analysis.sentiment,
      tags: [...(session.tags || []), ...(analysis.tags || [])],
      actionsJson: analysis.actions,
    });

    // Auto-save to Second Brain if contact was identified
    let savedToBrain = false;
    const contactId = session.contactId;
    const contactName = session.tags?.find((t: string) => t.startsWith("contact:"))?.replace("contact:", "") || 
                        analysis.speakerIdentification?.detectedName;
    
    if (contactId) {
      try {
        const baseUrl = process.env.APP_BASE_URL || "https://pulselifeos.com";
        await fetch(`${baseUrl}/api/comm/call/save-to-brain`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callSessionId: sessionId, contactId }),
        });
        savedToBrain = true;
        console.log(`🧠 Auto-saved to Second Brain: ${contactId}`);
      } catch (e) {
        console.error("Auto-save to brain failed:", e);
      }
    }

    // Log to Third Brain
    const userId = session.userId;
    if (userId) {
      const eventId = await logThirdBrainEvent({
        userId,
        type: "call",
        source: "telephony",
        title: `Call with ${contactName || session.toNumber || "Unknown"}`,
        summary: analysis.summaryShort || "Call completed",
        rawPayload: {
          sessionId,
          contact_name: contactName,
          contact_email: null,
          contact_id: contactId,
          direction: session.direction,
          toNumber: session.toNumber,
          fromNumber: session.fromNumber,
          duration_seconds: session.durationSec,
          summary: analysis.summaryShort,
          sentiment: analysis.sentiment,
          tags: analysis.tags,
          action_items: analysis.actions?.map((a: any) => a.action) || [],
          keyTopics: analysis.keyTopics,
        },
      });

      // Trigger auto-followup draft generation
      if (eventId) {
        triggerAutoFollowupForCall(userId, eventId);
      }

      // Upsert relationship memory if contact known
      if (contactName) {
        const contactKey = `relationship:${contactName.toLowerCase().replace(/\s+/g, "_")}`;
        await upsertMemory({
          userId,
          category: "relationship",
          key: contactKey,
          content: `Last call: ${new Date().toLocaleDateString()}. ${analysis.summaryShort || "Call completed"}`,
          importance: 2,
          metadata: {
            lastCallDate: new Date().toISOString(),
            sentiment: analysis.sentiment,
            contactId,
            phone: session.direction === "outbound" ? session.toNumber : session.fromNumber,
          },
        });
        console.log(`🧠 Third Brain memory updated: ${contactKey}`);
      }
    }

    return NextResponse.json({
      success: true,
      sessionId,
      transcriptText,
      analysis,
      savedToBrain,
    });

  } catch (error: any) {
    console.error("Transcription error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function analyzeCall(session: any, transcript: string) {
  const contactName = session.tags?.find((t: string) => t.startsWith("contact:"))?.replace("contact:", "");
  
  const prompt = `Analyze this phone call transcript.

CALL INFO:
- Direction: ${session.direction}
- To: ${session.toNumber}
- Contact: ${contactName || "Unknown"}
- Duration: ${session.durationSec || 0} seconds

TRANSCRIPT:
${transcript}

Provide analysis in this JSON format:
{
  "summaryShort": "1-2 sentence summary",
  "summaryDetailed": "Detailed summary with key points",
  "sentiment": "positive" | "neutral" | "negative",
  "speakerIdentification": {
    "detectedName": "Name if mentioned in call or null",
    "company": "Company if mentioned or null",
    "role": "Role/title if mentioned or null"
  },
  "tags": ["topic1", "topic2"],
  "actions": [
    {"action": "Follow up item", "priority": "high" | "medium" | "low"}
  ],
  "keyTopics": ["topic1", "topic2"],
  "followUpDate": "suggested follow-up date or null"
}

Only respond with valid JSON.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1500,
    temperature: 0.3,
  });

  const responseText = completion.choices[0]?.message?.content || "{}";
  
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch {
    return {
      summaryShort: "Call completed",
      summaryDetailed: transcript,
      sentiment: "neutral",
      tags: [],
      actions: [],
    };
  }
}
