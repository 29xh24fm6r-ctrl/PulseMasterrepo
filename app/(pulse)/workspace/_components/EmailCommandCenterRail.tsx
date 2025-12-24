"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Inbox,
  Mail,
  MessageSquare,
  Wand2,
  Clock,
  CheckCircle2,
  ArrowRight,
  Search,
  Sparkles,
} from "lucide-react";

type EmailTriageItem = {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  urgency: "now" | "soon" | "later";
  suggestedAction: "reply" | "schedule" | "snooze" | "convert_to_task" | "archive";
  why: string;
  evidence: string[];
  href: string;
};

type EmailRailPayload = {
  ok: boolean;
  summary: {
    inboxBacklog: number;
    needsReply: number;
    waitingOnOthers: number;
    scheduled: number;
    inboxZeroProgress: number; // 0-100
  };
  triage: EmailTriageItem[];
};

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "info" | "success" | "warn" | "danger";
}) {
  const cls =
    tone === "info"
      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
      : tone === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : tone === "warn"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
      : tone === "danger"
      ? "border-red-500/30 bg-red-500/10 text-red-200"
      : "border-zinc-700 bg-zinc-900/30 text-zinc-200";

  return (
    <span className={cx("inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-semibold", cls)}>
      {children}
    </span>
  );
}

function Skeleton() {
  return <div className="h-3 rounded bg-zinc-800/70 animate-pulse" />;
}

function urgencyTone(u: EmailTriageItem["urgency"]) {
  if (u === "now") return "danger" as const;
  if (u === "soon") return "warn" as const;
  return "neutral" as const;
}

function actionLabel(a: EmailTriageItem["suggestedAction"]) {
  switch (a) {
    case "reply":
      return "Reply";
    case "schedule":
      return "Schedule";
    case "snooze":
      return "Snooze";
    case "convert_to_task":
      return "To Task";
    case "archive":
      return "Archive";
    default:
      return "Action";
  }
}

export function EmailCommandCenterRail() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EmailRailPayload | null>(null);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/workspace/email-rail", { cache: "no-store" });
      const json = (await res.json()) as EmailRailPayload;
      setData(json);
    } catch (e) {
      console.error(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!data?.triage) return [];
    const s = q.trim().toLowerCase();
    if (!s) return data.triage;
    return data.triage.filter((t) => {
      return (
        t.from.toLowerCase().includes(s) ||
        t.subject.toLowerCase().includes(s) ||
        t.snippet.toLowerCase().includes(s)
      );
    });
  }, [data, q]);

  return (
    <aside
      className={cx(
        "w-[360px] shrink-0",
        "rounded-3xl border border-zinc-800/70 bg-zinc-950/40 backdrop-blur-xl",
        "shadow-[0_20px_60px_rgba(0,0,0,0.55)] p-4"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-2xl bg-zinc-900/70 border border-zinc-800 flex items-center justify-center">
            <Inbox className="w-5 h-5 text-cyan-200" />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-100">Email Command Center</div>
            <div className="text-[12px] text-zinc-400">Triage, replies, follow-ups — all in one rail</div>
          </div>
        </div>

        <button
          onClick={load}
          className="px-3 py-2 rounded-2xl border border-zinc-800 bg-zinc-950/35 hover:bg-zinc-900/45 text-sm font-semibold"
        >
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="mb-3">
        <div className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/35 px-3 py-2">
          <Search className="w-4 h-4 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search email…"
            className="w-full bg-transparent outline-none text-sm text-zinc-200 placeholder:text-zinc-500"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/45 p-3">
          <div className="text-[11px] text-zinc-400">Needs reply</div>
          <div className="text-2xl font-bold mt-1">{loading ? "—" : data?.summary.needsReply ?? 0}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/45 p-3">
          <div className="text-[11px] text-zinc-400">Backlog</div>
          <div className="text-2xl font-bold mt-1">{loading ? "—" : data?.summary.inboxBacklog ?? 0}</div>
        </div>
        <div className="col-span-2 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] text-cyan-200/80">Inbox Zero runway</div>
            <div className="text-sm font-semibold text-cyan-100">
              {loading ? "…" : `${data?.summary.inboxZeroProgress ?? 0}%`}
            </div>
          </div>
          <Link
            href="/calls"
            className="px-3 py-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/15 text-sm font-semibold text-cyan-100 inline-flex items-center gap-2"
          >
            Open Comms <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Triage list */}
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
          Triage
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </div>
        ) : !data?.triage?.length ? (
          <div className="text-sm text-zinc-500">No email items need you right now.</div>
        ) : (
          filtered.slice(0, 8).map((t) => (
            <Link
              key={t.id}
              href={t.href}
              className={cx(
                "block rounded-2xl border border-zinc-800/70 bg-zinc-950/45 hover:bg-zinc-900/45 transition-all p-3"
              )}
              title={`${t.subject} — ${t.from}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-zinc-300" />
                    <div className="text-sm font-semibold text-zinc-100 truncate">{t.subject}</div>
                  </div>
                  <div className="text-[12px] text-zinc-400 mt-1 truncate">
                    <span className="text-zinc-300">{t.from}</span> — {t.snippet}
                  </div>

                  <div className="mt-2 text-[12px] text-zinc-200">
                    <span className="text-zinc-400">Suggested:</span>{" "}
                    {t.suggestedAction === "reply" ? "Reply with Pulse draft" : actionLabel(t.suggestedAction)}
                  </div>

                  <div className="mt-2 text-[11px] text-zinc-400">
                    <span className="text-zinc-500">Why:</span> {t.why}
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <Pill tone={urgencyTone(t.urgency)}>{t.urgency.toUpperCase()}</Pill>
                    <Pill tone="info">{actionLabel(t.suggestedAction)}</Pill>
                    {t.evidence?.slice(0, 1).map((e, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-1 rounded-full border border-zinc-700 bg-zinc-900/35 text-zinc-300"
                      >
                        {e}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // V1: route to a future email-reply surface (or open /calls with context)
                        window.location.href = `/calls?intent=email_reply&thread=${encodeURIComponent(t.id)}`;
                      }}
                      className="px-3 py-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 text-sm font-semibold text-emerald-100 inline-flex items-center justify-between"
                    >
                      Pulse Reply <Wand2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.location.href = `/tasks?from=email&thread=${encodeURIComponent(t.id)}`;
                      }}
                      className="px-3 py-2 rounded-2xl border border-zinc-800 bg-zinc-950/35 hover:bg-zinc-900/45 text-sm font-semibold text-zinc-200 inline-flex items-center justify-between"
                    >
                      To Task <CheckCircle2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-2">
                  {t.urgency === "now" ? <Pill tone="danger">NOW</Pill> : t.urgency === "soon" ? <Pill tone="warn">SOON</Pill> : <Pill>Later</Pill>}
                  <span className="text-[11px] text-zinc-500 inline-flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-200" /> Needs you
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Bottom shortcuts */}
      <div className="mt-4 pt-4 border-t border-zinc-800/70 grid grid-cols-2 gap-2">
        <Link
          href="/calls?tab=email"
          className="px-3 py-2 rounded-2xl border border-zinc-800 bg-zinc-950/35 hover:bg-zinc-900/45 text-sm font-semibold text-zinc-200 inline-flex items-center justify-between"
        >
          Inbox <Inbox className="w-4 h-4" />
        </Link>
        <Link
          href="/live-coach?autostart=1&mode=hybrid"
          className="px-3 py-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/15 text-sm font-semibold text-cyan-100 inline-flex items-center justify-between"
        >
          Coach <MessageSquare className="w-4 h-4" />
        </Link>
        <Link
          href="/focus-lock"
          className="px-3 py-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 text-sm font-semibold text-emerald-100 inline-flex items-center justify-between"
        >
          Focus <Clock className="w-4 h-4" />
        </Link>
        <Link
          href="/tasks"
          className="px-3 py-2 rounded-2xl border border-zinc-800 bg-zinc-950/35 hover:bg-zinc-900/45 text-sm font-semibold text-zinc-200 inline-flex items-center justify-between"
        >
          Tasks <CheckCircle2 className="w-4 h-4" />
        </Link>
      </div>
    </aside>
  );
}

