// proactive/index.ts
// Phase 3 & 4: Ambient awareness and trigger detection
// SAFE: Read-only detection, no autonomous actions

import { getSupabase } from "../supabase.js";

// ============================================
// PHASE 3: CALENDAR INGEST STUB
// Detects upcoming commitments and stores as signals
// ============================================

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time?: string;
  description?: string;
}

/**
 * Process calendar events and emit signals for upcoming commitments.
 * This is a STUB - actual calendar integration comes later.
 * For now, we just provide the interface and logging.
 */
export async function ingestCalendarEvents(
  userId: string,
  events: CalendarEvent[]
): Promise<{ signalsCreated: number }> {
  const supabase = getSupabase();
  let signalsCreated = 0;

  for (const event of events) {
    try {
      // Check if we already have a signal for this event
      const { data: existing } = await supabase
        .from("pulse_signals")
        .select("id")
        .eq("user_id", userId)
        .eq("source_id", event.id)
        .eq("signal_type", "upcoming_commitment")
        .maybeSingle();

      if (existing) continue; // Skip if already ingested

      // Create signal for upcoming commitment
      const { error } = await supabase.from("pulse_signals").insert({
        user_id: userId,
        signal_type: "upcoming_commitment",
        source: "calendar",
        source_id: event.id,
        payload: {
          title: event.title,
          start_time: event.start_time,
          end_time: event.end_time,
          description: event.description,
          importance_guess: guessImportance(event),
        },
        created_at: new Date().toISOString(),
      });

      if (!error) signalsCreated++;
    } catch (e) {
      console.warn("[pulse-mcp] calendar ingest error", { event: event.id, error: e });
    }
  }

  console.log("[pulse-mcp] calendar ingest complete", { userId, signalsCreated });
  return { signalsCreated };
}

/**
 * Guess importance based on event properties (naive heuristic)
 */
function guessImportance(event: CalendarEvent): number {
  const title = (event.title || "").toLowerCase();

  // High importance keywords
  if (/\b(urgent|important|deadline|interview|meeting with|presentation)\b/.test(title)) {
    return 0.9;
  }

  // Medium importance
  if (/\b(call|meeting|review|sync)\b/.test(title)) {
    return 0.6;
  }

  // Low importance
  return 0.3;
}

// ============================================
// PHASE 4: TRIGGER EVALUATOR
// Detects nudge-worthy situations, emits observer events
// NO automatic actions - just detection
// ============================================

interface TriggerEvaluationResult {
  triggersDetected: number;
  candidatesCreated: number;
}

/**
 * Evaluate triggers for a user. Called on /tick.
 * Checks for situations that might warrant a nudge.
 * SAFE: Only creates observer events and trigger candidates.
 */
export async function evaluateTriggers(userId: string): Promise<TriggerEvaluationResult> {
  const supabase = getSupabase();
  let triggersDetected = 0;
  let candidatesCreated = 0;

  try {
    // Get upcoming commitments in next 48 hours
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const { data: upcomingSignals } = await supabase
      .from("pulse_signals")
      .select("*")
      .eq("user_id", userId)
      .eq("signal_type", "upcoming_commitment")
      .gte("payload->>start_time", now.toISOString())
      .lte("payload->>start_time", in48h.toISOString())
      .limit(20);

    if (!upcomingSignals || upcomingSignals.length === 0) {
      return { triggersDetected: 0, candidatesCreated: 0 };
    }

    // Check each upcoming commitment for preparation status
    for (const signal of upcomingSignals) {
      const payload = signal.payload as any;
      const title = payload?.title || "Unknown event";
      const startTime = payload?.start_time;

      // Check if there's already a trigger candidate for this
      const { data: existingTrigger } = await supabase
        .from("pulse_trigger_candidates")
        .select("id")
        .eq("user_id", userId)
        .eq("source_event_id", signal.id)
        .eq("status", "pending")
        .maybeSingle();

      if (existingTrigger) continue; // Already detected

      // Check if there's a preparation signal
      const { data: prepSignals } = await supabase
        .from("pulse_signals")
        .select("id")
        .eq("user_id", userId)
        .eq("signal_type", "preparation")
        .eq("related_event_id", signal.id)
        .limit(1);

      const hasPreparation = prepSignals && prepSignals.length > 0;

      if (!hasPreparation && payload?.importance_guess > 0.5) {
        triggersDetected++;

        // Create trigger candidate (NOT an action - just a candidate for review)
        const { error: insertError } = await supabase
          .from("pulse_trigger_candidates")
          .insert({
            user_id: userId,
            trigger_type: "upcoming_commitment",
            message: `Upcoming: "${title}" at ${startTime} - no preparation detected`,
            source_event_id: signal.id,
            source_type: "signal",
            status: "pending",
            detected_at: new Date().toISOString(),
            meta: {
              event_title: title,
              start_time: startTime,
              importance: payload?.importance_guess,
            },
          });

        if (!insertError) candidatesCreated++;

        // Also emit an observer event for visibility
        await supabase.from("pulse_observer_events").insert({
          user_id: userId,
          event_type: "nudge_candidate",
          payload: {
            trigger_type: "upcoming_commitment",
            message: `Upcoming commitment with no prep: "${title}"`,
            event_id: signal.id,
          },
          created_at: new Date().toISOString(),
        });
      }
    }

    console.log("[pulse-mcp] trigger evaluation complete", {
      userId,
      triggersDetected,
      candidatesCreated,
    });
  } catch (e) {
    console.warn("[pulse-mcp] trigger evaluation error", { userId, error: e });
  }

  return { triggersDetected, candidatesCreated };
}

/**
 * Run all proactive evaluations for a user.
 * Called from /tick endpoint.
 */
export async function runProactiveEvaluation(userId: string): Promise<{
  triggers: TriggerEvaluationResult;
}> {
  const triggers = await evaluateTriggers(userId);

  return { triggers };
}
