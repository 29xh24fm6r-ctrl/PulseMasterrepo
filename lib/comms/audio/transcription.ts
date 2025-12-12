// Audio Transcription
// lib/comms/audio/transcription.ts

/**
 * Transcribe audio using available providers
 */
export async function transcribeAudio(audioUrl: string): Promise<string> {
  // Try OpenAI Whisper first (if available)
  try {
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Download audio file
    const audioResponse = await fetch(audioUrl);
    const audioBlob = await audioResponse.blob();
    const audioFile = new File([audioBlob], "audio.mp3", { type: "audio/mpeg" });

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
      language: "en",
    });

    return transcription.text;
  } catch (err) {
    console.warn("[AudioTranscription] OpenAI Whisper failed, trying fallback:", err);
  }

  // Fallback: Try Deepgram (if available)
  try {
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (deepgramApiKey) {
      const response = await fetch("https://api.deepgram.com/v1/listen", {
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
      if (data.results?.channels?.[0]?.alternatives?.[0]?.transcript) {
        return data.results.channels[0].alternatives[0].transcript;
      }
    }
  } catch (err) {
    console.warn("[AudioTranscription] Deepgram failed:", err);
  }

  // Fallback: Try ElevenLabs (if available)
  try {
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (elevenLabsApiKey) {
      // ElevenLabs doesn't have transcription, but we can try their API
      // For now, return placeholder
      throw new Error("ElevenLabs transcription not available");
    }
  } catch (err) {
    // Continue to final fallback
  }

  // Final fallback: Return placeholder (user should upload transcript manually)
  throw new Error(
    "Audio transcription failed. Please provide a transcript manually or configure OpenAI/Deepgram API keys."
  );
}

/**
 * Transcribe audio with speaker diarization (if supported)
 */
export async function transcribeAudioWithSpeakers(audioUrl: string): Promise<{
  transcript: string;
  segments: Array<{
    speaker: string;
    text: string;
    start: number;
    end: number;
  }>;
}> {
  // For now, use basic transcription and return single speaker
  const transcript = await transcribeAudio(audioUrl);
  return {
    transcript,
    segments: [
      {
        speaker: "Speaker 1",
        text: transcript,
        start: 0,
        end: transcript.length,
      },
    ],
  };
}

