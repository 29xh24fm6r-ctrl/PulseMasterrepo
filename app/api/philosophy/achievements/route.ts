// app/api/philosophy/achievements/route.ts (migrated from Notion to Supabase)
import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { 
  ALL_ACHIEVEMENTS, 
  Achievement, 
  getAchievementById,
  RARITY_COLORS,
  checkAndUnlockAchievements
} from "@/lib/philosophy/achievements";

/**
 * GET - Get achievements and check for new unlocks
 */
export async function GET(request: NextRequest) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
    const { searchParams } = new URL(request.url);
    const checkNew = searchParams.get('check') === 'true';
    
    // Get unlocked achievements from Supabase
    const { data: achievementsData } = await supabaseAdmin
      .from("achievements")
      .select("achievement_key")
      .eq("user_id", supabaseUserId);

    const unlocked = (achievementsData || []).map((a: any) => a.achievement_key);
    
    // Optionally check for new achievements
    let newlyUnlocked: Achievement[] = [];
    if (checkNew) {
      const result = await checkAndUnlockAchievements();
      if (result.ok) {
        newlyUnlocked = result.newlyUnlocked;
      }
    }
    
    // Build response with all achievements and their status
    const achievementsWithStatus = ALL_ACHIEVEMENTS
      .filter(a => !a.secret || unlocked.includes(a.id))
      .map(a => ({
        ...a,
        unlocked: unlocked.includes(a.id),
        rarity: a.rarity,
        colors: RARITY_COLORS[a.rarity],
      }));
    
    // Stats
    const stats = {
      total: ALL_ACHIEVEMENTS.filter(a => !a.secret).length,
      unlocked: unlocked.length,
      points: unlocked.reduce((sum, id) => {
        const a = getAchievementById(id);
        return sum + (a?.xpReward || 0);
      }, 0),
    };
    
    return NextResponse.json({
      ok: true,
      achievements: achievementsWithStatus,
      unlocked,
      newlyUnlocked: newlyUnlocked.map(a => ({
        ...a,
        colors: RARITY_COLORS[a.rarity],
      })),
      stats,
    });
    
  } catch (error: any) {
    console.error('Achievements API error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST - Manually trigger achievement check or unlock specific achievement
 */
export async function POST(request: NextRequest) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
    const body = await request.json();
    const { action, achievementId } = body;
    
    if (action === 'check') {
      const result = await checkAndUnlockAchievements();
      
      if (!result.ok) {
        return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
      }
      
      return NextResponse.json({
        ok: true,
        newlyUnlocked: result.newlyUnlocked,
      });
    }
    
    if (action === 'unlock' && achievementId) {
      const achievement = getAchievementById(achievementId);
      if (!achievement) {
        return NextResponse.json({ ok: false, error: 'Achievement not found' }, { status: 404 });
      }
      
      // Check if already unlocked
      const { data: existing } = await supabaseAdmin
        .from("achievements")
        .select("id")
        .eq("user_id", supabaseUserId)
        .eq("achievement_key", achievementId)
        .single();

      if (!existing) {
        await supabaseAdmin.from("achievements").insert({
          user_id: supabaseUserId,
          achievement_key: achievementId,
          title: achievement.title || achievementId,
          description: achievement.description || "",
          earned_at: new Date().toISOString(),
        });
      }
      
      return NextResponse.json({
        ok: true,
        achievement: {
          ...achievement,
          colors: RARITY_COLORS[achievement.rarity],
        },
      });
    }
    
    return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 });
    
  } catch (error: any) {
    console.error('Achievements API error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
