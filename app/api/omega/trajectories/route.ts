// app/api/omega/trajectories/route.ts
// Life trajectory projections

export const dynamic = "force-dynamic";

import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { withCompatTelemetry } from "@/lib/compat/withCompatTelemetry";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { executeOmegaPrompt } from "@/lib/omega/llm";
import { OMEGA_PROMPTS } from "@/lib/omega/prompts";

export async function GET(req: Request) {
  const gate = await requireOpsAuth();
  if (!gate.ok || !gate.canon) return Response.json(gate, { status: gate.status });

  return withCompatTelemetry({
    req: req as any,
    userIdUuid: gate.canon.userIdUuid,
    clerkUserId: gate.canon.clerkUserId,
    eventName: "api.omega.trajectories.get",
    handler: async () => {
      const url = new URL(req.url);
      const trajectoryType = url.searchParams.get("type");
      const limit = parseInt(url.searchParams.get("limit") || "10");

      const supabase = getSupabaseAdminRuntimeClient();

      let query = supabase
        .from("pulse_trajectories")
        .select("*")
        .eq("user_id", gate.canon.clerkUserId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (trajectoryType) {
        query = query.eq("trajectory_type", trajectoryType);
      }

      const { data, error } = await query;

      if (error) throw error;

      const trajectories = (data || []).map((t: any) => ({
        id: t.id,
        trajectoryType: t.trajectory_type,
        timeHorizon: t.time_horizon,
        startingState: t.starting_state,
        projectedMilestones: t.projected_milestones,
        projectedEndState: t.projected_end_state,
        confidence: t.confidence,
        assumptions: t.assumptions,
        risks: t.risks,
        opportunities: t.opportunities,
        createdAt: t.created_at,
      }));

      return Response.json({ ok: true, trajectories });
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
    eventName: "api.omega.trajectories.post",
    handler: async () => {
      const body = await req.json();
      const { timeHorizon = "1_year" } = body;

      const supabase = getSupabaseAdminRuntimeClient();

      // Gather context for trajectory projection
      const [goalsResult, eventsResult, connectionsResult, strategiesResult] = await Promise.all([
        supabase
          .from("pulse_goals")
          .select("*")
          .eq("user_id", gate.canon.clerkUserId)
          .eq("status", "active"),
        supabase
          .from("pulse_life_events")
          .select("*")
          .eq("user_id", gate.canon.clerkUserId)
          .order("occurred_at", { ascending: false })
          .limit(20),
        supabase
          .from("pulse_domain_connections")
          .select("*")
          .eq("user_id", gate.canon.clerkUserId),
        supabase
          .from("pulse_strategies")
          .select("*")
          .eq("user_id", gate.canon.clerkUserId)
          .eq("active", true)
          .limit(20),
      ]);

      const goals = goalsResult.data || [];
      const events = eventsResult.data || [];
      const connections = connectionsResult.data || [];
      const strategies = strategiesResult.data || [];

      // Build current state from goals
      const currentState: Record<string, any> = {};
      for (const goal of goals) {
        if (!currentState[goal.goal_type]) {
          currentState[goal.goal_type] = [];
        }
        currentState[goal.goal_type].push({
          title: goal.title,
          progress: goal.progress,
          priority: goal.priority,
        });
      }

      // Project trajectories using LLM
      const result = await executeOmegaPrompt<{
        trajectories: any[];
        recommended_focus: string;
        critical_decisions: string[];
      }>(OMEGA_PROMPTS.PROJECT_TRAJECTORY, {
        currentState,
        goals: goals.map((g: any) => ({
          type: g.goal_type,
          title: g.title,
          timeHorizon: g.time_horizon,
          progress: g.progress,
          priority: g.priority,
        })),
        events: events.map((e: any) => ({
          type: e.event_type,
          title: e.title,
          significance: e.significance,
          occurredAt: e.occurred_at,
        })),
        connections: connections.map((c: any) => ({
          domains: [c.domain_a, c.domain_b],
          type: c.connection_type,
          strength: c.strength,
        })),
        patterns: strategies.map((s: any) => ({
          type: s.strategy_type,
          pattern: s.pattern,
          confidence: s.confidence,
        })),
      });

      // Store trajectories
      const insertedTrajectories = [];
      for (const trajectory of result.trajectories) {
        const { data } = await supabase
          .from("pulse_trajectories")
          .insert({
            user_id: gate.canon.clerkUserId,
            trajectory_type: trajectory.type,
            time_horizon: timeHorizon,
            starting_state: currentState,
            projected_milestones: trajectory.milestones,
            projected_end_state: { description: trajectory.end_state },
            confidence: trajectory.confidence,
            assumptions: trajectory.key_assumptions,
            risks: trajectory.key_risks,
            opportunities: trajectory.key_opportunities,
          })
          .select()
          .single();

        if (data) {
          insertedTrajectories.push(data);
        }
      }

      return Response.json({
        ok: true,
        trajectories: insertedTrajectories,
        recommendedFocus: result.recommended_focus,
        criticalDecisions: result.critical_decisions,
      });
    },
  });
}
