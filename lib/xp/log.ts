import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { 
  XPCategory, 
  IdentityType, 
  ACTIVITY_XP_MAP 
} from "@/lib/xp/types";
import {
  XPState,
  createInitialXPState,
  calculateXPGain,
  applyXPGain,
  XPGain,
} from "@/lib/xp/engine";

export interface LogXPRequest {
  activity: string;
  sourceType?: 'habit' | 'task' | 'deal' | 'journal' | 'follow_up' | 'streak' | 'manual' | 'boss_fight';
  sourceId?: string;
  forceCrit?: boolean;
  customMultiplier?: number;
  notes?: string;
  currentState?: Partial<XPState>;
}

export interface LogXPResponse {
  ok: boolean;
  gain?: XPGain;
  transactionId?: string;
  error?: string;
}

/**
 * Log XP to Supabase (migrated from Notion)
 */
export async function logXP(request: LogXPRequest): Promise<LogXPResponse> {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();

    const { activity, sourceType, sourceId, forceCrit, customMultiplier, notes, currentState } = request;

    if (!activity) {
      return { 
        ok: false, 
        error: 'Activity is required' 
      };
    }

    // Check if activity exists in our map
    if (!ACTIVITY_XP_MAP[activity]) {
      return { 
        ok: false, 
        error: `Unknown activity: ${activity}. Valid activities: ${Object.keys(ACTIVITY_XP_MAP).join(', ')}` 
      };
    }

    // Build state for calculation (use provided state or create initial)
    const state: XPState = {
      ...createInitialXPState(),
      ...currentState,
    };

    // Calculate XP gain
    const gain = calculateXPGain(activity, state, {
      forceCrit,
      customMultiplier,
    });

    if (!gain) {
      return { 
        ok: false, 
        error: 'Failed to calculate XP gain' 
      };
    }

    // Apply gain to state
    const newState = applyXPGain(state, gain);

    // Log to Supabase xp_transactions table
    const { data: transaction, error } = await supabaseAdmin
      .from("xp_transactions")
      .insert({
        user_id: supabaseUserId,
        amount: gain.finalXP,
        source: sourceType || "manual",
        description: `${activity}: ${gain.finalXP} XP (${gain.category})`,
        metadata: {
          activity,
          category: gain.category,
          baseXP: gain.baseXP,
          finalXP: gain.finalXP,
          wasCrit: gain.wasCrit,
          multipliers: gain.multipliers,
          identitiesRewarded: gain.identitiesRewarded,
          sourceId,
          notes,
        },
      })
      .select("id")
      .single();

    if (error) {
      console.error("Failed to log XP transaction:", error);
      return { 
        ok: false, 
        error: `Failed to log XP: ${error.message}` 
      };
    }

    return {
      ok: true,
      gain,
      transactionId: transaction.id,
    };
  } catch (error: any) {
    console.error('XP log error:', error);
    return { 
      ok: false, 
      error: error.message || 'Failed to log XP' 
    };
  }
}
