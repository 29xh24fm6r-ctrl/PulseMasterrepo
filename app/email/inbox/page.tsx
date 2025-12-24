"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { OutboxFlushButton } from "./_components/OutboxFlushButton";
import { OutboxHealthCard } from "./_components/OutboxHealthCard";
import { SuggestedDraftsCard } from "./_components/SuggestedDraftsCard";
import { ReminderCard } from "./_components/ReminderCard";

type Evidence = Record<string, unknown>;

type TriageItem = {
  // Canonical identifier
  triage_id: string;
  email_thread_id: string;

  // Triage state
  urgency: string;
  suggested_action: string;
  state: string;
  score: number | null;
  next_action_at: string | null;
  why: string | null;
  evidence: Evidence;

  // Thread fields
  subject: string | null;
  snippet: string | null;
  from_email: string | null;
  last_message_at: string | null;

  // Derived convenience
  needs_reply: boolean;
};

type TriageListResponse =
  | { ok: true; items: TriageItem[] }
  | { ok: boolean; error?: string; message?: string; items?: TriageItem[] };

type TriageUpdatePayload = {
  triage_id: string;
  patch: {
    urgency?: string;
    suggested_action?: string;
    state?: string;
    score?: number | null;
    next_action_at?: string | null;
    why?: string | null;
    evidence?: Evidence;
  };
};

type ThreadMessage = {
  id: string;
  email_thread_id: string;
  subject?: string | null;
  snippet?: string | null;
  body_text?: string | null;
  body_html?: string | null;
  from_name?: string | null;
  from_email?: string | null;
  to_email?: string | null;
  direction?: string | null;
  when?: string | null;
  message_id?: string | null; // Optional: message-id header for reply threading
};

type ThreadResponse =
  | {
      ok: true;
      thread: {
        email_thread_id: string;
        subject?: string | null;
        messages: ThreadMessage[];
        outbox?: Array<{ id: string; status: string; error?: string | null; created_at?: string | null }>;
      };
    }
  | { ok: false; error: string; detail?: string; hint?: string };

type DraftResponse =
  | {
      ok: true;
      draft: {
        draft_id: string | null;
        email_thread_id: string;
        to_email: string;
        subject: string;
        body_text: string;
        safe_checksum: string;
        persisted: boolean;
      };
      warn?: string;
    }
  | { ok: false; error: string; hint?: string; detail?: string };

type SendResponse =
  | {
      ok: true;
      queued: {
        outbox_id: string | null;
        email_thread_id: string;
        to_email: string;
        subject: string;
        safe_mode: boolean;
        status: string;
      };
    }
  | { ok: false; error: string; hint?: string; detail?: string };

type Toast = { id: string; kind: "success" | "error" | "info"; title: string; message?: string };

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function safeText(s?: string | null, fallback = "") {
  const t = (s ?? "").toString().trim();
  return t.length ? t : fallback;
}

function formatWhen(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function fetchTriage(signal?: AbortSignal): Promise<TriageItem[]> {
  const r = await fetch("/api/email/triage", {
    method: "GET",
    headers: { accept: "application/json" },
    cache: "no-store",
    signal,
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`triage_fetch_failed: ${r.status} ${text || r.statusText}`);
  }

  const json = (await r.json().catch(() => null)) as TriageListResponse | null;
  if (!json) throw new Error("triage_fetch_failed: invalid_json");

  const ok = (json as any)?.ok;
  if (ok === false) {
    const msg = (json as any)?.error || (json as any)?.message || "triage_fetch_failed";
    throw new Error(String(msg));
  }

  const items = json.items ?? [];
  return items.filter(
    (x) =>
      typeof x?.triage_id === "string" &&
      x.triage_id.length > 0 &&
      typeof x?.email_thread_id === "string" &&
      x.email_thread_id.length > 0
  );
}

async function postTriageUpdate(payload: TriageUpdatePayload): Promise<void> {
  if (!payload || typeof payload !== "object") throw new Error("triage_update_invalid_payload");
  if (!payload.triage_id) throw new Error("triage_update_missing_triage_id");
  if (!payload.patch || typeof payload.patch !== "object") {
    throw new Error("triage_update_invalid_patch");
  }

  if (payload.patch.evidence !== undefined) {
    if (
      !payload.patch.evidence ||
      typeof payload.patch.evidence !== "object" ||
      Array.isArray(payload.patch.evidence)
    ) {
      throw new Error("triage_update_invalid_evidence_object");
    }
  }

  const r = await fetch("/api/email/triage/update", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(payload),
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`triage_update_failed: ${r.status} ${text || r.statusText}`);
  }

  await r.json().catch(() => null);
}

async function fetchThread(email_thread_id: string, signal?: AbortSignal) {
  const r = await fetch(`/api/email/thread?email_thread_id=${encodeURIComponent(email_thread_id)}`, {
    method: "GET",
    headers: { accept: "application/json" },
    cache: "no-store",
    signal,
  });

  const json = (await r.json().catch(() => null)) as ThreadResponse | null;
  if (!json) throw new Error("thread_fetch_failed: invalid_json");

  if ((json as any).ok === false) {
    const msg = (json as any).error || "thread_fetch_failed";
    const detail = (json as any).detail ? `: ${(json as any).detail}` : "";
    throw new Error(`${msg}${detail}`);
  }

  return (json as any).thread as { email_thread_id: string; subject?: string | null; messages: ThreadMessage[] };
}

async function postDraft(input: {
  email_thread_id: string;
  to_email: string;
  subject?: string;
  body?: string;
  from_display?: string;
  last_snippet?: string;
  user_goal?: string;
  tone?: string;
  in_reply_to?: string | null;
  references?: string[] | null;
  is_reply?: boolean;
  include_quote?: boolean;
  quote_from?: string | null;
  quote_date?: string | null;
  quote_snippet?: string | null;
  smart_follow_up?: boolean;
  evidence: Evidence;
}) {
  const r = await fetch("/api/email/draft", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      email_thread_id: input.email_thread_id,
      to_email: input.to_email,
      subject: input.subject,
      body: input.body,
      from_display: input.from_display,
      last_snippet: input.last_snippet,
      user_goal: input.user_goal,
      tone: input.tone,
      in_reply_to: input.in_reply_to,
      references: input.references,
      is_reply: input.is_reply,
      include_quote: input.include_quote,
      quote_from: input.quote_from,
      quote_date: input.quote_date,
      quote_snippet: input.quote_snippet,
      smart_follow_up: input.smart_follow_up,
      evidence: input.evidence,
    }),
  });

  const json = (await r.json().catch(() => null)) as DraftResponse | null;
  if (!json) throw new Error("draft_failed: invalid_json");

  if ((json as any).ok === false) {
    const msg = (json as any).error || "draft_failed";
    const detail = (json as any).detail ? `: ${(json as any).detail}` : "";
    throw new Error(`${msg}${detail}`);
  }

  return json as Extract<DraftResponse, { ok: true }>;
}

async function postSend(input: {
  email_thread_id: string;
  to_email: string;
  subject: string;
  body_text: string;
  safe_checksum: string;
  in_reply_to?: string | null;
  references?: string[] | null;
  evidence: Evidence;
}) {
  const r = await fetch("/api/email/send", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(input),
  });

  const json = (await r.json().catch(() => null)) as SendResponse | null;
  if (!json) throw new Error("send_failed: invalid_json");

  if ((json as any).ok === false) {
    const msg = (json as any).error || "send_failed";
    const detail = (json as any).detail ? `: ${(json as any).detail}` : "";
    throw new Error(`${msg}${detail}`);
  }

  return json as Extract<SendResponse, { ok: true }>;
}

function StatusPill({ state }: { state?: string | null }) {
  const s = (state || "triaged").toLowerCase();
  const cls =
    s === "suggested"
      ? "bg-cyan-500/20 text-cyan-200 border-cyan-500/40"
      : s === "done"
        ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/40"
        : s === "triaged"
          ? "bg-zinc-500/20 text-zinc-200 border-zinc-500/40"
          : "bg-zinc-500/20 text-zinc-200 border-zinc-500/40";

  return (
    <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-xs", cls)}>
      {s}
    </span>
  );
}

function UrgencyBadge({ urgency }: { urgency?: string | null }) {
  const u = (urgency || "p2").toLowerCase();
  const cls =
    u === "p0"
      ? "bg-red-500/20 text-red-200 border-red-500/40"
      : u === "p1"
        ? "bg-amber-500/20 text-amber-200 border-amber-500/40"
        : u === "p2"
          ? "bg-blue-500/20 text-blue-200 border-blue-500/40"
          : "bg-zinc-500/20 text-zinc-200 border-zinc-500/40";

  return (
    <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold", cls)}>
      {u.toUpperCase()}
    </span>
  );
}

function ActionButton({
  label,
  onClick,
  disabled,
  kind = "default",
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  kind?: "default" | "primary" | "danger";
}) {
  const cls =
    kind === "primary"
      ? "bg-violet-600 text-white hover:bg-violet-500"
      : kind === "danger"
        ? "bg-red-600 text-white hover:bg-red-500"
        : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 border border-zinc-300";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        cls
      )}
    >
      {label}
    </button>
  );
}

function Toasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed right-4 top-4 z-50 flex w-[360px] max-w-[90vw] flex-col gap-2">
      {toasts.map((t) => {
        const cls =
          t.kind === "success"
            ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-200"
            : t.kind === "error"
              ? "border-red-500/50 bg-red-500/10 text-red-200"
              : "border-cyan-500/50 bg-cyan-500/10 text-cyan-200";

        return (
          <div key={t.id} className={cx("rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm", cls)}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-sm font-semibold">{t.title}</div>
                {t.message ? <div className="mt-1 text-xs opacity-90">{t.message}</div> : null}
              </div>
              <button
                type="button"
                onClick={() => onDismiss(t.id)}
                className="rounded-lg border border-zinc-700 bg-zinc-950/60 px-2 py-1 text-xs hover:bg-zinc-900/60"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function pickRecipientFromThread(messages: ThreadMessage[], fallbackFromRow?: string | null) {
  // Best-effort:
  // - if there is an inbound message, use its from_email
  // - else fallback to row.from_email
  const inbound = messages.find((m) => (m.direction || "").toLowerCase().includes("in"));
  const to = inbound?.from_email || fallbackFromRow || "";
  return (to || "").trim();
}

function ThreadRail({
  open,
  onClose,
  threadId,
  subject,
  loading,
  error,
  messages,
  triageRow,
  addToast,
  outbox,
}: {
  open: boolean;
  onClose: () => void;
  threadId: string | null;
  subject?: string | null;
  loading: boolean;
  error: string | null;
  messages: ThreadMessage[];
  triageRow: TriageItem | null;
  addToast: (kind: Toast["kind"], title: string, message?: string) => void;
  outbox: Array<{ id: string; status: string; error?: string | null; created_at?: string | null }>;
}) {
  // compose state
  const [toEmail, setToEmail] = useState("");
  const [subj, setSubj] = useState("");
  const [body, setBody] = useState("");
  const [safeChecksum, setSafeChecksum] = useState("");
  const [inReplyTo, setInReplyTo] = useState<string | null>(null);
  const [references, setReferences] = useState<string[]>([]);

  const [tone, setTone] = useState("clear, concise, professional");
  const [goal, setGoal] = useState("move the conversation forward");
  const [composeBusy, setComposeBusy] = useState<null | "draft" | "send">(null);

  // hydrate compose defaults when thread opens/changes
  useEffect(() => {
    if (!open || !threadId) return;

    const derivedTo = pickRecipientFromThread(messages, triageRow?.from_email ?? null);
    setToEmail(derivedTo);

    const s = safeText(subject ?? triageRow?.subject ?? null, "Re:");
    setSubj(s.startsWith("Re:") ? s : `Re: ${s}`);

    // Extract reply metadata from the last inbound message
    const lastInbound = [...messages].reverse().find((m) => (m.direction || "").toLowerCase().includes("in"));
    if (lastInbound?.message_id) {
      setInReplyTo(lastInbound.message_id);
      // Build references array from all message_ids in the thread (including the one we're replying to)
      // This follows the standard pattern: References includes the full thread chain
      const refs: string[] = [];
      const seen = new Set<string>();
      for (const msg of messages) {
        if (msg.message_id && !seen.has(msg.message_id)) {
          refs.push(msg.message_id);
          seen.add(msg.message_id);
        }
      }
      setReferences(refs);
    } else {
      setInReplyTo(null);
      setReferences([]);
    }

    // do not wipe body if user already typed while messages were loading
    // but if empty, set to blank
    setBody((prev) => (prev.trim().length ? prev : ""));
    setSafeChecksum("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, threadId, messages]);

  // update recipient if messages change (after load)
  useEffect(() => {
    if (!open || !threadId) return;
    const derivedTo = pickRecipientFromThread(messages, triageRow?.from_email ?? null);
    setToEmail((prev) => (prev.trim().length ? prev : derivedTo));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  async function handleAIDraft() {
    if (!threadId) return;
    const derivedTo = (toEmail || "").trim();

    if (!derivedTo) {
      addToast("error", "Missing recipient", "Could not determine to_email from the thread. Populate it and retry.");
      return;
    }

    setComposeBusy("draft");
    try {
      const last = messages[messages.length - 1];
      const lastInbound = [...messages].reverse().find((m) => (m.direction || "").toLowerCase().includes("in"));
      const lastSnippet = safeText(last?.body_text, safeText(last?.snippet, triageRow?.snippet || ""));

      // Determine if we should use smart follow-up (reply mode + empty body)
      const smartFollowUp = Boolean(inReplyTo) && (!body || body.trim().length === 0);

      // Get quote metadata from the last inbound message
      const quoteFrom = safeText(lastInbound?.from_email || lastInbound?.from_name || triageRow?.from_email, null);
      const quoteDate = lastInbound?.when || null;
      const quoteSnippet = lastSnippet || null;

      const resp = await postDraft({
        email_thread_id: threadId,
        to_email: derivedTo,
        subject: subj || undefined,
        body: body || undefined,
        from_display: safeText(triageRow?.from_email, derivedTo),
        last_snippet: lastSnippet,
        tone,
        user_goal: goal,
        in_reply_to: inReplyTo,
        references: references.length > 0 ? references : null,
        is_reply: !!inReplyTo,
        include_quote: true, // Default to including quote for replies
        quote_from: quoteFrom,
        quote_date: quoteDate,
        quote_snippet: quoteSnippet,
        smart_follow_up: smartFollowUp,
        evidence: { source: "compose_ui", action: "ai_draft", smart_follow_up: smartFollowUp },
      });

      const d = resp.draft;
      setSubj(d.subject);
      setBody(d.body_text);
      setSafeChecksum(d.safe_checksum);

      const msg = (resp as any).smart_follow_up_applied
        ? "Smart follow-up draft generated (safe mode checksum issued)."
        : resp.warn || "AI draft generated (safe mode checksum issued).";
      addToast("success", "Draft ready", msg);
    } catch (e: any) {
      addToast("error", "Draft failed", e?.message ? String(e.message) : "draft_failed");
    } finally {
      setComposeBusy(null);
    }
  }

  async function handleSendSafe() {
    if (!threadId) return;
    const derivedTo = (toEmail || "").trim();

    if (!derivedTo) {
      addToast("error", "Missing recipient", "Enter a recipient email first.");
      return;
    }
    if (!subj.trim()) {
      addToast("error", "Missing subject", "Enter a subject first.");
      return;
    }
    if (!body.trim()) {
      addToast("error", "Missing body", "Write a reply first (or click AI Draft).");
      return;
    }
    if (!safeChecksum.trim()) {
      addToast("error", "Safe mode required", "Click AI Draft first (or regenerate a safe checksum) before sending.");
      return;
    }

    setComposeBusy("send");
    try {
      const resp = await postSend({
        email_thread_id: threadId,
        to_email: derivedTo,
        subject: subj.trim(),
        body_text: body,
        safe_checksum: safeChecksum.trim(),
        in_reply_to: inReplyTo,
        references: references.length > 0 ? references : null,
        evidence: { source: "compose_ui", action: "send_safe", safe_mode: true },
      });

      addToast("success", "Queued to send", `Outbox: ${resp.queued.outbox_id || "(queued)"}`);

      // Optional: clear body after queueing
      setBody("");
      setSafeChecksum("");
    } catch (e: any) {
      addToast("error", "Send failed", e?.message ? String(e.message) : "send_failed");
    } finally {
      setComposeBusy(null);
    }
  }

  return (
    <div
      className={cx(
        "fixed inset-y-0 right-0 z-40 w-[560px] max-w-[94vw] transform bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white shadow-2xl transition",
        open ? "translate-x-0" : "translate-x-full"
      )}
      aria-hidden={!open}
    >
      <div className="flex h-full flex-col">
        <div className="border-b border-zinc-800 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white">
                {safeText(subject ?? null, threadId ? "Thread" : "Thread")}
              </div>
              {threadId ? (
                <div className="mt-1 truncate text-xs text-zinc-400">
                  Canonical: <span className="font-mono">{threadId}</span>
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-xs hover:bg-zinc-900/60"
            >
              Close
            </button>
          </div>
        </div>

        {/* Thread messages */}
        <div className="flex-1 overflow-auto px-4 py-4">
          {loading ? <div className="text-sm text-zinc-400">Loading thread…</div> : null}

          {error ? (
            <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              <div className="font-semibold">Thread failed to load</div>
              <div className="mt-1 font-mono text-xs">{error}</div>
              <div className="mt-2 text-xs text-red-300">
                If your messages table isn't named <span className="font-mono">email_messages</span>, update{" "}
                <span className="font-mono">src/app/api/email/thread/route.ts</span>.
              </div>
            </div>
          ) : null}

          {!loading && !error && messages.length === 0 ? (
            <div className="text-sm text-zinc-400">No messages returned for this thread.</div>
          ) : null}

          <div className="flex flex-col gap-3">
            {messages.map((m) => {
              const who = safeText(m.from_name, safeText(m.from_email, "Unknown"));
              const when = formatWhen(m.when ?? null);
              const bodyText = safeText(m.body_text, safeText(m.snippet, ""));

              return (
                <div key={m.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">{who}</div>
                      <div className="mt-1 text-xs text-zinc-400">
                        {m.from_email ? <span className="font-mono">{m.from_email}</span> : null}
                        {when ? <span className="text-zinc-500"> · {when}</span> : null}
                        {m.direction ? <span className="text-zinc-500"> · {m.direction}</span> : null}
                      </div>
                    </div>
                  </div>
                  {bodyText ? <div className="mt-3 whitespace-pre-wrap text-sm text-zinc-300">{bodyText}</div> : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Outbox status badge */}
        {outbox?.length ? (
          <div className="mb-3 mx-4 rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-300">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Outbox</div>
              <div className="text-zinc-500">{outbox[0]?.created_at ? formatWhen(outbox[0].created_at) : ""}</div>
            </div>
            <div className="mt-1">
              Latest:{" "}
              <span className="font-mono">{String(outbox[0]?.status || "").toUpperCase()}</span>
              {outbox[0]?.error ? <span className="text-red-400"> — {String(outbox[0].error)}</span> : null}
            </div>
          </div>
        ) : (
          <div className="mb-3 mx-4 text-[11px] text-zinc-500">No outbox activity for this thread.</div>
        )}

        {/* Inline compose (SAFE MODE) */}
        <div className="border-t border-zinc-800 bg-zinc-950/40 px-4 py-3">
          <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Reply (Safe Mode)</div>

          <div className="mt-2 grid grid-cols-1 gap-2">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <div>
                <div className="text-[11px] text-zinc-400">To</div>
                <input
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  placeholder="recipient@example.com"
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>

              <div>
                <div className="text-[11px] text-zinc-400">Subject</div>
                <input
                  value={subj}
                  onChange={(e) => setSubj(e.target.value)}
                  placeholder="Re: …"
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <div>
                <div className="text-[11px] text-zinc-400">Tone</div>
                <input
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>

              <div>
                <div className="text-[11px] text-zinc-400">Goal</div>
                <input
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>
            </div>

            <div>
              <div className="text-[11px] text-zinc-400">Body</div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                placeholder="Write your reply… (or click AI Draft)"
                className="mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] text-zinc-500">
                Safe checksum:{" "}
                <span className="font-mono">{safeChecksum ? safeChecksum.slice(0, 12) + "…" : "(none yet)"}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={composeBusy !== null}
                  onClick={handleAIDraft}
                  className={cx(
                    "rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-zinc-900/60",
                    composeBusy ? "opacity-50 cursor-not-allowed" : ""
                  )}
                >
                  {composeBusy === "draft" ? "Drafting…" : "AI Draft"}
                </button>

                <button
                  type="button"
                  disabled={composeBusy !== null}
                  onClick={handleSendSafe}
                  className={cx(
                    "rounded-xl border border-violet-600/50 bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500",
                    composeBusy ? "opacity-50 cursor-not-allowed" : ""
                  )}
                >
                  {composeBusy === "send" ? "Queuing…" : "Send (Safe)"}
                </button>
              </div>
            </div>

            <div className="text-[11px] text-zinc-500">
              "Send (Safe)" queues to <span className="font-mono">email_outbox</span>. A worker can deliver it later.
              This prevents accidental/unsafe direct sending.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InboxPage() {
  const [items, setItems] = useState<TriageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [suggestedOnly, setSuggestedOnly] = useState(false);

  const [activeTriageId, setActiveTriageId] = useState<string | null>(null);
  const [busyTriageId, setBusyTriageId] = useState<string | null>(null);

  // thread rail state
  const [railOpen, setRailOpen] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [threadErr, setThreadErr] = useState<string | null>(null);
  const [threadSubject, setThreadSubject] = useState<string | null>(null);
  const [threadMessages, setThreadMessages] = useState<ThreadMessage[]>([]);
  const [threadOutbox, setThreadOutbox] = useState<
    Array<{ id: string; status: string; error?: string | null; created_at?: string | null }>
  >([]);

  // toasts
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastTimerRef = useRef<Record<string, any>>({});

  const abortRef = useRef<AbortController | null>(null);
  const threadAbortRef = useRef<AbortController | null>(null);

  // realtime SSE refs
  const esRef = useRef<EventSource | null>(null);
  const pollFallbackRef = useRef<any>(null);

  function addToast(kind: Toast["kind"], title: string, message?: string) {
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const t: Toast = { id, kind, title, message };
    setToasts((prev) => [t, ...prev].slice(0, 5));

    // auto-dismiss after 4.5s
    toastTimerRef.current[id] = setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
      clearTimeout(toastTimerRef.current[id]);
      delete toastTimerRef.current[id];
    }, 4500);
  }

  function dismissToast(id: string) {
    setToasts((prev) => prev.filter((x) => x.id !== id));
    if (toastTimerRef.current[id]) {
      clearTimeout(toastTimerRef.current[id]);
      delete toastTimerRef.current[id];
    }
  }

  async function refresh(silent = false) {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    if (!silent) setLoading(true);
    if (!silent) setErr(null);

    try {
      const list = await fetchTriage(ac.signal);
      setItems(list);
      if (!silent) addToast("info", "Inbox refreshed");
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : "triage_fetch_failed";
      setErr(msg);
      addToast("error", "Inbox failed to load", msg);
    } finally {
      if (!silent) setLoading(false);
      if (silent) setLoading(false);
    }
  }

  function openThread(item: TriageItem) {
    setActiveTriageId(item.triage_id);
    setRailOpen(true);
  }

  async function loadThread(threadId: string) {
    threadAbortRef.current?.abort();
    const ac = new AbortController();
    threadAbortRef.current = ac;

    setThreadLoading(true);
    setThreadErr(null);
    setThreadSubject(null);
    setThreadMessages([]);

    try {
      const thread = await fetchThread(threadId, ac.signal);
      setThreadSubject(thread.subject ?? null);
      setThreadMessages(thread.messages || []);
      setThreadOutbox((thread as any).outbox || []);
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : "thread_fetch_failed";
      setThreadErr(msg);
    } finally {
      setThreadLoading(false);
    }
  }

  async function applyAction(
    item: TriageItem,
    action: string,
    evidence: Evidence,
    extra?: Partial<TriageUpdatePayload["patch"]>
  ) {
    const triage_id = item.triage_id;
    const prev = items;

    setBusyTriageId(triage_id);

    // Map action strings to canonical state/suggested_action
    let optimisticState: string = item.state || "triaged";
    let optimisticSuggestedAction: string = item.suggested_action || "followup";

    if (action === "done") {
      optimisticState = "done";
    } else if (action === "reply") {
      optimisticState = "suggested";
      optimisticSuggestedAction = "reply";
    } else if (action === "followup") {
      optimisticState = "suggested";
      optimisticSuggestedAction = "followup";
    } else if (action === "task") {
      optimisticState = "suggested";
      optimisticSuggestedAction = "task";
    } else if (action === "ignore") {
      optimisticState = "triaged";
      optimisticSuggestedAction = "ignore";
    }

    setItems((curr) =>
      curr.map((i) =>
        i.triage_id === triage_id
          ? {
              ...i,
              state: optimisticState,
              suggested_action: optimisticSuggestedAction,
              evidence: { ...(i.evidence || {}), ...evidence },
            }
          : i
      )
    );

    try {
      await postTriageUpdate({
        triage_id,
        patch: {
          state: optimisticState,
          suggested_action: optimisticSuggestedAction,
          evidence: { ...(item.evidence || {}), ...evidence },
          ...extra,
        },
      });

      addToast("success", "Updated", `${action.replaceAll("_", " ")} applied`);
      await refresh(true); // silent refresh

      // if rail is open and this thread is active, refresh thread view too
      if (railOpen && activeTriageId === triage_id) {
        const activeItem = items.find((i) => i.triage_id === triage_id);
        if (activeItem) {
          await loadThread(activeItem.email_thread_id);
        }
      }
    } catch (e: any) {
      setItems(prev);
      const msg = e?.message ? String(e.message) : "triage_update_failed";
      setErr(msg);
      addToast("error", "Update failed", msg);
    } finally {
      setBusyTriageId(null);
    }
  }

  // initial load
  useEffect(() => {
    refresh(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // realtime SSE: connect once
  useEffect(() => {
    // Clean any prior
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    if (pollFallbackRef.current) {
      clearInterval(pollFallbackRef.current);
      pollFallbackRef.current = null;
    }

    let sseOk = false;

    try {
      const es = new EventSource("/api/email/triage/stream");
      esRef.current = es;

      es.addEventListener("hello", () => {
        sseOk = true;
        addToast("info", "Realtime connected");
      });

      const onSignal = () => {
        // silent refresh on any event
        refresh(true);
      };

      es.addEventListener("tick", onSignal);
      es.onmessage = onSignal;

      es.onerror = () => {
        // If SSE fails, close & fall back to polling.
        try {
          es.close();
        } catch {}
        esRef.current = null;

        if (!sseOk) {
          addToast("info", "Realtime unavailable", "Falling back to 20s polling");
        }

        if (!pollFallbackRef.current) {
          pollFallbackRef.current = setInterval(() => {
            refresh(true);
          }, 20000);
        }
      };
    } catch {
      // Hard fallback
      addToast("info", "Realtime unavailable", "Falling back to 20s polling");
      pollFallbackRef.current = setInterval(() => refresh(true), 20000);
    }

    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      if (pollFallbackRef.current) {
        clearInterval(pollFallbackRef.current);
        pollFallbackRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load thread when activeTriageId changes and rail is open
  useEffect(() => {
    if (!railOpen || !activeTriageId) return;
    const activeItem = items.find((i) => i.triage_id === activeTriageId);
    if (activeItem) {
      loadThread(activeItem.email_thread_id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [railOpen, activeTriageId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const state = (item.state || "triaged").toLowerCase();
      const urgency = (item.urgency || "p2").toLowerCase();

      if (stateFilter !== "all" && state !== stateFilter) return false;
      if (urgencyFilter !== "all" && urgency !== urgencyFilter) return false;
      if (suggestedOnly && !item.suggested_action) return false;

      if (!q) return true;
      const hay = [item.subject, item.snippet, item.from_email, item.suggested_action, item.why]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [items, query, stateFilter, urgencyFilter, suggestedOnly]);

  const activeItem = useMemo(() => {
    if (!activeTriageId) return null;
    return items.find((item) => item.triage_id === activeTriageId) || null;
  }, [items, activeTriageId]);

  const counts = useMemo(() => {
    const byState: Record<string, number> = { all: items.length };
    const byUrgency: Record<string, number> = { all: items.length };

    for (const item of items) {
      const s = (item.state || "triaged").toLowerCase();
      const u = (item.urgency || "p2").toLowerCase();
      byState[s] = (byState[s] || 0) + 1;
      byUrgency[u] = (byUrgency[u] || 0) + 1;
    }

    return { byState, byUrgency };
  }, [items]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      <Toasts toasts={toasts} onDismiss={dismissToast} />

      {/* Thread rail */}
      <ThreadRail
        open={railOpen}
        onClose={() => setRailOpen(false)}
        threadId={activeItem?.email_thread_id ?? null}
        subject={threadSubject ?? activeItem?.subject ?? null}
        loading={threadLoading}
        error={threadErr}
        messages={threadMessages}
        triageRow={activeItem}
        addToast={addToast}
        outbox={threadOutbox}
      />

      {/* Backdrop when rail open */}
      {railOpen ? (
        <button
          type="button"
          aria-label="Close thread rail"
          className="fixed inset-0 z-30 cursor-default bg-black/20"
          onClick={() => setRailOpen(false)}
        />
      ) : null}

      <div className="mx-auto max-w-[1600px] px-6 py-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white">Email Inbox</h1>
              <p className="text-sm text-zinc-400 mt-1">
                Canonical triage UI — reads <span className="font-mono text-zinc-300">/api/email/triage</span>, writes{" "}
                <span className="font-mono text-zinc-300">/api/email/triage/update</span>, realtime via{" "}
                <span className="font-mono text-zinc-300">/api/email/triage/stream</span>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const r = await fetch("/api/email/outbox/tick?limit=10", { method: "POST" });
                    const j = await r.json().catch(() => null);
                    if (!r.ok || !j?.ok) throw new Error(j?.error || "outbox_tick_failed");
                    addToast("success", "Outbox processed", `Processed: ${j.processed}`);
                    await refresh(true);
                    if (railOpen && activeItem?.email_thread_id) await loadThread(activeItem.email_thread_id);
                  } catch (e: any) {
                    addToast("error", "Outbox tick failed", e?.message ? String(e.message) : "outbox_tick_failed");
                  }
                }}
                className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-2 text-sm font-semibold hover:bg-zinc-900/45"
              >
                Process Outbox
              </button>
              <button
                type="button"
                onClick={() => refresh(false)}
                disabled={loading}
                className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-2 text-sm font-semibold hover:bg-zinc-900/45 disabled:opacity-50"
              >
                {loading ? "Loading…" : "Refresh"}
              </button>
            </div>
          </div>

          {err ? (
            <div className="rounded-xl border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              <div className="font-semibold">Error</div>
              <div className="font-mono text-xs mt-1">{err}</div>
            </div>
          ) : null}

          {/* Outbox Worker */}
          <div className="flex flex-col gap-3">
            <SuggestedDraftsCard />
            <ReminderCard />
            <OutboxHealthCard />
            <OutboxFlushButton />
          </div>

          {/* Controls */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Search</div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search subject, sender, snippet…"
                className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">State</div>
              <select
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="all">All ({counts.byState.all || 0})</option>
                <option value="triaged">Triaged ({counts.byState.triaged || 0})</option>
                <option value="suggested">Suggested ({counts.byState.suggested || 0})</option>
                <option value="done">Done ({counts.byState.done || 0})</option>
              </select>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Urgency</div>
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value)}
                className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="all">All ({counts.byUrgency.all || 0})</option>
                <option value="p0">P0 ({counts.byUrgency.p0 || 0})</option>
                <option value="p1">P1 ({counts.byUrgency.p1 || 0})</option>
                <option value="p2">P2 ({counts.byUrgency.p2 || 0})</option>
                <option value="p3">P3 ({counts.byUrgency.p3 || 0})</option>
              </select>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Filters</div>
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={suggestedOnly}
                  onChange={(e) => setSuggestedOnly(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-950/60"
                />
                Suggested only
              </label>
            </div>
          </div>

          {/* Main Layout */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            {/* List */}
            <div className="md:col-span-2">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 shadow-lg">
                <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
                  <div className="text-sm font-semibold text-white">
                    Threads <span className="text-zinc-400">({filtered.length})</span>
                  </div>
                  {loading ? <div className="text-xs text-zinc-400">Loading…</div> : null}
                </div>

                <div className="max-h-[72vh] overflow-auto">
                  {filtered.length === 0 && !loading ? (
                    <div className="p-6 text-sm text-zinc-400 text-center">No threads match your filters.</div>
                  ) : null}

                  {filtered.map((item) => {
                    const isActive = item.triage_id === activeTriageId;
                    const isBusy = item.triage_id === busyTriageId;

                    return (
                      <button
                        key={item.triage_id}
                        type="button"
                        onClick={() => openThread(item)}
                        className={cx(
                          "w-full text-left border-b border-zinc-800 px-4 py-4 transition",
                          isActive ? "bg-cyan-500/10 border-cyan-500/30" : "bg-zinc-950/40 hover:bg-zinc-900/45"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <UrgencyBadge urgency={item.urgency} />
                              <StatusPill state={item.state} />
                              {item.needs_reply && (
                                <span className="inline-flex items-center rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-200">
                                  Needs reply
                                </span>
                              )}
                            </div>
                            <div className="truncate text-sm font-semibold text-white mt-2">
                              {safeText(item.subject, "(no subject)")}
                            </div>
                            <div className="mt-1 truncate text-xs text-zinc-400">
                              {safeText(item.from_email, "Unknown sender")}
                            </div>
                            <div className="mt-1 line-clamp-2 text-xs text-zinc-500">{safeText(item.snippet, "")}</div>
                          </div>

                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <div className="text-[11px] text-zinc-500">{formatWhen(item.last_message_at)}</div>
                            {isBusy ? <div className="text-[11px] text-zinc-400">Working…</div> : null}
                          </div>
                        </div>

                        {item.suggested_action && item.why ? (
                          <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-1.5 text-[11px] text-zinc-300">
                            <span className="font-semibold">Suggested:</span> {item.suggested_action}
                            {item.why ? <span className="text-zinc-500"> — {item.why}</span> : null}
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Detail */}
            <div className="md:col-span-3">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 shadow-lg">
                <div className="border-b border-zinc-800 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-lg font-semibold text-white">
                        {activeItem ? safeText(activeItem.subject, "(no subject)") : "Select a thread"}
                      </div>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {activeItem && (
                          <>
                            <UrgencyBadge urgency={activeItem.urgency} />
                            <StatusPill state={activeItem.state} />
                            {activeItem.needs_reply && (
                              <span className="inline-flex items-center rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-xs text-red-200">
                                Needs reply
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-zinc-400">
                        {activeItem ? (
                          <>
                            From: <span className="font-medium text-zinc-300">{safeText(activeItem.from_email, "Unknown")}</span>
                            {activeItem.last_message_at ? (
                              <span className="text-zinc-500"> · {formatWhen(activeItem.last_message_at)}</span>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-zinc-500">Choose a thread to view it in the right rail.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-5">
                  {!activeItem ? (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 text-sm text-zinc-300">
                      Realtime is active (SSE). Click a row to open the thread rail.
                      <div className="mt-3 text-xs text-zinc-500">
                        Canonical reads: <span className="font-mono">/api/email/triage</span>. Canonical writes:{" "}
                        <span className="font-mono">/api/email/triage/update</span>.
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 mb-4">
                        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Snippet</div>
                        <div className="whitespace-pre-wrap text-sm text-zinc-200">
                          {safeText(activeItem.snippet, "(no snippet)")}
                        </div>
                      </div>

                      {activeItem.why ? (
                        <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 mb-4">
                          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Why</div>
                          <div className="text-sm text-zinc-200">{activeItem.why}</div>
                        </div>
                      ) : null}

                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setRailOpen(true)}
                          className="rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-2 text-sm font-semibold hover:bg-zinc-900/60"
                        >
                          Open thread view →
                        </button>
                      </div>

                      {/* Actions */}
                      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
                        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Triage Actions</div>
                        <div className="flex flex-wrap gap-2">
                          <ActionButton
                            label="Mark as Reply"
                            kind="primary"
                            disabled={busyTriageId === activeItem.triage_id}
                            onClick={() =>
                              applyAction(activeItem, "reply", {
                                source: "inbox_ui",
                                reason: "User marked needs reply",
                              })
                            }
                          />

                          <ActionButton
                            label="Mark as Followup"
                            disabled={busyTriageId === activeItem.triage_id}
                            onClick={() =>
                              applyAction(activeItem, "followup", {
                                source: "inbox_ui",
                                reason: "User marked follow up",
                              })
                            }
                          />

                          <ActionButton
                            label="Mark as Task"
                            disabled={busyTriageId === activeItem.triage_id}
                            onClick={() =>
                              applyAction(activeItem, "task", {
                                source: "inbox_ui",
                                reason: "User marked as task",
                              })
                            }
                          />

                          <ActionButton
                            label="Mark Done"
                            disabled={busyTriageId === activeItem.triage_id}
                            onClick={() =>
                              applyAction(
                                activeItem,
                                "done",
                                {
                                  source: "inbox_ui",
                                  reason: "User marked done",
                                },
                                { state: "done" }
                              )
                            }
                          />

                          <ActionButton
                            label="Ignore"
                            disabled={busyTriageId === activeItem.triage_id}
                            onClick={() =>
                              applyAction(activeItem, "ignore", {
                                source: "inbox_ui",
                                reason: "User marked ignore",
                              })
                            }
                          />
                        </div>

                        {/* Suggested action helper */}
                        {activeItem.suggested_action ? (
                          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
                            <div className="text-xs font-semibold text-zinc-300 mb-2">AI Suggestion</div>
                            <div className="text-sm text-zinc-200 mb-3">
                              <span className="font-semibold">{activeItem.suggested_action}</span>
                              {activeItem.why ? <span className="text-zinc-400"> — {activeItem.why}</span> : null}
                            </div>

                            <ActionButton
                              label={`Apply: ${activeItem.suggested_action}`}
                              kind="primary"
                              disabled={busyTriageId === activeItem.triage_id}
                              onClick={() =>
                                applyAction(activeItem, activeItem.suggested_action, {
                                  source: "ai_suggestion",
                                  reason: activeItem.why || "AI suggested action",
                                })
                              }
                            />
                          </div>
                        ) : null}
                      </div>

                      {/* Canonical ID display */}
                      <div className="mt-4 text-xs text-zinc-500">
                        Triage ID: <span className="font-mono text-zinc-400">{activeItem.triage_id}</span>
                        <br />
                        Thread ID: <span className="font-mono text-zinc-400">{activeItem.email_thread_id}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Contract reminder */}
              <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4 text-xs text-zinc-400">
                <div className="font-semibold text-zinc-300 mb-2">Canonical Contract Guarantees</div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    UI uses <span className="font-mono text-zinc-300">email_thread_id</span> only (never{" "}
                    <span className="font-mono text-zinc-300">thread_id</span>).
                  </li>
                  <li>
                    Writes always send <span className="font-mono text-zinc-300">evidence</span> as an object (never a raw string).
                  </li>
                  <li>No direct reads from tables/views. All data comes through API routes.</li>
                  <li>Realtime uses SSE to trigger canonical refreshes (no schema assumptions).</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-xs text-zinc-500 text-center">
            Realtime mode: SSE <span className="font-mono">/api/email/triage/stream</span> (fallback: 20s polling).
          </div>
        </div>
      </div>
    </div>
  );
}
