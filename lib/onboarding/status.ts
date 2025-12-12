// ============================================================================
// Onboarding Status Check
// ============================================================================

import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables. Please configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

const supabase = getSupabase();

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
