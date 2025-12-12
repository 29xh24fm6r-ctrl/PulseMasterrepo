// Voice Analysis Module
// lib/coaches/voiceAnalysis.ts

import { llmJson } from "@/lib/llm/client";

export interface VoiceAnalysisResult {
  patterns: {
    interruptions: number;
    fillerWords: string[];
    averagePacing: "slow" | "normal" | "fast";
    pauses: number;
  };
  sentiment: {
    overall: "positive" | "neutral" | "negative";
    curve: Array<{
      timestamp: number;
      sentiment: "positive" | "neutral" | "negative";
      intensity: number; // 0-1
    }>;
  };
  negotiation: {
    powerShifts: Array<{
      timestamp: number;
      direction: "gained" | "lost";
      reason: string;
    }>;
    leverageMoments: string[];
  };
  emotionalTriggers: string[];
  coachingActions: string[];
  suggestedDrills: string[];
}

/**
 * Analyze transcribed conversation for coaching insights
 */
export async function analyzeVoiceConversation(
  transcript: string,
  segments?: Array<{ start: number; end: number; text: string }>
): Promise<VoiceAnalysisResult> {
  // Detect patterns
  const patterns = detectConversationPatterns(transcript);

  // Analyze sentiment
  const sentiment = await analyzeSentiment(transcript, segments);

  // Detect negotiation dynamics
  const negotiation = await detectNegotiationDynamics(transcript, segments);

  // Extract emotional triggers
  const emotionalTriggers = await extractEmotionalTriggers(transcript);

  // Generate coaching actions
  const coachingActions = await generateCoachingActions(
    patterns,
    sentiment,
    negotiation,
    emotionalTriggers
  );

  // Suggest drills
  const suggestedDrills = await suggestDrills(patterns, sentiment, negotiation);

  return {
    patterns,
    sentiment,
    negotiation,
    emotionalTriggers,
    coachingActions,
    suggestedDrills,
  };
}

/**
 * Detect conversation patterns
 */
function detectConversationPatterns(transcript: string): VoiceAnalysisResult["patterns"] {
  const fillerWords = ["um", "uh", "like", "you know", "so", "well"];
  const foundFillers: string[] = [];

  fillerWords.forEach((word) => {
    const regex = new RegExp(`\\b${word}\\b`, "gi");
    const matches = transcript.match(regex);
    if (matches && matches.length > 5) {
      foundFillers.push(word);
    }
  });

  // Estimate interruptions (look for abrupt topic changes or short responses)
  const sentences = transcript.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const interruptions = sentences.filter((s) => s.trim().length < 20).length;

  // Estimate pacing (words per sentence)
  const words = transcript.split(/\s+/).length;
  const avgWordsPerSentence = words / sentences.length;
  let pacing: "slow" | "normal" | "fast" = "normal";
  if (avgWordsPerSentence < 10) pacing = "fast";
  if (avgWordsPerSentence > 20) pacing = "slow";

  // Count pauses (periods, commas, ellipses)
  const pauses = (transcript.match(/[.,…]/g) || []).length;

  return {
    interruptions,
    fillerWords: foundFillers,
    averagePacing: pacing,
    pauses,
  };
}

/**
 * Analyze sentiment over time
 */
async function analyzeSentiment(
  transcript: string,
  segments?: Array<{ start: number; end: number; text: string }>
): Promise<VoiceAnalysisResult["sentiment"]> {
  const prompt = [
    "Analyze the sentiment of this conversation transcript:",
    "",
    transcript,
    "",
    "Return JSON:",
    "{",
    '  "overall": "positive" | "neutral" | "negative",',
    '  "curve": [',
    '    {"timestamp": 0, "sentiment": "positive|neutral|negative", "intensity": 0.0-1.0},',
    "    ...",
    "  ]",
    "}",
    "",
    "Create 5-10 sentiment points across the conversation timeline.",
  ].join("\n");

  try {
    const result = await llmJson({ prompt, model: "gpt-4o-mini" });
    return {
      overall: result.overall || "neutral",
      curve: result.curve || [],
    };
  } catch (error) {
    console.error("[VoiceAnalysis] Sentiment analysis error:", error);
    return {
      overall: "neutral",
      curve: [],
    };
  }
}

/**
 * Detect negotiation power dynamics
 */
async function detectNegotiationDynamics(
  transcript: string,
  segments?: Array<{ start: number; end: number; text: string }>
): Promise<VoiceAnalysisResult["negotiation"]> {
  const prompt = [
    "Analyze this conversation for negotiation power dynamics:",
    "",
    transcript,
    "",
    "Identify:",
    "1. Moments where power shifted (gained or lost)",
    "2. Leverage opportunities that were used or missed",
    "",
    "Return JSON:",
    "{",
    '  "powerShifts": [',
    '    {"timestamp": 0, "direction": "gained" | "lost", "reason": "explanation"},',
    "    ...",
    "  ],",
    '  "leverageMoments": ["moment 1", "moment 2", ...]',
    "}",
  ].join("\n");

  try {
    const result = await llmJson({ prompt, model: "gpt-4o-mini" });
    return {
      powerShifts: result.powerShifts || [],
      leverageMoments: result.leverageMoments || [],
    };
  } catch (error) {
    console.error("[VoiceAnalysis] Negotiation analysis error:", error);
    return {
      powerShifts: [],
      leverageMoments: [],
    };
  }
}

/**
 * Extract emotional triggers
 */
async function extractEmotionalTriggers(transcript: string): Promise<string[]> {
  const prompt = [
    "Identify emotional triggers or stress points in this conversation:",
    "",
    transcript,
    "",
    "Return JSON array of trigger descriptions:",
    '["trigger 1", "trigger 2", ...]',
  ].join("\n");

  try {
    const result = await llmJson({ prompt, model: "gpt-4o-mini" });
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("[VoiceAnalysis] Emotional trigger extraction error:", error);
    return [];
  }
}

/**
 * Generate coaching actions
 */
async function generateCoachingActions(
  patterns: VoiceAnalysisResult["patterns"],
  sentiment: VoiceAnalysisResult["sentiment"],
  negotiation: VoiceAnalysisResult["negotiation"],
  triggers: string[]
): Promise<string[]> {
  const prompt = [
    "Based on this conversation analysis, suggest 3-5 specific coaching actions:",
    "",
    `Patterns: ${JSON.stringify(patterns)}`,
    `Sentiment: ${sentiment.overall}`,
    `Power shifts: ${negotiation.powerShifts.length}`,
    `Triggers: ${triggers.join(", ")}`,
    "",
    "Return JSON array of actionable coaching suggestions:",
    '["action 1", "action 2", ...]',
  ].join("\n");

  try {
    const result = await llmJson({ prompt, model: "gpt-4o-mini" });
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("[VoiceAnalysis] Coaching actions error:", error);
    return [];
  }
}

/**
 * Suggest practice drills
 */
async function suggestDrills(
  patterns: VoiceAnalysisResult["patterns"],
  sentiment: VoiceAnalysisResult["sentiment"],
  negotiation: VoiceAnalysisResult["negotiation"]
): Promise<string[]> {
  const issues: string[] = [];
  if (patterns.fillerWords.length > 0) issues.push("filler words");
  if (patterns.interruptions > 5) issues.push("interruptions");
  if (sentiment.overall === "negative") issues.push("sentiment management");
  if (negotiation.powerShifts.some((s) => s.direction === "lost")) issues.push("maintaining leverage");

  if (issues.length === 0) {
    return ["Continue practicing to maintain current level"];
  }

  const prompt = [
    "Suggest 2-3 specific practice drills for these issues:",
    issues.join(", "),
    "",
    "Return JSON array:",
    '["drill 1", "drill 2", ...]',
  ].join("\n");

  try {
    const result = await llmJson({ prompt, model: "gpt-4o-mini" });
    return Array.isArray(result) ? result : [];
  } catch (error) {
    return ["Practice reducing filler words", "Work on maintaining composure under pressure"];
  }
}

