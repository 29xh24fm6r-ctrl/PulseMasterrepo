// Guild Engine
// lib/guilds/engine.ts

import { supabaseAdmin } from "@/lib/supabase";
import { getUserTrailingAverageScore } from "@/lib/scoreboard/global";

export interface EligibleGuild {
  id: string;
  code: string;
  name: string;
  description: string | null;
  min_level_index: number | null;
  min_score: number | null;
  isEligible: boolean;
  eligibilityReason: string;
}

/**
 * Ensure default guilds exist for a job
 */
export async function ensureDefaultGuildsForJob(
  jobGraphNodeId: string
): Promise<void> {
  // Check if guilds already exist
  const { count } = await supabaseAdmin
    .from("guilds")
    .select("*", { count: "exact", head: true })
    .eq("job_graph_node_id", jobGraphNodeId);

  if ((count || 0) > 0) {
    return; // Already seeded
  }

  // Create default guilds
  const guilds = [
    {
      code: "elite_closers",
      name: "Elite Closers",
      description: "Top performers operating at Elite level or above",
      min_level_index: 3, // Elite
      min_score: 0.75,
      is_open: true,
    },
    {
      code: "rising_producers",
      name: "Rising Producers",
      description: "Consistent growth-focused performers",
      min_level_index: 1, // Operator
      min_score: 0.5,
      is_open: true,
    },
    {
      code: "discipline_guild",
      name: "Discipline Guild",
      description: "Focused on building consistent daily habits",
      min_level_index: 0, // Rookie
      min_score: 0.4,
      is_open: true,
    },
  ];

  for (const guild of guilds) {
    await supabaseAdmin.from("guilds").insert({
      job_graph_node_id: jobGraphNodeId,
      ...guild,
    });
  }
}

/**
 * Get eligible guilds for user
 */
export async function getEligibleGuildsForUser(
  userId: string
): Promise<EligibleGuild[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Get user's job profile
  const { data: jobProfile } = await supabaseAdmin
    .from("user_job_profiles")
    .select("job_node_id")
    .eq("user_id", dbUserId)
    .eq("is_active", true)
    .maybeSingle();

  if (!jobProfile || !jobProfile.job_node_id) {
    return [];
  }

  // Ensure guilds exist
  await ensureDefaultGuildsForJob(jobProfile.job_node_id);

  // Get user's career level
  const { data: progress } = await supabaseAdmin
    .from("user_career_progress")
    .select("current_level_index")
    .eq("user_id", dbUserId)
    .maybeSingle();

  const userLevelIndex = progress?.current_level_index || 0;

  // Get trailing average score
  const trailingScore = await getUserTrailingAverageScore(userId, 7);

  // Get all guilds for this job
  const { data: guilds } = await supabaseAdmin
    .from("guilds")
    .select("*")
    .eq("job_graph_node_id", jobProfile.job_node_id)
    .eq("is_open", true);

  if (!guilds || guilds.length === 0) {
    return [];
  }

  // Check eligibility for each guild
  const eligible: EligibleGuild[] = [];

  for (const guild of guilds) {
    const meetsLevel =
      guild.min_level_index === null || userLevelIndex >= guild.min_level_index;
    const meetsScore =
      guild.min_score === null ||
      (trailingScore !== null && trailingScore >= guild.min_score);

    const isEligible = meetsLevel && meetsScore;

    let reason = "";
    if (isEligible) {
      reason = "You meet all requirements";
    } else {
      const reasons: string[] = [];
      if (!meetsLevel) {
        reasons.push(
          `Requires level ${guild.min_level_index || 0}, you're at ${userLevelIndex}`
        );
      }
      if (!meetsScore) {
        reasons.push(
          `Requires ${Math.round((guild.min_score || 0) * 100)}% score, you're at ${trailingScore ? Math.round(trailingScore * 100) : "N/A"}%`
        );
      }
      reason = reasons.join(". ");
    }

    eligible.push({
      id: guild.id,
      code: guild.code,
      name: guild.name,
      description: guild.description,
      min_level_index: guild.min_level_index,
      min_score: guild.min_score,
      isEligible,
      eligibilityReason: reason,
    });
  }

  return eligible;
}

/**
 * Join a guild
 */
export async function joinGuild(
  userId: string,
  guildId: string
): Promise<{ success: boolean; message: string }> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Re-check eligibility
  const eligible = await getEligibleGuildsForUser(userId);
  const guild = eligible.find((g) => g.id === guildId);

  if (!guild) {
    return { success: false, message: "Guild not found" };
  }

  if (!guild.isEligible) {
    return {
      success: false,
      message: `Not eligible: ${guild.eligibilityReason}`,
    };
  }

  // Check if already a member
  const { data: existing } = await supabaseAdmin
    .from("user_guild_memberships")
    .select("id")
    .eq("user_id", dbUserId)
    .eq("guild_id", guildId)
    .maybeSingle();

  if (existing) {
    return { success: false, message: "Already a member" };
  }

  // Join guild
  await supabaseAdmin.from("user_guild_memberships").insert({
    user_id: dbUserId,
    guild_id: guildId,
    role: "member",
  });

  return { success: true, message: `Joined ${guild.name}` };
}

/**
 * Compute guild scorecards for a date
 */
export async function computeGuildScorecards(date: Date): Promise<void> {
  const dateStr = date.toISOString().split("T")[0];

  // Get all guilds
  const { data: guilds } = await supabaseAdmin.from("guilds").select("id, job_graph_node_id");

  if (!guilds || guilds.length === 0) {
    return;
  }

  for (const guild of guilds) {
    // Get members
    const { data: members } = await supabaseAdmin
      .from("user_guild_memberships")
      .select("user_id")
      .eq("guild_id", guild.id);

    if (!members || members.length === 0) {
      // No members, create empty scorecard
      await supabaseAdmin
        .from("guild_scorecards")
        .upsert(
          {
            guild_id: guild.id,
            date: dateStr,
            member_count: 0,
            avg_score: null,
            top_score: null,
          },
          {
            onConflict: "guild_id,date",
          }
        );
      continue;
    }

    // Get job profiles for members (to find their job_node_id)
    const memberIds = members.map((m) => m.user_id);
    const { data: jobProfiles } = await supabaseAdmin
      .from("user_job_profiles")
      .select("user_id, job_node_id")
      .in("user_id", memberIds)
      .eq("is_active", true)
      .eq("job_node_id", guild.job_graph_node_id);

    const memberUserIds = (jobProfiles || []).map((p) => p.user_id);

    if (memberUserIds.length === 0) {
      continue;
    }

    // Get scorecards for members on this date
    const { data: scorecards } = await supabaseAdmin
      .from("job_scorecards")
      .select("overall_score")
      .in("user_id", memberUserIds)
      .eq("scorecard_date", dateStr)
      .not("overall_score", "is", null);

    if (!scorecards || scorecards.length === 0) {
      await supabaseAdmin
        .from("guild_scorecards")
        .upsert(
          {
            guild_id: guild.id,
            date: dateStr,
            member_count: memberUserIds.length,
            avg_score: null,
            top_score: null,
          },
          {
            onConflict: "guild_id,date",
          }
        );
      continue;
    }

    const scores = scorecards.map((sc) => sc.overall_score || 0);
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const topScore = Math.max(...scores);

    // Upsert guild scorecard
    await supabaseAdmin
      .from("guild_scorecards")
      .upsert(
        {
          guild_id: guild.id,
          date: dateStr,
          member_count: memberUserIds.length,
          avg_score: avgScore,
          top_score: topScore,
        },
        {
          onConflict: "guild_id,date",
        }
      );
  }
}




