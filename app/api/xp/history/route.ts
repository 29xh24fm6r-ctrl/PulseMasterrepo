import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const XP_DB = process.env.NOTION_DATABASE_XP;

// Safe property helpers
function safeGetTitle(props: any, key: string): string {
  try { return props[key]?.title?.[0]?.plain_text || ''; } catch { return ''; }
}
function safeGetNumber(props: any, key: string): number {
  try { return props[key]?.number || 0; } catch { return 0; }
}
function safeGetSelect(props: any, key: string): string {
  try { return props[key]?.select?.name || ''; } catch { return ''; }
}
function safeGetCheckbox(props: any, key: string): boolean {
  try { return props[key]?.checkbox || false; } catch { return false; }
}
function safeGetDate(props: any, key: string): string {
  try { return props[key]?.date?.start || ''; } catch { return ''; }
}
function safeGetRichText(props: any, key: string): string {
  try { return props[key]?.rich_text?.[0]?.plain_text || ''; } catch { return ''; }
}

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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const category = searchParams.get('category');

    let entries: XPEntry[] = [];
    
    if (XP_DB) {
      const filters: any[] = [];
      if (category) {
        filters.push({ property: 'Category', select: { equals: category } });
      }

      const response = await notion.databases.query({
        database_id: XP_DB.replace(/-/g, ''),
        filter: filters.length > 0 ? { and: filters } : undefined,
        sorts: [{ property: 'Date', direction: 'descending' }],
        page_size: Math.min(limit, 100),
      });

      entries = response.results.map((page: any) => {
        const props = page.properties || {};
        const notes = safeGetRichText(props, 'Notes');
        return {
          id: page.id,
          name: safeGetTitle(props, 'Name') || 'XP Gained',
          amount: safeGetNumber(props, 'Amount') || 0,
          category: (safeGetSelect(props, 'Category') || 'DXP') as XPEntry['category'],
          activity: safeGetSelect(props, 'Activity') || 'unknown',
          date: safeGetDate(props, 'Date') || new Date().toISOString(),
          wasCrit: safeGetCheckbox(props, 'Crit'),
          notes: notes || undefined,
          identityBonus: notes?.toLowerCase().includes('identity bonus'),
        };
      });
    } else {
      entries = generateMockXPHistory(limit);
    }

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

function generateMockXPHistory(limit: number): XPEntry[] {
  const activities = [
    { name: 'Task Completed', activity: 'task_completed', category: 'DXP' },
    { name: 'Deal Advanced', activity: 'deal_advanced', category: 'DXP' },
    { name: 'Follow-up Sent', activity: 'follow_up_sent', category: 'PXP' },
    { name: 'Journal Entry', activity: 'journal_entry', category: 'IXP' },
    { name: 'Habit Completed', activity: 'habit_completed', category: 'MXP' },
    { name: 'Capture Saved', activity: 'capture_saved', category: 'AXP' },
  ];
  const entries: XPEntry[] = [];
  const now = new Date();

  for (let i = 0; i < limit; i++) {
    const activityData = activities[Math.floor(Math.random() * activities.length)];
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    const wasCrit = Math.random() < 0.05;
    const hasIdentityBonus = Math.random() < 0.2;
    const baseAmount = 15 + Math.floor(Math.random() * 35);

    entries.push({
      id: `mock-${i}`,
      name: activityData.name,
      amount: wasCrit ? baseAmount * 2 : baseAmount,
      category: activityData.category as XPEntry['category'],
      activity: activityData.activity,
      date: date.toISOString(),
      wasCrit,
      identityBonus: hasIdentityBonus,
      notes: hasIdentityBonus ? 'Identity bonus: The Stoic +6 XP' : undefined,
    });
  }
  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return entries;
}
