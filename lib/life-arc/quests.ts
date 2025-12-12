// Life Arc Quest Generation
// lib/life-arc/quests.ts

import { supabaseAdmin } from "@/lib/supabase";
import { llmComplete } from "@/lib/llm/client";
import { LifeArc, LifeArcQuest, UserModelSnapshot } from "./model";

/**
 * Generate quests for a life arc
 */
export async function generateArcQuests(
  arc: LifeArc,
  userModel: UserModelSnapshot
): Promise<LifeArcQuest[]> {
  const prompt = `Generate 3-7 concrete, actionable quests for this Life Arc:

Arc: ${arc.name}
Description: ${arc.description || ""}
Key: ${arc.key}

User Context:
- Career Level: ${userModel.careerLevel || "unknown"}
- Emotion State: ${userModel.emotionState || "neutral"}
- Stress Score: ${userModel.stressScore || 0}

Output JSON array:
[
  {
    "title": "Short quest title",
    "description": "What this quest involves",
    "difficulty": 1-5,
    "impact": 1-5,
    "source_hint": "career|confidant|sales|finance|identity",
    "due_days": number of days from now (optional)
  },
  ...
]

Make quests:
- Specific and actionable
- Aligned with the arc's purpose
- Not duplicating existing career missions or habits
- Varied in difficulty (mix of easy wins and bigger challenges)
- High impact for moving the arc forward`;

  try {
    const response = await llmComplete(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.7,
      json: true,
      max_tokens: 800,
    });

    // Extract JSON from markdown code fences if present
    function extractJson(text: string): any {
      const cleaned = text
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      return JSON.parse(cleaned);
    }

    const parsed = typeof response === "string" ? extractJson(response) : response;
    const quests = Array.isArray(parsed) ? parsed : [];

    // Save quests to database
    const savedQuests: LifeArcQuest[] = [];

    for (const quest of quests.slice(0, 7)) {
      // Calculate due date if provided
      let dueDate: string | undefined;
      if (quest.due_days) {
        const due = new Date();
        due.setDate(due.getDate() + quest.due_days);
        dueDate = due.toISOString().split("T")[0];
      }

      const { data: saved } = await supabaseAdmin
        .from("life_arc_quests")
        .insert({
          arc_id: arc.id,
          title: quest.title || "Untitled Quest",
          description: quest.description || undefined,
          difficulty: Math.max(1, Math.min(5, quest.difficulty || 1)),
          impact: Math.max(1, Math.min(5, quest.impact || 1)),
          source_hint: quest.source_hint || undefined,
          due_date: dueDate,
          status: "open",
        })
        .select("*")
        .single();

      if (saved) {
        savedQuests.push({
          id: saved.id,
          arcId: saved.arc_id,
          title: saved.title,
          description: saved.description || undefined,
          status: saved.status as any,
          dueDate: saved.due_date || undefined,
          difficulty: saved.difficulty,
          impact: saved.impact,
          sourceHint: saved.source_hint || undefined,
        });
      }
    }

    return savedQuests;
  } catch (err) {
    console.error(`[LifeArcQuests] Failed to generate quests for arc ${arc.id}:`, err);
    // Return default quests
    return generateDefaultQuests(arc);
  }
}

/**
 * Generate default quests if LLM fails
 */
function generateDefaultQuests(arc: LifeArc): LifeArcQuest[] {
  const defaults: Record<LifeArcKey, Array<{ title: string; description: string; difficulty: number; impact: number }>> = {
    healing: [
      { title: "Journal with Confidant 3 times this week", description: "Regular emotional check-ins", difficulty: 2, impact: 4 },
      { title: "Do one small act of self-care daily for 7 days", description: "Build self-care habits", difficulty: 1, impact: 3 },
      { title: "Identify and write down 3 triggers", description: "Understand what causes stress", difficulty: 2, impact: 4 },
    ],
    emotional_stability: [
      { title: "Maintain emotional journal for 14 days", description: "Track emotional patterns", difficulty: 2, impact: 3 },
      { title: "Practice stress management technique daily", description: "Build resilience", difficulty: 2, impact: 4 },
    ],
    career_level_up: [
      { title: "Complete Career Missions 5 days in a row", description: "Build consistency", difficulty: 3, impact: 5 },
      { title: "Schedule 2 deep-work blocks per week", description: "Focus on pipeline work", difficulty: 2, impact: 4 },
      { title: "Have honest conversation with manager", description: "Align expectations", difficulty: 4, impact: 5 },
    ],
    career_transition: [
      { title: "Research target role requirements", description: "Understand next level", difficulty: 2, impact: 4 },
      { title: "Build skills gap analysis", description: "Identify development areas", difficulty: 3, impact: 4 },
    ],
    financial_reset: [
      { title: "Create monthly budget", description: "Track income and expenses", difficulty: 2, impact: 4 },
      { title: "Reduce one major expense", description: "Cut unnecessary spending", difficulty: 3, impact: 5 },
    ],
    relationship_restore: [
      { title: "Have one honest conversation", description: "Address key issues", difficulty: 4, impact: 5 },
      { title: "Practice active listening daily", description: "Improve communication", difficulty: 2, impact: 3 },
    ],
    performance_push: [
      { title: "Close 2 key deals this month", description: "Focus on high-value opportunities", difficulty: 4, impact: 5 },
      { title: "Systematize pipeline process", description: "Create repeatable workflow", difficulty: 3, impact: 4 },
    ],
    identity_rebuild: [
      { title: "Clarify top 5 core values", description: "Define what matters most", difficulty: 3, impact: 5 },
      { title: "Align daily actions with values", description: "Live authentically", difficulty: 3, impact: 4 },
    ],
    health_rebuild: [
      { title: "Establish sleep schedule", description: "Prioritize rest", difficulty: 2, impact: 4 },
      { title: "Add one healthy habit", description: "Build foundation", difficulty: 2, impact: 3 },
    ],
    custom: [
      { title: "Make progress on your goal", description: "Take one step forward", difficulty: 2, impact: 3 },
    ],
  };

  const arcDefaults = defaults[arc.key] || defaults.custom;

  return arcDefaults.map((q, idx) => ({
    id: `default-${arc.id}-${idx}`,
    arcId: arc.id,
    title: q.title,
    description: q.description,
    status: "open" as const,
    difficulty: q.difficulty,
    impact: q.impact,
  }));
}

/**
 * Get open quests for arc
 */
export async function getArcQuests(arcId: string): Promise<LifeArcQuest[]> {
  const { data } = await supabaseAdmin
    .from("life_arc_quests")
    .select("*")
    .eq("arc_id", arcId)
    .in("status", ["open", "in_progress"])
    .order("impact", { ascending: false })
    .order("due_date", { ascending: true });

  if (!data) return [];

  return data.map((q) => ({
    id: q.id,
    arcId: q.arc_id,
    title: q.title,
    description: q.description || undefined,
    status: q.status as any,
    dueDate: q.due_date || undefined,
    difficulty: q.difficulty,
    impact: q.impact,
    sourceHint: q.source_hint || undefined,
  }));
}

/**
 * Complete a quest
 */
export async function completeQuest(questId: string): Promise<void> {
  await supabaseAdmin
    .from("life_arc_quests")
    .update({
      status: "done",
      updated_at: new Date().toISOString(),
    })
    .eq("id", questId);
}


