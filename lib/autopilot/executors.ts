// Autopilot Executors
// lib/autopilot/executors.ts

import { supabaseAdmin } from "@/lib/supabase";
import { AutopilotAction } from "./types";

/**
 * Execute action based on type - direct returns per case, no mutable state
 */
async function executeActionByType(
  action: AutopilotAction
): Promise<Record<string, any>> {
  switch (action.action_type) {
    case "email_followup":
      return await executeEmailFollowup(action);

    case "create_task":
      return await executeCreateTask(action);

    case "complete_task":
      return await executeCompleteTask(action);

    case "relationship_checkin":
      return await executeRelationshipCheckin(action);

    case "deal_nudge":
      return await executeDealNudge(action);

    case "meeting_prep":
      return await executeMeetingPrep(action);

    default:
      // Hard failure is correct here (unknown action type must not be silently ignored)
      throw new Error(`Unknown autopilot action type: ${action.action_type}`);
  }
}

/**
 * Execute an autopilot action
 */
export async function executeAutopilotAction(
  actionId: string
): Promise<{ success: boolean; result: Record<string, any> }> {
  // Load action
  const { data: action } = await supabaseAdmin
    .from("autopilot_actions")
    .select("*")
    .eq("id", actionId)
    .single();

  if (!action) {
    throw new Error("Action not found");
  }

  if (action.status === "executed") {
    return {
      success: true,
      result: action.execution_result || {},
    };
  }

  try {
    // Execute action - direct returns, no mutable state
    const result = await executeActionByType(action);

    // Update action status
    await supabaseAdmin
      .from("autopilot_actions")
      .update({
        status: "executed",
        executed_at: new Date().toISOString(),
        execution_result: result,
      })
      .eq("id", actionId);

    return { success: true, result };
  } catch (err) {
    // Provide action context without leaking sensitive payloads
    const message = err instanceof Error ? err.message : String(err);
    const errorMessage = `Autopilot executor failed for type="${action.action_type}": ${message}`;
    console.error(`[Autopilot] ${errorMessage}`, err);
    return {
      success: false,
      result: { error: message },
    };
  }
}

/**
 * Execute email followup action
 */
async function executeEmailFollowup(
  action: AutopilotAction
): Promise<Record<string, any>> {
  const payload = action.suggested_payload || {};
  const context = action.context;

  // Create a draft or task to follow up
  // For now, we'll create a task
  const { data: task } = await supabaseAdmin
    .from("tasks")
    .insert({
      user_id: action.user_id,
      title: `Follow up: ${context.subject || "Email"}`,
      description: payload.draft_body || `Follow up on email from ${context.from_address}`,
      status: "open",
      priority: action.risk_level === "high" ? "high" : "medium",
    })
    .select("*")
    .single();

  return {
    task_id: task?.id,
    type: "task_created",
  };
}

/**
 * Execute create task action
 */
async function executeCreateTask(
  action: AutopilotAction
): Promise<Record<string, any>> {
  const payload = action.suggested_payload || {};
  const context = action.context;

  const { data: task } = await supabaseAdmin
    .from("tasks")
    .insert({
      user_id: action.user_id,
      title: payload.title || context.title || "Task",
      description: payload.description || context.description || null,
      due_at: payload.due_at || context.due_at || null,
      status: "open",
      priority: payload.priority || context.priority || "medium",
      deal_id: context.deal_id || null,
    })
    .select("*")
    .single();

  return {
    task_id: task?.id,
    type: "task_created",
  };
}

/**
 * Execute complete task action
 */
async function executeCompleteTask(
  action: AutopilotAction
): Promise<Record<string, any>> {
  const context = action.context;

  if (!context.task_id) {
    throw new Error("task_id required");
  }

  await supabaseAdmin
    .from("tasks")
    .update({
      status: "done",
    })
    .eq("id", context.task_id)
    .eq("user_id", action.user_id);

  return {
    task_id: context.task_id,
    type: "task_completed",
  };
}

/**
 * Execute relationship checkin action
 */
async function executeRelationshipCheckin(
  action: AutopilotAction
): Promise<Record<string, any>> {
  const payload = action.suggested_payload || {};
  const context = action.context;

  // Create a task to reach out
  const { data: task } = await supabaseAdmin
    .from("tasks")
    .insert({
      user_id: action.user_id,
      title: `Check in: ${context.contact_name || "Contact"}`,
      description: payload.message_draft || `Reach out to ${context.contact_name}`,
      status: "open",
      priority: action.risk_level === "high" ? "high" : "medium",
    })
    .select("*")
    .single();

  return {
    task_id: task?.id,
    contact_id: context.contact_id,
    type: "task_created",
  };
}

/**
 * Execute deal nudge action
 */
async function executeDealNudge(
  action: AutopilotAction
): Promise<Record<string, any>> {
  const payload = action.suggested_payload || {};
  const context = action.context;

  // Create a task to nudge the deal
  const { data: task } = await supabaseAdmin
    .from("tasks")
    .insert({
      user_id: action.user_id,
      title: `Deal nudge: ${context.deal_name || "Deal"}`,
      description: payload.message_draft || `Follow up on ${context.deal_name}`,
      status: "open",
      priority: action.risk_level === "high" ? "high" : "medium",
      deal_id: context.deal_id || null,
    })
    .select("*")
    .single();

  return {
    task_id: task?.id,
    deal_id: context.deal_id,
    type: "task_created",
  };
}

/**
 * Execute meeting prep action
 */
async function executeMeetingPrep(
  action: AutopilotAction
): Promise<Record<string, any>> {
  const context = action.context;

  // Trigger meeting briefing generation (this will be handled by the meeting briefing API)
  // For now, create a task
  const { data: task } = await supabaseAdmin
    .from("tasks")
    .insert({
      user_id: action.user_id,
      title: `Prep for: ${context.event_title || "Meeting"}`,
      description: `Prepare briefing and notes for upcoming meeting`,
      status: "open",
      priority: "high",
    })
    .select("*")
    .single();

  return {
    task_id: task?.id,
    event_id: context.event_id,
    type: "task_created",
  };
}




