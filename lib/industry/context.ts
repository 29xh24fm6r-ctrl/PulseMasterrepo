// Industry Context Loader
// lib/industry/context.ts

import { supabaseAdmin } from "@/lib/supabase";

/**
 * Get or create industry intel for user's industry
 */
export async function getIndustryContextForUser(
  userId: string
): Promise<{ industryName: string; intel: any | null }> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Try to get industry from user_profiles or user_job_profiles
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("industry")
    .eq("user_id", dbUserId)
    .maybeSingle();

  let industryName = profile?.industry || null;

  // Fallback: try user_job_profiles -> job_graph_nodes -> extract industry
  if (!industryName) {
    const { data: jobProfile } = await supabaseAdmin
      .from("user_job_profiles")
      .select("job_node_id, job_graph_nodes(path)")
      .eq("user_id", dbUserId)
      .eq("is_active", true)
      .maybeSingle();

    if (jobProfile?.job_graph_nodes?.path) {
      const pathParts = (jobProfile.job_graph_nodes.path as string).split(" > ");
      industryName = pathParts[0] || null; // First part is usually industry
    }
  }

  if (!industryName) {
    return { industryName: "Unknown", intel: null };
  }

  // Load or create industry intel
  const { data: intel } = await supabaseAdmin
    .from("industry_intel")
    .select("*")
    .eq("industry_name", industryName)
    .maybeSingle();

  return {
    industryName,
    intel: intel || null,
  };
}




