// app/api/xp/log/route.ts (migrated from Notion to Supabase)
import { NextRequest, NextResponse } from 'next/server';
import { logXP, LogXPRequest, LogXPResponse } from '@/lib/xp/log';
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { XPCategory, getLevelFromXP, getLevelProgress, calculateAscensionLevel } from '@/lib/xp/types';

export async function POST(request: NextRequest): Promise<NextResponse<LogXPResponse>> {
  try {
    const body: LogXPRequest = await request.json();
    
    // Use shared function (already migrated to Supabase)
    const result = await logXP(body);
    
    if (!result.ok) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('XP log error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || 'Failed to log XP' 
    }, { status: 500 });
  }
}

// GET - Fetch XP totals from Supabase
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all'; // 'today', 'week', 'month', 'all'

    // Build date filter
    let dateFilter: { gte?: string } = {};
    const now = new Date();
    
    if (period === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      dateFilter = { gte: startOfDay };
    } else if (period === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      dateFilter = { gte: startOfWeek.toISOString() };
    } else if (period === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      dateFilter = { gte: startOfMonth };
    }

    // Query Supabase
    let query = supabaseAdmin
      .from("xp_transactions")
      .select("*")
      .eq("user_id", supabaseUserId)
      .order("created_at", { ascending: false });

    if (dateFilter.gte) {
      query = query.gte("created_at", dateFilter.gte);
    }

    const { data: transactions, error } = await query.limit(1000);

    if (error) {
      console.error('Error fetching XP transactions:', error);
      return NextResponse.json({ 
        ok: false, 
        error: error.message || 'Failed to fetch XP' 
      }, { status: 500 });
    }

    // Calculate totals
    const totals: Record<XPCategory, number> = {
      DXP: 0, PXP: 0, IXP: 0, AXP: 0, MXP: 0,
    };
    
    let totalXP = 0;
    let critCount = 0;
    const recentGains: any[] = [];

    for (const tx of transactions || []) {
      const metadata = tx.metadata || {};
      const category = metadata.category as XPCategory || "DXP";
      const amount = tx.amount || 0;
      const wasCrit = metadata.wasCrit || false;

      if (category && totals[category] !== undefined) {
        totals[category] += amount;
        totalXP += amount;
      }

      if (wasCrit) critCount++;

      // Collect recent gains (last 10)
      if (recentGains.length < 10) {
        recentGains.push({
          activity: metadata.activity || 'unknown',
          category,
          amount,
          wasCrit,
          date: tx.created_at,
        });
      }
    }

    // Calculate levels from totals
    const levels: Record<XPCategory, number> = {
      DXP: getLevelFromXP(totals.DXP),
      PXP: getLevelFromXP(totals.PXP),
      IXP: getLevelFromXP(totals.IXP),
      AXP: getLevelFromXP(totals.AXP),
      MXP: getLevelFromXP(totals.MXP),
    };

    const ascensionLevel = calculateAscensionLevel(levels);

    return NextResponse.json({
      ok: true,
      period,
      totals,
      levels,
      ascensionLevel,
      totalXP,
      totalEntries: transactions?.length || 0,
      critCount,
      recentGains,
    });

  } catch (error: any) {
    console.error('XP fetch error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || 'Failed to fetch XP' 
    }, { status: 500 });
  }
}
