import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { 
  ALL_ACHIEVEMENTS, 
  Achievement, 
  AchievementCondition,
  getAchievementById,
  RARITY_COLORS 
} from "@/lib/philosophy/achievements";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const ACHIEVEMENTS_DB = process.env.NOTION_DATABASE_ACHIEVEMENTS || "";
const SKILL_PROGRESS_DB = process.env.NOTION_DATABASE_SKILL_PROGRESS || "";
const STREAKS_DB = process.env.NOTION_DATABASE_STREAKS || "";

// In-memory cache
let cachedAchievements: string[] = [];
let lastFetch = 0;

interface ProgressData {
  streak: number;
  skillsMastered: number;
  treesWithMastery: string[];
  completedTrees: string[];
  masteredSkillIds: string[];
}

/**
 * GET - Get achievements and check for new unlocks
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkNew = searchParams.get('check') === 'true';
    
    // Get unlocked achievements
    const unlocked = await getUnlockedAchievements();
    
    // Optionally check for new achievements
    let newlyUnlocked: Achievement[] = [];
    if (checkNew) {
      const progress = await getProgressData();
      newlyUnlocked = await checkAndUnlockAchievements(progress, unlocked);
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
    const body = await request.json();
    const { action, achievementId } = body;
    
    if (action === 'check') {
      const unlocked = await getUnlockedAchievements();
      const progress = await getProgressData();
      const newlyUnlocked = await checkAndUnlockAchievements(progress, unlocked);
      
      return NextResponse.json({
        ok: true,
        newlyUnlocked: newlyUnlocked.map(a => ({
          ...a,
          colors: RARITY_COLORS[a.rarity],
        })),
      });
    }
    
    if (action === 'unlock' && achievementId) {
      const achievement = getAchievementById(achievementId);
      if (!achievement) {
        return NextResponse.json({ ok: false, error: 'Achievement not found' }, { status: 404 });
      }
      
      await unlockAchievement(achievementId);
      
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

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getUnlockedAchievements(): Promise<string[]> {
  // Use cache if recent
  if (Date.now() - lastFetch < 30000 && cachedAchievements.length > 0) {
    return cachedAchievements;
  }
  
  const unlocked: string[] = [];
  
  if (ACHIEVEMENTS_DB) {
    try {
      const response = await notion.databases.query({
        database_id: ACHIEVEMENTS_DB.replace(/-/g, ''),
        page_size: 100,
      });
      
      for (const page of response.results as any[]) {
        const id = page.properties['Achievement ID']?.title?.[0]?.plain_text;
        if (id) unlocked.push(id);
      }
      
      cachedAchievements = unlocked;
      lastFetch = Date.now();
    } catch (error) {
      console.error('Failed to fetch achievements from Notion:', error);
    }
  }
  
  return unlocked;
}

async function unlockAchievement(achievementId: string): Promise<void> {
  const achievement = getAchievementById(achievementId);
  if (!achievement) return;
  
  if (ACHIEVEMENTS_DB) {
    try {
      // Check if already unlocked
      const existing = await notion.databases.query({
        database_id: ACHIEVEMENTS_DB.replace(/-/g, ''),
        filter: {
          property: 'Achievement ID',
          title: { equals: achievementId },
        },
        page_size: 1,
      });
      
      if (existing.results.length === 0) {
        await notion.pages.create({
          parent: { database_id: ACHIEVEMENTS_DB.replace(/-/g, '') },
          properties: {
            'Achievement ID': { title: [{ text: { content: achievementId } }] },
            'Name': { rich_text: [{ text: { content: achievement.name } }] },
            'Category': { select: { name: achievement.category } },
            'Rarity': { select: { name: achievement.rarity } },
            'XP Reward': { number: achievement.xpReward },
            'Unlocked At': { date: { start: new Date().toISOString() } },
          },
        });
        
        console.log(`🏆 Achievement unlocked: ${achievement.name} (${achievement.rarity})`);
        
        // Update cache
        if (!cachedAchievements.includes(achievementId)) {
          cachedAchievements.push(achievementId);
        }
      }
    } catch (error) {
      console.error('Failed to save achievement to Notion:', error);
    }
  } else {
    // Memory fallback
    if (!cachedAchievements.includes(achievementId)) {
      cachedAchievements.push(achievementId);
    }
  }
}

async function getProgressData(): Promise<ProgressData> {
  const progress: ProgressData = {
    streak: 0,
    skillsMastered: 0,
    treesWithMastery: [],
    completedTrees: [],
    masteredSkillIds: [],
  };
  
  // Get streak
  if (STREAKS_DB) {
    try {
      const response = await notion.databases.query({
        database_id: STREAKS_DB.replace(/-/g, ''),
        filter: { property: 'Date', date: { past_month: {} } },
        sorts: [{ property: 'Date', direction: 'descending' }],
      });
      
      const dates = (response.results as any[])
        .map(p => p.properties['Date']?.date?.start)
        .filter(Boolean)
        .sort()
        .reverse();
      
      // Calculate streak
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      if (dates.includes(today) || dates.includes(yesterday)) {
        let checkDate = dates.includes(today) ? today : yesterday;
        for (const date of dates) {
          if (date === checkDate) {
            progress.streak++;
            const prev = new Date(checkDate);
            prev.setDate(prev.getDate() - 1);
            checkDate = prev.toISOString().split('T')[0];
          } else if (date < checkDate) {
            break;
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch streak:', error);
    }
  }
  
  // Get skill progress
  if (SKILL_PROGRESS_DB) {
    try {
      const response = await notion.databases.query({
        database_id: SKILL_PROGRESS_DB.replace(/-/g, ''),
        filter: { property: 'State', select: { equals: 'mastered' } },
        page_size: 100,
      });
      
      const treeSkillCount: Record<string, number> = {};
      const treeTotalSkills: Record<string, number> = {
        stoicism: 7, samurai: 7, taoism: 7, zen: 7, discipline: 7, effectiveness: 7,
      };
      
      for (const page of response.results as any[]) {
        const skillId = page.properties['Skill ID']?.title?.[0]?.plain_text;
        const treeId = page.properties['Tree ID']?.select?.name;
        
        if (skillId && treeId) {
          progress.masteredSkillIds.push(skillId);
          progress.skillsMastered++;
          
          if (!progress.treesWithMastery.includes(treeId)) {
            progress.treesWithMastery.push(treeId);
          }
          
          treeSkillCount[treeId] = (treeSkillCount[treeId] || 0) + 1;
        }
      }
      
      // Check completed trees
      for (const [treeId, count] of Object.entries(treeSkillCount)) {
        if (count >= (treeTotalSkills[treeId] || 7)) {
          progress.completedTrees.push(treeId);
        }
      }
    } catch (error) {
      console.error('Failed to fetch skill progress:', error);
    }
  }
  
  return progress;
}

async function checkAndUnlockAchievements(
  progress: ProgressData, 
  alreadyUnlocked: string[]
): Promise<Achievement[]> {
  const newlyUnlocked: Achievement[] = [];
  
  for (const achievement of ALL_ACHIEVEMENTS) {
    if (alreadyUnlocked.includes(achievement.id)) continue;
    
    const met = checkCondition(achievement.condition, progress);
    
    if (met) {
      await unlockAchievement(achievement.id);
      newlyUnlocked.push(achievement);
    }
  }
  
  return newlyUnlocked;
}

function checkCondition(condition: AchievementCondition, progress: ProgressData): boolean {
  switch (condition.type) {
    case 'streak':
      return progress.streak >= condition.value;
      
    case 'skills_mastered':
      return progress.skillsMastered >= condition.value;
      
    case 'tree_complete':
      if (condition.treeId) {
        return progress.completedTrees.includes(condition.treeId);
      }
      return progress.completedTrees.length >= condition.value;
      
    case 'trees_started':
      return progress.treesWithMastery.length >= condition.value;
      
    case 'specific':
      if (condition.skillIds) {
        return condition.skillIds.every(id => progress.masteredSkillIds.includes(id));
      }
      return false;
      
    default:
      return false;
  }
}
