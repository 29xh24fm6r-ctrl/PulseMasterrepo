// tools/persona_calibrate.ts
// MCP tool: persona.calibrate
// Records explicit taste feedback and returns updated preferences.
// Feeds the existing memory system via pulse_memory_events.
// Canon: never throw, return structured status.

import { z } from "zod";
import {
  parseFeedback,
  recordTasteSignal,
  loadPreferences,
  applySignal,
} from "../personhood/index.js";
import type { TastePreferences } from "../personhood/types.js";

const inputSchema = z.object({
  target_user_id: z.string().min(10),
  feedback: z.string().min(1),
});

export async function personaCalibrate(input: unknown): Promise<{
  ok: boolean;
  signals_detected: number;
  preferences_updated: string[];
  current_preferences?: TastePreferences;
  error?: string;
}> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      signals_detected: 0,
      preferences_updated: [],
      error: parsed.error.message,
    };
  }

  const { target_user_id, feedback } = parsed.data;

  try {
    // Parse feedback into taste signals
    const signals = parseFeedback(feedback);

    if (signals.length === 0) {
      // No recognized feedback patterns — record as general preference memory
      await recordTasteSignal(target_user_id, {
        signal_type: "explicit",
        dimension: "verbosity", // default bucket
        direction: "decrease", // conservative default
        raw_feedback: feedback,
      });

      const prefs = await loadPreferences(target_user_id);

      return {
        ok: true,
        signals_detected: 0,
        preferences_updated: [],
        current_preferences: prefs,
      };
    }

    // Record each signal and track which dimensions were updated
    const updatedDimensions: string[] = [];

    for (const signal of signals) {
      await recordTasteSignal(target_user_id, signal);
      if (!updatedDimensions.includes(signal.dimension)) {
        updatedDimensions.push(signal.dimension);
      }
    }

    // Load the resulting preferences
    const prefs = await loadPreferences(target_user_id);

    return {
      ok: true,
      signals_detected: signals.length,
      preferences_updated: updatedDimensions,
      current_preferences: prefs,
    };
  } catch (e: any) {
    return {
      ok: false,
      signals_detected: 0,
      preferences_updated: [],
      error: e?.message ?? "Unknown error calibrating preferences",
    };
  }
}
