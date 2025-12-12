// lib/mythic/createDefaultArc.ts

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";

export interface DefaultArcParams {
  title?: string;
  logline?: string;
  call_to_adventure?: string;
}

/**
 * Resolve Clerk ID to database user UUID
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
 * Create a default active arc if none exists
 */
export async function createDefaultArc(
  userId: string,
  params?: DefaultArcParams
) {
  const sb = supabaseServer();
  const dbUserId = await resolveUserId(userId);

  // Check if active arc already exists
  const { data: existing } = await sb
    .from("mythic_arcs")
    .select("id")
    .eq("user_id", dbUserId)
    .eq("status", "active")
    .maybeSingle();

  if (existing) {
    return existing; // Return existing arc
  }

  // Create default arc
  const { data: arc, error } = await sb
    .from("mythic_arcs")
    .insert({
      user_id: dbUserId,
      title: params?.title || "The Current Chapter",
      status: "active",
      current_act: 1,
      logline: params?.logline || "An unnamed chapter calling for clarity.",
      call_to_adventure:
        params?.call_to_adventure ||
        "Something feels unresolved and is asking for attention.",
      trials: [],
      allies: [],
      shadow: {},
      open_loops: [],
      metadata: {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return arc;
}

