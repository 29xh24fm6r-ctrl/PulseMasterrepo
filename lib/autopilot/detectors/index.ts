// Detector Index - Runs all detectors
// lib/autopilot/detectors/index.ts

import { AutopilotCandidate } from "../types";
import { detectEmailFollowups } from "./emails";
import { detectTaskActions } from "./tasks";
import { detectDealActions } from "./deals";
import { detectRelationshipActions } from "./relationships";
import { detectMeetingActions } from "./meetings";

/**
 * Run all detectors and return combined candidates
 */
export async function runAllDetectors(
  userId: string
): Promise<AutopilotCandidate[]> {
  const [
    emailCandidates,
    taskCandidates,
    dealCandidates,
    relationshipCandidates,
    meetingCandidates,
  ] = await Promise.all([
    detectEmailFollowups(userId),
    detectTaskActions(userId),
    detectDealActions(userId),
    detectRelationshipActions(userId),
    detectMeetingActions(userId),
  ]);

  return [
    ...emailCandidates,
    ...taskCandidates,
    ...dealCandidates,
    ...relationshipCandidates,
    ...meetingCandidates,
  ];
}




