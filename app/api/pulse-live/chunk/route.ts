// Pulse Live - Process Chunk
// POST /api/pulse-live/chunk
// app/api/pulse-live/chunk/route.ts

import { NextRequest } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { supabaseServer } from "@/lib/supabase/server";
import { jsonOk, handleRouteError } from "@/lib/api/routeErrors";
import { inferSpeakersFromTranscript } from "@/lib/pulse-live/diarization";
import { resolveSpeakers } from "@/lib/pulse-live/speaker-resolution";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const userId = await requireClerkUserId();
    const supabase = supabaseServer();

    const formData = await request.formData();
    const sessionId = formData.get("session_id") as string;
    const audioBlob = formData.get("audio") as File | null;
    const transcriptText = formData.get("transcript") as string | null;
    const startTime = parseFloat(formData.get("start_time") as string) || 0;

    if (!sessionId) {
      return jsonOk({ error: "session_id required" }, { status: 400 });
    }

    // Get session
    const { data: session } = await supabase
      .from("call_sessions")
      .select("*")
      .eq("owner_user_id", userId)
      .eq("id", sessionId)
      .eq("status", "active")
      .single();

    if (!session) {
      return jsonOk({ error: "Session not found or ended" }, { status: 404 });
    }

    let transcript = transcriptText;
    let segments: Array<{ speaker_key: string; text: string; start: number; end: number }> = [];

    // Transcribe if audio provided
    if (audioBlob && !transcript) {
      const bytes = await audioBlob.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const transcription = await openai.audio.transcriptions.create({
        file: new File([buffer], "chunk.webm", { type: "audio/webm" }),
        model: "whisper-1",
        response_format: "verbose_json",
      });

      transcript = transcription.text;
    }

    if (!transcript) {
      return jsonOk({ error: "No transcript or audio provided" }, { status: 400 });
    }

    // Diarize (infer speakers)
    const diarized = await inferSpeakersFromTranscript(
      transcript,
      session.participant_emails || []
    );

    // Resolve speakers to CRM contacts
    const speakerMap: Record<string, { name?: string; email?: string }> = {};
    for (const seg of diarized) {
      if (!speakerMap[seg.speaker_key]) {
        speakerMap[seg.speaker_key] = {
          name: (seg as any).speaker_name,
        };
      }
    }

    const resolutions = await resolveSpeakers(
      userId,
      speakerMap,
      session.participant_emails || [],
      session.calendar_event_id || undefined
    );

    // Update session speaker_map
    const updatedSpeakerMap = { ...(session.speaker_map || {}), ...resolutions };
    await supabase
      .from("call_sessions")
      .update({ speaker_map: updatedSpeakerMap })
      .eq("id", sessionId);

    // Save segments
    const segmentInserts = diarized.map((seg) => ({
      session_id: sessionId,
      owner_user_id: userId,
      speaker_key: seg.speaker_key,
      contact_id: resolutions[seg.speaker_key]?.contact_id || null,
      text: seg.text,
      start_time: seg.start + startTime,
      end_time: seg.end + startTime,
      confidence: seg.confidence || resolutions[seg.speaker_key]?.confidence || 0,
    }));

    if (segmentInserts.length > 0) {
      await supabase.from("call_segments").insert(segmentInserts);
    }

    // Extract action items, decisions, objections, risks
    const extraction = await extractStructuredData(transcript);

    // Update rolling summary
    await updateCallSummary(supabase, userId, sessionId, transcript, extraction);

    // Evaluate nudge criticality
    const criticality = await evaluateCriticality(transcript, extraction);

    // Generate nudge if needed
    const { evaluateNudge, generateNudgeMessage } = await import("@/lib/pulse-live/nudgePolicy");
    const lastNudgeTime = null; // TODO: Track last nudge time in session
    const nudgeDecision = evaluateNudge(criticality, lastNudgeTime);
    const nudgeMessage = nudgeDecision.should_nudge
      ? generateNudgeMessage(transcript, extraction, criticality)
      : null;

    return jsonOk({
      segments_processed: segmentInserts.length,
      criticality,
      extraction,
      nudge: nudgeMessage ? {
        message: nudgeMessage,
        frequency: nudgeDecision.frequency,
      } : null,
    });
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}

async function extractStructuredData(transcript: string) {
  const prompt = `Extract structured data from this conversation transcript:

TRANSCRIPT:
${transcript}

Return JSON:
{
  "action_items": ["item1", "item2"],
  "decisions": ["decision1", "decision2"],
  "objections": ["objection1"],
  "risks": ["risk1"]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    return JSON.parse(completion.choices[0].message.content || "{}");
  } catch (error) {
    console.error("Extraction error:", error);
    return { action_items: [], decisions: [], objections: [], risks: [] };
  }
}

async function updateCallSummary(
  supabase: any,
  userId: string,
  sessionId: string,
  transcript: string,
  extraction: any
) {
  // Get or create summary
  const { data: existing } = await supabase
    .from("call_summaries")
    .select("*")
    .eq("session_id", sessionId)
    .maybeSingle();

  const currentActions = existing?.action_items || [];
  const currentDecisions = existing?.decisions || [];
  const currentObjections = existing?.objections || [];
  const currentRisks = existing?.risks || [];

  const summaryText = existing
    ? `${existing.summary_text}\n\n${transcript}`
    : transcript;

  // Truncate summary if too long (keep last 2000 chars)
  const truncatedSummary = summaryText.length > 2000 ? summaryText.slice(-2000) : summaryText;

  await supabase.from("call_summaries").upsert({
    session_id: sessionId,
    owner_user_id: userId,
    summary_text: truncatedSummary,
    action_items: [...currentActions, ...(extraction.action_items || [])],
    decisions: [...currentDecisions, ...(extraction.decisions || [])],
    objections: [...currentObjections, ...(extraction.objections || [])],
    risks: [...currentRisks, ...(extraction.risks || [])],
    updated_at: new Date().toISOString(),
  });
}

async function evaluateCriticality(transcript: string, extraction: any): Promise<number> {
  // Calculate criticality score [0, 1]
  let score = 0;

  // Objections raise criticality
  if (extraction.objections && extraction.objections.length > 0) {
    score += 0.3;
  }

  // Risks raise criticality
  if (extraction.risks && extraction.risks.length > 0) {
    score += 0.2;
  }

  // Decision points raise criticality
  if (extraction.decisions && extraction.decisions.length > 0) {
    score += 0.2;
  }

  // Pricing/timing language raises criticality
  const pricingWords = ["price", "cost", "budget", "pricing", "deal", "discount"];
  const timingWords = ["deadline", "timeline", "when", "date", "schedule"];
  const lowerTranscript = transcript.toLowerCase();

  if (pricingWords.some((w) => lowerTranscript.includes(w))) {
    score += 0.15;
  }
  if (timingWords.some((w) => lowerTranscript.includes(w))) {
    score += 0.1;
  }

  return Math.min(1, score);
}

