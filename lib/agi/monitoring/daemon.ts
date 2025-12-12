// AGI Monitoring Daemon - Scheduled & Event-Based AGI Runs
// lib/agi/monitoring/daemon.ts

import { handleAGIEvent } from "../orchestrator";
import { scheduleTickTrigger, AGITriggerContext } from "../triggers";
import { getAGIUserProfile } from "../settings";
import { supabaseAdmin } from "@/lib/supabase";
import {
  shouldRunMorningRitual,
  shouldRunMiddayRitual,
  shouldRunEveningRitual,
  shouldRunWeeklyRitual,
} from "./rituals";

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
 * Get user AGI settings (helper function)
 */
async function getUserAGISettings(userId: string): Promise<{
  level: "off" | "assist" | "autopilot";
  max_runs_per_day: number;
} | null> {
  const dbUserId = await resolveUserId(userId);

  try {
    const { data } = await supabaseAdmin
      .from("user_agi_settings")
      .select("level, max_runs_per_day")
      .eq("user_id", dbUserId)
      .maybeSingle();

    if (!data) {
      return {
        level: "assist",
        max_runs_per_day: 12,
      };
    }

    return {
      level: (data.level as "off" | "assist" | "autopilot") || "assist",
      max_runs_per_day: data.max_runs_per_day || 12,
    };
  } catch {
    return {
      level: "assist",
      max_runs_per_day: 12,
    };
  }
}

/**
 * Run scheduled AGI checks for a user
 */
export async function runScheduledAGIChecksForUser(userId: string, now: Date): Promise<void> {
  const profile = await getAGIUserProfile(userId);
  const settings = await getUserAGISettings(userId);

  if (!settings || settings.level === "off") {
    return; // AGI disabled for this user
  }

  const rituals = profile.rituals || {};

  // Check morning ritual
  if (await shouldRunMorningRitual(now, profile, userId)) {
    try {
      await handleAGIEvent(userId, {
        type: "schedule_tick",
        source: "ritual/morning",
        payload: { ritual: "morning", focus: rituals.morning?.focus || [] },
      });
    } catch (err: any) {
      console.error(`[AGI Monitoring] Morning ritual failed for user ${userId}:`, err.message);
    }
  }

  // Check midday ritual
  if (await shouldRunMiddayRitual(now, profile, userId)) {
    try {
      await handleAGIEvent(userId, {
        type: "schedule_tick",
        source: "ritual/midday",
        payload: { ritual: "midday", focus: rituals.midday?.focus || [] },
      });
    } catch (err: any) {
      console.error(`[AGI Monitoring] Midday ritual failed for user ${userId}:`, err.message);
    }
  }

  // Check evening ritual
  if (await shouldRunEveningRitual(now, profile, userId)) {
    try {
      await handleAGIEvent(userId, {
        type: "schedule_tick",
        source: "ritual/evening",
        payload: { ritual: "evening", focus: rituals.evening?.focus || [] },
      });
    } catch (err: any) {
      console.error(`[AGI Monitoring] Evening ritual failed for user ${userId}:`, err.message);
    }
  }

  // Check weekly ritual
  if (await shouldRunWeeklyRitual(now, profile, userId)) {
    try {
      await handleAGIEvent(userId, {
        type: "schedule_tick",
        source: "ritual/weekly",
        payload: { ritual: "weekly", focus: rituals.weekly?.focus || [] },
      });
    } catch (err: any) {
      console.error(`[AGI Monitoring] Weekly ritual failed for user ${userId}:`, err.message);
    }
  }
}

/**
 * Trigger event-driven AGI run
 */
export async function triggerEventDrivenAGI(
  userId: string,
  trigger: AGITriggerContext
): Promise<any> {
  // Simple passthrough - Orchestrator already enforces settings + policies
  return handleAGIEvent(userId, trigger);
}

/**
 * Get active users (users with AGI enabled, recently active)
 */
export async function getActiveUsers(): Promise<string[]> {
  try {
    // Get users with AGI enabled (not 'off')
    const { data: settings } = await supabaseAdmin
      .from("user_agi_settings")
      .select("user_id, clerk_id")
      .neq("level", "off")
      .limit(100);

    if (!settings || settings.length === 0) {
      return [];
    }

    // Resolve to Clerk IDs
    const clerkIds: string[] = [];
    for (const setting of settings) {
      if (setting.clerk_id) {
        clerkIds.push(setting.clerk_id);
      } else {
        // Try to resolve from users table
        const { data: user } = await supabaseAdmin
          .from("users")
          .select("clerk_id")
          .eq("id", setting.user_id)
          .maybeSingle();
        if (user?.clerk_id) {
          clerkIds.push(user.clerk_id);
        }
      }
    }

    return clerkIds;
  } catch (err: any) {
    console.error("[AGI Monitoring] Failed to get active users:", err.message);
    return [];
  }
}


