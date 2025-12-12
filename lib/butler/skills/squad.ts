// Butler Skills for Squads - Experience v5
// lib/butler/skills/squad.ts

import { buildSquadWorldState } from "@/lib/experience/squad-world";
import { callAI } from "@/lib/ai/call";

/**
 * Get squad status overview
 */
export async function getSquadStatusOverview(userId: string, squadId: string) {
  const state = await buildSquadWorldState(userId, squadId);

  // Identify risks
  const atRiskMissions = state.missions.filter((m) => {
    const avgProgress =
      m.memberProgress.reduce((sum, mp) => sum + mp.progressPercent, 0) /
      Math.max(1, m.memberProgress.length);
    return avgProgress < 30 && m.status === "active";
  });

  const behindMembers = state.missions
    .flatMap((m) =>
      m.memberProgress
        .filter((mp) => mp.progressPercent < 30)
        .map((mp) => ({
          userId: mp.userId,
          mission: m.title,
          progress: mp.progressPercent,
        }))
    )
    .filter((v, i, a) => a.findIndex((t) => t.userId === v.userId) === i);

  // Generate narrative
  const narrative = await callAI({
    userId,
    feature: "squad_status",
    systemPrompt: `You are Pulse Butler providing a squad status overview. Be concise and actionable.`,
    userPrompt: `Squad: ${state.name}
Active Missions: ${state.missions.length}
At Risk Missions: ${atRiskMissions.map((m) => m.title).join(", ")}
Members Behind: ${behindMembers.map((m) => m.userId).length}
Online Members: ${state.members.filter((m) => m.status === "online").length}

Provide a status overview and suggestions.`,
    maxTokens: 300,
  });

  return {
    narrative: narrative.response || "Squad status unavailable",
    atRiskMissions: atRiskMissions.map((m) => m.title),
    behindMembers: behindMembers.length,
    onlineMembers: state.members.filter((m) => m.status === "online").length,
  };
}

/**
 * Suggest next squad mission
 */
export async function suggestNextSquadMission(userId: string, squadId: string) {
  const state = await buildSquadWorldState(userId, squadId);

  // Analyze past missions and patterns
  const suggestions = await callAI({
    userId,
    feature: "squad_mission_suggestion",
    systemPrompt: `You are Pulse Butler suggesting squad missions. Provide 1-3 mission ideas with scope and timeline.`,
    userPrompt: `Squad: ${state.name}
Current Missions: ${state.missions.map((m) => m.title).join(", ")}
Members: ${state.members.length}

Suggest next squad mission ideas.`,
    maxTokens: 400,
  });

  return {
    suggestions: suggestions.response || "No suggestions available",
  };
}



