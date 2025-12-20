// app/api/philosophy/training/route.ts (migrated from Notion to Supabase)
import { canMakeAICall, trackAIUsage } from "@/lib/services/usage";
import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";
import OpenAI from "openai";
import { getSkillTreeById } from "@/lib/philosophy/skill-trees";
import { loadMentorWithKernel } from "@/app/lib/brain-loader";
import { awardXP } from "@/lib/xp/award";
import { checkAndUnlockAchievements } from "@/lib/philosophy/achievements";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Format date as YYYY-MM-DD
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

async function recordStreakActivity(supabaseUserId: string, activity: string, source: string): Promise<{ multiplier: number; streak: number }> {
  const today = getToday();
  
  // Record streak activity
  await supabaseAdmin
    .from("xp_transactions")
    .insert({
      user_id: supabaseUserId,
      amount: 0,
      source: source || "streak",
      description: `Activity: ${activity}`,
      metadata: {
        activity,
        isStreakActivity: true,
        date: today,
      },
    });
  
  // Calculate current streak
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
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
    if (date) dates.add(date);
  }
  
  // Count consecutive days
  let checkDate = today;
  let currentStreak = 0;
  const sortedDates = Array.from(dates).sort().reverse();
  
  for (const date of sortedDates) {
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
  
  return {
    multiplier: getStreakMultiplier(currentStreak),
    streak: currentStreak,
  };
}

interface TrainingRequest {
  treeId: string;
  skillId: string;
  userResponse: string;
  mentorId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
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
    const streakData = await recordStreakActivity(supabaseUserId, `skill_training:${skillId}`, 'skill_tree');
    
    // If passed, award XP
    let xpAwarded = null;
    let newAchievements: any[] = [];
    
    if (evaluation.passed) {
      try {
        // Calculate XP with streak multiplier
        const baseXP = skill.xpReward || 50;
        const xpResult = await awardXP('philosophy_skill_unlocked', {
          sourceType: "skill_tree",
          notes: `Mastered ${skill.name} in ${tree.name}`,
        });
        
        const totalBase = baseXP + (xpResult.xpAwarded || 0);
        const multipliedXP = Math.round(totalBase * streakData.multiplier);
        
        xpAwarded = {
          amount: multipliedXP,
          baseAmount: totalBase,
          category: 'IXP',
          streakMultiplier: streakData.multiplier,
          currentStreak: streakData.streak,
        };
        
        console.log(`🎉 Skill mastered: ${skill.name} | Base XP: ${totalBase} | Multiplier: ${streakData.multiplier}x | Final: ${multipliedXP}`);
        
        // Check for new achievements
        const result = await checkAndUnlockAchievements();
        if (result.ok) {
          newAchievements = result.newlyUnlocked;
        }
        
        if (newAchievements.length > 0) {
          console.log(`🏆 New achievements unlocked: ${newAchievements.map((a: any) => a.name || a.id).join(', ')}`);
        }
        
      } catch (error) {
        console.error('Failed to award XP:', error);
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
    features: ["skill_evaluation", "supabase_persistence", "streak_tracking", "xp_multipliers", "achievements"],
  });
}
