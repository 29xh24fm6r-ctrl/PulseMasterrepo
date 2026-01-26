// lib/omega/confidence-ledger.ts
// Confidence Ledger: Track predictions vs outcomes for calibration

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ConfidenceEvent {
  userId: string;
  sessionId?: string;
  node: string;
  predictionType: "intent" | "draft" | "simulation" | "improvement" | "guardian";
  predictionId?: string;
  predictedConfidence: number;
  contextSnapshot?: Record<string, unknown>;
}

export interface ConfidenceOutcome {
  outcome: "success" | "partial" | "failure" | "modified" | "rejected" | "timeout";
  outcomeConfidence?: number;
  notes?: string;
}

export interface CalibrationBucket {
  bucket: string;
  avgPredicted: number;
  actualSuccessRate: number;
  calibrationGap: number;
  totalPredictions: number;
}

export interface EarnedAutonomyResult {
  level: number;
  reason: string;
  calibrationScore: number;
}

/**
 * Record a confidence prediction for later calibration analysis
 */
export async function recordConfidencePrediction(event: ConfidenceEvent): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("pulse_confidence_events")
      .insert({
        user_id: event.userId,
        session_id: event.sessionId,
        node: event.node,
        prediction_type: event.predictionType,
        prediction_id: event.predictionId,
        predicted_confidence: event.predictedConfidence,
        context_snapshot: event.contextSnapshot || {},
      })
      .select("id")
      .single();

    if (error) {
      console.error("[ConfidenceLedger] Failed to record prediction:", error);
      return null;
    }

    return data.id;
  } catch (err) {
    console.error("[ConfidenceLedger] Error recording prediction:", err);
    return null;
  }
}

/**
 * Record the outcome of a prediction for calibration
 */
export async function recordConfidenceOutcome(
  eventId: string,
  outcome: ConfidenceOutcome
): Promise<boolean> {
  try {
    // Get the original prediction
    const { data: event } = await supabase
      .from("pulse_confidence_events")
      .select("predicted_confidence")
      .eq("id", eventId)
      .single();

    if (!event) {
      console.error("[ConfidenceLedger] Event not found:", eventId);
      return false;
    }

    // Calculate confidence error
    const actualSuccess =
      outcome.outcome === "success" ? 1.0 : outcome.outcome === "partial" ? 0.5 : 0.0;
    const confidenceError = event.predicted_confidence - actualSuccess;

    const { error } = await supabase
      .from("pulse_confidence_events")
      .update({
        outcome: outcome.outcome,
        outcome_confidence: outcome.outcomeConfidence,
        outcome_notes: outcome.notes,
        outcome_recorded_at: new Date().toISOString(),
        confidence_error: confidenceError,
      })
      .eq("id", eventId);

    if (error) {
      console.error("[ConfidenceLedger] Failed to record outcome:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[ConfidenceLedger] Error recording outcome:", err);
    return false;
  }
}

/**
 * Get calibration data for a user/node
 */
export async function getCalibrationData(
  userId: string,
  node?: string
): Promise<CalibrationBucket[]> {
  try {
    let query = supabase
      .from("pulse_confidence_calibration")
      .select("*")
      .eq("user_id", userId);

    if (node) {
      query = query.eq("node", node);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[ConfidenceLedger] Failed to get calibration data:", error);
      return [];
    }

    return (data || []).map((row) => ({
      bucket: row.confidence_bucket,
      avgPredicted: row.avg_predicted,
      actualSuccessRate: row.actual_success_rate,
      calibrationGap: row.calibration_gap,
      totalPredictions: row.total_predictions,
    }));
  } catch (err) {
    console.error("[ConfidenceLedger] Error getting calibration data:", err);
    return [];
  }
}

/**
 * Get recommended confidence adjustment based on historical calibration
 */
export async function getConfidenceAdjustment(
  userId: string,
  node: string,
  rawConfidence: number
): Promise<number> {
  const calibration = await getCalibrationData(userId, node);

  if (calibration.length === 0) {
    // No history, return raw confidence
    return rawConfidence;
  }

  // Find the bucket this confidence falls into
  const bucket =
    rawConfidence < 0.5
      ? "low"
      : rawConfidence < 0.7
        ? "medium"
        : rawConfidence < 0.85
          ? "high"
          : "very_high";

  const bucketData = calibration.find((c) => c.bucket === bucket);

  if (!bucketData || bucketData.totalPredictions < 10) {
    // Not enough data for this bucket
    return rawConfidence;
  }

  // Adjust confidence based on historical calibration gap
  // If we're overconfident (gap > 0), reduce confidence
  // If we're underconfident (gap < 0), increase confidence
  const adjusted = rawConfidence - bucketData.calibrationGap;

  // Clamp to valid range
  return Math.max(0, Math.min(1, adjusted));
}

/**
 * Check if system has earned higher autonomy based on calibration
 */
export async function checkEarnedAutonomy(userId: string): Promise<EarnedAutonomyResult> {
  const calibration = await getCalibrationData(userId);

  if (calibration.length === 0) {
    return { level: 0, reason: "No prediction history", calibrationScore: 0 };
  }

  // Calculate overall calibration score
  const totalPredictions = calibration.reduce((sum, c) => sum + c.totalPredictions, 0);
  const weightedGap =
    calibration.reduce((sum, c) => sum + c.calibrationGap * c.totalPredictions, 0) /
    totalPredictions;

  const calibrationScore = 1 - Math.abs(weightedGap);

  // Determine autonomy level based on calibration and volume
  if (totalPredictions < 20) {
    return { level: 0, reason: "Insufficient history (< 20 predictions)", calibrationScore };
  }

  if (calibrationScore < 0.7) {
    return { level: 1, reason: "Calibration needs improvement", calibrationScore };
  }

  if (totalPredictions < 100 || calibrationScore < 0.85) {
    return { level: 2, reason: "Building trust", calibrationScore };
  }

  if (calibrationScore >= 0.9 && totalPredictions >= 200) {
    return { level: 3, reason: "Highly calibrated, earned full autonomy", calibrationScore };
  }

  return { level: 2, reason: "Good calibration, moderate autonomy", calibrationScore };
}

/**
 * Get confidence event by ID
 */
export async function getConfidenceEvent(eventId: string): Promise<{
  id: string;
  userId: string;
  node: string;
  predictedConfidence: number;
  outcome?: string;
} | null> {
  try {
    const { data, error } = await supabase
      .from("pulse_confidence_events")
      .select("id, user_id, node, predicted_confidence, outcome")
      .eq("id", eventId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      userId: data.user_id,
      node: data.node,
      predictedConfidence: data.predicted_confidence,
      outcome: data.outcome,
    };
  } catch {
    return null;
  }
}

/**
 * Get recent confidence events for a user
 */
export async function getRecentConfidenceEvents(
  userId: string,
  limit = 50
): Promise<
  {
    id: string;
    node: string;
    predictionType: string;
    predictedConfidence: number;
    outcome?: string;
    confidenceError?: number;
    createdAt: string;
  }[]
> {
  try {
    const { data, error } = await supabase
      .from("pulse_confidence_events")
      .select("id, node, prediction_type, predicted_confidence, outcome, confidence_error, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[ConfidenceLedger] Failed to get recent events:", error);
      return [];
    }

    return (data || []).map((row) => ({
      id: row.id,
      node: row.node,
      predictionType: row.prediction_type,
      predictedConfidence: row.predicted_confidence,
      outcome: row.outcome,
      confidenceError: row.confidence_error,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error("[ConfidenceLedger] Error getting recent events:", err);
    return [];
  }
}
