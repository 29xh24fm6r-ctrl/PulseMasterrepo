import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function getUserFlags(userId: string): Promise<Record<string, boolean>> {
  // Optional table: feature_flags(user_id, flag, enabled)
  try {
    const { data } = await supabaseAdmin
      .from("feature_flags")
      .select("flag, enabled")
      .eq("user_id", userId);

    const flags: Record<string, boolean> = {};
    for (const row of data || []) {
      flags[row.flag] = !!row.enabled;
    }
    return flags;
  } catch {
    return {};
  }
}

