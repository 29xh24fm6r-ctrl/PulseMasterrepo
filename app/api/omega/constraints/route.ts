// app/api/omega/constraints/route.ts
// Guardian constraints and violations

import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { withCompatTelemetry } from "@/lib/compat/withCompatTelemetry";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export async function GET(req: Request) {
  const gate = await requireOpsAuth();
  if (!gate.ok || !gate.canon) return Response.json(gate, { status: gate.status });

  return withCompatTelemetry({
    req: req as any,
    userIdUuid: gate.canon.userIdUuid,
    clerkUserId: gate.canon.clerkUserId,
    eventName: "api.omega.constraints.get",
    handler: async () => {
      const url = new URL(req.url);
      const includeViolations = url.searchParams.get("violations") === "true";

      const supabase = getSupabaseAdminRuntimeClient();

      // Get all constraints
      const { data: constraints, error: constraintsError } = await supabase
        .from("pulse_constraints")
        .select("*")
        .order("constraint_type", { ascending: true });

      if (constraintsError) throw constraintsError;

      let violations: any[] = [];
      if (includeViolations) {
        const { data: violationsData, error: violationsError } = await supabase
          .from("pulse_constraint_violations")
          .select("*, constraint:pulse_constraints(*)")
          .eq("user_id", gate.canon.clerkUserId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (violationsError) throw violationsError;
        violations = violationsData || [];
      }

      return Response.json({
        ok: true,
        constraints: (constraints || []).map((c: any) => ({
          id: c.id,
          constraintType: c.constraint_type,
          constraintName: c.constraint_name,
          description: c.description,
          rule: c.rule,
          immutable: c.immutable,
          violationCount: c.violation_count,
          createdAt: c.created_at,
        })),
        violations: violations.map((v: any) => ({
          id: v.id,
          constraintId: v.constraint_id,
          constraintName: v.constraint?.constraint_name,
          attemptedAction: v.attempted_action,
          violationReason: v.violation_reason,
          blocked: v.blocked,
          overrideRequested: v.override_requested,
          overrideGranted: v.override_granted,
          createdAt: v.created_at,
        })),
      });
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
    eventName: "api.omega.constraints.post",
    handler: async () => {
      const body = await req.json();
      const { action, constraintId, violationId } = body;

      const supabase = getSupabaseAdminRuntimeClient();

      if (action === "request_override") {
        // Request an override for a violation
        if (!violationId) {
          return Response.json(
            { ok: false, error: "Missing violationId for override request" },
            { status: 400 }
          );
        }

        // Check if the constraint is immutable
        const { data: violation } = await supabase
          .from("pulse_constraint_violations")
          .select("*, constraint:pulse_constraints(*)")
          .eq("id", violationId)
          .single();

        if (!violation) {
          return Response.json({ ok: false, error: "Violation not found" }, { status: 404 });
        }

        if (violation.constraint?.immutable) {
          return Response.json(
            { ok: false, error: "Cannot override immutable constraint" },
            { status: 403 }
          );
        }

        await supabase
          .from("pulse_constraint_violations")
          .update({ override_requested: true })
          .eq("id", violationId);

        return Response.json({ ok: true, action: "override_requested", violationId });
      }

      if (action === "grant_override") {
        // Grant an override (admin action)
        const claims: any = gate.canon;
        const isAdmin = claims?.role === "admin";

        if (!isAdmin) {
          return Response.json(
            { ok: false, error: "Only admins can grant overrides" },
            { status: 403 }
          );
        }

        await supabase
          .from("pulse_constraint_violations")
          .update({ override_granted: true })
          .eq("id", violationId);

        return Response.json({ ok: true, action: "override_granted", violationId });
      }

      if (action === "add_soft_constraint") {
        // Add a user-defined soft constraint
        const { name, description, rule } = body;

        if (!name || !description || !rule) {
          return Response.json(
            { ok: false, error: "Missing required fields: name, description, rule" },
            { status: 400 }
          );
        }

        const { data, error } = await supabase
          .from("pulse_constraints")
          .insert({
            constraint_type: "user_override",
            constraint_name: `user_${gate.canon.clerkUserId}_${name}`,
            description,
            rule,
            immutable: false,
          })
          .select()
          .single();

        if (error) {
          if (error.code === "23505") {
            return Response.json(
              { ok: false, error: "Constraint with this name already exists" },
              { status: 409 }
            );
          }
          throw error;
        }

        return Response.json({ ok: true, constraint: data });
      }

      return Response.json(
        { ok: false, error: "Invalid action" },
        { status: 400 }
      );
    },
  });
}
