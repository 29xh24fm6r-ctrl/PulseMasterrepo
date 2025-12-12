// Squad World Engine - Experience v5
// lib/experience/squad-world.ts

import { supabaseAdmin } from "@/lib/supabase";

export interface SquadWorldTile {
  id: string;
  type: "mission" | "streak" | "ritual" | "member";
  label: string;
  status?: string;
  progressPercent?: number;
}

export interface SquadWorldState {
  squadId: string;
  name: string;
  members: Array<{
    userId: string;
    displayName: string;
    status: "online" | "focus" | "away";
  }>;
  missions: Array<{
    id: string;
    title: string;
    status: string;
    memberProgress: Array<{
      userId: string;
      progressPercent: number;
      status: string;
    }>;
  }>;
  tiles: SquadWorldTile[];
}

/**
 * Build squad world state
 */
export async function buildSquadWorldState(
  userId: string,
  squadId: string
): Promise<SquadWorldState> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  // Load squad
  const { data: squad } = await supabaseAdmin
    .from("squads")
    .select("*")
    .eq("id", squadId)
    .single();

  if (!squad) {
    throw new Error("Squad not found");
  }

  // Load members
  const { data: members } = await supabaseAdmin
    .from("squad_members")
    .select("*, users:user_id(id, display_name)")
    .eq("squad_id", squadId);

  // Load presence
  const { data: presence } = await supabaseAdmin
    .from("squad_presence")
    .select("*")
    .eq("squad_id", squadId);

  // Load missions
  const { data: missions } = await supabaseAdmin
    .from("squad_missions")
    .select("*")
    .eq("squad_id", squadId)
    .in("status", ["active", "planned"]);

  // Load mission progress
  const missionProgress: Record<string, any[]> = {};
  for (const mission of missions || []) {
    const { data: progress } = await supabaseAdmin
      .from("squad_mission_members")
      .select("*")
      .eq("squad_mission_id", mission.id);

    missionProgress[mission.id] = progress || [];
  }

  // Build members array
  const membersArray = (members || []).map((m: any) => {
    const pres = (presence || []).find((p) => p.user_id === m.user_id);
    return {
      userId: m.user_id,
      displayName: m.users?.display_name || "Unknown",
      status: (pres?.status as "online" | "focus" | "away") || "away",
    };
  });

  // Build missions array
  const missionsArray = (missions || []).map((mission) => ({
    id: mission.id,
    title: mission.title,
    status: mission.status,
    memberProgress: (missionProgress[mission.id] || []).map((mp: any) => ({
      userId: mp.user_id,
      progressPercent: mp.progress_percent,
      status: mp.status,
    })),
  }));

  // Build tiles
  const tiles: SquadWorldTile[] = [];

  // Mission tiles
  for (const mission of missionsArray) {
    const avgProgress =
      mission.memberProgress.reduce((sum, mp) => sum + mp.progressPercent, 0) /
      Math.max(1, mission.memberProgress.length);

    tiles.push({
      id: `mission_${mission.id}`,
      type: "mission",
      label: mission.title,
      status: mission.status,
      progressPercent: avgProgress,
    });
  }

  // Team streak tile (placeholder - would calculate from actual streak data)
  tiles.push({
    id: "team_streak",
    type: "streak",
    label: "Team Streak",
    status: "active",
    progressPercent: 75, // Would calculate from actual data
  });

  // Member tiles (optional - can be toggled)
  for (const member of membersArray.slice(0, 5)) {
    tiles.push({
      id: `member_${member.userId}`,
      type: "member",
      label: member.displayName,
      status: member.status,
    });
  }

  return {
    squadId,
    name: squad.name,
    members: membersArray,
    missions: missionsArray,
    tiles,
  };
}



