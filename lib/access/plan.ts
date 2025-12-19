import "server-only";
import type { UserPlan } from "./types";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function getUserPlan(userId: string): Promise<UserPlan> {
  // If you already have a billing table, wire it here.
  // Default to free if none exists.
  try {
    const { data } = await supabaseAdmin
      .from("user_billing")
      .select("plan")
      .eq("user_id", userId)
      .maybeSingle();

    const p = data?.plan;
    if (p === "pro" || p === "enterprise") return p;
    return "free";
  } catch {
    return "free";
  }
}

