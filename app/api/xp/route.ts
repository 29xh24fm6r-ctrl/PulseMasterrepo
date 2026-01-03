import { NextRequest, NextResponse } from 'next/server';
import { requireOpsAuth } from '@/lib/auth/opsAuth';
import {
  XPCategory,
  XP_CATEGORIES,
  IDENTITIES,
  getLevelFromXP,
  calculateAscensionLevel,
} from '@/lib/xp/types';
import { getXPTotals, awardXP } from '@/lib/xp/award';

// Mock state creator to match frontend expectations partially
function createXPStateFromTotals(totals: Record<string, number>) {
  const levels: Record<string, number> = {};
  for (const cat of Object.keys(XP_CATEGORIES)) {
    levels[cat] = getLevelFromXP(totals[cat] || 0);
  }

  return {
    totals: {
      DXP: totals.DXP || 0,
      AXP: totals.AXP || 0,
      MXP: totals.MXP || 0,
      PXP: totals.PXP || 0,
      IXP: totals.IXP || 0,
    },
    levels,
    ascensionLevel: calculateAscensionLevel(levels as any),
    todayXP: { DXP: 0, AXP: 0, MXP: 0, PXP: 0, IXP: 0 }, // We don't track today sep in totals view right now easily without more queries, defaulting 0 for now
    identityResonance: {
      Warrior: 0,
      Wizard: 0,
      Bard: 0,
      Druid: 0,
      Paladin: 0,
      Rogue: 0,
      Monk: 0,
      Alchemist: 0,
      Strategist: 0,
      Leader: 0,
      Builder: 0,
      Investigator: 0
    },
    activeIdentity: 'Builder',
    unlockedSkills: [],
    lastUpdated: new Date().toISOString(),
    currentStreak: 0,
    longestStreak: 0
  };
}

// GET - Fetch current XP state
export async function GET(request: NextRequest) {
  try {
    const access = await requireOpsAuth(request as any);
    if (!access.ok || !access.gate) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const userId = access.gate.canon.clerkUserId;

    const { totals, recentGains } = await getXPTotals(userId);
    const xpState = createXPStateFromTotals(totals);

    // Map recentGains to history
    const history = recentGains.map((g: any) => ({
      id: g.id,
      description: g.notes || g.activity,
      category: g.category,
      amount: g.amount,
      activity: g.activity,
      wasCrit: g.was_crit,
      date: g.created_at,
      identities: []
    }));

    return NextResponse.json({
      success: true,
      state: xpState,
      stats: { totalXP: Object.values(totals).reduce((a, b) => a + b, 0) }, // Simplified stats
      history,
      categories: XP_CATEGORIES,
      identities: IDENTITIES,
    });
  } catch (error) {
    console.error('XP fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch XP' },
      { status: 500 }
    );
  }
}

// POST - Award XP for an activity
export async function POST(request: NextRequest) {
  try {
    const access = await requireOpsAuth(request as any);
    if (!access.ok || !access.gate) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const userId = access.gate.canon.clerkUserId;

    const body = await request.json();
    const { activity, description, forceCrit, customMultiplier } = body;

    if (!activity) {
      return NextResponse.json({ success: false, error: 'Activity required' }, { status: 400 });
    }

    const result = await awardXP(userId, activity, 'api', {
      notes: description,
      forceCrit,
      customMultiplier
    });

    return NextResponse.json({
      success: true,
      gain: {
        finalXP: result.amount,
        category: result.category,
        activity: result.activity,
        wasCrit: result.wasCrit,
        multipliers: { identity: 1, streak: 1 }, // simplified
        levelUp: false, // complex to calc without state before/after
        newLevel: 0,
        skillsUnlocked: [],
        identitiesRewarded: []
      },
      // We don't return fullnewState here because it's expensive, client should refetch if needed
      message: `+${result.amount} ${result.category} ${result.wasCrit ? '(CRIT!)' : ''}`,
    });
  } catch (error) {
    console.error('XP award error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to award XP' },
      { status: 500 }
    );
  }
}