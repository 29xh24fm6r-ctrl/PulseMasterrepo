import { NextRequest, NextResponse } from "next/server";
import { BADGES, Badge, UnlockedBadge, AchievementState, getBadgeById, RARITY_CONFIG } from "@/lib/achievements/badges";

// Storage key for localStorage (client-side) or could be Notion
const ACHIEVEMENTS_STORAGE_KEY = "pulse_achievements";

// GET - Fetch achievement state and check for new unlocks
export async function GET(req: NextRequest) {
  try {
    // In a real app, fetch user stats from Notion/database
    // For now, we'll generate mock progress data
    const userStats = await fetchUserStats();
    
    // Get current achievement state (from query or generate fresh)
    const currentState = getInitialState();
    
    // Check for newly unlocked badges
    const { newlyUnlocked, updatedState } = checkForUnlocks(currentState, userStats);
    
    // Calculate progress for all badges
    const badgesWithProgress = BADGES.map((badge) => {
      const isUnlocked = updatedState.unlockedBadges.some((ub) => ub.badgeId === badge.id);
      const progress = calculateProgress(badge, userStats);
      const unlockedData = updatedState.unlockedBadges.find((ub) => ub.badgeId === badge.id);
      
      return {
        ...badge,
        isUnlocked,
        progress,
        unlockedAt: unlockedData?.unlockedAt || null,
        rarityConfig: RARITY_CONFIG[badge.rarity],
      };
    });

    // Group by category
    const byCategory: Record<string, typeof badgesWithProgress> = {};
    for (const badge of badgesWithProgress) {
      if (!byCategory[badge.category]) {
        byCategory[badge.category] = [];
      }
      byCategory[badge.category].push(badge);
    }

    // Calculate totals
    const totalUnlocked = updatedState.unlockedBadges.length;
    const totalBadges = BADGES.length;
    const totalXpFromBadges = updatedState.unlockedBadges.reduce((sum, ub) => {
      const badge = getBadgeById(ub.badgeId);
      return sum + (badge?.xpReward || 0);
    }, 0);

    // Rarity breakdown
    const rarityBreakdown = {
      common: { unlocked: 0, total: 0 },
      uncommon: { unlocked: 0, total: 0 },
      rare: { unlocked: 0, total: 0 },
      epic: { unlocked: 0, total: 0 },
      legendary: { unlocked: 0, total: 0 },
    };

    for (const badge of BADGES) {
      rarityBreakdown[badge.rarity].total++;
      if (updatedState.unlockedBadges.some((ub) => ub.badgeId === badge.id)) {
        rarityBreakdown[badge.rarity].unlocked++;
      }
    }

    return NextResponse.json({
      ok: true,
      badges: badgesWithProgress,
      byCategory,
      newlyUnlocked,
      stats: {
        totalUnlocked,
        totalBadges,
        totalXpFromBadges,
        completionPercentage: Math.round((totalUnlocked / totalBadges) * 100),
        rarityBreakdown,
      },
      state: updatedState,
    });
  } catch (error) {
    console.error("Achievements error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to fetch achievements" },
      { status: 500 }
    );
  }
}

// POST - Manually unlock a badge (for special badges)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { badgeId, action } = body;

    if (action === "unlock" && badgeId) {
      const badge = getBadgeById(badgeId);
      if (!badge) {
        return NextResponse.json({ ok: false, error: "Badge not found" }, { status: 404 });
      }

      // In a real app, save to database
      const unlockedBadge: UnlockedBadge = {
        badgeId,
        unlockedAt: new Date().toISOString(),
      };

      return NextResponse.json({
        ok: true,
        unlocked: {
          ...badge,
          unlockedAt: unlockedBadge.unlockedAt,
          rarityConfig: RARITY_CONFIG[badge.rarity],
        },
        xpAwarded: badge.xpReward,
      });
    }

    return NextResponse.json({ ok: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Achievement unlock error:", error);
    return NextResponse.json(
      { ok: false, error: "Failed to unlock achievement" },
      { status: 500 }
    );
  }
}

// Helper: Get initial state (would come from database in real app)
function getInitialState(): AchievementState {
  // Mock: Some badges already unlocked for demo
  return {
    unlockedBadges: [
      { badgeId: "xp_1000", unlockedAt: "2024-11-15T10:00:00Z" },
      { badgeId: "xp_5000", unlockedAt: "2024-11-20T14:30:00Z" },
      { badgeId: "tasks_10", unlockedAt: "2024-11-10T09:00:00Z" },
      { badgeId: "tasks_50", unlockedAt: "2024-11-25T16:45:00Z" },
      { badgeId: "streak_7", unlockedAt: "2024-11-18T08:00:00Z" },
      { badgeId: "journal_first", unlockedAt: "2024-11-08T20:00:00Z" },
      { badgeId: "identity_first_action", unlockedAt: "2024-11-12T11:30:00Z" },
      { badgeId: "deal_first", unlockedAt: "2024-11-22T15:00:00Z" },
      { badgeId: "special_early_adopter", unlockedAt: "2024-11-01T00:00:00Z" },
    ],
    totalBadges: BADGES.length,
    totalXpFromBadges: 0,
    lastUnlocked: "special_early_adopter",
  };
}

// Helper: Fetch user stats (would come from Notion in real app)
async function fetchUserStats(): Promise<Record<string, number>> {
  // Mock user stats - in production, fetch from Notion/database
  return {
    total_xp: 8500,
    daily_xp: 320,
    streak_days: 12,
    tasks_completed: 67,
    high_priority_tasks: 15,
    deals_closed: 3,
    deals_total_value: 45000,
    identity_actions: 25,
    archetypes_activated: 0,
    archetypes_discovered: 4,
    total_resonance: 750,
    north_star_set: 1,
    perfect_habit_days: 5,
    habit_completions: 85,
    single_habit_streak: 18,
    journal_entries: 12,
    badges_unlocked: 9,
    crit_count: 22,
    late_night_tasks: 4,
    weekend_xp: 650,
  };
}

// Helper: Calculate progress for a badge
function calculateProgress(badge: Badge, stats: Record<string, number>): number {
  const currentValue = stats[badge.requirement.type] || 0;
  return Math.min(100, Math.round((currentValue / badge.requirement.threshold) * 100));
}

// Helper: Check for newly unlocked badges
function checkForUnlocks(
  currentState: AchievementState,
  stats: Record<string, number>
): { newlyUnlocked: Badge[]; updatedState: AchievementState } {
  const newlyUnlocked: Badge[] = [];
  const updatedBadges = [...currentState.unlockedBadges];

  for (const badge of BADGES) {
    // Skip if already unlocked
    if (currentState.unlockedBadges.some((ub) => ub.badgeId === badge.id)) {
      continue;
    }

    // Check if threshold met
    const currentValue = stats[badge.requirement.type] || 0;
    if (currentValue >= badge.requirement.threshold) {
      newlyUnlocked.push(badge);
      updatedBadges.push({
        badgeId: badge.id,
        unlockedAt: new Date().toISOString(),
      });
    }
  }

  return {
    newlyUnlocked,
    updatedState: {
      ...currentState,
      unlockedBadges: updatedBadges,
      lastUnlocked: newlyUnlocked.length > 0 ? newlyUnlocked[newlyUnlocked.length - 1].id : currentState.lastUnlocked,
    },
  };
}
