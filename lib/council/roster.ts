// Council Roster Builder
// lib/council/roster.ts

import { CouncilMode, CouncilMember } from "./types";

export interface BuildCouncilRosterParams {
  mode: CouncilMode;
  primaryCoachId: string;
  userModel?: any;
}

/**
 * Build council roster based on mode
 */
export function buildCouncilRoster(
  params: BuildCouncilRosterParams
): CouncilMember[] {
  const { mode, primaryCoachId } = params;
  const roster: CouncilMember[] = [];

  switch (mode) {
    case "emotional_support":
      roster.push(
        { coachId: "confidant", role: "primary", weight: 1.5 },
        { coachId: "emotional", role: "secondary", weight: 1.2 },
        { coachId: "identity", role: "secondary", weight: 1.0 },
        { coachId: "career", role: "observer", weight: 0.5 }
      );
      break;

    case "advisory":
      roster.push(
        { coachId: primaryCoachId, role: "primary", weight: 1.5 },
        { coachId: "career", role: "secondary", weight: 1.2 },
        { coachId: "identity", role: "secondary", weight: 1.0 }
      );
      // Add simulation if available
      if (primaryCoachId !== "simulation") {
        roster.push({ coachId: "simulation", role: "secondary", weight: 1.0 });
      }
      break;

    case "performance":
      roster.push(
        { coachId: primaryCoachId, role: "primary", weight: 1.5 },
        { coachId: "autopilot", role: "secondary", weight: 1.2 },
        { coachId: "planner", role: "secondary", weight: 1.0 },
        { coachId: "identity", role: "observer", weight: 0.8 }
      );
      break;

    case "life_navigation":
      roster.push(
        { coachId: primaryCoachId === "identity" ? "identity" : "planner", role: "primary", weight: 1.5 },
        { coachId: "career", role: "secondary", weight: 1.2 },
        { coachId: "identity", role: "secondary", weight: 1.2 },
        { coachId: "confidant", role: "secondary", weight: 1.0 }
      );
      break;

    case "crisis":
      roster.push(
        { coachId: "confidant", role: "primary", weight: 1.8 },
        { coachId: "emotional", role: "secondary", weight: 1.5 }
      );
      break;

    default:
      // Fallback: just primary coach
      roster.push({ coachId: primaryCoachId, role: "primary", weight: 1.0 });
  }

  return roster;
}




