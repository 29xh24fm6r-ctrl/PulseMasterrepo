// Career Missions Engine
// lib/career/missions.ts

import { supabaseAdmin } from "@/lib/supabase";
import { evaluateCareerProgressForUser } from "./progress";

export interface MissionDefinition {
  type: "kpi_threshold" | "autopilot_actions_completed" | "custom";
  kpi_key?: string;
  target?: number;
  period?: "daily" | "weekly";
  action_type?: string;
  [key: string]: any;
}

/**
 * Seed default mission templates for a career level
 */
export async function seedDefaultMissionsForLevel(
  careerTrackId: string,
  levelId: string,
  levelIndex: number
): Promise<void> {
  // Check if missions already exist
  const { count } = await supabaseAdmin
    .from("career_missions")
    .select("*", { count: "exact", head: true })
    .eq("career_level_id", levelId);

  if ((count || 0) > 0) {
    return; // Already seeded
  }

  const missions: Array<{
    code: string;
    title: string;
    description: string;
    difficulty: string;
    recommended_frequency: string;
    definition: MissionDefinition;
    reward_xp: number;
  }> = [];

  if (levelIndex === 0) {
    // Rookie missions
    missions.push(
      {
        code: "daily_deep_work_60",
        title: "60 Minutes of Deep Work",
        description: "Complete 60 minutes of focused deep work on core pipeline tasks.",
        difficulty: "easy",
        recommended_frequency: "daily",
        definition: {
          type: "kpi_threshold",
          kpi_key: "daily_deep_work_hours",
          target: 1.0,
          period: "daily",
        },
        reward_xp: 50,
      },
      {
        code: "one_quality_touch",
        title: "One Quality Touch",
        description: "Make 1 meaningful touch to a key contact or relationship.",
        difficulty: "easy",
        recommended_frequency: "daily",
        definition: {
          type: "kpi_threshold",
          kpi_key: "relationship_outreach_count",
          target: 1,
          period: "daily",
        },
        reward_xp: 30,
      }
    );
  } else if (levelIndex === 1) {
    // Operator missions
    missions.push(
      {
        code: "pipeline_power_hour",
        title: "Pipeline Power Hour",
        description: "Make at least 10 deal-related touchpoints today.",
        difficulty: "medium",
        recommended_frequency: "daily",
        definition: {
          type: "kpi_threshold",
          kpi_key: "deal_touchpoints_count",
          target: 10,
          period: "daily",
        },
        reward_xp: 100,
      },
      {
        code: "inbox_risk_zero",
        title: "Inbox Risk Zero",
        description: "Clear all high-risk communications (reduce Autopilot attention score to 0).",
        difficulty: "medium",
        recommended_frequency: "daily",
        definition: {
          type: "autopilot_actions_completed",
          action_type: "email_followup",
          target: 5,
        },
        reward_xp: 75,
      }
    );
  } else if (levelIndex === 2) {
    // Pro missions
    missions.push(
      {
        code: "relationship_triage",
        title: "Relationship Triage",
        description: "Make 3 quality check-ins across A/B tier relationships.",
        difficulty: "medium",
        recommended_frequency: "weekly",
        definition: {
          type: "kpi_threshold",
          kpi_key: "relationship_outreach_count",
          target: 3,
          period: "daily",
        },
        reward_xp: 150,
      }
    );
  } else if (levelIndex === 3) {
    // Elite missions
    missions.push(
      {
        code: "strategy_block",
        title: "Strategy Block",
        description: "60 minutes of strategic thinking/planning on top 3 deals.",
        difficulty: "hard",
        recommended_frequency: "weekly",
        definition: {
          type: "kpi_threshold",
          kpi_key: "daily_deep_work_hours",
          target: 1.0,
          period: "daily",
        },
        reward_xp: 200,
      }
    );
  } else if (levelIndex === 4) {
    // Legend missions
    missions.push(
      {
        code: "industry_insight_session",
        title: "Industry Insight Session",
        description: "Deep dive an industry trend and record insight in Third Brain.",
        difficulty: "hard",
        recommended_frequency: "weekly",
        definition: {
          type: "custom",
          requires_third_brain_note: true,
        },
        reward_xp: 300,
      }
    );
  }

  // Insert missions
  for (const mission of missions) {
    await supabaseAdmin.from("career_missions").insert({
      career_track_id: careerTrackId,
      career_level_id: levelId,
      code: mission.code,
      title: mission.title,
      description: mission.description,
      difficulty: mission.difficulty,
      recommended_frequency: mission.recommended_frequency,
      definition: mission.definition,
    });
  }
}

/**
 * Assign daily career missions
 */
export async function assignDailyCareerMissions(
  userId: string,
  date: Date = new Date()
): Promise<void> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Evaluate progress to get current level
  const progress = await evaluateCareerProgressForUser(userId, date);

  // Get user's career progress
  const { data: userProgress } = await supabaseAdmin
    .from("user_career_progress")
    .select("career_track_id, current_level_id")
    .eq("user_id", dbUserId)
    .single();

  if (!userProgress) {
    return;
  }

  // Get missions for current level
  const { data: missions } = await supabaseAdmin
    .from("career_missions")
    .select("*")
    .eq("career_track_id", userProgress.career_track_id)
    .eq("career_level_id", progress.currentLevel.id)
    .in("recommended_frequency", ["daily", "weekly"]);

  if (!missions || missions.length === 0) {
    // Seed missions if none exist
    await seedDefaultMissionsForLevel(
      userProgress.career_track_id,
      progress.currentLevel.id,
      progress.currentLevel.index
    );

    // Reload missions
    const { data: reloadedMissions } = await supabaseAdmin
      .from("career_missions")
      .select("*")
      .eq("career_track_id", userProgress.career_track_id)
      .eq("career_level_id", progress.currentLevel.id)
      .in("recommended_frequency", ["daily", "weekly"]);

    if (!reloadedMissions || reloadedMissions.length === 0) {
      return;
    }

    // Assign missions
    for (const mission of reloadedMissions) {
      const dateStr = date.toISOString().split("T")[0];

      // Check if already assigned for this date
      const { count } = await supabaseAdmin
        .from("user_career_missions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", dbUserId)
        .eq("career_mission_id", mission.id)
        .eq("assigned_date", dateStr);

      if ((count || 0) === 0) {
        // Calculate due date (daily = same day, weekly = +7 days)
        const dueDate = new Date(date);
        if (mission.recommended_frequency === "weekly") {
          dueDate.setDate(dueDate.getDate() + 7);
        }

        await supabaseAdmin.from("user_career_missions").insert({
          user_id: dbUserId,
          career_mission_id: mission.id,
          status: "assigned",
          assigned_date: dateStr,
          due_date: dueDate.toISOString().split("T")[0],
          reward_xp: 100, // Default reward, can be customized per mission
        });
      }
    }
  } else {
    // Assign existing missions
    for (const mission of missions) {
      const dateStr = date.toISOString().split("T")[0];

      // Check if already assigned for this date
      const { count } = await supabaseAdmin
        .from("user_career_missions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", dbUserId)
        .eq("career_mission_id", mission.id)
        .eq("assigned_date", dateStr);

      if ((count || 0) === 0) {
        // Calculate due date
        const dueDate = new Date(date);
        if (mission.recommended_frequency === "weekly") {
          dueDate.setDate(dueDate.getDate() + 7);
        }

        await supabaseAdmin.from("user_career_missions").insert({
          user_id: dbUserId,
          career_mission_id: mission.id,
          status: "assigned",
          assigned_date: dateStr,
          due_date: dueDate.toISOString().split("T")[0],
          reward_xp: 100,
        });
      }
    }
  }
}

/**
 * Evaluate mission completion
 */
export async function evaluateMissionCompletion(
  userCareerMissionId: string
): Promise<{ completed: boolean; rewardXP: number }> {
  // Load mission instance
  const { data: missionInstance } = await supabaseAdmin
    .from("user_career_missions")
    .select("*, career_missions(*)")
    .eq("id", userCareerMissionId)
    .single();

  if (!missionInstance || missionInstance.status === "completed") {
    return { completed: false, rewardXP: 0 };
  }

  const mission = (missionInstance.career_missions as any) || {};
  const definition = (mission.definition as MissionDefinition) || {};

  // Get user's database ID
  const userId = missionInstance.user_id;

  let completed = false;

  if (definition.type === "kpi_threshold") {
    // Check job scorecard for the assigned date
    const { data: scorecard } = await supabaseAdmin
      .from("job_scorecards")
      .select("kpi_values")
      .eq("user_id", userId)
      .eq("scorecard_date", missionInstance.assigned_date)
      .maybeSingle();

    if (scorecard && scorecard.kpi_values) {
      const kpiValue = scorecard.kpi_values[definition.kpi_key || ""] || 0;
      const target = definition.target || 0;
      completed = kpiValue >= target;
    }
  } else if (definition.type === "autopilot_actions_completed") {
    // Count autopilot actions
    const startOfDay = new Date(missionInstance.assigned_date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(missionInstance.assigned_date);
    endOfDay.setHours(23, 59, 59, 999);

    const { count } = await supabaseAdmin
      .from("autopilot_actions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("action_type", definition.action_type)
      .eq("status", "executed")
      .gte("executed_at", startOfDay.toISOString())
      .lte("executed_at", endOfDay.toISOString());

    const target = definition.target || 0;
    completed = (count || 0) >= target;
  } else if (definition.type === "custom") {
    // Custom missions - for now, mark as not completed
    // Can be extended with specific logic
    completed = false;
  }

  if (completed) {
    // Update mission status
    await supabaseAdmin
      .from("user_career_missions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", userCareerMissionId);

    // Award XP if reward_xp > 0
    const rewardXP = missionInstance.reward_xp || 0;
    if (rewardXP > 0) {
      try {
        // Try to insert into xp_transactions
        await supabaseAdmin.from("xp_transactions").insert({
          user_id: userId,
          amount: rewardXP,
          category: "career_mission",
          description: `Completed mission: ${mission.title}`,
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        // XP table might not exist or have different schema, ignore
        console.warn("[CareerMissions] XP table not found or insert failed, skipping reward:", err);
      }
    }

    return { completed: true, rewardXP };
  }

  return { completed: false, rewardXP: 0 };
}

