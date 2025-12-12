// Speaker Embeddings
// lib/voice/diarization/embeddings.ts

import { SpeakerEmbedding } from "./types";

/**
 * Generate speaker embedding from transcript segment
 * Uses OpenAI text-embedding-3-small (768 dimensions)
 */
export async function generateSpeakerEmbedding(transcript: string): Promise<number[]> {
  try {
    const { default: OpenAI } = await import("openai");
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: transcript.substring(0, 8000), // Limit length
      dimensions: 768,
    });

    return response.data[0].embedding;
  } catch (err) {
    console.error("[SpeakerEmbedding] Failed:", err);
    // Return zero vector as fallback
    return new Array(768).fill(0);
  }
}

/**
 * Generate embeddings for multiple segments
 */
export async function generateSpeakerEmbeddings(
  segments: Array<{ transcript: string }>
): Promise<SpeakerEmbedding[]> {
  const embeddings: SpeakerEmbedding[] = [];

  for (const segment of segments) {
    const embedding = await generateSpeakerEmbedding(segment.transcript);
    embeddings.push({
      embedding,
      transcript: segment.transcript,
    });
  }

  return embeddings;
}

