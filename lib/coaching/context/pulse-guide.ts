// Pulse Guide Coach Context Builder
// lib/coaching/context/pulse-guide.ts

import { createClient } from "@/lib/supabase/server";

export interface PulseGuideContext {
  userFocusProfile?: {
    primaryFocus?: string;
    secondaryFocus?: string;
    selfDescription?: string;
  };
  onboardingState?: {
    hasCompletedCore: boolean;
    hasSeenLifeTour: boolean;
    hasSeenWorkTour: boolean;
    hasSeenFinanceTour: boolean;
    hasSeenRelationshipsTour: boolean;
  };
  enabledModules: {
    finance: boolean;
    crm: boolean;
    simulation: boolean;
    strategy: boolean;
    work: boolean;
  };
  currentPage?: string;
}

export async function buildPulseGuideContext(
  userId: string,
  origin?: string
): Promise<PulseGuideContext> {
  const supabase = await createClient();

  // Fetch user focus profile
  const { data: focusProfile } = await supabase
    .from("user_focus_profile")
    .select("*")
    .eq("user_id", userId)
    .single();

  // Fetch onboarding state
  const { data: onboardingState } = await supabase
    .from("user_onboarding_state")
    .select("*")
    .eq("user_id", userId)
    .single();

  // Fetch dashboard preferences (to infer enabled modules)
  const { data: preferences } = await supabase
    .from("user_dashboard_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  // Determine current page from origin
  let currentPage: string | undefined;
  if (origin) {
    if (origin.startsWith("page.")) {
      currentPage = origin.replace("page.", "");
    } else if (origin.startsWith("global.")) {
      currentPage = "global";
    }
  }

  return {
    userFocusProfile: focusProfile
      ? {
          primaryFocus: focusProfile.primary_focus,
          secondaryFocus: focusProfile.secondary_focus,
          selfDescription: focusProfile.self_description,
        }
      : undefined,
    onboardingState: onboardingState
      ? {
          hasCompletedCore: onboardingState.has_completed_core,
          hasSeenLifeTour: onboardingState.has_seen_life_tour,
          hasSeenWorkTour: onboardingState.has_seen_work_tour,
          hasSeenFinanceTour: onboardingState.has_seen_finance_tour,
          hasSeenRelationshipsTour: onboardingState.has_seen_relationships_tour,
        }
      : undefined,
    enabledModules: {
      finance: preferences?.show_money_snapshot ?? true,
      crm: preferences?.show_relationships ?? true,
      simulation: true, // Always enabled
      strategy: preferences?.show_strategy_xp ?? true,
      work: preferences?.show_tasks_focus ?? true,
    },
    currentPage,
  };
}




