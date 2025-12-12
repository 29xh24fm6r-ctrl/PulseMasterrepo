// Pulse Physiology Engine
// lib/physiology/engine.ts

import { supabaseAdmin } from "@/lib/supabase";
import { PhysiologySignal, PhysiologyState, PhysiologyInsight } from "./types";

/**
 * Process physiology signals and generate state
 */
export async function processPhysiologySignals(
  userId: string,
  signals: PhysiologySignal[]
): Promise<PhysiologyState> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  // Aggregate signals
  const heartRate = signals.find((s) => s.type === "heart_rate")?.value;
  const hrv = signals.find((s) => s.type === "hrv")?.value;
  const sleepQuality = signals.find((s) => s.type === "sleep_cycle")?.value;
  const respirationRate = signals.find((s) => s.type === "respiration")?.value;
  const pupilDilation = signals.find((s) => s.type === "pupil_dilation")?.value;
  const facialExpression = signals.find((s) => s.type === "facial_expression")?.metadata as
    | PhysiologyState["facialExpression"]
    | undefined;
  const speechEnergy = signals.find((s) => s.type === "speech_energy")?.value;
  const speechCadence = signals.find((s) => s.type === "speech_cadence")?.value;

  // Calculate derived scores
  const stressScore = calculateStressScore(heartRate, hrv, respirationRate, pupilDilation);
  const cognitiveLoadScore = calculateCognitiveLoadScore(
    pupilDilation,
    speechEnergy,
    speechCadence
  );
  const emotionalDrift = calculateEmotionalDrift(facialExpression, signals);
  const burnoutIndex = calculateBurnoutIndex(stressScore, sleepQuality, heartRate, hrv);
  const readinessScore = calculateReadinessScore(
    stressScore,
    sleepQuality,
    cognitiveLoadScore,
    heartRate
  );

  // Calculate confidence based on signal count and quality
  const confidence = Math.min(1, signals.length / 5); // More signals = higher confidence

  return {
    userId: dbUserId,
    timestamp: new Date().toISOString(),
    heartRate,
    hrv,
    sleepQuality,
    respirationRate,
    pupilDilation,
    facialExpression,
    speechEnergy,
    speechCadence,
    stressScore,
    cognitiveLoadScore,
    emotionalDrift,
    burnoutIndex,
    readinessScore,
    signalCount: signals.length,
    confidence,
  };
}

/**
 * Calculate stress score from physiological signals
 */
function calculateStressScore(
  heartRate?: number,
  hrv?: number,
  respirationRate?: number,
  pupilDilation?: number
): number {
  let score = 0.5; // Default

  // Heart rate (normal: 60-100, stressed: >100)
  if (heartRate) {
    if (heartRate > 100) {
      score += 0.3;
    } else if (heartRate > 80) {
      score += 0.1;
    }
  }

  // HRV (lower = more stressed)
  if (hrv) {
    if (hrv < 30) {
      score += 0.3;
    } else if (hrv < 50) {
      score += 0.1;
    }
  }

  // Respiration (faster = more stressed)
  if (respirationRate) {
    if (respirationRate > 20) {
      score += 0.2;
    }
  }

  // Pupil dilation (larger = more stressed)
  if (pupilDilation) {
    score += pupilDilation * 0.2;
  }

  return Math.min(1, score);
}

/**
 * Calculate cognitive load score
 */
function calculateCognitiveLoadScore(
  pupilDilation?: number,
  speechEnergy?: number,
  speechCadence?: number
): number {
  let score = 0.5;

  // Pupil dilation (larger = higher cognitive load)
  if (pupilDilation) {
    score += pupilDilation * 0.4;
  }

  // Speech energy (lower = higher cognitive load, brain is focused)
  if (speechEnergy !== undefined) {
    score += (1 - speechEnergy) * 0.3;
  }

  // Speech cadence (slower = higher cognitive load)
  if (speechCadence) {
    if (speechCadence < 120) {
      score += 0.3;
    }
  }

  return Math.min(1, score);
}

/**
 * Calculate emotional drift
 */
function calculateEmotionalDrift(
  facialExpression?: PhysiologyState["facialExpression"],
  signals: PhysiologySignal[] = []
): number {
  if (!facialExpression) return 0;

  // Check for micro-expressions indicating emotional shift
  const microExpressions = facialExpression.microExpressions || [];
  const shiftIndicators = microExpressions.filter((expr) =>
    ["conflict", "uncertainty", "suppression"].includes(expr)
  );

  return Math.min(1, shiftIndicators.length * 0.3);
}

/**
 * Calculate burnout index
 */
function calculateBurnoutIndex(
  stressScore: number,
  sleepQuality?: number,
  heartRate?: number,
  hrv?: number
): number {
  let index = stressScore * 0.5;

  // Poor sleep quality increases burnout risk
  if (sleepQuality !== undefined) {
    index += (1 - sleepQuality) * 0.3;
  }

  // Elevated heart rate + low HRV = burnout risk
  if (heartRate && hrv) {
    if (heartRate > 90 && hrv < 40) {
      index += 0.2;
    }
  }

  return Math.min(1, index);
}

/**
 * Calculate readiness score
 */
function calculateReadinessScore(
  stressScore: number,
  sleepQuality?: number,
  cognitiveLoadScore?: number,
  heartRate?: number
): number {
  let score = 1.0;

  // High stress reduces readiness
  score -= stressScore * 0.4;

  // Poor sleep reduces readiness
  if (sleepQuality !== undefined) {
    score -= (1 - sleepQuality) * 0.3;
  }

  // Very high cognitive load reduces readiness
  if (cognitiveLoadScore && cognitiveLoadScore > 0.8) {
    score -= 0.2;
  }

  // Optimal heart rate for readiness (60-80 BPM)
  if (heartRate) {
    if (heartRate < 60 || heartRate > 100) {
      score -= 0.1;
    }
  }

  return Math.max(0, Math.min(1, score));
}

/**
 * Generate physiology insights
 */
export function generatePhysiologyInsights(
  state: PhysiologyState
): PhysiologyInsight[] {
  const insights: PhysiologyInsight[] = [];

  // Stress alert
  if (state.stressScore > 0.7) {
    insights.push({
      type: "stress_alert",
      severity: state.stressScore > 0.85 ? "high" : "medium",
      description: `High stress detected (${Math.round(state.stressScore * 100)}%)`,
      recommendation: "Take a break, practice deep breathing, or step away from current task",
      confidence: state.confidence,
    });
  }

  // Cognitive overload
  if (state.cognitiveLoadScore > 0.8) {
    insights.push({
      type: "cognitive_overload",
      severity: "high",
      description: `Cognitive load is very high (${Math.round(state.cognitiveLoadScore * 100)}%)`,
      recommendation: "Reduce task complexity, take a mental break, or simplify your focus",
      confidence: state.confidence,
    });
  }

  // Burnout risk
  if (state.burnoutIndex > 0.6) {
    insights.push({
      type: "burnout_risk",
      severity: state.burnoutIndex > 0.75 ? "high" : "medium",
      description: `Burnout risk detected (${Math.round(state.burnoutIndex * 100)}%)`,
      recommendation: "Prioritize rest, reduce workload, and focus on recovery",
      confidence: state.confidence,
    });
  }

  // Readiness peak
  if (state.readinessScore > 0.8) {
    insights.push({
      type: "readiness_peak",
      severity: "low",
      description: `High readiness detected (${Math.round(state.readinessScore * 100)}%)`,
      recommendation: "This is an optimal time for high-performance work or important decisions",
      confidence: state.confidence,
    });
  }

  // Emotional shift
  if (state.emotionalDrift > 0.5) {
    insights.push({
      type: "emotional_shift",
      severity: "medium",
      description: "Emotional state is shifting",
      recommendation: "Take a moment to check in with yourself and process what's happening",
      confidence: state.confidence,
    });
  }

  // Recovery needed
  if (state.stressScore > 0.6 && state.sleepQuality !== undefined && state.sleepQuality < 0.5) {
    insights.push({
      type: "recovery_needed",
      severity: "high",
      description: "Recovery is needed - stress is high and sleep quality is low",
      recommendation: "Prioritize rest, reduce commitments, and focus on recovery activities",
      confidence: state.confidence,
    });
  }

  // Flow state detected
  if (
    state.cognitiveLoadScore > 0.6 &&
    state.cognitiveLoadScore < 0.8 &&
    state.stressScore < 0.4 &&
    state.readinessScore > 0.7
  ) {
    insights.push({
      type: "flow_state_detected",
      severity: "low",
      description: "Flow state detected - optimal performance window",
      recommendation: "Maintain focus and continue current activity - you're in the zone",
      confidence: state.confidence,
    });
  }

  return insights;
}



