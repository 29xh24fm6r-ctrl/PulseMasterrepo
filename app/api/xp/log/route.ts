// app/api/xp/log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import { awardXP, getXPTotals } from '@/lib/xp/award';
import { getLevelFromXP, calculateAscensionLevel, XPCategory } from '@/lib/xp/types';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { activity, sourceType, sourceId, forceCrit, customMultiplier, notes } = body;

    if (!activity) {
      return NextResponse.json({ ok: false, error: 'Activity is required' }, { status: 400 });
    }

    const result = await awardXP(userId, activity, sourceType || 'manual', {
      sourceId,
      notes,
      forceCrit,
      customMultiplier
    });

    return NextResponse.json({
      ok: true,
      gain: {
        finalXP: result.amount,
        category: result.category,
        wasCrit: result.wasCrit,
        baseXP: result.amount / (result.critMultiplier || 1), // approx
        multipliers: { crit: result.critMultiplier, identity: 1 },
        identitiesRewarded: []
      }
    });

  } catch (error: any) {
    console.error('XP log error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to log XP' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get('period') || 'all') as "today" | "week" | "month" | "all";

    const { totals, recentGains } = await getXPTotals(userId, period);

    // Calculate levels
    // @ts-ignore
    const levels: Record<XPCategory, number> = {
      DXP: getLevelFromXP(totals.DXP || 0),
      PXP: getLevelFromXP(totals.PXP || 0),
      IXP: getLevelFromXP(totals.IXP || 0),
      AXP: getLevelFromXP(totals.AXP || 0),
      MXP: getLevelFromXP(totals.MXP || 0),
    };

    const ascensionLevel = calculateAscensionLevel(levels);
    const totalXP = Object.values(totals).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      ok: true,
      period,
      totals,
      levels,
      ascensionLevel,
      totalXP,
      recentGains,
      critCount: recentGains.filter((g: any) => g.was_crit).length
    });

  } catch (error: any) {
    console.error('XP fetch error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to fetch XP' }, { status: 500 });
  }
}