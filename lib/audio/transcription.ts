// Audio Transcription Module
// lib/audio/transcription.ts

// Supports multiple transcription providers with fallback chain

export interface TranscriptionResult {
  text: string;
  confidence: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
  provider: "deepgram" | "elevenlabs" | "webapi" | "fallback";
}

/**
 * Transcribe audio using best available provider
 */
export async function transcribeAudio(
  audioBuffer: Buffer | ArrayBuffer,
  options?: {
    language?: string;
    model?: string;
  }
): Promise<TranscriptionResult> {
  // Try Deepgram first
  try {
    if (process.env.DEEPGRAM_API_KEY) {
      return await transcribeWithDeepgram(audioBuffer, options);
    }
  } catch (error) {
    console.warn("[Transcription] Deepgram failed, trying ElevenLabs:", error);
  }

  // Try ElevenLabs
  try {
    if (process.env.ELEVENLABS_API_KEY) {
      return await transcribeWithElevenLabs(audioBuffer, options);
    }
  } catch (error) {
    console.warn("[Transcription] ElevenLabs failed, trying Web API:", error);
  }

  // Fallback to Web Speech API (browser only) or basic processing
  return await transcribeWithFallback(audioBuffer);
}

/**
 * Transcribe using Deepgram
 */
async function transcribeWithDeepgram(
  audioBuffer: Buffer | ArrayBuffer,
  options?: { language?: string; model?: string }
): Promise<TranscriptionResult> {
  const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
  if (!deepgramApiKey) {
    throw new Error("Deepgram API key not configured");
  }

  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: "audio/webm" });
  formData.append("audio", blob);

  const response = await fetch("https://api.deepgram.com/v1/listen", {
    method: "POST",
    headers: {
      Authorization: `Token ${deepgramApiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Deepgram API error: ${response.statusText}`);
  }

  const data = await response.json();
  const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";

  return {
    text: transcript,
    confidence: data.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0.8,
    segments: data.results?.channels?.[0]?.alternatives?.[0]?.words?.map((w: any) => ({
      start: w.start,
      end: w.end,
      text: w.word,
    })),
    provider: "deepgram",
  };
}

/**
 * Transcribe using ElevenLabs
 */
async function transcribeWithElevenLabs(
  audioBuffer: Buffer | ArrayBuffer,
  options?: { language?: string }
): Promise<TranscriptionResult> {
  const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
  if (!elevenLabsApiKey) {
    throw new Error("ElevenLabs API key not configured");
  }

  const formData = new FormData();
  const blob = new Blob([audioBuffer], { type: "audio/webm" });
  formData.append("audio", blob);

  const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: {
      "xi-api-key": elevenLabsApiKey,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    text: data.text || "",
    confidence: 0.75,
    provider: "elevenlabs",
  };
}

/**
 * Fallback transcription (placeholder - would use Web Speech API in browser)
 */
async function transcribeWithFallback(
  audioBuffer: Buffer | ArrayBuffer
): Promise<TranscriptionResult> {
  // In a real implementation, this would use Web Speech API in the browser
  // For server-side, this is a placeholder that indicates transcription is needed
  console.warn("[Transcription] Using fallback - transcription not available");
  return {
    text: "[Transcription unavailable - please configure Deepgram or ElevenLabs API key]",
    confidence: 0,
    provider: "fallback",
  };
}

