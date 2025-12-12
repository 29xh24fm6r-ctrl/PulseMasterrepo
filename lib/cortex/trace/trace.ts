// Pulse Cortex Trace System
// lib/cortex/trace/trace.ts

import { supabaseAdmin } from "@/lib/supabase";
import { PulseTraceEntry, TraceSource, TraceLevel } from "./types";

// In-memory store for UI speed (last 100 entries)
const inMemoryTrace: PulseTraceEntry[] = [];
const MAX_MEMORY_TRACE = 100;

/**
 * Log a trace entry
 */
export async function logTrace(
  userId: string,
  source: TraceSource,
  level: TraceLevel,
  message: string,
  data?: Record<string, any>,
  context?: PulseTraceEntry["context"]
): Promise<void> {
  try {
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();

    const dbUserId = userRow?.id || userId;

    const entry: PulseTraceEntry = {
      id: `trace_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      userId: dbUserId,
      timestamp: new Date().toISOString(),
      source,
      level,
      message,
      data,
      context,
    };

    // Add to in-memory store
    inMemoryTrace.push(entry);
    if (inMemoryTrace.length > MAX_MEMORY_TRACE) {
      inMemoryTrace.shift();
    }

    // Persist to database
    await supabaseAdmin.from("pulse_cortex_trace").insert({
      user_id: dbUserId,
      timestamp: entry.timestamp,
      source: entry.source,
      level: entry.level,
      message: entry.message,
      data: entry.data || {},
      context: entry.context || {},
    });
  } catch (err) {
    console.error("[Trace] Failed to log entry:", err);
    // Still add to in-memory store even if DB fails
  }
}

/**
 * Get trace entries for user
 */
export async function getTraceEntries(
  userId: string,
  options?: {
    limit?: number;
    source?: TraceSource;
    level?: TraceLevel;
    since?: string;
  }
): Promise<PulseTraceEntry[]> {
  try {
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();

    const dbUserId = userRow?.id || userId;

    const { limit = 100, source, level, since } = options || {};

    let query = supabaseAdmin
      .from("pulse_cortex_trace")
      .select("*")
      .eq("user_id", dbUserId)
      .order("timestamp", { ascending: false })
      .limit(limit);

    if (source) {
      query = query.eq("source", source);
    }

    if (level) {
      query = query.eq("level", level);
    }

    if (since) {
      query = query.gte("timestamp", since);
    }

    const { data } = await query;

    return (
      data?.map((row) => ({
        id: row.id,
        userId: row.user_id,
        timestamp: row.timestamp,
        source: row.source,
        level: row.level,
        message: row.message,
        data: row.data || {},
        context: row.context || {},
      })) || []
    );
  } catch (err) {
    console.error("[Trace] Failed to get entries:", err);
    // Fallback to in-memory store
    return inMemoryTrace
      .filter((e) => {
        if (options?.source && e.source !== options.source) return false;
        if (options?.level && e.level !== options.level) return false;
        if (options?.since && e.timestamp < options.since) return false;
        return true;
      })
      .slice(0, options?.limit || 100);
  }
}

/**
 * Get in-memory trace (for real-time UI)
 */
export function getInMemoryTrace(): PulseTraceEntry[] {
  return [...inMemoryTrace].reverse(); // Most recent first
}



