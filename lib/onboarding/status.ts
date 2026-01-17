// ============================================================================
// Onboarding Status Check
// ============================================================================

import { getSupabaseAdminRuntimeClient, getSupabaseRuntimeClient } from "@/lib/runtime/supabase.runtime";



export interface UserProfile {
  id: string;
  user_id: string;
  archetype: string | null;
  summary: string | null;
  profile_data: Record<string, any>;
  life_season: string | null;
  role_type: string | null;
  industry: string | null;
  specific_role: string | null;
  dashboard_density: number;
  coach_style: string;
  gamification_level: string;
  onboarding_completed: boolean;
}


export async function getOnboardingStatus(userId: string): Promise<{
  completed: boolean;
  profile: UserProfile | null;
}> {
  const supabase = getSupabaseAdminRuntimeClient();
  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !profile) {
    return { completed: false, profile: null };
  }

  return {
    completed: profile.onboarding_completed === true,
    profile: profile as UserProfile,
  };
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = getSupabaseAdminRuntimeClient();
  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !profile) {
    return null;
  }

  return profile as UserProfile;
}

export async function getUserDashboardLayout(userId: string): Promise<Record<string, any> | null> {
  const supabase = getSupabaseAdminRuntimeClient();
  const { data: layout, error } = await supabase
    .from("user_dashboard_layouts")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (error || !layout) {
    return null;
  }

  return layout.layout_data;
}
