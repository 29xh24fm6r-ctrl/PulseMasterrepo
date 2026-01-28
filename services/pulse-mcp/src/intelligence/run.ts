// intelligence/run.ts
// Main intelligence runner — orchestrates signal generation, intent inference, and scheduling.
// Called by POST /cron/intelligence (Cloud Scheduler OIDC).
// Never throws. Always returns structured IntelligenceResult.
// Logs observer event at the end.

import { getSupabase } from "../supabase.js";
import { writeSignal } from "./signalWriter.js";
import { inferIntents } from "./inferIntent.js";
import { scheduleIntents } from "./scheduler.js";
import type { GeneratedSignal, IntelligenceResult } from "./types.js";

// Signal generators
import { detectRepeatQuestions } from "./signals/repeatQuestion.js";
import { detectStalledTasks } from "./signals/stalledTask.js";
import { detectDeadlineRisks } from "./signals/deadlineRisk.js";
import { detectUnansweredThreads } from "./signals/unansweredThread.js";
import { detectSystemDegraded } from "./signals/systemDegraded.js";
import { detectUserOverload } from "./signals/userOverload.js";

const ALL_GENERATORS = [
  { name: "repeatQuestion", fn: detectRepeatQuestions },
  { name: "stalledTask", fn: detectStalledTasks },
  { name: "deadlineRisk", fn: detectDeadlineRisks },
  { name: "unansweredThread", fn: detectUnansweredThreads },
  { name: "systemDegraded", fn: detectSystemDegraded },
  { name: "userOverload", fn: detectUserOverload },
];

/**
 * Run the full intelligence pipeline for a user.
 * 1. Generate signals (all generators, parallel)
 * 2. Write deduped signals to pulse_signals
 * 3. Read back new unprocessed signals
 * 4. Infer intents
 * 5. Schedule proposals
 * 6. Log observer event
 *
 * Never throws. Errors are collected and returned.
 */
export async function runIntelligence(
  userId: string,
): Promise<IntelligenceResult> {
  const startMs = Date.now();
  const errors: string[] = [];
  let signalCount = 0;
  let intentCount = 0;
  let proposalCount = 0;

  // ============================================
  // STEP 1: Generate signals (parallel, fault-isolated)
  // ============================================
  const allSignals: GeneratedSignal[] = [];

  const generatorResults = await Promise.allSettled(
    ALL_GENERATORS.map(async ({ name, fn }) => {
      try {
        return await fn(userId);
      } catch (e: any) {
        errors.push(`generator(${name}): ${e?.message ?? "unknown"}`);
        return [];
      }
    }),
  );

  for (const result of generatorResults) {
    if (result.status === "fulfilled") {
      allSignals.push(...result.value);
    }
  }

  // ============================================
  // STEP 2: Write deduped signals
  // ============================================
  for (const signal of allSignals) {
    try {
      const id = await writeSignal(userId, signal);
      if (id) signalCount++;
    } catch (e: any) {
      errors.push(
        `writeSignal(${signal.signal_type}): ${e?.message ?? "unknown"}`,
      );
    }
  }

  // ============================================
  // STEP 3: Read back unprocessed intelligence signals
  // ============================================
  let storedSignals: Array<{
    id: string;
    signal_type: string;
    payload: Record<string, unknown>;
  }> = [];

  try {
    const { data } = await getSupabase()
      .from("pulse_signals")
      .select("id, signal_type, payload")
      .eq("user_id", userId)
      .eq("source", "intelligence")
      .eq("processed", false)
      .order("created_at", { ascending: false })
      .limit(100);

    storedSignals = (data ?? []) as typeof storedSignals;
  } catch (e: any) {
    errors.push(`read_signals: ${e?.message ?? "unknown"}`);
  }

  // ============================================
  // STEP 4: Infer intents (pure logic, no DB)
  // ============================================
  const intents = inferIntents(storedSignals);
  intentCount = intents.length;

  // ============================================
  // STEP 5: Schedule proposals
  // ============================================
  if (intents.length > 0) {
    try {
      const schedResult = await scheduleIntents(userId, intents);
      proposalCount = schedResult.proposals_created;
      errors.push(...schedResult.errors);
    } catch (e: any) {
      errors.push(`scheduler: ${e?.message ?? "unknown"}`);
    }
  }

  // ============================================
  // STEP 6: Mark processed signals
  // ============================================
  if (storedSignals.length > 0) {
    try {
      const signalIds = storedSignals.map((s) => s.id);
      await getSupabase()
        .from("pulse_signals")
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
        })
        .in("id", signalIds);
    } catch (e: any) {
      errors.push(`mark_processed: ${e?.message ?? "unknown"}`);
    }
  }

  // ============================================
  // STEP 7: Log observer event (non-blocking)
  // ============================================
  const durationMs = Date.now() - startMs;
  logIntelligenceRun(userId, {
    signals_generated: signalCount,
    intents_generated: intentCount,
    proposals_created: proposalCount,
    duration_ms: durationMs,
    errors,
  }).catch(() => {});

  return {
    ok: errors.length === 0,
    generated: {
      signals: signalCount,
      intents: intentCount,
      proposals: proposalCount,
    },
    errors,
  };
}

/**
 * Log an intelligence run to pulse_observer_events.
 * Non-blocking: errors are swallowed.
 */
async function logIntelligenceRun(
  userId: string,
  meta: {
    signals_generated: number;
    intents_generated: number;
    proposals_created: number;
    duration_ms: number;
    errors: string[];
  },
): Promise<void> {
  try {
    await getSupabase().from("pulse_observer_events").insert({
      user_id: userId,
      event_type: "intelligence_run",
      payload: {
        ...meta,
        timestamp: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
    });
  } catch {
    // Never fail the response if logging fails
  }
}
