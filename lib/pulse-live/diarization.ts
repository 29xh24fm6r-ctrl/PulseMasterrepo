/**
 * Speaker Diarization Utilities
 * lib/pulse-live/diarization.ts
 */

import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface DiarizedSegment {
  speaker_key: string; // spk_0, spk_1, etc.
  text: string;
  start: number;
  end: number;
  confidence?: number;
}

/**
 * Diarize audio using Whisper (basic speaker detection)
 * For production, use a dedicated diarization service like Deepgram or AssemblyAI
 */
export async function diarizeAudio(audioBuffer: Buffer): Promise<DiarizedSegment[]> {
  // Whisper can provide basic speaker labels if configured
  // For now, we'll use a simple approach: segment by silence and infer speakers
  // In production, integrate with Deepgram or AssemblyAI for proper diarization

  // Placeholder implementation
  // TODO: Integrate with proper diarization service
  return [];
}

/**
 * Infer speakers from transcript using LLM
 * This is a fallback when audio diarization isn't available
 */
export async function inferSpeakersFromTranscript(
  transcript: string,
  participantEmails: string[] = []
): Promise<DiarizedSegment[]> {
  if (!transcript.trim()) return [];

  const prompt = `Analyze this conversation transcript and identify distinct speakers. Assign each segment to a speaker.

TRANSCRIPT:
${transcript}

${participantEmails.length > 0 ? `\nPARTICIPANT EMAILS: ${participantEmails.join(", ")}` : ""}

Return a JSON array of segments:
[
  {
    "speaker_key": "spk_0",
    "text": "exact text segment",
    "start": 0.0,
    "end": 5.2,
    "speaker_name": "Speaker 1" (or email if identifiable)
  },
  ...
]

If you can identify a speaker by name or email from the context, use that. Otherwise use spk_0, spk_1, etc.
Only return valid JSON.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    return result.segments || [];
  } catch (error) {
    console.error("Speaker inference error:", error);
    // Fallback: treat as single speaker
    return [
      {
        speaker_key: "spk_0",
        text: transcript,
        start: 0,
        end: transcript.split(" ").length * 0.5, // Rough estimate
      },
    ];
  }
}

