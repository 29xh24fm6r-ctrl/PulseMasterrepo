// Autopilot Orchestrator
// lib/autopilot/orchestrator.ts

import { supabaseAdmin } from "@/lib/supabase";
import { llmComplete } from "@/lib/llm/client";
import { AutopilotMode, AutopilotCandidate, AutopilotAction } from "./types";
import { getAutopilotPolicy, isActionAllowed } from "./policy";
import { runAllDetectors } from "./detectors";
import { getCareerContextForAutopilot } from "@/lib/career/integrations";
import { handleAGIEvent } from "@/lib/agi/orchestrator";
import { taskOverdueTrigger, relationshipSignalTrigger } from "@/lib/agi/triggers";

/**
 * Run autopilot scan
 */
export async function runAutopilotScan(
  userId: string,
  mode?: AutopilotMode
): Promise<{
  runId: string;
  candidatesFound: number;
  actionsSuggested: number;
  actionsExecuted: number;
}> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // 1. Load policy
  const policy = await getAutopilotPolicy(userId);
  const effectiveMode = mode || policy.mode;

  if (effectiveMode === "off") {
    return {
      runId: "",
      candidatesFound: 0,
      actionsSuggested: 0,
      actionsExecuted: 0,
    };
  }

  // 2. Create run record
  const { data: run } = await supabaseAdmin
    .from("autopilot_runs")
    .insert({
      user_id: dbUserId,
      mode: effectiveMode,
      candidates_found: 0,
      actions_suggested: 0,
      actions_executed: 0,
      actions_dismissed: 0,
    })
    .select("*")
    .single();

  const runId = run?.id || "";

  // 3. Run detectors
  const candidates = await runAllDetectors(userId);
  const candidatesFound = candidates.length;

  // 3.5. Trigger AGI Kernel for major signals
  // Check for overdue task spike
  const overdueCandidates = candidates.filter((c) => c.type === "task_overdue" || c.type.includes("overdue"));
  if (overdueCandidates.length > 3) {
    try {
      await handleAGIEvent(userId, taskOverdueTrigger({
        overdueCount: overdueCandidates.length,
      }));
    } catch (agiErr) {
      console.warn("[Autopilot] AGI trigger failed:", agiErr);
    }
  }

  // Check for relationship signals
  const relationshipCandidates = candidates.filter((c) => c.type.includes("relationship"));
  if (relationshipCandidates.length > 0) {
    try {
      await handleAGIEvent(userId, relationshipSignalTrigger({
        atRiskCount: relationshipCandidates.filter((c) => c.riskLevel === "high").length,
      }));
    } catch (agiErr) {
      console.warn("[Autopilot] AGI trigger failed:", agiErr);
    }
  }

  // 4. Filter by policy and generate actions
  const currentHour = new Date().getHours();
  let actionsSuggested = 0;
  let actionsExecuted = 0;

  // Check daily limit
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count: todayActions } = await supabaseAdmin
    .from("autopilot_actions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", dbUserId)
    .gte("created_at", today.toISOString())
    .in("status", ["suggested", "approved", "executed"]);

  const remainingLimit = policy.daily_action_limit - (todayActions || 0);

  for (const candidate of candidates) {
    if (actionsSuggested >= remainingLimit) {
      break;
    }

    // Check if allowed
    if (
      !isActionAllowed(
        policy,
        candidate.type,
        candidate.riskLevel,
        currentHour
      )
    ) {
      continue;
    }

    // Generate action details using LLM (with career context)
    const actionDetails = await generateActionDetails(candidate, careerContext);

    // Insert action
    const { data: action } = await supabaseAdmin
      .from("autopilot_actions")
      .insert({
        user_id: dbUserId,
        action_type: candidate.type,
        risk_level: candidate.riskLevel,
        status: effectiveMode === "auto" && candidate.riskLevel === "low" ? "executed" : "suggested",
        context: candidate.context,
        suggested_summary: actionDetails.summary,
        suggested_payload: actionDetails.payload,
      })
      .select("*")
      .single();

    actionsSuggested++;

    // Execute if auto mode and low risk
    if (effectiveMode === "auto" && candidate.riskLevel === "low" && action) {
      // Execution will be handled separately, but we mark it here
      actionsExecuted++;
    }
  }

  // 5. Update run record
  await supabaseAdmin
    .from("autopilot_runs")
    .update({
      candidates_found: candidatesFound,
      actions_suggested: actionsSuggested,
      actions_executed: actionsExecuted,
      run_completed_at: new Date().toISOString(),
    })
    .eq("id", runId);

  return {
    runId,
    candidatesFound,
    actionsSuggested,
    actionsExecuted,
  };
}

/**
 * Generate action details using LLM
 */
async function generateActionDetails(
  candidate: AutopilotCandidate,
  careerContext?: any
): Promise<{ summary: string; payload: Record<string, any> }> {
  const careerInfo = careerContext
    ? `\n\nCareer Context:
- Current Level: ${careerContext.currentLevel}
- Active Missions: ${careerContext.activeMissions.map((m: any) => m.title).join(", ") || "None"}
Consider how this action might help complete active career missions.`
    : "";

  const prompt = `You are Pulse, an AI assistant generating an autopilot action.

Action Type: ${candidate.type}
Risk Level: ${candidate.riskLevel}
Context: ${JSON.stringify(candidate.context, null, 2)}${careerInfo}

Generate:
1. A concise summary (1-2 sentences) of what this action should do
2. A payload object with the specific details needed to execute this action

For example:
- email_followup: { draft_subject, draft_body }
- create_task: { title, description, due_at, priority }
- relationship_checkin: { message_draft, suggested_channel }
- deal_nudge: { message_draft, target_contact_id }
- meeting_prep: { briefing_notes }

Return JSON:
{
  "summary": "string",
  "payload": { ... }
}

Return ONLY valid JSON, no markdown.`;

  try {
    const response = await llmComplete({
      messages: [
        {
          role: "system",
          content: "You are Pulse, an AI assistant that generates actionable autopilot suggestions.",
        },
        { role: "user", content: prompt },
      ],
    });

    const cleaned = response.trim().replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return {
      summary: parsed.summary || candidate.summary || "Action needed",
      payload: parsed.payload || {},
    };
  } catch (err) {
    console.error("[Autopilot] LLM generation failed:", err);
    return {
      summary: candidate.summary || "Action needed",
      payload: {},
    };
  }
}

