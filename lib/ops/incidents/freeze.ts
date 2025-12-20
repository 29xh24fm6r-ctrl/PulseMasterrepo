// src/lib/ops/incidents/freeze.ts
import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function getRollbackAutoMergeFreeze(): Promise<{
  enabled: boolean;
  reason: string | null;
  updated_at: string | null;
}> {
  const sb = supabaseAdmin();

  const { data, error } = await sb
    .from("ops_automation_locks")
    .select("enabled, reason, updated_at")
    .eq("key", "rollback_auto_merge")
    .maybeSingle();

  if (error) throw new Error(`freeze_lookup_failed:${error.message}`);

  return {
    enabled: Boolean(data?.enabled),
    reason: data?.reason ?? null,
    updated_at: data?.updated_at ?? null,
  };
}

export async function setRollbackAutoMergeFreeze(enabled: boolean, reason: string | null) {
  const sb = supabaseAdmin();

  const { error } = await sb.from("ops_automation_locks").upsert(
    {
      key: "rollback_auto_merge",
      enabled,
      reason: reason ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );

  if (error) throw new Error(`freeze_update_failed:${error.message}`);
}

