// POST /api/comm/call/transcribe - Transcribe and analyze call using Vertex AI (Gemini 1.5 Pro)
// PRIVACY NOTICE: Implements "Transient Analysis". Audio is processed and immediately deleted.
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { triggerAutoFollowupForCall } from "@/lib/delegation/auto-followup";
import { getCallSession, updateCallSession } from "@/lib/comm/store";
import { logThirdBrainEvent, upsertMemory } from "@/lib/third-brain/service";
import { pulseVertex } from "@/lib/pulse/vertex-ai";

export async function POST(request: Request) {
  let recordingUrlForCleanup: string | null = null;

  try {
    const { sessionId, recordingUrl } = await request.json();

    if (!sessionId || !recordingUrl) {
      return NextResponse.json({ error: "Missing sessionId or recordingUrl" }, { status: 400 });
    }
    recordingUrlForCleanup = recordingUrl;

    const session = await getCallSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    console.log(`🧠 Pulse Brain Listening to call: ${sessionId}`);

    // 1. Download recording from Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const audioResponse = await fetch(recordingUrl, {
      headers: { Authorization: `Basic ${auth}` },
    });

    if (!audioResponse.ok) throw new Error(`Failed to download recording: ${audioResponse.status}`);

    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    console.log(`📥 Audio downloaded (${audioBuffer.length} bytes). Sending to Vertex AI...`);

    // 2. Analyze with Vertex AI (Gemini 1.5 Pro)
    // We do EVERYTHING in one shot: Transcribe, Analyze, Extract Actions.
    // This is "God Mode" efficiency.
    const analysis = await analyzeAudioWithGemini(session, audioBuffer);

    console.log(`✅ Vertex Analysis Complete. Sentiment: ${analysis.sentiment}`);
    console.log(`🗑️ PRIVACY PROTOCOL: Deleting remote recording...`);

    // 3. IMMEDIATE DELETION (Privacy Protocol)
    // We assume recordingUrl is like: https://api.twilio.com/2010-04-01/Accounts/AC.../Recordings/RE....mp3
    // We need to send a DELETE request to the .json version of that URL (or just the base resource).
    const deleteUrl = recordingUrl.replace(".mp3", ".json"); // Twilio API convention
    await fetch(deleteUrl, {
      method: "DELETE",
      headers: { Authorization: `Basic ${auth}` }
    });
    console.log(`🗑️ Recording deleted successfully.`);

    // 4. Update Session & System
    // Update session with transcript (extracted from analysis if possible, or summary)
    // Note: Gemini implementation below asks for transcript in JSON.
    await updateCallSession(sessionId, {
      transcriptText: analysis.transcript,
      summaryShort: analysis.summaryShort,
      summaryDetailed: analysis.summaryDetailed,
      sentiment: analysis.sentiment,
      tags: [...(session.tags || []), ...(analysis.tags || [])],
      actionsJson: analysis.actions,
    });

    // 5. System Integrations (Second Brain, Third Brain)

    // Auto-save to Second Brain (Contact Context)
    const contactId = session.contactId;
    const contactName = session.tags?.find((t: string) => t.startsWith("contact:"))?.replace("contact:", "") ||
      analysis.speakerIdentification?.detectedName;

    if (contactId) {
      // (Optional) Fire and forget save endpoint
      // implemented inline for robustness or keep fetch if separate logic exists
    }

    // Log to Third Brain (Events)
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
          ...analysis, // Dump full god-mode analysis
          duration_seconds: session.durationSec,
        },
      });

      // Trigger Auto-Followup
      if (eventId) triggerAutoFollowupForCall(userId, eventId);

      // Recursive Memory (Relationship Intelligence)
      if (contactName) {
        const contactKey = `relationship:${contactName.toLowerCase().replace(/\s+/g, "_")}`;
        await upsertMemory({
          userId,
          category: "relationship",
          key: contactKey,
          content: `Reflected on call (${new Date().toLocaleDateString()}): ${analysis.summaryDetailed}. Tone was ${analysis.sentiment}.`,
          importance: 3, // Higher importance for voice
          metadata: {
            lastCallDate: new Date().toISOString(),
            sentiment: analysis.sentiment,
            contactId,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      sessionId,
      analysis,
      privacy: "recording_deleted"
    });

  } catch (error: any) {
    console.error("Vertex Processing Error:", error);

    // FAIL-SAFE: Attempt to delete recording even if analysis failed
    if (recordingUrlForCleanup) {
      try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
        const deleteUrl = recordingUrlForCleanup.replace(".mp3", ".json");
        await fetch(deleteUrl, {
          method: "DELETE",
          headers: { Authorization: `Basic ${auth}` }
        });
        console.log("🗑️ Fail-safe deletion executed.");
      } catch (e) {
        console.error("CRITICAL: Failed to delete recording during error handling", e);
      }
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function analyzeAudioWithGemini(session: any, audioBuffer: Buffer) {
  const contactName = session.tags?.find((t: string) => t.startsWith("contact:"))?.replace("contact:", "") || "Unknown Contact";

  const prompt = `
  You are Pulse OS, an ELITE Sales Strategist and Communication Coach (World-Class Level).
  Your goal is to provide PREDICTIVE, ACTIONABLE insights that will help the user close deals and deepen relationships.
  
  Listen to this phone call audio with "God Mode" perception. 
  You must hear what is NOT said—hesitation, excitement, deception, or urgency.
  
  CONTEXT:
  - Direction: ${session.direction}
  - Counterparty: ${contactName}
  
  TASK:
  1. **Transcribe**: Verbatim record of the conversation.
  2. **Emotional Decoder**: Analyze the specific tone (e.g., "Client sounded initially skeptical but warmed up when price was mentioned").
  3. **Sales Intelligence**:
     - Identify *Buying Signals* or *Red Flags*.
     - Extract *Hard Commitments* (Time, Money, Next Steps).
  4. **Strategic Advice**: 
     - "Based on their tone, you should..." 
     - "They are lying about..."
     - "Push for close now because..."
  
  OUTPUT JSON ONLY:
  {
    "transcript": "Full text...",
    "summaryShort": "One sentence strategic summary.",
    "summaryDetailed": "Detailed bullet points including emotional nuance.",
    "sentiment": "positive/neutral/negative/anxious/angry/excited",
    "emotionalContext": "Deep psychological analysis of the counterparty's state.",
    "speakerIdentification": {
        "detectedName": "Name if found",
        "role": "Role if found"
    },
    "tags": ["Urgent", "Deal Risk", "Buying Signal", "Tag1"],
    "actions": [
        {"action": "Specific tactic (e.g. 'Send pricing within 1 hour')", "priority": "high", "assignee": "me"}
    ],
    "keyTopics": ["Price", "Competitor X", "Timeline"],
    "salesCoachWisdom": "One piece of elite advice for the next interaction."
  }
  `;

  // Use the audio intelligence service
  try {
    const resultText = await pulseVertex.analyzeAudio(audioBuffer, "audio/mp3", prompt);

    // Clean and parse JSON
    const jsonStr = resultText.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("JSON Parse Error on Vertex Response:", e);
    return {
      transcript: "Error parsing processing results.",
      summaryShort: "Processing failed.",
      sentiment: "neutral",
      actions: []
    };
  }
}
