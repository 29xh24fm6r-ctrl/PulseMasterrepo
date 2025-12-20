// lib/simulation/server/fixPlanStore.ts
import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

export async function insertFixPlanStub(args: {
  userId: string;
  runId: string;
  requestId: string;
  stepId: string;
  stepTitle?: string | null;
}) {
  // Resolve to database user ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", args.userId)
    .maybeSingle();

  const dbUserId = userRow?.id || args.userId;

  const { data, error } = await supabaseAdmin
    .from("simulation_fix_plans")
    .insert({
      user_id: dbUserId,
      run_id: args.runId,
      request_id: args.requestId,
      step_id: args.stepId,
      step_title: args.stepTitle ?? null,
      status: "created",
    })
    .select("id")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.id) throw new Error("Failed to create fix plan record");
  return data.id as string;
}

export async function updateFixPlan(args: {
  id: string;
  status: "generated" | "error";
  plan_markdown?: string | null;
  patch_json?: any | null;
  error?: string | null;
}) {
  const { error } = await supabaseAdmin
    .from("simulation_fix_plans")
    .update({
      status: args.status,
      generated_at: new Date().toISOString(),
      plan_markdown: args.plan_markdown ?? null,
      patch_json: args.patch_json ?? null,
      error: args.error ?? null,
    })
    .eq("id", args.id);

  if (error) throw new Error(error.message);
}

export async function getFixPlansForRun(args: { userId: string; runId: string; limit?: number }) {
  // Resolve to database user ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", args.userId)
    .maybeSingle();

  const dbUserId = userRow?.id || args.userId;

  const limit = Math.max(1, Math.min(50, args.limit ?? 10));

  const { data, error } = await supabaseAdmin
    .from("simulation_fix_plans")
    .select("id,request_id,step_id,step_title,status,created_at,generated_at,error")
    .eq("user_id", dbUserId)
    .eq("run_id", args.runId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getFixPlan(args: { userId: string; planId: string }) {
  // Resolve to database user ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", args.userId)
    .maybeSingle();

  const dbUserId = userRow?.id || args.userId;

  const { data, error } = await supabaseAdmin
    .from("simulation_fix_plans")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("id", args.planId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

