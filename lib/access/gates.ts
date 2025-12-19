import "server-only";
import type { AccessContext, UserPlan } from "./types";
import type { FeatureGate } from "@/lib/features/types";

const PLAN_RANK: Record<UserPlan, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
};

export type GateResult = { ok: true } | { ok: false; reason: string };

export function evalGate(gate: FeatureGate | undefined, ctx: AccessContext): GateResult {
  // default: require auth for safety
  const g: FeatureGate = gate ?? { kind: "auth" };

  switch (g.kind) {
    case "public":
      return { ok: true };

    case "auth":
      return ctx.isAuthed ? { ok: true } : { ok: false, reason: "Sign in required" };

    case "plan": {
      if (!ctx.isAuthed) return { ok: false, reason: "Sign in required" };
      const need = PLAN_RANK[g.min];
      const have = PLAN_RANK[(ctx.plan || "free") as UserPlan];
      return have >= need ? { ok: true } : { ok: false, reason: `Upgrade to ${g.min}` };
    }

    case "role": {
      if (!ctx.isAuthed) return { ok: false, reason: "Sign in required" };
      const roles = new Set(ctx.roles || []);
      return g.anyOf.some((r) => roles.has(r)) ? { ok: true } : { ok: false, reason: "Insufficient role" };
    }

    case "flag": {
      if (!ctx.isAuthed) return { ok: false, reason: "Sign in required" };
      return ctx.flags?.[g.flag] ? { ok: true } : { ok: false, reason: `Feature flag off: ${g.flag}` };
    }

    case "all": {
      for (const sub of g.gates) {
        const r = evalGate(sub, ctx);
        if (!r.ok) return r;
      }
      return { ok: true };
    }

    case "any": {
      const failures: string[] = [];
      for (const sub of g.gates) {
        const r = evalGate(sub, ctx);
        if (r.ok) return { ok: true };
        failures.push("reason" in r ? r.reason : "Not allowed");
      }
      return { ok: false, reason: failures[0] || "Not allowed" };
    }

    default:
      return { ok: false, reason: "Unknown gate" };
  }
}

