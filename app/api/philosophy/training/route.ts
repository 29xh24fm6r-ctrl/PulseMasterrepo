import { canMakeAICall, trackAIUsage } from "@/lib/services/usage";
import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import OpenAI from "openai";
import { getSkillTreeById } from "@/lib/philosophy/skill-trees";
import { loadMentorWithKernel } from "@/app/lib/brain-loader";
import { awardXP } from "@/lib/xp/award";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const SKILL_PROGRESS_DB = process.env.NOTION_DATABASE_SKILL_PROGRESS || "";
const STREAKS_DB = process.env.NOTION_DATABASE_STREAKS || "";

// ============================================
// STREAK FUNCTIONS
// ============================================

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function getToday(): string {
  return formatDate(new Date());
}

function getStreakMultiplier(streak: number): number {
  if (streak >= 30) return 2.0;
  if (streak >= 14) return 1.5;
  if (streak >= 7) return 1.25;
  if (streak >= 3) return 1.1;
  return 1.0;
}

async function recordStreakActivity(activity: string, source: string): Promise<{ multiplier: number; streak: number }> {
  const today = getToday();
  let currentStreak = 1;
  
  if (STREAKS_DB) {
    try {
      // Check if entry exists for today
      const existing = await notion.databases.query({
        database_id: STREAKS_DB.replace(/-/g, ''),
        filter: {
          property: 'Date',
          date: { equals: today },
        },
        page_size: 1,
      });
      
      if (existing.results.length > 0) {
        const page = existing.results[0] as any;
        const currentActivities = page.properties['Activities']?.rich_text?.[0]?.plain_text || '';
        const activitiesList = currentActivities ? currentActivities.split(', ') : [];
        
        if (!activitiesList.includes(activity)) {
          activitiesList.push(activity);
          await notion.pages.update({
            page_id: page.id,
            properties: {
              'Activities': { rich_text: [{ text: { content: activitiesList.join(', ') } }] },
              'Count': { number: activitiesList.length },
            },
          });
        }
      } else {
        await notion.pages.create({
          parent: { database_id: STREAKS_DB.replace(/-/g, '') },
          properties: {
            'Date': { date: { start: today } },
            'Activities': { rich_text: [{ text: { content: activity } }] },
            'Source': { select: { name: source } },
            'Count': { number: 1 },
          },
        });
      }
      
      // Calculate current streak
      const last30 = await notion.databases.query({
        database_id: STREAKS_DB.replace(/-/g, ''),
        filter: {
          property: 'Date',
          date: { past_month: {} },
        },
        sorts: [{ property: 'Date', direction: 'descending' }],
      });
      
      const dates = (last30.results as any[])
        .map(p => p.properties['Date']?.date?.start)
        .filter(Boolean);
      
      // Count consecutive days
      let checkDate = today;
      currentStreak = 0;
      
      for (const date of dates) {
        if (date === checkDate) {
          currentStreak++;
          const prev = new Date(checkDate);
          prev.setDate(prev.getDate() - 1);
          checkDate = formatDate(prev);
        } else if (date < checkDate) {
          break;
        }
      }
      
      console.log(`📊 Streak recorded: ${currentStreak} days | Activity: ${activity}`);
      
    } catch (error) {
      console.error('Streak recording failed:', error);
    }
  }
  
  return {
    multiplier: getStreakMultiplier(currentStreak),
    streak: currentStreak,
  };
}

// ============================================
// SKILL PROGRESS FUNCTIONS
// ============================================

async function updateSkillProgress(treeId: string, skillId: string, state: 'in_progress' | 'mastered') {
  console.log(`📝 Updating skill progress: ${treeId}/${skillId} -> ${state}`);
  
  if (!SKILL_PROGRESS_DB) {
    console.log('⚠️ No SKILL_PROGRESS_DB configured, skipping Notion update');
    return;
  }
  
  try {
    const existing = await notion.databases.query({
      database_id: SKILL_PROGRESS_DB.replace(/-/g, ''),
      filter: {
        and: [
          { property: 'Skill ID', title: { equals: skillId } },
          { property: 'Tree ID', select: { equals: treeId } },
        ],
      },
      page_size: 1,
    });
    
    if (existing.results.length > 0) {
      await notion.pages.update({
        page_id: existing.results[0].id,
        properties: {
          'State': { select: { name: state } },
          ...(state === 'mastered' ? { 'Mastered At': { date: { start: new Date().toISOString() } } } : {}),
        },
      });
      console.log(`✅ Updated existing skill in Notion: ${skillId}`);
    } else {
      await notion.pages.create({
        parent: { database_id: SKILL_PROGRESS_DB.replace(/-/g, '') },
        properties: {
          'Skill ID': { title: [{ text: { content: skillId } }] },
          'Tree ID': { select: { name: treeId } },
          'State': { select: { name: state } },
          'Started At': { date: { start: new Date().toISOString() } },
          ...(state === 'mastered' ? { 'Mastered At': { date: { start: new Date().toISOString() } } } : {}),
        },
      });
      console.log(`✅ Created new skill in Notion: ${skillId}`);
    }
  } catch (error) {
    console.error('❌ Notion update failed:', error);
  }
}

// ============================================
// ACHIEVEMENT CHECK (via internal API call)
// ============================================

async function checkAchievements(baseUrl: string): Promise<any[]> {
  try {
    const res = await fetch(`${baseUrl}/api/philosophy/achievements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check' }),
    });
    const data = await res.json();
    return data.newlyUnlocked || [];
  } catch (error) {
    console.error('Achievement check failed:', error);
    return [];
  }
}

// ============================================
// MAIN API HANDLER
// ============================================

interface TrainingRequest {
  treeId: string;
  skillId: string;
  userResponse: string;
  mentorId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: TrainingRequest = await request.json();
    const { treeId, skillId, userResponse, mentorId } = body;
    
    if (!treeId || !skillId || !userResponse) {
      return NextResponse.json(
        { ok: false, error: 'treeId, skillId, and userResponse required' },
        { status: 400 }
      );
    }
    
    const tree = getSkillTreeById(treeId);
    const skill = tree?.skills.find(s => s.id === skillId);
    
    if (!tree || !skill) {
      return NextResponse.json(
        { ok: false, error: 'Tree or skill not found' },
        { status: 404 }
      );
    }
    
    // Get mentor brain if available
    const primaryMentorId = mentorId || tree.mentorIds[0];
    let brainContent = '';
    try {
      brainContent = await loadMentorWithKernel(primaryMentorId);
    } catch {
      // Continue without brain content
    }
    
    // Build evaluation prompt
    const systemPrompt = `You are a Philosophy Mentor evaluating a student's training exercise.

${brainContent ? `## MENTOR KNOWLEDGE\n${brainContent}\n\n---\n\n` : ''}

## SKILL BEING TRAINED
**Skill:** ${skill.name}
**Description:** ${skill.description}
**Training Prompt:** ${skill.trainingPrompt}
**Mastery Requirement:** ${skill.masteryRequirement}

## YOUR TASK
Evaluate the student's response. Determine if they have demonstrated the skill.

## EVALUATION CRITERIA
1. Did they engage genuinely with the prompt?
2. Did they demonstrate understanding of the core concept?
3. Did they meet the mastery requirement?

## RESPONSE FORMAT
Respond with a JSON object (no markdown):
{
  "passed": true/false,
  "feedback": "2-3 sentences of feedback in the mentor's voice",
  "encouragement": "1 sentence of encouragement",
  "nextStep": "If failed, what should they try differently"
}

Be encouraging but honest. The goal is growth, not validation.
Respond ONLY with valid JSON, no other text.`;

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Student's response to "${skill.trainingPrompt}":\n\n${userResponse}` },
    ];
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });
    
    const responseText = completion.choices[0]?.message?.content || '';
    
    // Parse JSON response
    let evaluation;
    try {
      const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      evaluation = JSON.parse(cleanJson);
    } catch {
      evaluation = {
        passed: false,
        feedback: "I couldn't fully evaluate your response. Let's try again with more detail.",
        encouragement: "Every attempt is progress.",
        nextStep: "Try to be more specific and personal in your response.",
      };
    }
    
    // Record streak activity (always, even if not passed)
    const streakData = await recordStreakActivity(`skill_training:${skillId}`, 'skill_tree');
    
    // If passed, award XP and update progress
    let xpAwarded = null;
    let newAchievements: any[] = [];
    
    if (evaluation.passed) {
      try {
        // Update skill progress
        await updateSkillProgress(treeId, skillId, 'mastered');
        
        // Calculate XP with streak multiplier
        const baseXP = skill.xpReward;
        const xpResult = await awardXP('philosophy_skill_unlocked', 'skill_tree', {
          notes: `Mastered ${skill.name} in ${tree.name}`,
        });
        
        const totalBase = baseXP + xpResult.amount;
        const multipliedXP = Math.round(totalBase * streakData.multiplier);
        
        xpAwarded = {
          amount: multipliedXP,
          baseAmount: totalBase,
          category: 'IXP',
          wasCrit: xpResult.wasCrit,
          streakMultiplier: streakData.multiplier,
          currentStreak: streakData.streak,
        };
        
        console.log(`🎉 Skill mastered: ${skill.name} | Base XP: ${totalBase} | Multiplier: ${streakData.multiplier}x | Final: ${multipliedXP}`);
        
        // Check for new achievements
        const baseUrl = new URL(request.url).origin;
        newAchievements = await checkAchievements(baseUrl);
        
        if (newAchievements.length > 0) {
          console.log(`🏆 New achievements unlocked: ${newAchievements.map(a => a.name).join(', ')}`);
        }
        
      } catch (error) {
        console.error('Failed to update progress or award XP:', error);
      }
    }
    
    return NextResponse.json({
      ok: true,
      evaluation,
      skill: {
        id: skill.id,
        name: skill.name,
        xpReward: skill.xpReward,
      },
      xpAwarded,
      streak: {
        current: streakData.streak,
        multiplier: streakData.multiplier,
      },
      newAchievements,
    });
    
  } catch (error: any) {
    console.error('Training API error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    name: "Pulse Philosophy Training API",
    version: "3.0",
    features: ["skill_evaluation", "notion_persistence", "streak_tracking", "xp_multipliers", "achievements"],
  });
}
