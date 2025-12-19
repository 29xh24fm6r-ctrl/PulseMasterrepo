import "server-only";
import { Client } from "@notionhq/client";
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

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const XP_LOG_DB = process.env.XP_LOG_DB;

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
  notionPageId?: string;
  error?: string;
}

/**
 * Log XP to Notion
 * Extracted from app/api/xp/log/route.ts
 */
export async function logXP(request: LogXPRequest): Promise<LogXPResponse> {
  try {
    if (!XP_LOG_DB) {
      return { 
        ok: false, 
        error: 'XP_LOG_DB not configured' 
      };
    }

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
          select: { name: sourceType || 'manual' },
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

    return {
      ok: true,
      gain,
      notionPageId: notionPage.id,
    };
  } catch (error: any) {
    console.error('XP log error:', error);
    return { 
      ok: false, 
      error: error.message || 'Failed to log XP' 
    };
  }
}

