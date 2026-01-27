// omega-gate/confidence.ts
// Confidence gate — evaluates whether a call should proceed.
// Phase 1: deterministic scoring based on tool config + intent heuristics.
// Phase 2: will integrate OmegaConfidenceEngine with historical calibration.

import { getToolEntry } from "./allowlist.js";
import type { GateRequest } from "./validation.js";

export type ConfidenceVerdict = "allow" | "require_human" | "deny";

export interface ConfidenceResult {
  score: number;
  verdict: ConfidenceVerdict;
  reason: string;
}

/**
 * Evaluate confidence for a gate request.
 *
 * Phase 1 scoring rules:
 * - read/none/read_only tools: always 1.0 (allow)
 * - ephemeral tools: 0.9 (allow)
 * - draft tools: 0.8 (require_human if < 0.85)
 * - writes_required tools: 0.7 base (require_human unless boosted)
 *
 * Phase 2: real confidence engine with calibration data
 */
export function evaluateConfidence(request: GateRequest): ConfidenceResult {
  const entry = getToolEntry(request.tool);
  if (!entry) {
    return { score: 0, verdict: "deny", reason: "Tool not in allowlist" };
  }

  let score: number;
  let reason: string;

  switch (entry.effect) {
    case "none":
    case "read_only":
      score = 1.0;
      reason = "Read-only operation, no side effects";
      break;

    case "ephemeral":
      score = 0.9;
      reason = "Ephemeral simulation, no persistent effects";
      break;

    case "draft":
      score = 0.8;
      reason = "Creates draft for human review";
      break;

    case "writes_required":
      score = 0.7;
      reason = "Write operation requires elevated confidence";
      break;

    default:
      score = 0.5;
      reason = "Unknown effect type";
  }

  // Apply tool-specific minimum
  const minConfidence = entry.confidenceMin ?? 0;
  if (minConfidence > 0 && score < minConfidence) {
    return {
      score,
      verdict: "require_human",
      reason: `Score ${score} below tool minimum ${minConfidence}`,
    };
  }

  // Route by score
  const verdict = scoreToVerdict(score);

  return { score, verdict, reason };
}

function scoreToVerdict(score: number): ConfidenceVerdict {
  if (score < 0.6) return "deny";
  if (score < 0.85) return "require_human";
  return "allow";
}
