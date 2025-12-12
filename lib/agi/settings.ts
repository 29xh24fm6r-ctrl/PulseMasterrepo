// AGI Settings Service - User Personalization Layer
// lib/agi/settings.ts

import { supabaseAdmin } from "@/lib/supabase";

export interface AGIUserProfile {
  userId: string;
  priorities: Record<string, boolean>;
  capabilities: Record<string, boolean>;
  autonomyStyle: "conservative" | "balanced" | "proactive";
  rituals: Record<string, any>;
  focusAreas: string[];
  tone: string;
  notificationPreferences: Record<string, boolean>;
  predictiveAssistance: boolean;
  hardLimits: Record<string, boolean>;
}

const DEFAULT_PROFILE: Omit<AGIUserProfile, "userId"> = {
  priorities: {
    work: true,
    finance: true,
    relationships: true,
    health: false,
    personal_growth: true,
  },
  capabilities: {
    create_tasks: true,
    reorder_tasks: false,
    calendar_blocks: false,
    draft_emails: false,
    run_simulations: false,
    update_crm: false,
  },
  autonomyStyle: "balanced",
  rituals: {},
  focusAreas: [],
  tone: "default",
  notificationPreferences: { in_app: true, email: false, sms: false },
  predictiveAssistance: true,
  hardLimits: {
    no_email_send: true,
    no_calendar_changes: true,
    no_financial_moves: true,
    no_relationship_nudges: false,
  },
};

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
 * Get AGI user profile (merged with defaults)
 */
export async function getAGIUserProfile(userId: string): Promise<AGIUserProfile> {
  const dbUserId = await resolveUserId(userId);

  try {
    const { data, error } = await supabaseAdmin
      .from("agi_user_profile")
      .select("*")
      .eq("user_id", dbUserId)
      .maybeSingle();

    if (error && error.code !== "42P01") {
      // Table doesn't exist yet - return defaults
      console.warn("[AGI Settings] agi_user_profile table not found, using defaults:", error.message);
      return {
        userId,
        ...DEFAULT_PROFILE,
      };
    }

    if (!data) {
      return {
        userId,
        ...DEFAULT_PROFILE,
      };
    }

    return {
      userId,
      priorities: (data.priorities as Record<string, boolean>) ?? DEFAULT_PROFILE.priorities,
      capabilities: (data.capabilities as Record<string, boolean>) ?? DEFAULT_PROFILE.capabilities,
      autonomyStyle: (data.autonomy_style ?? DEFAULT_PROFILE.autonomyStyle) as
        | "conservative"
        | "balanced"
        | "proactive",
      rituals: (data.rituals as Record<string, any>) ?? DEFAULT_PROFILE.rituals,
      focusAreas: (data.focus_areas as string[]) ?? DEFAULT_PROFILE.focusAreas,
      tone: (data.tone as string) ?? DEFAULT_PROFILE.tone,
      notificationPreferences:
        (data.notification_preferences as Record<string, boolean>) ?? DEFAULT_PROFILE.notificationPreferences,
      predictiveAssistance:
        (data.predictive_assistance as boolean) ?? DEFAULT_PROFILE.predictiveAssistance,
      hardLimits: (data.hard_limits as Record<string, boolean>) ?? DEFAULT_PROFILE.hardLimits,
    };
  } catch (err: any) {
    console.error("[AGI Settings] Failed to load profile:", err);
    return {
      userId,
      ...DEFAULT_PROFILE,
    };
  }
}

/**
 * Save AGI user profile
 */
export async function saveAGIUserProfile(
  userId: string,
  updates: Partial<Omit<AGIUserProfile, "userId">>
): Promise<AGIUserProfile> {
  const dbUserId = await resolveUserId(userId);

  const { data: existing } = await supabaseAdmin
    .from("agi_user_profile")
    .select("user_id")
    .eq("user_id", dbUserId)
    .maybeSingle();

  const profileData = {
    user_id: dbUserId,
    priorities: updates.priorities ?? DEFAULT_PROFILE.priorities,
    capabilities: updates.capabilities ?? DEFAULT_PROFILE.capabilities,
    autonomy_style: updates.autonomyStyle ?? DEFAULT_PROFILE.autonomyStyle,
    rituals: updates.rituals ?? DEFAULT_PROFILE.rituals,
    focus_areas: updates.focusAreas ?? DEFAULT_PROFILE.focusAreas,
    tone: updates.tone ?? DEFAULT_PROFILE.tone,
    notification_preferences: updates.notificationPreferences ?? DEFAULT_PROFILE.notificationPreferences,
    predictive_assistance: updates.predictiveAssistance ?? DEFAULT_PROFILE.predictiveAssistance,
    hard_limits: updates.hardLimits ?? DEFAULT_PROFILE.hardLimits,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from("agi_user_profile")
      .update(profileData)
      .eq("user_id", dbUserId)
      .select()
      .single();

    if (error) throw error;
    return {
      userId,
      priorities: data.priorities as Record<string, boolean>,
      capabilities: data.capabilities as Record<string, boolean>,
      autonomyStyle: data.autonomy_style as "conservative" | "balanced" | "proactive",
      rituals: data.rituals as Record<string, any>,
      focusAreas: data.focus_areas as string[],
      tone: data.tone as string,
      notificationPreferences: data.notification_preferences as Record<string, boolean>,
      predictiveAssistance: data.predictive_assistance as boolean,
      hardLimits: data.hard_limits as Record<string, boolean>,
    };
  } else {
    const { data, error } = await supabaseAdmin
      .from("agi_user_profile")
      .insert({
        ...profileData,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return {
      userId,
      priorities: data.priorities as Record<string, boolean>,
      capabilities: data.capabilities as Record<string, boolean>,
      autonomyStyle: data.autonomy_style as "conservative" | "balanced" | "proactive",
      rituals: data.rituals as Record<string, any>,
      focusAreas: data.focus_areas as string[],
      tone: data.tone as string,
      notificationPreferences: data.notification_preferences as Record<string, boolean>,
      predictiveAssistance: data.predictive_assistance as boolean,
      hardLimits: data.hard_limits as Record<string, boolean>,
    };
  }
}

/**
 * Check if AGI can perform a capability
 */
export function canAGIDo(profile: AGIUserProfile, capability: string): boolean {
  return Boolean(profile.capabilities?.[capability]);
}

/**
 * Check if a hard limit is set
 */
export function hasHardLimit(profile: AGIUserProfile, limitKey: string): boolean {
  return Boolean(profile.hardLimits?.[limitKey]);
}

/**
 * Get user priorities
 */
export function getUserPriorities(profile: AGIUserProfile): Record<string, boolean> {
  return profile.priorities || {};
}

/**
 * Check if action is allowed by profile (capabilities + hard limits)
 */
export function isActionAllowedByProfile(
  profile: AGIUserProfile,
  action: { type: string; details?: any }
): boolean {
  // Check hard limits first (absolute blockers)
  if (hasHardLimit(profile, "no_email_send") && action.type.includes("email")) {
    return false;
  }

  if (hasHardLimit(profile, "no_calendar_changes") && action.type.includes("calendar")) {
    return false;
  }

  if (hasHardLimit(profile, "no_financial_moves") && action.type.includes("finance")) {
    return false;
  }

  if (hasHardLimit(profile, "no_relationship_nudges") && action.type === "update_relationship_plan") {
    return false;
  }

  // Check capabilities
  if (action.type === "create_task" && !canAGIDo(profile, "create_tasks")) {
    return false;
  }

  if (action.type === "update_task" && !canAGIDo(profile, "reorder_tasks")) {
    return false;
  }

  if (action.details?.calendarBlock && !canAGIDo(profile, "calendar_blocks")) {
    return false;
  }

  if (action.type === "send_email_draft" && !canAGIDo(profile, "draft_emails")) {
    return false;
  }

  if (action.type === "schedule_simulation" && !canAGIDo(profile, "run_simulations")) {
    return false;
  }

  return true;
}



