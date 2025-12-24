"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Brain,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Flame,
  Inbox,
  MessageSquare,
  Phone,
  Shield,
  Sparkles,
  Target,
} from "lucide-react";
import { RouteIdentityBadge } from "../_components/RouteIdentityBadge";

type Brief = {
  greeting: string;
  timeWindowLabel: string;
  dayIntent: string;
  leverageState: "clear" | "busy" | "overloaded";
  confidence: number; // 0-100
  nextMoveTitle: string;
  nextMoveReason: string;
  evidence: string[];
};

type WorkItem = {
  id: string;
  title: string;
  why: string;
  etaMinutes: number;
  status: "focus" | "now" | "soon" | "blocked";
  href: string;
  evidence: string[];
};

type TriageItem = {
  id: string;
  kind: "email" | "sms" | "call" | "voicemail";
  from: string;
  subject: string;
  preview: string;
  urgency: "now" | "soon" | "later";
  suggestedAction: string;
  evidence: string[];
  href: string;
};

type Scoreboard = {
  momentumScore: number;
  completedToday: number;
  dueSoon: number;
  overdue: number;
  commsBacklog: number;
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

function Card({
  title,
  icon,
  right,
  children,
  className,
}: {
  title: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cx(
        "rounded-3xl border border-zinc-800/70 bg-zinc-950/40 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.55)]",
        "p-5",
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon ? (
            <div className="w-9 h-9 rounded-2xl bg-zinc-900/70 border border-zinc-800 flex items-center justify-center">
              {icon}
            </div>
          ) : null}
          <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Skeleton() {
  return <div className="h-3 rounded bg-zinc-800/70 animate-pulse" />;
}

function StatusDot({ s }: { s: WorkItem["status"] }) {
  const cls =
    s === "focus"
      ? "bg-cyan-300"
      : s === "now"
      ? "bg-emerald-300"
      : s === "soon"
      ? "bg-amber-300"
      : "bg-red-300";
  return <span className={cx("w-2.5 h-2.5 rounded-full", cls)} />;
}

function UrgencyPill({ u }: { u: TriageItem["urgency"] }) {
  if (u === "now") return <Pill tone="danger">NOW</Pill>;
  if (u === "soon") return <Pill tone="warn">SOON</Pill>;
  return <Pill>Later</Pill>;
}

export default function HomeCommandCenter() {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [work, setWork] = useState<WorkItem[]>([]);
  const [triage, setTriage] = useState<TriageItem[]>([]);
  const [score, setScore] = useState<Scoreboard | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/home/command-center", { cache: "no-store" });
      
      if (!res.ok) {
        console.error("[HomeCommandCenter] API error:", res.status, res.statusText);
        // Still allow page to render with empty state
        setBrief(null);
        setWork([]);
        setTriage([]);
        setScore(null);
        setLoading(false);
        return;
      }

      const data = await res.json();
      console.log("[HomeCommandCenter] API response:", data);
      
      if (data?.ok) {
        setBrief(data.brief);
        setWork(data.work ?? []);
        setTriage(data.triage ?? []);
        setScore(data.score ?? null);
      } else {
        console.warn("[HomeCommandCenter] API returned ok:false", data);
        // allow page to still render with empty state
        setBrief(null);
        setWork([]);
        setTriage([]);
        setScore(null);
      }
    } catch (e) {
      console.error("[HomeCommandCenter] Fetch error:", e);
      setBrief(null);
      setWork([]);
      setTriage([]);
      setScore(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const leverageTone = useMemo(() => {
    if (!brief) return "neutral" as const;
    if (brief.leverageState === "clear") return "success" as const;
    if (brief.leverageState === "busy") return "warn" as const;
    return "danger" as const;
  }, [brief]);

  return (
    <main className="min-h-screen bg-[#050607] text-zinc-100">
      <RouteIdentityBadge id="HOME_COMMAND_CENTER" />

      {/* Background (NO PURPLE) — graphite + cyan/teal "aurora" */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_15%,rgba(34,211,238,0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_80%,rgba(16,185,129,0.10),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_90%,rgba(245,158,11,0.08),transparent_55%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#050607] via-[#050607] to-black" />
        <div className="absolute inset-0 opacity-[0.25] bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:48px_48px]" />
      </div>

      <div className="relative max-w-[1500px] mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="space-y-1">
            <div className="text-[11px] text-zinc-400 uppercase tracking-wider">Pulse • Work Command Center</div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Run your entire workday from one screen.
            </h1>
            <div className="text-sm text-zinc-400 max-w-[760px]">
              Tasks, comms, projects, sales—Pulse turns noise into a controlled execution queue with clear next moves.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="px-4 py-2 rounded-2xl border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/45 text-sm font-semibold"
            >
              Refresh
            </button>

            <Link
              href="/workspace"
              className="px-4 py-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/15 text-sm font-semibold text-cyan-100 inline-flex items-center gap-2"
            >
              Workspace <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Top Row: Brief + Scoreboard */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-6 mb-6">
          <Card
            title="Pulse Brief"
            icon={<Brain className="w-5 h-5 text-cyan-200" />}
            right={
              <div className="flex items-center gap-2">
                {brief ? (
                  <>
                    <Pill tone={leverageTone}>
                      {brief.leverageState === "clear" ? "CLEAR RUNWAY" : brief.leverageState === "busy" ? "BUSY" : "OVERLOADED"}
                    </Pill>
                    <Pill tone="info">{brief.confidence}% confidence</Pill>
                  </>
                ) : (
                  <Pill>…</Pill>
                )}
              </div>
            }
          >
            {loading || !brief ? (
              <div className="space-y-3">
                <Skeleton />
                <Skeleton />
                <Skeleton />
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4">
                <div className="space-y-3">
                  <div className="text-sm text-zinc-300">{brief.greeting}</div>
                  <div className="text-2xl font-bold leading-tight">{brief.nextMoveTitle}</div>
                  <div className="text-sm text-zinc-400">
                    <span className="text-zinc-200 font-semibold">Why:</span> {brief.nextMoveReason}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Pill><CalendarClock className="w-3.5 h-3.5 mr-1" /> {brief.timeWindowLabel}</Pill>
                    <Pill><Target className="w-3.5 h-3.5 mr-1" /> {brief.dayIntent}</Pill>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4">
                  <div className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider mb-2">Evidence</div>
                  <div className="flex flex-wrap gap-2">
                    {brief.evidence?.length ? (
                      brief.evidence.slice(0, 6).map((e, i) => (
                        <span
                          key={i}
                          className="text-[10px] px-2 py-1 rounded-full border border-zinc-700 bg-zinc-900/35 text-zinc-300"
                        >
                          {e}
                        </span>
                      ))
                    ) : (
                      <div className="text-sm text-zinc-500">No evidence tags yet.</div>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Link
                      href="/focus-lock"
                      className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 p-3 text-sm font-semibold text-emerald-100 inline-flex items-center justify-between"
                    >
                      Focus Lock <Flame className="w-4 h-4" />
                    </Link>
                    <Link
                      href="/calls"
                      className="rounded-2xl border border-zinc-800 bg-zinc-950/35 hover:bg-zinc-900/45 p-3 text-sm font-semibold text-zinc-200 inline-flex items-center justify-between"
                    >
                      Comms <Phone className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card title="Scoreboard" icon={<Shield className="w-5 h-5 text-emerald-200" />}>
            {loading || !score ? (
              <div className="space-y-3">
                <Skeleton />
                <Skeleton />
                <Skeleton />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4">
                  <div className="text-xs text-zinc-400">Momentum</div>
                  <div className="text-3xl font-bold mt-1 text-zinc-100">{score.momentumScore}</div>
                  <div className="text-[12px] text-zinc-500 mt-1">Execution velocity</div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4">
                  <div className="text-xs text-zinc-400">Completed</div>
                  <div className="text-3xl font-bold mt-1">{score.completedToday}</div>
                  <div className="text-[12px] text-zinc-500 mt-1">Today</div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4">
                  <div className="text-xs text-zinc-400">Due soon</div>
                  <div className="text-3xl font-bold mt-1 text-amber-100">{score.dueSoon}</div>
                  <div className="text-[12px] text-zinc-500 mt-1">Next 48h</div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/45 p-4">
                  <div className="text-xs text-zinc-400">Overdue</div>
                  <div className="text-3xl font-bold mt-1 text-red-100">{score.overdue}</div>
                  <div className="text-[12px] text-zinc-500 mt-1">Needs rescue</div>
                </div>

                <div className="col-span-2 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-cyan-200/80">Comms backlog</div>
                      <div className="text-2xl font-bold mt-1 text-cyan-100">{score.commsBacklog}</div>
                    </div>
                    <Link
                      href="/calls"
                      className="px-4 py-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/15 text-sm font-semibold text-cyan-100 inline-flex items-center gap-2"
                    >
                      Triage Now <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Main Cockpit: Work Queue + Triage Rail */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
          {/* Work Queue */}
          <div className="space-y-6">
            <Card
              title="Execution Queue"
              icon={<CheckCircle2 className="w-5 h-5 text-emerald-200" />}
              right={<Pill tone="info">Do the top item. Momentum compounds.</Pill>}
            >
              {loading ? (
                <div className="space-y-3">
                  <Skeleton />
                  <Skeleton />
                  <Skeleton />
                  <Skeleton />
                </div>
              ) : work.length === 0 ? (
                <div className="text-sm text-zinc-500">
                  Nothing loaded yet. Once tasks/comms are wired in, Pulse will build your queue automatically.
                </div>
              ) : (
                <div className="space-y-3">
                  {work.slice(0, 8).map((w) => (
                    <Link
                      key={w.id}
                      href={w.href}
                      className={cx(
                        "block rounded-2xl border bg-zinc-950/45 hover:bg-zinc-900/45 transition-all p-4",
                        w.status === "blocked"
                          ? "border-red-500/25"
                          : w.status === "soon"
                          ? "border-amber-500/20"
                          : w.status === "now"
                          ? "border-emerald-500/20"
                          : "border-cyan-500/20"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <StatusDot s={w.status} />
                            <div className="text-sm font-semibold text-zinc-100 truncate">{w.title}</div>
                          </div>
                          <div className="text-[12px] text-zinc-400 mt-1">{w.why}</div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            <Pill tone={w.status === "blocked" ? "danger" : w.status === "soon" ? "warn" : w.status === "now" ? "success" : "info"}>
                              {w.status.toUpperCase()}
                            </Pill>
                            <Pill>{w.etaMinutes}m</Pill>
                            {w.evidence?.slice(0, 2).map((e, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-2 py-1 rounded-full border border-zinc-700 bg-zinc-900/35 text-zinc-300"
                              >
                                {e}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="shrink-0">
                          <span className="text-[11px] px-3 py-1.5 rounded-full border border-zinc-700 bg-zinc-900/30 text-zinc-200 inline-flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                            Next
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card title="Projects / Pipelines" icon={<Target className="w-5 h-5 text-cyan-200" />}>
                <div className="text-sm text-zinc-400">
                  This section becomes your "active deals + projects" layer. Pulse will keep only what's active and require your touch.
                </div>
                <div className="mt-4 flex gap-2">
                  <Link
                    href="/deals"
                    className="px-4 py-2 rounded-2xl border border-zinc-800 bg-zinc-950/35 hover:bg-zinc-900/45 text-sm font-semibold text-zinc-200"
                  >
                    Open Deals
                  </Link>
                  <Link
                    href="/workspace"
                    className="px-4 py-2 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/15 text-sm font-semibold text-cyan-100"
                  >
                    Open Workspace
                  </Link>
                </div>
              </Card>

              <Card title="Coach / Scripts" icon={<MessageSquare className="w-5 h-5 text-emerald-200" />}>
                <div className="text-sm text-zinc-400">
                  From here: "what do I say next?" for emails/calls, objection handling, follow-ups, and talk tracks.
                </div>
                <div className="mt-4">
                  <Link
                    href="/live-coach?autostart=1&mode=hybrid"
                    className="w-full inline-flex items-center justify-between px-4 py-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 text-sm font-semibold text-emerald-100"
                  >
                    Start Live Coach <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </Card>
            </div>
          </div>

          {/* Triage Rail */}
          <div className="space-y-6">
            <Card
              title="Comms Triage"
              icon={<Inbox className="w-5 h-5 text-cyan-200" />}
              right={
                <Link
                  href="/calls"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border border-zinc-800 bg-zinc-950/35 hover:bg-zinc-900/45 text-sm font-semibold"
                >
                  Open Comms <ArrowRight className="w-4 h-4" />
                </Link>
              }
            >
              <div className="text-xs text-zinc-400 mb-3">
                Only items that require you. Each one includes the recommended move + evidence.
              </div>

              {loading ? (
                <div className="space-y-3">
                  <Skeleton />
                  <Skeleton />
                  <Skeleton />
                </div>
              ) : triage.length === 0 ? (
                <div className="text-sm text-zinc-500">
                  No triage items right now. Pulse will surface the next interrupt that truly matters.
                </div>
              ) : (
                <div className="space-y-3">
                  {triage.slice(0, 10).map((t) => (
                    <Link
                      key={t.id}
                      href={t.href}
                      className={cx(
                        "block rounded-2xl border bg-zinc-950/45 hover:bg-zinc-900/45 transition-all p-4",
                        t.urgency === "now"
                          ? "border-red-500/25"
                          : t.urgency === "soon"
                          ? "border-amber-500/20"
                          : "border-zinc-800/70"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {t.kind === "call" || t.kind === "voicemail" ? (
                              <Phone className="w-4 h-4 text-zinc-300" />
                            ) : (
                              <Inbox className="w-4 h-4 text-zinc-300" />
                            )}
                            <div className="text-sm font-semibold text-zinc-100 truncate">{t.subject}</div>
                          </div>
                          <div className="text-[12px] text-zinc-400 mt-1 truncate">
                            <span className="text-zinc-300">{t.from}</span> — {t.preview}
                          </div>

                          <div className="mt-2 text-[12px] text-zinc-200">
                            <span className="text-zinc-400">Suggested:</span> {t.suggestedAction}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            {t.evidence?.slice(0, 3).map((e, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-2 py-1 rounded-full border border-zinc-700 bg-zinc-900/35 text-zinc-300"
                              >
                                {e}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="shrink-0 flex flex-col items-end gap-2">
                          <UrgencyPill u={t.urgency} />
                          <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                            <Bell className="w-3.5 h-3.5" /> Needs you
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Today's Intent" icon={<Flame className="w-5 h-5 text-amber-200" />}>
              <div className="text-sm text-zinc-400">
                This becomes your "operating mantra" box. It keeps the day from fracturing.
              </div>
              <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="text-xs uppercase tracking-wider text-amber-200/80 font-semibold">Rule</div>
                <div className="mt-1 text-lg font-bold text-amber-100">
                  Don't open a new loop unless Pulse knows where it goes.
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
