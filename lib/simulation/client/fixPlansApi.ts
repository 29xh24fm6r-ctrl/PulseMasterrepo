// lib/simulation/client/fixPlansApi.ts
"use client";

export type FixPlanMeta = {
  id: string;
  request_id: string;
  step_id: string;
  step_title: string | null;
  status: string;
  created_at: string;
  generated_at: string | null;
  error: string | null;
};

export type FixPlanFull = FixPlanMeta & {
  plan_markdown: string | null;
  patch_json: any | null;
  run_id: string;
  user_id: string;
};

export async function createFixPlanForStep(runId: string, payload: any) {
  const res = await fetch(`/api/simulation/runs/${encodeURIComponent(runId)}/fixplans`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as any;
  if (!json?.ok) throw new Error(json?.error || "Failed to generate fix plan");
  return json as { planId: string; request_id: string; plan_markdown: string; patch_json: any };
}

export async function listFixPlans(runId: string, limit = 10): Promise<FixPlanMeta[]> {
  const res = await fetch(
    `/api/simulation/runs/${encodeURIComponent(runId)}/fixplans?limit=${encodeURIComponent(String(limit))}`,
    { method: "GET", headers: { Accept: "application/json" }, cache: "no-store" }
  );

  const json = (await res.json().catch(() => null)) as any;
  if (!json?.ok) throw new Error(json?.error || "Failed to load fix plans");
  return (json.fixplans || []) as FixPlanMeta[];
}

export async function getFixPlan(planId: string): Promise<FixPlanFull> {
  const res = await fetch(`/api/simulation/fixplans/${encodeURIComponent(planId)}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as any;
  if (!json?.ok) throw new Error(json?.error || "Failed to load fix plan");
  return json.plan as FixPlanFull;
}

