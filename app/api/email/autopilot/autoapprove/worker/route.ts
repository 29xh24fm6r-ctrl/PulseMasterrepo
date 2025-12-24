import { NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { audit, autopilotEnabled, computeUndoUntil } from "@/lib/email/autopilot";
import { autoapprovedCountToday, getTriageForEvent, loadRules, matchRule } from "@/lib/email/autopilotRules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function autoapproveEnabled() {
  return (
    String(process.env.EMAIL_AUTOPILOT_V2_ENABLED || "false") === "true" &&
    String(process.env.EMAIL_AUTOPILOT_AUTOAPPROVE_ENABLED || "false") === "true"
  );
}

export async function POST(req: Request) {
  const secret = process.env.EMAIL_AUTOPILOT_CRON_SECRET;
  if (secret) {
    const got = req.headers.get("x-pulse-autopilot-secret");
    if (got !== secret) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (!autopilotEnabled()) return NextResponse.json({ ok: false, error: "autopilot_disabled" }, { status: 400 });
  if (!autoapproveEnabled()) return NextResponse.json({ ok: false, error: "autoapprove_disabled" }, { status: 400 });

  const sb = supabaseAdmin();

  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") || 10)));

  // global cap default
  const globalCap = Math.max(0, Math.min(200, Number(process.env.EMAIL_AUTOPILOT_MAX_AUTOAPPROVE_PER_DAY || 10)));
  const defaultIntent = String(process.env.EMAIL_AUTOPILOT_DEFAULT_INTENT || "safe") === "real" ? "real" : "safe";
  const realEnabled = String(process.env.EMAIL_REAL_SEND_ENABLED || "false") === "true";

  // load candidate drafts (active only)
  const { data: drafts, error: dErr } = await sb
    .from("email_suggested_drafts")
    .select("id,user_id,kind,to_email,subject,body,source_event_id,created_at")
    .eq("active", true)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (dErr) return NextResponse.json({ ok: false, error: dErr.message }, { status: 500 });
  if (!drafts?.length) return NextResponse.json({ ok: true, processed: 0 });

  // group by user_id (rules are per-user)
  const byUser: Record<string, any[]> = {};
  for (const d of drafts) {
    const u = String(d.user_id || "");
    if (!u) continue;
    byUser[u] = byUser[u] || [];
    byUser[u].push(d);
  }

  const results: any[] = [];

  for (const [userId, userDrafts] of Object.entries(byUser)) {
    const rules = await loadRules(userId).catch(() => []);
    if (!rules.length) {
      // no rules -> skip
      for (const d of userDrafts) {
        await logDecision(userId, null, d.id, d.source_event_id, "skipped", "no_rules", { draft_id: d.id });
        results.push({ draft_id: d.id, ok: false, skipped: "no_rules" });
      }
      continue;
    }

    // daily caps
    const already = await autoapprovedCountToday(userId);
    const remainingGlobal = Math.max(0, globalCap - already);

    if (remainingGlobal <= 0) {
      for (const d of userDrafts) {
        await logDecision(userId, null, d.id, d.source_event_id, "blocked", "daily_cap_reached", { already });
        results.push({ draft_id: d.id, ok: false, blocked: "daily_cap_reached" });
      }
      continue;
    }

    let approvedCount = 0;

    for (const d of userDrafts) {
      if (approvedCount >= remainingGlobal) break;

      const sourceEventId = d.source_event_id ? String(d.source_event_id) : "";
      if (!sourceEventId) {
        await logDecision(userId, null, d.id, null, "skipped", "missing_source_event_id", {});
        results.push({ draft_id: d.id, ok: false, skipped: "missing_source_event_id" });
        continue;
      }

      const triage = await getTriageForEvent(userId, sourceEventId);
      if (!triage) {
        await logDecision(userId, null, d.id, d.source_event_id, "skipped", "missing_triage", {});
        results.push({ draft_id: d.id, ok: false, skipped: "missing_triage" });
        continue;
      }

      // Find first matching rule
      let matched: any = null;
      let matchDetail: any = null;

      for (const r of rules) {
        const m = matchRule(r, normalizeDraft(d), triage);
        if (m.ok) {
          matched = r;
          matchDetail = m;
          break;
        }
      }

      if (!matched) {
        await logDecision(userId, null, d.id, d.source_event_id, "skipped", "no_rule_match", { triage });
        results.push({ draft_id: d.id, ok: false, skipped: "no_rule_match" });
        continue;
      }

      // per-rule cap
      const perRuleCap = Math.max(0, Number(matched.max_per_day ?? 10));
      // rough per-rule enforcement using decisions table
      const perRuleUsed = await countRuleAutoapprovedToday(userId, matched.id);
      if (perRuleUsed >= perRuleCap) {
        await logDecision(userId, matched.id, d.id, d.source_event_id, "blocked", "rule_cap_reached", { perRuleUsed, perRuleCap });
        results.push({ draft_id: d.id, ok: false, blocked: "rule_cap_reached" });
        continue;
      }

      // Determine intent with safety
      const requestedIntent = matched.intent || defaultIntent;
      const effectiveIntent = requestedIntent === "real" && realEnabled ? "real" : "safe";

      // schedule
      const delaySec = Math.max(0, Math.min(3600, Number(matched.delay_seconds ?? 0)));
      const now = new Date();
      const scheduledSendAt = new Date(now.getTime() + delaySec * 1000).toISOString();
      const undoUntil = computeUndoUntil(now);

      // thread headers from email_events
      let inReplyTo: string | null = null;
      let references: string[] | null = null;

      const { data: ev } = await sb
        .from("email_events")
        .select("message_id,references")
        .eq("id", sourceEventId)
        .eq("user_id", userId)
        .maybeSingle();

      if (ev?.message_id) inReplyTo = String(ev.message_id);
      if (Array.isArray(ev?.references) && ev.references.length) {
        references = ev.references.map(String);
        if (inReplyTo && !references.includes(inReplyTo)) references = [...references, inReplyTo];
      } else if (inReplyTo) {
        references = [inReplyTo];
      }

      // Create outbox as pending_send
      const { data: out, error: oErr } = await sb
        .from("email_outbox")
        .insert({
          user_id: userId,
          status: "pending_send",
          send_intent: effectiveIntent,
          approved_by_user: false,
          approved_at: now.toISOString(),
          scheduled_send_at: scheduledSendAt,
          undo_until: undoUntil,
          source_draft_id: d.id,

          to_email: String(d.to_email),
          subject: String(d.subject),
          html: String(d.body),

          in_reply_to: inReplyTo,
          references,

          attempt_count: 0,
          next_attempt_at: null,
          last_error: null,
        })
        .select("id")
        .single();

      if (oErr) {
        await logDecision(userId, matched.id, d.id, d.source_event_id, "blocked", "outbox_insert_failed", { error: oErr.message });
        results.push({ draft_id: d.id, ok: false, blocked: "outbox_insert_failed" });
        continue;
      }

      // deactivate draft
      await sb.from("email_suggested_drafts").update({ active: false }).eq("id", d.id).eq("user_id", userId).catch(() => {});

      // logs
      await logDecision(userId, matched.id, d.id, d.source_event_id, "auto_approved", "matched_rule", {
        rule_id: matched.id,
        match: matchDetail,
        triage: {
          label: triage.triage_label,
          confidence: triage.triage_confidence,
        },
        requested_intent: requestedIntent,
        effective_intent: effectiveIntent,
        scheduled_send_at: scheduledSendAt,
        undo_until: undoUntil,
      });

      await audit(userId, out.id, "approved", { auto: true, rule_id: matched.id, draft_id: d.id, intent: effectiveIntent });
      await audit(userId, out.id, "scheduled", { scheduled_send_at: scheduledSendAt, undo_until: undoUntil });

      approvedCount += 1;
      results.push({ draft_id: d.id, ok: true, outbox_id: out.id, rule_id: matched.id, intent: effectiveIntent });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}

function normalizeDraft(d: any) {
  return {
    id: String(d.id),
    kind: String(d.kind),
    to_email: String(d.to_email || ""),
    subject: String(d.subject || ""),
    body: String(d.body || ""),
    source_event_id: d.source_event_id ? String(d.source_event_id) : null,
  };
}

async function logDecision(userId: string, ruleId: string | null, draftId: string, sourceEventId: any, decision: string, reason: string, detail: any) {
  const sb = supabaseAdmin();
  await sb
    .from("email_autopilot_decisions")
    .insert({
      user_id: userId,
      rule_id: ruleId,
      draft_id: draftId,
      source_event_id: sourceEventId ?? null,
      decision,
      reason,
      detail: detail ?? null,
    })
    .catch(() => {});
}

async function countRuleAutoapprovedToday(userId: string, ruleId: string) {
  const sb = supabaseAdmin();

  const { count } = await sb
    .from("email_autopilot_decisions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("rule_id", ruleId)
    .eq("decision", "auto_approved")
    .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

  return Number(count || 0);
}

