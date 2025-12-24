import { supabaseAdmin } from "@/lib/supabase/admin";

export function autopilotEnabled() {
  return String(process.env.EMAIL_AUTOPILOT_ENABLED || "false") === "true";
}

export function undoSeconds() {
  const n = Number(process.env.EMAIL_AUTOPILOT_UNDO_SECONDS || 60);
  return Math.max(10, Math.min(60 * 10, isFinite(n) ? n : 60)); // 10s..10m
}

export function computeUndoUntil(now = new Date()) {
  return new Date(now.getTime() + undoSeconds() * 1000).toISOString();
}

export async function audit(userId: string, outboxId: string, action: string, detail?: any) {
  const sb = supabaseAdmin();
  await sb
    .from("email_send_audit")
    .insert({
      user_id: userId,
      outbox_id: outboxId,
      action,
      detail: detail ?? null,
    })
    .catch(() => {});
}

