// Power Patterns Engine
// lib/patterns/engine.ts

import { supabaseAdmin } from "@/lib/supabase";
import { PatternType, PowerPattern, PatternSourceEvent } from "./types";

/**
 * Get time of day key from a date
 */
export function getTimeOfDayKey(date: Date): string {
  const hour = date.getHours();
  if (hour < 6) return "late_night";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

/**
 * Get weekday key from a date
 */
export function getWeekdayKey(date: Date): string {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[date.getDay()];
}

/**
 * Recompute power patterns for a user
 */
export async function recomputePowerPatternsForUser(userId: string, daysBack: number = 30): Promise<void> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  // 1. Load coaching turns (need to get via sessions first to get user_id)
  const { data: sessions } = await supabaseAdmin
    .from("coaching_sessions")
    .select("id")
    .eq("user_id", dbUserId);

  const sessionIds = (sessions || []).map((s) => s.id);

  let coachingTurns: any[] = [];
  if (sessionIds.length > 0) {
    const { data: turns } = await supabaseAdmin
      .from("coaching_turns")
      .select("*")
      .in("session_id", sessionIds)
      .gte("created_at", cutoffDate.toISOString())
      .order("created_at", { ascending: true });
    coachingTurns = turns || [];
  }

  // 2. Load voice switch events
  const { data: voiceEvents } = await supabaseAdmin
    .from("voice_switch_events")
    .select("*")
    .eq("user_id", dbUserId)
    .gte("created_at", cutoffDate.toISOString())
    .order("created_at", { ascending: true });

  // 3. Aggregate events by buckets
  const buckets: Record<string, PatternSourceEvent[]> = {};

  // Process coaching turns
  for (const turn of coachingTurns) {
    const timestamp = new Date(turn.created_at);
    const timeOfDay = getTimeOfDayKey(timestamp);
    const weekday = getWeekdayKey(timestamp);

    // Time of day bucket
    const timeKey = `time_of_day:${timeOfDay}`;
    if (!buckets[timeKey]) buckets[timeKey] = [];
    buckets[timeKey].push({
      timestamp: turn.created_at,
      coach_id: turn.session_id ? await getCoachIdFromSession(turn.session_id) : null,
      emotion: turn.emotion,
      context_tags: [],
    });

    // Weekday bucket
    const weekdayKey = `weekday:${weekday}`;
    if (!buckets[weekdayKey]) buckets[weekdayKey] = [];
    buckets[weekdayKey].push({
      timestamp: turn.created_at,
      coach_id: turn.session_id ? await getCoachIdFromSession(turn.session_id) : null,
      emotion: turn.emotion,
      context_tags: [],
    });

    // Coach bucket
    if (turn.session_id) {
      const coachId = await getCoachIdFromSession(turn.session_id);
      if (coachId) {
        const coachKey = `coach:${coachId}`;
        if (!buckets[coachKey]) buckets[coachKey] = [];
        buckets[coachKey].push({
          timestamp: turn.created_at,
          coach_id: coachId,
          emotion: turn.emotion,
          context_tags: [],
        });
      }
    }
  }

  // Process voice events
  for (const event of voiceEvents || []) {
    const timestamp = new Date(event.created_at);
    const timeOfDay = getTimeOfDayKey(timestamp);
    const weekday = getWeekdayKey(timestamp);

    // Time of day bucket
    const timeKey = `time_of_day:${timeOfDay}`;
    if (!buckets[timeKey]) buckets[timeKey] = [];
    buckets[timeKey].push({
      timestamp: event.created_at,
      coach_id: event.coach_id,
      emotion: event.primary_emotion,
      context_tags: [],
    });

    // Weekday bucket
    const weekdayKey = `weekday:${weekday}`;
    if (!buckets[weekdayKey]) buckets[weekdayKey] = [];
    buckets[weekdayKey].push({
      timestamp: event.created_at,
      coach_id: event.coach_id,
      emotion: event.primary_emotion,
      context_tags: [],
    });

    // Coach bucket
    if (event.coach_id) {
      const coachKey = `coach:${event.coach_id}`;
      if (!buckets[coachKey]) buckets[coachKey] = [];
      buckets[coachKey].push({
        timestamp: event.created_at,
        coach_id: event.coach_id,
        emotion: event.primary_emotion,
        context_tags: [],
      });
    }
  }

  // 4. Compute patterns for each bucket
  for (const [bucketKey, events] of Object.entries(buckets)) {
    if (events.length < 3) continue; // Need at least 3 samples

    const [patternType, key] = bucketKey.split(":", 2);
    const emotionCounts = new Map<string, number>();
    let totalEmotions = 0;

    for (const event of events) {
      if (event.emotion) {
        emotionCounts.set(event.emotion, (emotionCounts.get(event.emotion) || 0) + 1);
        totalEmotions++;
      }
    }

    if (totalEmotions === 0) continue;

    // Find dominant emotion
    let dominantEmotion: string | null = null;
    let maxCount = 0;
    for (const [emotion, count] of emotionCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominantEmotion = emotion;
      }
    }

    if (!dominantEmotion) continue;

    const emotionScore = maxCount / totalEmotions;
    const sampleSize = events.length;
    const confidence = Math.min(0.95, Math.sqrt(emotionScore) * Math.min(1, sampleSize / 20));

    // Upsert pattern
    await supabaseAdmin
      .from("power_patterns")
      .upsert(
        {
          user_id: dbUserId,
          pattern_type: patternType as PatternType,
          key: key,
          emotion_dominant: dominantEmotion,
          emotion_score: emotionScore,
          positive_behavior: [],
          negative_behavior: [],
          confidence: confidence,
          sample_size: sampleSize,
          last_seen_at: events[events.length - 1].timestamp,
        },
        {
          onConflict: "user_id,pattern_type,key",
        }
      );
  }
}

/**
 * Helper: Get coach ID from session ID
 */
async function getCoachIdFromSession(sessionId: string): Promise<string | null> {
  const { data: session } = await supabaseAdmin
    .from("coaching_sessions")
    .select("coach_id")
    .eq("id", sessionId)
    .single();

  return session?.coach_id || null;
}

/**
 * Get top power patterns for a user
 */
export async function getTopPowerPatterns(
  userId: string,
  limit: number = 10
): Promise<PowerPattern[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const { data: patterns } = await supabaseAdmin
    .from("power_patterns")
    .select("*")
    .eq("user_id", dbUserId)
    .order("confidence", { ascending: false })
    .order("sample_size", { ascending: false })
    .limit(limit);

  return (patterns || []) as PowerPattern[];
}

