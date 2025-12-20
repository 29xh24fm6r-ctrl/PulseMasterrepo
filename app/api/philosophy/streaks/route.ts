// app/api/philosophy/streaks/route.ts (migrated from Notion to Supabase)
import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";

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
  if (streak >= 30) return 2.0;
  if (streak >= 14) return 1.5;
  if (streak >= 7) return 1.25;
  if (streak >= 3) return 1.1;
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
    const { supabaseUserId } = await resolveSupabaseUser();
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    
    const activityDates = await getActivityDates(supabaseUserId, days);
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
    const { supabaseUserId } = await resolveSupabaseUser();
    const body = await request.json();
    const { activity, source } = body;
    
    const today = getToday();
    
    // Record to Supabase (using xp_transactions or a dedicated streaks table)
    // For now, we'll use xp_transactions metadata to track streaks
    await supabaseAdmin
      .from("xp_transactions")
      .insert({
        user_id: supabaseUserId,
        amount: 0, // No XP, just tracking activity
        source: source || "streak",
        description: `Activity: ${activity}`,
        metadata: {
          activity,
          isStreakActivity: true,
          date: today,
        },
      });
    
    // Calculate updated streak
    const activityDates = await getActivityDates(supabaseUserId, 30);
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

async function getActivityDates(supabaseUserId: string, days: number): Promise<string[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  // Get streak activities from xp_transactions
  const { data: transactions } = await supabaseAdmin
    .from("xp_transactions")
    .select("created_at, metadata")
    .eq("user_id", supabaseUserId)
    .eq("metadata->>isStreakActivity", "true")
    .gte("created_at", startDate.toISOString())
    .order("created_at", { ascending: false });

  const dates = new Set<string>();
  
  for (const tx of transactions || []) {
    const metadata = tx.metadata || {};
    const date = metadata.date || (tx.created_at ? formatDate(new Date(tx.created_at)) : null);
    if (date) {
      dates.add(date);
    }
  }
  
  return Array.from(dates).sort().reverse(); // Most recent first
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
