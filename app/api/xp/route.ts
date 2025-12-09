// Pulse OS - XP Ascension API Route
// app/api/xp/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import {
  XPCategory,
  XP_CATEGORIES,
  IdentityType,
  IDENTITIES,
  ACTIVITY_XP_MAP,
  getXPForLevel,
  getLevelFromXP,
  getLevelProgress,
  calculateAscensionLevel,
  SKILL_TREES,
} from '@/lib/xp/types';
import {
  XPState,
  XPGain,
  createInitialXPState,
  calculateXPGain,
  applyXPGain,
  openCritWindow,
  checkCritWindowExpiry,
  getXPStats,
  detectActivity,
  createAnimationData,
} from '@/lib/xp/engine';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// We'll store XP state in a Notion database or use localStorage on client
// For now, we'll calculate from activity data

// GET - Fetch current XP state
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('history') === 'true';
    
    // Calculate XP from Notion data
    const xpState = await calculateXPFromNotion();
    const stats = getXPStats(xpState);
    
    // Get recent XP history if requested
    let history: any[] = [];
    if (includeHistory) {
      history = await getXPHistory();
    }
    
    return NextResponse.json({
      success: true,
      state: xpState,
      stats,
      history,
      categories: XP_CATEGORIES,
      identities: IDENTITIES,
    });
  } catch (error) {
    console.error('XP fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch XP' },
      { status: 500 }
    );
  }
}

// POST - Award XP for an activity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { activity, description, forceCrit, customMultiplier } = body;
    
    // Get current state
    const currentState = await calculateXPFromNotion();
    
    // Determine activity type
    let activityType = activity;
    if (!activityType && description) {
      activityType = detectActivity(description);
    }
    
    if (!activityType) {
      return NextResponse.json({
        success: false,
        error: 'Could not determine activity type',
      }, { status: 400 });
    }
    
    // Calculate XP gain
    const gain = calculateXPGain(activityType, currentState, {
      forceCrit,
      customMultiplier,
    });
    
    if (!gain) {
      return NextResponse.json({
        success: false,
        error: 'Unknown activity type',
      }, { status: 400 });
    }
    
    // Apply gain to state
    const newState = applyXPGain(currentState, gain);
    
    // Log to Notion XP Log database (if it exists)
    await logXPGain(gain, description || activityType);
    
    // Create animation data
    const animation = createAnimationData(gain, currentState, newState);
    
    return NextResponse.json({
      success: true,
      gain,
      newState,
      animation,
      message: generateXPMessage(gain),
    });
  } catch (error) {
    console.error('XP award error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to award XP' },
      { status: 500 }
    );
  }
}

// ============================================
// NOTION INTEGRATION
// ============================================

async function calculateXPFromNotion(): Promise<XPState> {
  const state = createInitialXPState();
  
  try {
    // Check if XP Log database exists
    const xpLogDbId = process.env.XP_LOG_DB;
    
    if (xpLogDbId) {
      // Fetch from dedicated XP log
      const response = await notion.databases.query({
        database_id: xpLogDbId,
        sorts: [{ property: 'Date', direction: 'descending' }],
        page_size: 100,
      });
      
      const today = new Date().toDateString();
      
      for (const page of response.results as any[]) {
        const props = page.properties;
        
        const category = props.Category?.select?.name as XPCategory;
        const amount = props.Amount?.number || 0;
        const dateStr = props.Date?.date?.start;
        const date = dateStr ? new Date(dateStr) : null;
        
        if (category && XP_CATEGORIES[category]) {
          state.totals[category] += amount;
          
          // Track today's XP
          if (date && date.toDateString() === today) {
            state.todayXP[category] += amount;
          }
        }
        
        // Track identity resonance
        const identities = props.Identities?.multi_select || [];
        for (const id of identities) {
          if (IDENTITIES[id.name as IdentityType]) {
            state.identityResonance[id.name as IdentityType] += amount;
          }
        }
      }
    } else {
      // Calculate from existing databases (habits, tasks, deals)
      await calculateXPFromActivity(state);
    }
    
    // Calculate levels from totals
    for (const category of Object.keys(XP_CATEGORIES) as XPCategory[]) {
      state.levels[category] = getLevelFromXP(state.totals[category]);
    }
    
    // Calculate Ascension Level
    state.ascensionLevel = calculateAscensionLevel(state.levels);
    
    // Determine active identity
    let highestResonance = 0;
    for (const [identity, resonance] of Object.entries(state.identityResonance)) {
      if (resonance > highestResonance && resonance >= 500) {
        highestResonance = resonance;
        state.activeIdentity = identity as IdentityType;
      }
    }
    
    // Check for unlocked skills
    for (const [category, skills] of Object.entries(SKILL_TREES)) {
      const level = state.levels[category as XPCategory];
      for (const skill of skills) {
        if (level >= skill.levelRequired) {
          state.unlockedSkills.push(skill.id);
        }
      }
    }
    
    state.lastUpdated = new Date().toISOString();
    
  } catch (error) {
    console.error('Error calculating XP from Notion:', error);
  }
  
  return state;
}

async function calculateXPFromActivity(state: XPState): Promise<void> {
  const today = new Date().toDateString();
  
  // Habits → DXP + MXP
  const habitsDbId = process.env.HABITS_DB;
  if (habitsDbId) {
    try {
      const habits = await notion.databases.query({
        database_id: habitsDbId,
        page_size: 100,
      });
      
      for (const page of habits.results as any[]) {
        const props = page.properties;
        const streak = props.Streak?.number || props['Current Streak']?.number || 0;
        const completedToday = props['Completed Today']?.checkbox || false;
        
        // Base XP per habit with streak
        const habitXP = 15 + (streak * 2);
        state.totals.DXP += habitXP * Math.min(streak, 30); // Cap multiplier
        state.totals.MXP += streak * 5;
        
        if (completedToday) {
          state.todayXP.DXP += 15;
          state.todayXP.MXP += 5;
        }
        
        // Track streak for momentum
        if (streak > state.currentStreak) {
          state.currentStreak = streak;
        }
        if (streak > state.longestStreak) {
          state.longestStreak = streak;
        }
        
        // Identity resonance
        state.identityResonance.Warrior += streak * 3;
        state.identityResonance.Samurai += streak * 2;
      }
    } catch (e) {
      console.error('Error fetching habits for XP:', e);
    }
  }
  
  // Tasks → DXP + AXP
  const tasksDbId = process.env.TASKS_DB;
  if (tasksDbId) {
    try {
      const tasks = await notion.databases.query({
        database_id: tasksDbId,
        filter: {
          or: [
            { property: 'Status', status: { equals: 'Done' } },
            { property: 'Status', select: { equals: 'Done' } },
          ]
        },
        page_size: 100,
      });
      
      for (const page of tasks.results as any[]) {
        const props = page.properties;
        const priority = props.Priority?.select?.name || 'Medium';
        
        let taskXP = 25;
        if (priority === 'High' || priority === '🔴 High') taskXP = 40;
        if (priority === 'Low' || priority === '🟢 Low') taskXP = 15;
        
        state.totals.DXP += taskXP;
        state.totals.AXP += Math.round(taskXP * 0.5);
        
        // Identity
        state.identityResonance.Builder += taskXP;
        if (priority === 'High' || priority === '🔴 High') {
          state.identityResonance.Warrior += 20;
        }
      }
    } catch (e) {
      console.error('Error fetching tasks for XP:', e);
    }
  }
  
  // Deals → AXP + PXP
  const dealsDbId = process.env.DEALS_DB;
  if (dealsDbId) {
    try {
      const deals = await notion.databases.query({
        database_id: dealsDbId,
        page_size: 100,
      });
      
      for (const page of deals.results as any[]) {
        const props = page.properties;
        const stage = props.Stage?.status?.name || props.Stage?.select?.name || '';
        const value = props['Loan Amount']?.number || props.Value?.number || 0;
        
        // XP based on stage
        const stageXP: Record<string, number> = {
          'Lead': 10,
          'Contacted': 20,
          'Application': 40,
          'Processing': 60,
          'Underwriting': 80,
          'Approved': 100,
          'Docs Out': 120,
          'Funded': 200,
          'Closed Won': 200,
        };
        
        const dealXP = stageXP[stage] || 10;
        state.totals.AXP += dealXP;
        
        // Bigger deals = more PXP (leadership/influence)
        if (value > 500000) {
          state.totals.PXP += 50;
          state.identityResonance.Leader += 30;
        } else if (value > 100000) {
          state.totals.PXP += 25;
        }
        
        // Identity
        state.identityResonance.Builder += dealXP;
        state.identityResonance.Strategist += Math.round(dealXP * 0.5);
        
        if (stage === 'Funded' || stage === 'Closed Won') {
          state.identityResonance.Leader += 50;
        }
      }
    } catch (e) {
      console.error('Error fetching deals for XP:', e);
    }
  }
}

async function logXPGain(gain: XPGain, description: string): Promise<void> {
  const xpLogDbId = process.env.XP_LOG_DB;
  if (!xpLogDbId) return;
  
  try {
    await notion.pages.create({
      parent: { database_id: xpLogDbId },
      properties: {
        Name: { title: [{ text: { content: description } }] },
        Category: { select: { name: gain.category } },
        Amount: { number: gain.finalXP },
        Activity: { select: { name: gain.activity } },
        'Was Crit': { checkbox: gain.wasCrit },
        Date: { date: { start: new Date().toISOString().split('T')[0] } },
        Identities: { 
          multi_select: gain.identitiesRewarded.map(id => ({ name: id }))
        },
      },
    });
  } catch (e) {
    console.error('Error logging XP:', e);
  }
}

async function getXPHistory(): Promise<any[]> {
  const xpLogDbId = process.env.XP_LOG_DB;
  if (!xpLogDbId) return [];
  
  try {
    const response = await notion.databases.query({
      database_id: xpLogDbId,
      sorts: [{ property: 'Date', direction: 'descending' }],
      page_size: 20,
    });
    
    return response.results.map((page: any) => ({
      id: page.id,
      description: page.properties.Name?.title?.[0]?.plain_text || '',
      category: page.properties.Category?.select?.name,
      amount: page.properties.Amount?.number || 0,
      activity: page.properties.Activity?.select?.name,
      wasCrit: page.properties['Was Crit']?.checkbox || false,
      date: page.properties.Date?.date?.start,
      identities: page.properties.Identities?.multi_select?.map((s: any) => s.name) || [],
    }));
  } catch (e) {
    console.error('Error fetching XP history:', e);
    return [];
  }
}

// ============================================
// MESSAGE GENERATION
// ============================================

function generateXPMessage(gain: XPGain): string {
  const categoryInfo = XP_CATEGORIES[gain.category];
  const messages: string[] = [];
  
  // Base message
  if (gain.wasCrit) {
    messages.push(`⚡ CRITICAL HIT! +${gain.finalXP} ${categoryInfo.name}`);
  } else {
    messages.push(`+${gain.finalXP} ${categoryInfo.name}`);
  }
  
  // Multiplier breakdown
  const multipliers: string[] = [];
  if (gain.multipliers.identity > 1) {
    multipliers.push(`Identity: ×${gain.multipliers.identity.toFixed(1)}`);
  }
  if (gain.multipliers.streak > 1) {
    multipliers.push(`Streak: ×${gain.multipliers.streak.toFixed(1)}`);
  }
  if (multipliers.length > 0) {
    messages.push(`(${multipliers.join(', ')})`);
  }
  
  // Level up
  if (gain.levelUp) {
    messages.push(`🎉 ${categoryInfo.name} LEVEL UP → ${gain.newLevel}!`);
  }
  
  // Skill unlock
  if (gain.skillsUnlocked.length > 0) {
    messages.push(`🔓 Skill Unlocked: ${gain.skillsUnlocked[0]}`);
  }
  
  return messages.join(' ');
}