import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const STREAKS_DB = process.env.NOTION_DATABASE_STREAKS || "";

// In-memory fallback
const memoryStreaks: Record<string, { date: string; activities: string[] }[]> = {};

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  todayComplete: boolean;
  streakMultiplier: number;
  recentActivity: { date: string; count: number }[];
}

// Get streak multiplier based on streak length
function getStreakMultiplier(streak: number): number {
  if (streak >= 30) return 2.0;    // 🔥🔥🔥 Legendary
  if (streak >= 14) return 1.5;    // 🔥🔥 On Fire
  if (streak >= 7) return 1.25;    // 🔥 Warming Up
  if (streak >= 3) return 1.1;     // Building momentum
  return 1.0;
}

// Get streak tier name
function getStreakTier(streak: number): { name: string; icon: string; color: string } {
  if (streak >= 30) return { name: 'Legendary', icon: '🔥🔥🔥', color: '#EF4444' };
  if (streak >= 14) return { name: 'On Fire', icon: '🔥🔥', color: '#F97316' };
  if (streak >= 7) return { name: 'Warming Up', icon: '🔥', color: '#F59E0B' };
  if (streak >= 3) return { name: 'Building', icon: '✨', color: '#EAB308' };
  if (streak >= 1) return { name: 'Started', icon: '🌱', color: '#22C55E' };
  return { name: 'No Streak', icon: '💤', color: '#6B7280' };
}

// Format date as YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Get today's date string
function getToday(): string {
  return formatDate(new Date());
}

// Get yesterday's date string
function getYesterday(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return formatDate(yesterday);
}

/**
 * GET - Get current streak data
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    
    const activityDates = await getActivityDates(days);
    const streakData = calculateStreak(activityDates);
    
    return NextResponse.json({
      ok: true,
      ...streakData,
      tier: getStreakTier(streakData.currentStreak),
    });
    
  } catch (error: any) {
    console.error('Streaks API error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST - Record activity for today
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { activity, source } = body;
    
    const today = getToday();
    
    // Record to Notion if configured
    if (STREAKS_DB) {
      await recordActivityNotion(today, activity, source);
    } else {
      // Fallback to memory
      if (!memoryStreaks['default']) memoryStreaks['default'] = [];
      const todayEntry = memoryStreaks['default'].find(e => e.date === today);
      if (todayEntry) {
        if (!todayEntry.activities.includes(activity)) {
          todayEntry.activities.push(activity);
        }
      } else {
        memoryStreaks['default'].push({ date: today, activities: [activity] });
      }
    }
    
    // Calculate updated streak
    const activityDates = await getActivityDates(30);
    const streakData = calculateStreak(activityDates);
    
    console.log(`📊 Activity recorded: ${activity} | Streak: ${streakData.currentStreak} | Multiplier: ${streakData.streakMultiplier}x`);
    
    return NextResponse.json({
      ok: true,
      ...streakData,
      tier: getStreakTier(streakData.currentStreak),
      recorded: { date: today, activity, source },
    });
    
  } catch (error: any) {
    console.error('Streaks API error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// ============================================
// NOTION FUNCTIONS
// ============================================

async function recordActivityNotion(date: string, activity: string, source: string) {
  try {
    // Check if entry exists for today
    const existing = await notion.databases.query({
      database_id: STREAKS_DB.replace(/-/g, ''),
      filter: {
        property: 'Date',
        date: { equals: date },
      },
      page_size: 1,
    });
    
    if (existing.results.length > 0) {
      // Update existing - add to activities
      const page = existing.results[0] as any;
      const currentActivities = page.properties['Activities']?.rich_text?.[0]?.plain_text || '';
      const activitiesList = currentActivities ? currentActivities.split(', ') : [];
      
      if (!activitiesList.includes(activity)) {
        activitiesList.push(activity);
        await notion.pages.update({
          page_id: page.id,
          properties: {
            'Activities': { 
              rich_text: [{ text: { content: activitiesList.join(', ') } }] 
            },
            'Count': { number: activitiesList.length },
          },
        });
      }
      console.log(`✅ Updated activity in Notion for ${date}`);
    } else {
      // Create new entry
      await notion.pages.create({
        parent: { database_id: STREAKS_DB.replace(/-/g, '') },
        properties: {
          'Date': { date: { start: date } },
          'Activities': { rich_text: [{ text: { content: activity } }] },
          'Source': { select: { name: source || 'dojo' } },
          'Count': { number: 1 },
        },
      });
      console.log(`✅ Created new activity in Notion for ${date}`);
    }
  } catch (error) {
    console.error('Notion activity recording failed:', error);
    throw error;
  }
}

async function getActivityDates(days: number): Promise<string[]> {
  const dates: string[] = [];
  
  if (STREAKS_DB) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const response = await notion.databases.query({
        database_id: STREAKS_DB.replace(/-/g, ''),
        filter: {
          property: 'Date',
          date: { on_or_after: formatDate(startDate) },
        },
        sorts: [{ property: 'Date', direction: 'descending' }],
      });
      
      for (const page of response.results as any[]) {
        const date = page.properties['Date']?.date?.start;
        if (date) dates.push(date);
      }
    } catch (error) {
      console.error('Failed to fetch from Notion:', error);
    }
  }
  
  // Merge with memory fallback
  if (memoryStreaks['default']) {
    for (const entry of memoryStreaks['default']) {
      if (!dates.includes(entry.date)) {
        dates.push(entry.date);
      }
    }
  }
  
  return dates.sort().reverse(); // Most recent first
}

function calculateStreak(activityDates: string[]): StreakData {
  const today = getToday();
  const yesterday = getYesterday();
  
  const todayComplete = activityDates.includes(today);
  const yesterdayComplete = activityDates.includes(yesterday);
  
  // Calculate current streak
  let currentStreak = 0;
  let checkDate = todayComplete ? today : yesterday;
  
  // Only count streak if today or yesterday had activity
  if (todayComplete || yesterdayComplete) {
    const sortedDates = [...new Set(activityDates)].sort().reverse();
    
    for (const date of sortedDates) {
      if (date === checkDate) {
        currentStreak++;
        // Move to previous day
        const prev = new Date(checkDate);
        prev.setDate(prev.getDate() - 1);
        checkDate = formatDate(prev);
      } else if (date < checkDate) {
        // Gap in streak
        break;
      }
    }
  }
  
  // Calculate longest streak (simplified - would need full history)
  let longestStreak = currentStreak;
  
  // Build recent activity for heatmap
  const recentActivity: { date: string; count: number }[] = [];
  const last30Days = new Set(activityDates);
  
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = formatDate(d);
    recentActivity.push({
      date: dateStr,
      count: last30Days.has(dateStr) ? 1 : 0,
    });
  }
  
  return {
    currentStreak,
    longestStreak,
    lastActivityDate: activityDates[0] || null,
    todayComplete,
    streakMultiplier: getStreakMultiplier(currentStreak),
    recentActivity: recentActivity.reverse(), // Oldest first for display
  };
}
