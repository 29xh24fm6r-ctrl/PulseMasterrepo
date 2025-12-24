"use client";

import * as React from "react";

type EvidenceEvent = {
  received_at: string | null;
  from_email: string | null;
  to_email: string | null;
  subject: string | null;
  snippet: string | null;
  direction: string | null;
};

type Draft = {
  id: string;
  kind: string;
  to_email: string;
  subject: string;
  body: string;
  created_at: string;
  why?: string | null;
  context?: {
    thread_summary?: string | null;
    thread_events?: EvidenceEvent[] | null;
    ai?: { model?: string | null; generated_at?: string | null; rewritten_at?: string | null } | null;
  } | null;
};

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function SuggestedDraftsCard() {
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [drafts, setDrafts] = React.useState<Draft[]>([]);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const [tone, setTone] = React.useState("friendly, concise, confident");
  const [goal, setGoal] = React.useState("Reply helpfully and move the thread forward.");

  const [cfg, setCfg] = React.useState<{ ai: boolean; real: boolean } | null>(null);
  const [openEvidence, setOpenEvidence] = React.useState<Record<string, boolean>>({});

  async function loadConfig() {
    try {
      const resp = await fetch("/api/email/config", { cache: "no-store" });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok && data?.ok) setCfg({ ai: !!data.ai_drafting_enabled, real: !!data.real_send_enabled });
    } catch {}
  }

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const resp = await fetch("/api/email/suggested-drafts/list", { cache: "no-store" });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data.ok) {
        setErr(data?.error || `failed_${resp.status}`);
        setDrafts([]);
        return;
      }
      setDrafts(Array.isArray(data.drafts) ? data.drafts : []);
    } catch (e: any) {
      setErr(e?.message || "load_failed");
    } finally {
      setLoading(false);
    }
  }

  async function dismiss(id: string) {
    setBusyId(id);
    try {
      await fetch("/api/email/suggested-drafts/dismiss", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      }).catch(() => {});
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function queue(id: string) {
    setBusyId(id);
    try {
      await fetch("/api/email/suggested-drafts/queue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      }).catch(() => {});
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function sendNow(id: string) {
    setBusyId(id);
    try {
      const resp = await fetch("/api/email/suggested-drafts/send-now", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      }).catch(() => null);

      await resp?.json().catch(() => ({}));
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function aiRewrite(id: string) {
    setBusyId(id);
    try {
      const resp = await fetch("/api/email/suggested-drafts/rewrite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, tone, goal }),
      }).catch(() => null);

      await resp?.json().catch(() => ({}));
      await load();
    } finally {
      setBusyId(null);
    }
  }

  React.useEffect(() => {
    loadConfig();
    load();
  }, []);

  const realSendEnabled = cfg?.real ?? false;
  const aiEnabled = cfg?.ai ?? false;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <div className="text-sm font-semibold text-white">Suggested Drafts</div>
          <div className="text-xs text-zinc-400">Thread-aware replies + follow-ups, with evidence.</div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/email/accounts/google/start"
            className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-900/60"
            title="Connect Gmail"
          >
            Connect Gmail
          </a>
          <button
            onClick={load}
            disabled={loading}
            className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-900/60 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 text-[11px]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-semibold text-zinc-300">
            REAL SEND: <span className="text-zinc-400">{realSendEnabled ? "ON" : "OFF (safe queue only)"}</span>
          </div>
          <div className="font-semibold text-zinc-300">
            AI: <span className="text-zinc-400">{aiEnabled ? "ON" : "OFF"}</span>
          </div>
        </div>
      </div>

      {aiEnabled ? (
        <div className="grid grid-cols-1 gap-2 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
          <div className="text-xs font-semibold text-zinc-300">AI settings</div>
          <input
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm text-white placeholder:text-zinc-500"
            placeholder="Tone (e.g., friendly, concise, confident)"
          />
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-sm text-white placeholder:text-zinc-500"
            placeholder="Goal (e.g., schedule a call, request docs, confirm timing)"
          />
          <div className="text-[11px] text-zinc-500">
            AI rewrite regenerates body + why using thread evidence.
          </div>
        </div>
      ) : null}

      {err ? (
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-3 text-xs text-red-200">
          <div className="font-semibold">Error</div>
          <div className="opacity-90 mt-1">{err}</div>
        </div>
      ) : null}

      {drafts.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-xs text-zinc-400">No suggested drafts right now.</div>
      ) : (
        <div className="max-h-72 overflow-auto rounded-xl border border-zinc-800 bg-zinc-950/60 p-2">
          <div className="flex flex-col gap-2">
            {drafts.map((d) => {
              const isOpen = !!openEvidence[d.id];
              const evidence = d.context;

              return (
                <div key={d.id} className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-semibold text-zinc-300 uppercase">{String(d.kind || "")}</div>
                    <div className="flex items-center gap-2">
                      {aiEnabled ? (
                        <button
                          onClick={() => aiRewrite(d.id)}
                          disabled={busyId === d.id}
                          className="rounded-lg border border-blue-500/50 bg-blue-500/10 px-2 py-1 text-[11px] font-semibold text-blue-200 hover:bg-blue-500/20 disabled:opacity-50"
                          title="Regenerate draft with AI using thread evidence"
                        >
                          {busyId === d.id ? "Working…" : "AI rewrite"}
                        </button>
                      ) : null}

                      {/* Safe UX: Only show Send now when REAL SEND enabled */}
                      {realSendEnabled ? (
                        <button
                          onClick={() => sendNow(d.id)}
                          disabled={busyId === d.id}
                          className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
                          title="Queues + flushes immediately"
                        >
                          {busyId === d.id ? "Working…" : "Send now"}
                        </button>
                      ) : null}

                      <button
                        onClick={() => queue(d.id)}
                        disabled={busyId === d.id}
                        className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-900/60 disabled:opacity-50"
                        title="Queues into outbox (safe)"
                      >
                        Queue
                      </button>

                      <button
                        onClick={() => dismiss(d.id)}
                        disabled={busyId === d.id}
                        className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-900/60 disabled:opacity-50"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>

                  {d.why ? (
                    <div className="mt-1 rounded-lg border border-zinc-800 bg-zinc-950/60 p-2 text-[11px] text-zinc-300">
                      <span className="font-semibold">Why:</span> {d.why}
                    </div>
                  ) : null}

                  <div className="mt-1 text-[11px] text-zinc-400">To: {d.to_email}</div>
                  <div className="mt-1 text-xs font-semibold text-white">{d.subject}</div>
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-zinc-300">{d.body}</pre>

                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="text-[11px] text-zinc-500">Created: {fmt(d.created_at)}</div>
                    <button
                      onClick={() => setOpenEvidence((m) => ({ ...m, [d.id]: !m[d.id] }))}
                      className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-900/60"
                      title="Show what this draft is responding to"
                    >
                      {isOpen ? "Hide evidence" : "Evidence"}
                    </button>
                  </div>

                  {isOpen ? (
                    <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-[11px]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold text-zinc-300">Evidence</div>
                        <div className="text-zinc-500">
                          {evidence?.ai?.model ? `model ${evidence.ai.model}` : "model —"}
                        </div>
                      </div>

                      {evidence?.thread_summary ? (
                        <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950/80 p-2 whitespace-pre-wrap text-zinc-300">
                          {evidence.thread_summary}
                        </div>
                      ) : (
                        <div className="mt-2 text-zinc-500">No thread summary available.</div>
                      )}

                      {Array.isArray(evidence?.thread_events) && evidence!.thread_events!.length ? (
                        <div className="mt-2 flex flex-col gap-2">
                          {evidence!.thread_events!.map((e, idx) => (
                            <div key={idx} className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="font-semibold text-zinc-300">{e.subject || "(no subject)"}</div>
                                <div className="text-zinc-500">{e.received_at ? fmt(e.received_at) : "—"}</div>
                              </div>
                              <div className="mt-1 text-zinc-400">
                                {e.direction ? `${e.direction}` : "event"} | {e.from_email || "—"} → {e.to_email || "—"}
                              </div>
                              <div className="mt-1 text-zinc-300">{e.snippet || "(no snippet)"}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2 text-zinc-500">No thread events included.</div>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
