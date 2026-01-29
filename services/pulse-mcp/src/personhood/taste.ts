// personhood/taste.ts
// Taste memory & calibration signals.
//
// Explicit signals:
//   "Too verbose"        → density ↓
//   "Ask fewer questions" → question_rate ↓
//   "Be more decisive"   → decisiveness ↑
//   "That was perfect"   → snapshot preferences
//
// Implicit signals:
//   Fast approval        → format working
//   Slow approval        → needs refinement
//   Ignored question     → unnecessary
//   User edits response  → verbosity mismatch
//
// These feed the existing memory system.

import { getSupabase } from "../supabase.js";
import type { TastePreferences, TasteSignal, DEFAULT_PREFERENCES } from "./types.js";

// ============================================
// EXPLICIT FEEDBACK PARSING
// ============================================

const FEEDBACK_MAP: Array<{
  patterns: RegExp[];
  signal: Omit<TasteSignal, "signal_type" | "raw_feedback">;
}> = [
  {
    patterns: [/too verbose/i, /too (much|many) words/i, /shorter/i, /briefer/i],
    signal: { dimension: "verbosity", direction: "decrease" },
  },
  {
    patterns: [/more detail/i, /elaborate/i, /longer/i, /more words/i],
    signal: { dimension: "verbosity", direction: "increase" },
  },
  {
    patterns: [/fewer questions/i, /stop asking/i, /don't ask/i, /no questions/i],
    signal: { dimension: "question_rate", direction: "decrease" },
  },
  {
    patterns: [/more decisive/i, /just decide/i, /don't hedge/i, /be direct/i],
    signal: { dimension: "decisiveness", direction: "increase" },
  },
  {
    patterns: [/too dense/i, /too compact/i, /spread out/i, /more space/i],
    signal: { dimension: "density", direction: "decrease" },
  },
  {
    patterns: [/more compact/i, /denser/i, /pack it in/i],
    signal: { dimension: "density", direction: "increase" },
  },
];

/**
 * Parse explicit feedback text into taste signals.
 * Returns empty array if no feedback patterns match.
 */
export function parseFeedback(text: string): TasteSignal[] {
  const signals: TasteSignal[] = [];

  for (const { patterns, signal } of FEEDBACK_MAP) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        signals.push({
          signal_type: "explicit",
          ...signal,
          raw_feedback: text,
        });
        break; // Only match once per dimension
      }
    }
  }

  return signals;
}

// ============================================
// PREFERENCE ADJUSTMENT
// ============================================

type DimensionScale<T extends string> = T[];

const VERBOSITY_SCALE: DimensionScale<TastePreferences["verbosity"]> = [
  "terse",
  "moderate",
  "verbose",
];
const DENSITY_SCALE: DimensionScale<TastePreferences["density"]> = [
  "low",
  "medium",
  "high",
];
const QUESTION_SCALE: DimensionScale<TastePreferences["question_rate"]> = [
  "minimal",
  "normal",
  "frequent",
];
const DECISIVENESS_SCALE: DimensionScale<TastePreferences["decisiveness"]> =
  ["cautious", "balanced", "decisive"];

function adjustDimension<T extends string>(
  current: T,
  scale: T[],
  direction: "increase" | "decrease",
): T {
  const idx = scale.indexOf(current);
  if (idx === -1) return current;
  const newIdx =
    direction === "increase"
      ? Math.min(idx + 1, scale.length - 1)
      : Math.max(idx - 1, 0);
  return scale[newIdx];
}

/**
 * Apply a taste signal to preferences, returning updated preferences.
 * Pure function — does not persist.
 */
export function applySignal(
  prefs: TastePreferences,
  signal: TasteSignal,
): TastePreferences {
  const updated = { ...prefs };

  switch (signal.dimension) {
    case "verbosity":
      updated.verbosity = adjustDimension(
        updated.verbosity,
        VERBOSITY_SCALE,
        signal.direction,
      );
      break;
    case "density":
      updated.density = adjustDimension(
        updated.density,
        DENSITY_SCALE,
        signal.direction,
      );
      break;
    case "question_rate":
      updated.question_rate = adjustDimension(
        updated.question_rate,
        QUESTION_SCALE,
        signal.direction,
      );
      break;
    case "decisiveness":
      updated.decisiveness = adjustDimension(
        updated.decisiveness,
        DECISIVENESS_SCALE,
        signal.direction,
      );
      break;
  }

  return updated;
}

// ============================================
// PERSISTENCE (via pulse_memory_events)
// ============================================

/**
 * Record a taste signal to the memory system.
 * Non-blocking, never throws.
 */
export async function recordTasteSignal(
  userId: string,
  signal: TasteSignal,
): Promise<void> {
  try {
    await getSupabase().from("pulse_memory_events").insert({
      user_id: userId,
      content: `Taste: ${signal.dimension} ${signal.direction}${signal.raw_feedback ? ` ("${signal.raw_feedback}")` : ""}`,
      memory_type: "preference",
      source: "mcp",
      importance: 0.7,
      meta: {
        taste_signal: true,
        dimension: signal.dimension,
        direction: signal.direction,
        signal_type: signal.signal_type,
      },
    });
  } catch {
    // Never fail the response if memory write fails
  }
}

/**
 * Load persisted taste preferences for a user.
 * Reconstructs preferences from taste memory events.
 * Returns defaults if no history found.
 */
export async function loadPreferences(
  userId: string,
): Promise<TastePreferences> {
  const defaults: TastePreferences = {
    density: "medium",
    question_rate: "normal",
    decisiveness: "balanced",
    verbosity: "moderate",
  };

  try {
    const { data } = await getSupabase()
      .from("pulse_memory_events")
      .select("meta")
      .eq("user_id", userId)
      .eq("memory_type", "preference")
      .order("created_at", { ascending: true })
      .limit(50);

    if (!data || data.length === 0) return defaults;

    // Replay signals to reconstruct current preferences
    let prefs = { ...defaults };
    for (const row of data) {
      const meta = row.meta as Record<string, unknown> | null;
      if (!meta?.taste_signal) continue;

      const signal: TasteSignal = {
        signal_type: (meta.signal_type as "explicit" | "implicit") ?? "explicit",
        dimension: meta.dimension as keyof TastePreferences,
        direction: meta.direction as "increase" | "decrease",
      };

      prefs = applySignal(prefs, signal);
    }

    return prefs;
  } catch {
    return defaults;
  }
}
