import { sendEmail, type NormalizedSendError } from "@/lib/email/sender";
import type { SupabaseClient } from "@supabase/supabase-js";
import { classifySendFailure } from "@/lib/email/failureClassifier";
import { suggestEmailFix } from "@/lib/email/autoFix";

type FlushResult = {
  id: string;
  ok: boolean;
  provider_message_id?: string;
  final?: boolean;
  code?: string;
  error?: string;
  retry_in_seconds?: number;
  next_attempt_at?: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function computeBackoffSeconds(attemptCountAfterIncrement: number) {
  const base = 30;
  const exp = Math.pow(2, Math.max(0, attemptCountAfterIncrement - 1));
  const raw = base * exp;
  const capped = Math.min(raw, 60 * 60);
  const jitter = Math.random() * 0.2 * capped;
  return Math.floor(capped + jitter);
}

function isRetryable(code: NormalizedSendError["code"] | undefined) {
  return code === "rate_limited" || code === "provider_down" || code === "unknown";
}

export async function runOutboxFlush(opts: {
  sb: SupabaseClient;
  limit?: number;
  leaseSeconds?: number;
  workerId: string;
}): Promise<{ ok: true; claimed: number; processed: number; workerId: string; results: FlushResult[] }> {
  const sb = opts.sb;
  const limit = clamp(opts.limit ?? 10, 1, 50);
  const leaseSeconds = clamp(opts.leaseSeconds ?? 120, 10, 600);
  const workerId = opts.workerId;

  const { data: claimed, error: claimErr } = await sb.rpc("email_outbox_claim", {
    p_limit: limit,
    p_worker_id: workerId,
    p_lease_seconds: leaseSeconds,
  });

  if (claimErr) throw new Error(`outbox_claim_failed:${claimErr.message}`);

  const rows: any[] = Array.isArray(claimed) ? claimed : [];
  if (!rows.length) return { ok: true, claimed: 0, processed: 0, workerId, results: [] };

  const results: FlushResult[] = [];

  for (const row of rows) {
    const outboxId = row.id;

    // map canonical-ish fields
    const to = String(row.to_email ?? row.to ?? "");
    const subject = String(row.subject ?? "");
    const html = String(row.html ?? row.body_html ?? row.body ?? "");
    const inReplyTo = row.in_reply_to ? String(row.in_reply_to) : undefined;
    const references = Array.isArray(row.references) ? row.references.map(String) : undefined;

    try {
      const nextAttemptCount = Number(row.attempt_count || 0) + 1;

      const { error: bumpErr } = await sb
        .from("email_outbox")
        .update({ attempt_count: nextAttemptCount })
        .eq("id", outboxId)
        .eq("status", "sending")
        .eq("leased_by", workerId);

      if (bumpErr) throw new Error(`attempt_bump_failed:${bumpErr.message}`);

      const sent = await sendEmail({ to, subject, html, inReplyTo, references });

      const { error: upErr } = await sb
        .from("email_outbox")
        .update({
          status: "sent",
          provider: sent.provider,
          provider_message_id: sent.provider_message_id,
          sent_at: new Date().toISOString(),
          last_error: null,
          failure_code: null,
          auto_fix_suggested: false,
          auto_fix_payload: null,
          next_attempt_at: null,
          leased_by: null,
          leased_at: null,
          lease_expires_at: null,
        })
        .eq("id", outboxId)
        .eq("status", "sending")
        .eq("leased_by", workerId);

      if (upErr) throw new Error(`outbox_update_failed:${upErr.message}`);

      results.push({ id: outboxId, ok: true, provider_message_id: sent.provider_message_id });
    } catch (e) {
      const ne = e as NormalizedSendError;
      const code = ne?.code ?? "unknown";
      const msg = typeof ne?.message === "string" ? ne.message : "send_failed";

      // record auto-fix suggestion (best-effort, no throw)
      const cls = classifySendFailure({ code, message: msg });
      const fix = cls.fixable ? suggestEmailFix(to) : null;

      await sb
        .from("email_outbox")
        .update({
          last_error: `${code}:${msg}`,
          failure_code: cls.failure_code,
          auto_fix_suggested: !!fix,
          auto_fix_payload: fix ? fix : null,
        })
        .eq("id", outboxId)
        .eq("leased_by", workerId);

      const { data: fresh } = await sb
        .from("email_outbox")
        .select("attempt_count,max_attempts")
        .eq("id", outboxId)
        .maybeSingle();

      const attemptCount = Number(fresh?.attempt_count ?? row.attempt_count ?? 0);
      const maxAttempts = Number(fresh?.max_attempts ?? row.max_attempts ?? 6);

      const retryable = isRetryable(code);
      const exhausted = attemptCount >= maxAttempts;

      if (!retryable || exhausted) {
        await sb
          .from("email_outbox")
          .update({
            status: "failed",
            leased_by: null,
            leased_at: null,
            lease_expires_at: null,
          })
          .eq("id", outboxId)
          .eq("leased_by", workerId);

        results.push({ id: outboxId, ok: false, final: true, code, error: msg });
        continue;
      }

      const backoffSeconds = computeBackoffSeconds(attemptCount);
      const nextAttemptAt = new Date(Date.now() + backoffSeconds * 1000).toISOString();

      await sb
        .from("email_outbox")
        .update({
          status: "queued",
          next_attempt_at: nextAttemptAt,
          leased_by: null,
          leased_at: null,
          lease_expires_at: null,
        })
        .eq("id", outboxId)
        .eq("leased_by", workerId);

      results.push({
        id: outboxId,
        ok: false,
        final: false,
        code,
        error: msg,
        retry_in_seconds: backoffSeconds,
        next_attempt_at: nextAttemptAt,
      });
    }
  }

  return { ok: true, claimed: rows.length, processed: results.length, workerId, results };
}
