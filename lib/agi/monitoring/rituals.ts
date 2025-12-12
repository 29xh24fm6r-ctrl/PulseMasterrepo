// Ritual Engine - Morning/Midday/Evening/Weekly AGI Rituals
// lib/agi/monitoring/rituals.ts

import { AGIUserProfile } from "../settings";
import { supabaseAdmin } from "@/lib/supabase";

export interface RitualConfig {
  enabled: boolean;
  time?: string; // HH:MM format
  dayOfWeek?: number; // 0-6 (Sunday = 0)
  focus?: string[];
}

export interface RitualState {
  morning?: RitualConfig;
  midday?: RitualConfig;
  evening?: RitualConfig;
  weekly?: RitualConfig;
}

const RITUAL_TOLERANCE_MINUTES = 15; // Window for ritual execution

/**
 * Resolve Clerk ID to database user ID
 */
async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

/**
 * Check if a ritual has already run recently (within tolerance window)
 */
async function hasRitualRunRecently(
  userId: string,
  ritualName: string,
  now: Date
): Promise<boolean> {
  const dbUserId = await resolveUserId(userId);
  const toleranceMs = RITUAL_TOLERANCE_MINUTES * 60 * 1000;
  const cutoffTime = new Date(now.getTime() - toleranceMs);

  try {
    const { count } = await supabaseAdmin
      .from("agi_runs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", dbUserId)
      .eq("trigger->>source", `ritual/${ritualName}`)
      .gte("started_at", cutoffTime.toISOString());

    return (count || 0) > 0;
  } catch {
    return false; // If check fails, allow run (fail open)
  }
}

/**
 * Parse time string (HH:MM) and compare with current time
 */
function isTimeWithinTolerance(now: Date, targetTime: string, toleranceMinutes: number = RITUAL_TOLERANCE_MINUTES): boolean {
  const [targetHour, targetMinute] = targetTime.split(":").map(Number);
  const targetDate = new Date(now);
  targetDate.setHours(targetHour, targetMinute, 0, 0);

  const diffMs = Math.abs(now.getTime() - targetDate.getTime());
  const diffMinutes = diffMs / (1000 * 60);

  return diffMinutes <= toleranceMinutes;
}

/**
 * Check if morning ritual should run
 */
export async function shouldRunMorningRitual(
  now: Date,
  profile: AGIUserProfile,
  userId: string
): Promise<boolean> {
  const rituals = profile.rituals as RitualState | undefined;
  const morning = rituals?.morning;

  if (!morning || !morning.enabled || !morning.time) {
    return false;
  }

  // Check if already run recently
  if (await hasRitualRunRecently(userId, "morning", now)) {
    return false;
  }

  // Check if time matches (morning rituals typically 6am-10am)
  const hour = now.getHours();
  if (hour < 6 || hour > 10) {
    return false;
  }

  return isTimeWithinTolerance(now, morning.time);
}

/**
 * Check if midday ritual should run
 */
export async function shouldRunMiddayRitual(
  now: Date,
  profile: AGIUserProfile,
  userId: string
): Promise<boolean> {
  const rituals = profile.rituals as RitualState | undefined;
  const midday = rituals?.midday;

  if (!midday || !midday.enabled || !midday.time) {
    return false;
  }

  // Check if already run recently
  if (await hasRitualRunRecently(userId, "midday", now)) {
    return false;
  }

  // Check if time matches (midday rituals typically 11am-2pm)
  const hour = now.getHours();
  if (hour < 11 || hour > 14) {
    return false;
  }

  return isTimeWithinTolerance(now, midday.time);
}

/**
 * Check if evening ritual should run
 */
export async function shouldRunEveningRitual(
  now: Date,
  profile: AGIUserProfile,
  userId: string
): Promise<boolean> {
  const rituals = profile.rituals as RitualState | undefined;
  const evening = rituals?.evening;

  if (!evening || !evening.enabled || !evening.time) {
    return false;
  }

  // Check if already run recently
  if (await hasRitualRunRecently(userId, "evening", now)) {
    return false;
  }

  // Check if time matches (evening rituals typically 5pm-9pm)
  const hour = now.getHours();
  if (hour < 17 || hour > 21) {
    return false;
  }

  return isTimeWithinTolerance(now, evening.time);
}

/**
 * Check if weekly ritual should run
 */
export async function shouldRunWeeklyRitual(
  now: Date,
  profile: AGIUserProfile,
  userId: string
): Promise<boolean> {
  const rituals = profile.rituals as RitualState | undefined;
  const weekly = rituals?.weekly;

  if (!weekly || !weekly.enabled || !weekly.time) {
    return false;
  }

  // Check if already run recently (within last 24 hours)
  const dbUserId = await resolveUserId(userId);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  try {
    const { count } = await supabaseAdmin
      .from("agi_runs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", dbUserId)
      .eq("trigger->>source", "ritual/weekly")
      .gte("started_at", oneDayAgo.toISOString());

    if ((count || 0) > 0) {
      return false; // Already ran this week
    }
  } catch {
    // If check fails, continue
  }

  // Check day of week match
  if (weekly.dayOfWeek !== undefined && now.getDay() !== weekly.dayOfWeek) {
    return false;
  }

  // Check time match
  return isTimeWithinTolerance(now, weekly.time);
}



