// app/api/omega/goals/route.ts
// CRUD for Omega Prime life goals

export const dynamic = "force-dynamic";

import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { withCompatTelemetry } from "@/lib/compat/withCompatTelemetry";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import type { GoalType, GoalStatus, TimeHorizon } from "@/lib/omega/types";

export async function GET(req: Request) {
  const gate = await requireOpsAuth();
  if (!gate.ok || !gate.canon) return Response.json(gate, { status: gate.status });

  return withCompatTelemetry({
    req: req as any,
    userIdUuid: gate.canon.userIdUuid,
    clerkUserId: gate.canon.clerkUserId,
    eventName: "api.omega.goals.get",
    handler: async () => {
      const url = new URL(req.url);
      const status = url.searchParams.get("status") || "active";
      const goalType = url.searchParams.get("type");

      const supabase = getSupabaseAdminRuntimeClient();

      let query = supabase
        .from("pulse_goals")
        .select("*")
        .eq("user_id", gate.canon.clerkUserId)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (status !== "all") {
        query = query.eq("status", status);
      }

      if (goalType) {
        query = query.eq("goal_type", goalType);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Build goal hierarchy
      const goals = (data || []).map((g: any) => ({
        id: g.id,
        goalType: g.goal_type,
        title: g.title,
        description: g.description,
        targetState: g.target_state,
        currentState: g.current_state,
        timeHorizon: g.time_horizon,
        priority: g.priority,
        progress: g.progress,
        status: g.status,
        parentGoalId: g.parent_goal_id,
        createdAt: g.created_at,
        updatedAt: g.updated_at,
      }));

      return Response.json({ ok: true, goals });
    },
  });
}

export async function POST(req: Request) {
  const gate = await requireOpsAuth();
  if (!gate.ok || !gate.canon) return Response.json(gate, { status: gate.status });

  return withCompatTelemetry({
    req: req as any,
    userIdUuid: gate.canon.userIdUuid,
    clerkUserId: gate.canon.clerkUserId,
    eventName: "api.omega.goals.post",
    handler: async () => {
      const body = await req.json();
      const {
        goalType,
        title,
        description,
        targetState,
        currentState,
        timeHorizon,
        priority = 5,
        parentGoalId,
      } = body;

      if (!goalType || !title || !targetState) {
        return Response.json(
          { ok: false, error: "Missing required fields: goalType, title, targetState" },
          { status: 400 }
        );
      }

      const supabase = getSupabaseAdminRuntimeClient();

      const { data, error } = await supabase
        .from("pulse_goals")
        .insert({
          user_id: gate.canon.clerkUserId,
          goal_type: goalType as GoalType,
          title,
          description,
          target_state: targetState,
          current_state: currentState || {},
          time_horizon: timeHorizon as TimeHorizon,
          priority,
          progress: 0,
          status: "active",
          parent_goal_id: parentGoalId,
        })
        .select()
        .single();

      if (error) throw error;

      return Response.json({ ok: true, goal: data });
    },
  });
}

export async function PATCH(req: Request) {
  const gate = await requireOpsAuth();
  if (!gate.ok || !gate.canon) return Response.json(gate, { status: gate.status });

  return withCompatTelemetry({
    req: req as any,
    userIdUuid: gate.canon.userIdUuid,
    clerkUserId: gate.canon.clerkUserId,
    eventName: "api.omega.goals.patch",
    handler: async () => {
      const body = await req.json();
      const { goalId, ...updates } = body;

      if (!goalId) {
        return Response.json(
          { ok: false, error: "Missing required field: goalId" },
          { status: 400 }
        );
      }

      const supabase = getSupabaseAdminRuntimeClient();

      // Map camelCase to snake_case
      const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (updates.title) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.targetState) dbUpdates.target_state = updates.targetState;
      if (updates.currentState) dbUpdates.current_state = updates.currentState;
      if (updates.timeHorizon) dbUpdates.time_horizon = updates.timeHorizon;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
      if (updates.status) dbUpdates.status = updates.status;

      const { data, error } = await supabase
        .from("pulse_goals")
        .update(dbUpdates)
        .eq("id", goalId)
        .eq("user_id", gate.canon.clerkUserId)
        .select()
        .single();

      if (error) throw error;

      return Response.json({ ok: true, goal: data });
    },
  });
}
