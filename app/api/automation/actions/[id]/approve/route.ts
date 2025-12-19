// app/api/automation/actions/[id]/approve/route.ts
// Sprint 4: Approve and execute an automation action
import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAutomationAction } from "@/lib/automation/audit";
import { createLogger } from "@/lib/obs/log";

const logger = createLogger({ source: "automation_approve" });

export const dynamic = "force-dynamic";

/**
 * POST /api/automation/actions/[id]/approve
 * 
 * Approves and executes an automation action.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
    const resolvedParams = params instanceof Promise ? await params : params;
    const actionId = resolvedParams.id;

    // Fetch action
    const { data: action, error: fetchError } = await supabaseAdmin
      .from("automation_actions")
      .select("*")
      .eq("id", actionId)
      .eq("user_id", supabaseUserId)
      .eq("status", "suggested")
      .single();

    if (fetchError || !action) {
      return NextResponse.json({ error: "Action not found or not suggested" }, { status: 404 });
    }

    // Execute action
    const result = await executeAction(action.action_type, action.action_payload, supabaseUserId, logger);

    // Update action
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("automation_actions")
      .update({
        status: "executed",
        approved_by_user: true,
        approved_at: new Date().toISOString(),
        executed_at: new Date().toISOString(),
        result,
      })
      .eq("id", actionId)
      .select("*")
      .single();

    if (updateError) throw updateError;

    // Log to audit
    await logAutomationAction({
      user_id: supabaseUserId,
      action_type: "automation_action",
      entity_type: action.action_type.includes("task") ? "task" : undefined,
      action: "execute",
      payload: action.action_payload,
      source: "automation",
      source_id: actionId,
      correlation_id: action.correlation_id || undefined,
    });

    return NextResponse.json({
      ok: true,
      action: updated,
    });
  } catch (err: any) {
    logger.error("Failed to approve action", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to approve action" },
      { status: 500 }
    );
  }
}

/**
 * Execute an automation action
 */
async function executeAction(
  actionType: string,
  payload: Record<string, any>,
  userId: string,
  actionLogger: ReturnType<typeof createLogger>
): Promise<Record<string, any>> {
  switch (actionType) {
    case "create_task":
      const { data: task, error: taskError } = await supabaseAdmin
        .from("tasks")
        .insert({
          user_id: userId,
          title: payload.title,
          notes: payload.notes || null,
          status: payload.status || "open",
          priority: payload.priority || 2,
          due_date: payload.due_date || null,
        })
        .select("*")
        .single();

      if (taskError) throw taskError;
      return { task_id: task.id };

    case "complete_task":
      const { data: completedTask, error: completeError } = await supabaseAdmin
        .from("tasks")
        .update({ status: "done" })
        .eq("id", payload.task_id)
        .eq("user_id", userId)
        .select("*")
        .single();

      if (completeError) throw completeError;
      return { task_id: completedTask.id };

    case "nudge_deal":
      // TODO: Implement deal nudge (could create a task or note)
      actionLogger.info("Deal nudge action", { deal_id: payload.deal_id });
      return { deal_id: payload.deal_id, action: "nudged" };

    default:
      throw new Error(`Unknown action type: ${actionType}`);
  }
}

