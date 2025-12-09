// app/api/xp/log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import { 
  XPCategory, 
  IdentityType, 
  ACTIVITY_XP_MAP 
} from '@/lib/xp/types';
import {
  XPState,
  createInitialXPState,
  calculateXPGain,
  applyXPGain,
  XPGain,
} from '@/lib/xp/engine';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const XP_LOG_DB = process.env.XP_LOG_DB;

if (!XP_LOG_DB) {
  console.warn('XP_LOG_DB not set - XP logging disabled');
}

// ============================================
// LOG XP TO NOTION
// ============================================

interface LogXPRequest {
  activity: string;
  sourceType: 'habit' | 'task' | 'deal' | 'journal' | 'follow_up' | 'streak' | 'manual' | 'boss_fight';
  sourceId?: string;
  forceCrit?: boolean;
  customMultiplier?: number;
  notes?: string;
  // Optional: pass current state for accurate calculations
  currentState?: Partial<XPState>;
}

interface LogXPResponse {
  ok: boolean;
  gain?: XPGain;
  notionPageId?: string;
  error?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse<LogXPResponse>> {
  try {
    if (!XP_LOG_DB) {
      return NextResponse.json({ 
        ok: false, 
        error: 'XP_LOG_DB not configured' 
      }, { status: 500 });
    }

    const body: LogXPRequest = await request.json();
    const { activity, sourceType, sourceId, forceCrit, customMultiplier, notes, currentState } = body;

    if (!activity) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Activity is required' 
      }, { status: 400 });
    }

    // Check if activity exists in our map
    if (!ACTIVITY_XP_MAP[activity]) {
      return NextResponse.json({ 
        ok: false, 
        error: `Unknown activity: ${activity}. Valid activities: ${Object.keys(ACTIVITY_XP_MAP).join(', ')}` 
      }, { status: 400 });
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
      return NextResponse.json({ 
        ok: false, 
        error: 'Failed to calculate XP gain' 
      }, { status: 500 });
    }

    // Log to Notion
    const notionPage = await notion.pages.create({
      parent: { database_id: XP_LOG_DB },
      properties: {
        'Activity': {
          title: [{ text: { content: ACTIVITY_XP_MAP[activity].description || activity } }],
        },
        'Category': {
          select: { name: gain.category },
        },
        'Amount': {
          number: gain.finalXP,
        },
        'Base Amount': {
          number: gain.baseXP,
        },
        'Was Crit': {
          checkbox: gain.wasCrit,
        },
        'Crit Multiplier': {
          number: gain.multipliers.crit,
        },
        'Source Type': {
          select: { name: sourceType },
        },
        ...(sourceId && {
          'Source ID': {
            rich_text: [{ text: { content: sourceId } }],
          },
        }),
        'Active Identities': {
          multi_select: gain.identitiesRewarded.map(id => ({ name: id })),
        },
        'Identity Bonus': {
          number: Math.round((gain.multipliers.identity - 1) * gain.baseXP),
        },
        'Date': {
          date: { start: new Date().toISOString() },
        },
        ...(notes && {
          'Notes': {
            rich_text: [{ text: { content: notes } }],
          },
        }),
      },
    });

    return NextResponse.json({
      ok: true,
      gain,
      notionPageId: notionPage.id,
    });

  } catch (error: any) {
    console.error('XP log error:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message || 'Failed to log XP' 
    }, { status: 500 });
  }
}

// ============================================
// GET XP TOTALS FROM LOG
// ============================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    if (!XP_LOG_DB) {
      return NextResponse.json({ 
        ok: false, 
        error: 'XP_LOG_DB not configured' 
      }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all'; // 'today', 'week', 'month', 'all'

    // Build date filter
    let dateFilter: any = undefined;
    const now = new Date();
    
    if (period === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      dateFilter = {
        property: 'Date',
        date: { on_or_after: startOfDay },
      };
    } else if (period === 'week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      dateFilter = {
        property: 'Date',
        date: { on_or_after: startOfWeek.toISOString() },
      };
    } else if (period === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      dateFilter = {
        property: 'Date',
        date: { on_or_after: startOfMonth },
      };
    }

    // Query all XP log entries
    const response = await notion.databases.query({
      database_id: XP_LOG_DB,
      filter: dateFilter,
      sorts: [{ property: 'Date', direction: 'descending' }],
    });

    // Calculate totals
    const totals: Record<XPCategory, number> = {
      DXP: 0, PXP: 0, IXP: 0, AXP: 0, MXP: 0,
    };
    
    let totalXP = 0;
    let critCount = 0;
    const recentGains: any[] = [];

    for (const page of response.results as any[]) {
      const props = page.properties;
      const category = props['Category']?.select?.name as XPCategory;
      const amount = props['Amount']?.number || 0;
      const wasCrit = props['Was Crit']?.checkbox || false;
      const activity = props['Activity']?.title?.[0]?.plain_text || 'Unknown';
      const date = props['Date']?.date?.start;

      if (category && totals[category] !== undefined) {
        totals[category] += amount;
        totalXP += amount;
      }

      if (wasCrit) critCount++;

      // Collect recent gains (last 10)
      if (recentGains.length < 10) {
        recentGains.push({
          activity,
          category,
          amount,
          wasCrit,
          date,
        });
      }
    }

    // Calculate levels from totals
    const { getLevelFromXP, getLevelProgress, calculateAscensionLevel } = await import('@/lib/xp/types');
    
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
      totalEntries: response.results.length,
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