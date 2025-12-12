// Speaker Diarization
// lib/voice/diarization/diarize.ts

import { DiarizationSegment } from "./types";

/**
 * Diarize audio into speaker segments
 * Uses OpenAI Whisper with speaker diarization or Deepgram
 */
export async function diarizeAudio(audioUrl: string): Promise<DiarizationSegment[]> {
  // Try Deepgram first (has built-in diarization)
  try {
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (deepgramApiKey) {
      const response = await fetch("https://api.deepgram.com/v1/listen?diarize=true&punctuate=true", {
        method: "POST",
        headers: {
          Authorization: `Token ${deepgramApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: audioUrl,
        }),
      });

      const data = await response.json();
      if (data.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.speakers) {
        const segments: DiarizationSegment[] = [];
        for (const speaker of data.results.channels[0].alternatives[0].paragraphs.speakers) {
          segments.push({
            speakerLabel: `SPEAKER_${speaker.speaker}`,
            start: speaker.start || 0,
            end: speaker.end || 0,
            transcript: speaker.text || "",
          });
        }
        return segments;
      }
    }
  } catch (err) {
    console.warn("[Diarization] Deepgram failed:", err);
  }

  // Fallback: Use OpenAI Whisper and simple clustering
  try {
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Download and transcribe
    const audioResponse = await fetch(audioUrl);
    const audioBlob = await audioResponse.blob();
    const audioFile = new File([audioBlob], "audio.mp3", { type: "audio/mpeg" });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    // Simple speaker assignment (single speaker for now)
    // In production, you'd use a proper diarization model
    const segments: DiarizationSegment[] = [];
    if (transcription.segments) {
      for (const segment of transcription.segments) {
        segments.push({
          speakerLabel: "SPEAKER_1", // Default to single speaker
          start: segment.start || 0,
          end: segment.end || 0,
          transcript: segment.text || "",
        });
      }
    } else {
      // Fallback: single segment
      segments.push({
        speakerLabel: "SPEAKER_1",
        start: 0,
        end: 0,
        transcript: transcription.text || "",
      });
    }

    return segments;
  } catch (err) {
    console.error("[Diarization] OpenAI Whisper failed:", err);
    throw new Error("Failed to diarize audio. Please ensure audio transcription is configured.");
  }
}

