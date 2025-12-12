// Email Settings
// lib/email/settings.ts

import { supabaseAdmin } from "@/lib/supabase";

export type TaskMode = "manual" | "assistive" | "auto";

export interface UserEmailSettings {
  user_id: string;
  task_mode: TaskMode;
  created_at: string;
  updated_at: string;
}

/**
 * Get user email settings
 */
export async function getUserEmailSettings(userId: string): Promise<{ task_mode: TaskMode }> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const { data: settings } = await supabaseAdmin
    .from("user_email_settings")
    .select("task_mode")
    .eq("user_id", dbUserId)
    .maybeSingle();

  return {
    task_mode: (settings?.task_mode || "manual") as TaskMode,
  };
}

/**
 * Set user task mode
 */
export async function setUserTaskMode(userId: string, mode: TaskMode): Promise<void> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  await supabaseAdmin
    .from("user_email_settings")
    .upsert(
      {
        user_id: dbUserId,
        task_mode: mode,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    );
}

