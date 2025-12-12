// Voice Transformation Layer - Transforms LLM output to match voice persona
// lib/voices/transform.ts

import { VoiceStyle } from "./seed";

export interface TransformContext {
  originalText: string;
  voiceStyle: VoiceStyle;
  targetLength?: "short" | "medium" | "long";
}

/**
 * Transform text to match voice persona style
 * This is a lightweight transformation, not a full LLM re-prompt
 */
export function transformTextForVoice(
  context: TransformContext
): string {
  const { originalText, voiceStyle } = context;

  let transformed = originalText;

  // 1. Adjust sentence length
  if (voiceStyle.sentence_length === "short") {
    // Break long sentences into shorter ones
    transformed = transformed.replace(/\. /g, ".\n\n");
    transformed = transformed.replace(/, /g, ".\n");
  } else if (voiceStyle.sentence_length === "long") {
    // Combine short sentences where appropriate
    transformed = transformed.replace(/\.\n\n/g, ", ");
  }

  // 2. Add signature phrases (occasionally)
  if (voiceStyle.phrasing_patterns.length > 0 && Math.random() < 0.3) {
    const phrase = voiceStyle.phrasing_patterns[
      Math.floor(Math.random() * voiceStyle.phrasing_patterns.length)
    ];
    // Add at the beginning or end occasionally
    if (Math.random() < 0.5) {
      transformed = `${phrase}. ${transformed}`;
    } else {
      transformed = `${transformed} ${phrase}.`;
    }
  }

  // 3. Adjust warmth markers
  if (voiceStyle.warmth > 70) {
    // Add warm connectors
    transformed = transformed.replace(/\. /g, (match, offset) => {
      if (Math.random() < 0.2) {
        return ". I understand. ";
      }
      return match;
    });
  }

  // 4. Adjust energy markers
  if (voiceStyle.energy > 80) {
    // Add energetic punctuation
    transformed = transformed.replace(/\./g, (match, offset) => {
      if (offset < transformed.length - 10 && Math.random() < 0.1) {
        return "!";
      }
      return match;
    });
  }

  // 5. Adjust decisiveness
  if (voiceStyle.decisiveness > 80) {
    // Make statements more direct
    transformed = transformed.replace(/I think /gi, "");
    transformed = transformed.replace(/maybe /gi, "");
    transformed = transformed.replace(/perhaps /gi, "");
  }

  // 6. Add pauses for slow pacing
  if (voiceStyle.pacing === "slow") {
    transformed = transformed.replace(/\. /g, "... ");
  }

  return transformed.trim();
}

/**
 * Get voice parameters for TTS
 */
export function getVoiceParameters(voiceStyle: VoiceStyle): {
  speed: number;
  energy: number;
  warmth: number;
} {
  return {
    speed: voiceStyle.pacing === "fast" ? 1.1 : voiceStyle.pacing === "slow" ? 0.9 : 1.0,
    energy: voiceStyle.energy / 100,
    warmth: voiceStyle.warmth / 100,
  };
}




