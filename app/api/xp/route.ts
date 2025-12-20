// Pulse OS - XP Ascension API Route (migrated from Notion to Supabase)
// app/api/xp/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  XPCategory,
  XP_CATEGORIES,
  IdentityType,
  IDENTITIES,
  ACTIVITY_XP_MAP,
  getXPForLevel,
  getLevelFromXP,
  getLevelProgress,
  calculateAscensionLevel,
  SKILL_TREES,
} from '@/lib/xp/types';
import {
  XPState,
  XPGain,
  createInitialXPState,
  calculateXPGain,
  applyXPGain,
  openCritWindow,
  checkCritWindowExpiry,
  getXPStats,
  detectActivity,
  createAnimationData,
} from '@/lib/xp/engine';
import { logXP } from '@/lib/xp/log';

// GET - Fetch current XP state
export async function GET(request: NextRequest) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('history') === 'true';
    
    // Calculate XP from Supabase
    const xpState = await calculateXPFromSupabase(supabaseUserId);
    const stats = getXPStats(xpState);
    
    // Get recent XP history if requested
    let history: any[] = [];
    if (includeHistory) {
      history = await getXPHistory(supabaseUserId);
    }
    
    return NextResponse.json({
      success: true,
      state: xpState,
      stats,
      history,
      categories: XP_CATEGORIES,
      identities: IDENTITIES,
    });
  } catch (error: any) {
    console.error('XP fetch error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch XP' },
      { status: 500 }
    );
  }
}

// POST - Award XP for an activity
export async function POST(request: NextRequest) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
    const body = await request.json();
    const { activity, description, forceCrit, customMultiplier } = body;
    
    // Get current state
    const currentState = await calculateXPFromSupabase(supabaseUserId);
    
    // Determine activity type
    let activityType = activity;
    if (!activityType && description) {
      activityType = detectActivity(description);
    }
    
    if (!activityType) {
      return NextResponse.json({
        success: false,
        error: 'Could not determine activity type',
      }, { status: 400 });
    }
    
    // Calculate XP gain
    const gain = calculateXPGain(activityType, currentState, {
      forceCrit,
      customMultiplier,
    });
    
    if (!gain) {
      return NextResponse.json({
        success: false,
        error: 'Unknown activity type',
      }, { status: 400 });
    }
    
    // Apply gain to state
    const newState = applyXPGain(currentState, gain);
    
    // Log to Supabase
    const logResult = await logXP({
      activity: activityType,
      sourceType: 'manual',
      forceCrit,
      customMultiplier,
      notes: description,
      currentState,
    });
    
    if (!logResult.ok) {
      console.error('Failed to log XP:', logResult.error);
    }
    
    // Create animation data
    const animation = createAnimationData(gain, currentState, newState);
    
    return NextResponse.json({
      success: true,
      gain,
      newState,
      animation,
      message: generateXPMessage(gain),
    });
  } catch (error: any) {
    console.error('XP award error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to award XP' },
      { status: 500 }
    );
  }
}

// ============================================
// SUPABASE INTEGRATION
// ============================================

async function calculateXPFromSupabase(supabaseUserId: string): Promise<XPState> {
  const state = createInitialXPState();
  
  try {
    // Fetch all XP transactions from Supabase
    const { data: transactions, error } = await supabaseAdmin
      .from("xp_transactions")
      .select("*")
      .eq("user_id", supabaseUserId)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      console.error('Error fetching XP transactions:', error);
      return state;
    }

    const today = new Date().toDateString();
    
    for (const tx of transactions || []) {
      const metadata = tx.metadata || {};
      const category = metadata.category as XPCategory || "DXP";
      const amount = tx.amount || 0;
      const date = tx.created_at ? new Date(tx.created_at) : null;
      
      if (category && XP_CATEGORIES[category]) {
        state.totals[category] += amount;
        
        // Track today's XP
        if (date && date.toDateString() === today) {
          state.todayXP[category] += amount;
        }
      }
      
      // Track identity resonance from metadata
      const identities = metadata.identitiesRewarded || [];
      for (const id of identities) {
        if (IDENTITIES[id as IdentityType]) {
          state.identityResonance[id as IdentityType] += amount;
        }
      }
    }
    
    // Calculate levels from totals
    for (const category of Object.keys(XP_CATEGORIES) as XPCategory[]) {
      state.levels[category] = getLevelFromXP(state.totals[category]);
    }
    
    // Calculate Ascension Level
    state.ascensionLevel = calculateAscensionLevel(state.levels);
    
    // Determine active identity
    let highestResonance = 0;
    for (const [identity, resonance] of Object.entries(state.identityResonance)) {
      if (resonance > highestResonance && resonance >= 500) {
        highestResonance = resonance;
        state.activeIdentity = identity as IdentityType;
      }
    }
    
    // Check for unlocked skills
    for (const [category, skills] of Object.entries(SKILL_TREES)) {
      const level = state.levels[category as XPCategory];
      for (const skill of skills) {
        if (level >= skill.levelRequired) {
          state.unlockedSkills.push(skill.id);
        }
      }
    }
    
    state.lastUpdated = new Date().toISOString();
    
  } catch (error) {
    console.error('Error calculating XP from Supabase:', error);
  }
  
  return state;
}

async function getXPHistory(supabaseUserId: string): Promise<any[]> {
  try {
    const { data: transactions, error } = await supabaseAdmin
      .from("xp_transactions")
      .select("*")
      .eq("user_id", supabaseUserId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching XP history:', error);
      return [];
    }

    return (transactions || []).map((tx: any) => {
      const metadata = tx.metadata || {};
      return {
        id: tx.id,
        description: tx.description || '',
        category: metadata.category,
        amount: tx.amount || 0,
        activity: metadata.activity,
        wasCrit: metadata.wasCrit || false,
        date: tx.created_at,
        identities: metadata.identitiesRewarded || [],
      };
    });
  } catch (e) {
    console.error('Error fetching XP history:', e);
    return [];
  }
}

// ============================================
// MESSAGE GENERATION
// ============================================

function generateXPMessage(gain: XPGain): string {
  const categoryInfo = XP_CATEGORIES[gain.category];
  const messages: string[] = [];
  
  // Base message
  if (gain.wasCrit) {
    messages.push(`⚡ CRITICAL HIT! +${gain.finalXP} ${categoryInfo.name}`);
  } else {
    messages.push(`+${gain.finalXP} ${categoryInfo.name}`);
  }
  
  // Multiplier breakdown
  const multipliers: string[] = [];
  if (gain.multipliers.identity > 1) {
    multipliers.push(`Identity: ×${gain.multipliers.identity.toFixed(1)}`);
  }
  if (gain.multipliers.streak > 1) {
    multipliers.push(`Streak: ×${gain.multipliers.streak.toFixed(1)}`);
  }
  if (multipliers.length > 0) {
    messages.push(`(${multipliers.join(', ')})`);
  }
  
  // Level up
  if (gain.levelUp) {
    messages.push(`🎉 ${categoryInfo.name} LEVEL UP → ${gain.newLevel}!`);
  }
  
  // Skill unlock
  if (gain.skillsUnlocked.length > 0) {
    messages.push(`🔓 Skill Unlocked: ${gain.skillsUnlocked[0]}`);
  }
  
  return messages.join(' ');
}
