import { supabaseAdmin } from "@/lib/supabase/admin";

export type Rule = {
  id: string;
  user_id: string;
  enabled: boolean;
  kind: string | null;
  triage_label: string | null;
  min_confidence: number | null;

  allow_domains: string[] | null;
  deny_domains: string[] | null;
  allow_emails: string[] | null;
  deny_emails: string[] | null;

  max_per_day: number;
  delay_seconds: number;
  intent: "safe" | "real";

  subject_includes: string[] | null;
  subject_excludes: string[] | null;
  snippet_includes: string[] | null;
  snippet_excludes: string[] | null;
};

export type DraftForMatch = {
  id: string;
  kind: string;
  to_email: string;
  subject: string;
  body: string;
  source_event_id: string | null;
  context?: any;
};

export async function loadRules(userId: string): Promise<Rule[]> {
  const sb = supabaseAdmin();

  const { data, error } = await sb
    .from("email_autopilot_rules")
    .select("*")
    .eq("user_id", userId)
    .eq("enabled", true)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`rules_load_failed:${error.message}`);
  return (data ?? []).map(normalizeRule);
}

export async function getTriageForEvent(userId: string, sourceEventId: string) {
  const sb = supabaseAdmin();

  const { data } = await sb
    .from("email_events")
    .select("triage_label,triage_confidence,subject,snippet,from_email")
    .eq("user_id", userId)
    .eq("id", sourceEventId)
    .maybeSingle();

  return data ?? null;
}

export async function autoapprovedCountToday(userId: string): Promise<number> {
  const sb = supabaseAdmin();

  const { data } = await sb
    .from("email_autopilot_autoapproved_today")
    .select("autoapproved_count")
    .eq("user_id", userId)
    .maybeSingle();

  const n = Number((data as any)?.autoapproved_count ?? 0);
  return isFinite(n) ? n : 0;
}

export function matchRule(rule: Rule, draft: DraftForMatch, triage: any) {
  // kind match
  if (rule.kind && String(rule.kind) !== String(draft.kind)) return { ok: false, reason: "kind_mismatch" };

  // triage match
  if (rule.triage_label && String(rule.triage_label) !== String(triage?.triage_label ?? "")) {
    return { ok: false, reason: "triage_label_mismatch" };
  }

  // confidence
  if (typeof rule.min_confidence === "number") {
    const c = Number(triage?.triage_confidence ?? 0);
    if (!(c >= rule.min_confidence)) return { ok: false, reason: "confidence_too_low", detail: { got: c, need: rule.min_confidence } };
  }

  // allow/deny email/domain
  const to = String(draft.to_email || "").toLowerCase();
  const domain = to.includes("@") ? to.split("@")[1] : "";

  if (rule.deny_emails?.some((x) => x.toLowerCase() === to)) return { ok: false, reason: "deny_email" };
  if (rule.deny_domains?.some((x) => x.toLowerCase() === domain)) return { ok: false, reason: "deny_domain" };

  if (rule.allow_emails?.length) {
    if (!rule.allow_emails.some((x) => x.toLowerCase() === to)) return { ok: false, reason: "not_in_allow_emails" };
  }

  if (rule.allow_domains?.length) {
    if (!rule.allow_domains.some((x) => x.toLowerCase() === domain)) return { ok: false, reason: "not_in_allow_domains" };
  }

  // subject/snippet matchers (simple substring)
  const subj = String(draft.subject || "").toLowerCase();
  const snip = String(triage?.snippet ?? "").toLowerCase();

  if (rule.subject_includes?.length && !rule.subject_includes.some((s) => subj.includes(String(s).toLowerCase()))) {
    return { ok: false, reason: "subject_missing_include" };
  }
  if (rule.subject_excludes?.some((s) => subj.includes(String(s).toLowerCase()))) {
    return { ok: false, reason: "subject_has_exclude" };
  }

  if (rule.snippet_includes?.length && !rule.snippet_includes.some((s) => snip.includes(String(s).toLowerCase()))) {
    return { ok: false, reason: "snippet_missing_include" };
  }
  if (rule.snippet_excludes?.some((s) => snip.includes(String(s).toLowerCase()))) {
    return { ok: false, reason: "snippet_has_exclude" };
  }

  return { ok: true, reason: "matched" };
}

function normalizeRule(r: any): Rule {
  return {
    id: String(r.id),
    user_id: String(r.user_id),
    enabled: !!r.enabled,
    kind: r.kind ? String(r.kind) : null,
    triage_label: r.triage_label ? String(r.triage_label) : null,
    min_confidence: r.min_confidence == null ? null : Number(r.min_confidence),

    allow_domains: Array.isArray(r.allow_domains) ? r.allow_domains.map(String) : [],
    deny_domains: Array.isArray(r.deny_domains) ? r.deny_domains.map(String) : [],
    allow_emails: Array.isArray(r.allow_emails) ? r.allow_emails.map(String) : [],
    deny_emails: Array.isArray(r.deny_emails) ? r.deny_emails.map(String) : [],

    max_per_day: Math.max(0, Number(r.max_per_day ?? 10)),
    delay_seconds: Math.max(0, Number(r.delay_seconds ?? 0)),
    intent: String(r.intent || "safe") === "real" ? "real" : "safe",

    subject_includes: Array.isArray(r.subject_includes) ? r.subject_includes.map(String) : [],
    subject_excludes: Array.isArray(r.subject_excludes) ? r.subject_excludes.map(String) : [],
    snippet_includes: Array.isArray(r.snippet_includes) ? r.snippet_includes.map(String) : [],
    snippet_excludes: Array.isArray(r.snippet_excludes) ? r.snippet_excludes.map(String) : [],
  };
}

