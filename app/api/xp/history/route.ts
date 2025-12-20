// app/api/xp/history/route.ts (migrated from Notion to Supabase)
import { NextRequest, NextResponse } from 'next/server';
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface XPEntry {
  id: string;
  name: string;
  amount: number;
  category: 'DXP' | 'PXP' | 'IXP' | 'AXP' | 'MXP';
  activity: string;
  date: string;
  wasCrit: boolean;
  notes?: string;
  identityBonus?: boolean;
}

export interface XPSummary {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  byCategory: Record<string, number>;
  critCount: number;
  identityBonusCount: number;
}

export async function GET(request: NextRequest) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const category = searchParams.get('category');

    // Build query
    let query = supabaseAdmin
      .from("xp_transactions")
      .select("*")
      .eq("user_id", supabaseUserId)
      .order("created_at", { ascending: false })
      .limit(Math.min(limit, 100));

    // Filter by category if provided
    if (category) {
      query = query.contains("metadata", { category });
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error('Error fetching XP history:', error);
      return NextResponse.json({ 
        ok: false, 
        error: error.message || 'Failed to fetch XP history' 
      }, { status: 500 });
    }

    const entries: XPEntry[] = (transactions || []).map((tx: any) => {
      const metadata = tx.metadata || {};
      const notes = metadata.notes || tx.description || '';
      return {
        id: tx.id,
        name: tx.description || 'XP Gained',
        amount: tx.amount || 0,
        category: (metadata.category || 'DXP') as XPEntry['category'],
        activity: metadata.activity || 'unknown',
        date: tx.created_at || new Date().toISOString(),
        wasCrit: metadata.wasCrit || false,
        notes: notes || undefined,
        identityBonus: notes?.toLowerCase().includes('identity bonus') || metadata.identitiesRewarded?.length > 0,
      };
    });

    const summary = calculateSummary(entries);
    return NextResponse.json({ ok: true, entries, summary, count: entries.length });
  } catch (error: unknown) {
    console.error('XP history error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

function calculateSummary(entries: XPEntry[]): XPSummary {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const summary: XPSummary = {
    total: 0, today: 0, thisWeek: 0, thisMonth: 0,
    byCategory: { DXP: 0, PXP: 0, IXP: 0, AXP: 0, MXP: 0 },
    critCount: 0, identityBonusCount: 0,
  };

  for (const entry of entries) {
    const entryDate = new Date(entry.date);
    summary.total += entry.amount;
    summary.byCategory[entry.category] = (summary.byCategory[entry.category] || 0) + entry.amount;
    if (entry.wasCrit) summary.critCount++;
    if (entry.identityBonus) summary.identityBonusCount++;
    if (entryDate >= todayStart) summary.today += entry.amount;
    if (entryDate >= weekStart) summary.thisWeek += entry.amount;
    if (entryDate >= monthStart) summary.thisMonth += entry.amount;
  }
  return summary;
}
