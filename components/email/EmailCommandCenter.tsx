"use client";

import { useEffect, useMemo, useState } from "react";

type TriageItem = {
  id: string;
  thread_id: string;
  status: string;
  priority: string;
  needs_reply: boolean;
  suggested_action: string;
  due_at: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;
  updated_at: string;
};

const TABS = [
  { key: "inbox", label: "Inbox" },
  { key: "drafts", label: "Drafts" },
  { key: "followups", label: "Follow-ups" },
  { key: "brief", label: "Daily Brief" },
];

function priorityRank(p: string) {
  if (p === "p0") return 0;
  if (p === "p1") return 1;
  return 2;
}

export default function EmailCommandCenter() {
  const [tab, setTab] = useState("inbox");
  const [items, setItems] = useState<TriageItem[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/email/triage?limit=100");
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "load_failed");
      const list: TriageItem[] = j.items ?? [];
      list.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));
      setItems(list);
    } catch (e: any) {
      setErr(e?.message ?? "unknown_error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const inbox = useMemo(() => items.filter((x) => x.status !== "done"), [items]);
  const done = useMemo(() => items.filter((x) => x.status === "done"), [items]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-2xl font-semibold">Email Command Center</div>
        <div className="flex gap-2">
          <button
            className="px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/45 text-sm font-semibold"
            onClick={load}
            disabled={loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-colors ${
              tab === t.key
                ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-200"
                : "border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/45 text-zinc-200"
            }`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {err && (
        <div className="p-4 rounded-xl border border-red-500/50 bg-red-500/10 text-red-200">{err}</div>
      )}

      {tab === "inbox" && (
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-5 space-y-4">
            <div className="text-sm font-semibold text-zinc-300">Triage Queue</div>
            <div className="space-y-2">
              {inbox.map((it) => (
                <button
                  key={it.id}
                  onClick={() => setSelectedThreadId(it.thread_id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    selectedThreadId === it.thread_id
                      ? "border-cyan-500/50 bg-cyan-500/10"
                      : "border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/45"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-zinc-100">
                      {it.priority.toUpperCase()} · {it.suggested_action}
                    </div>
                    {it.needs_reply && (
                      <div className="text-xs px-2.5 py-1 rounded-full border border-red-500/40 bg-red-500/10 text-red-200">
                        Needs reply
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-zinc-400 mt-2">Status: {it.status}</div>
                  {it.due_at && (
                    <div className="text-xs text-zinc-400">Due: {new Date(it.due_at).toLocaleString()}</div>
                  )}
                </button>
              ))}
              {!inbox.length && (
                <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 text-zinc-400 text-center">
                  No items 🎉
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-zinc-800">
              <div className="text-sm font-semibold text-zinc-300 mb-2">Done</div>
              <div className="space-y-2">
                {done.slice(0, 10).map((it) => (
                  <div key={it.id} className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/40 text-zinc-400 text-sm">
                    {it.priority.toUpperCase()} · {it.suggested_action} · done
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-7">
            {selectedThreadId ? (
              <ThreadPanel threadId={selectedThreadId} onChanged={load} />
            ) : (
              <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-950/40 text-zinc-400 text-center">
                Select an item to view the thread.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "drafts" && (
        <DraftsView onOpenThread={(id) => { setSelectedThreadId(id); setTab("inbox"); }} />
      )}

      {tab === "followups" && (
        <FollowupsView onOpenThread={(id) => { setSelectedThreadId(id); setTab("inbox"); }} />
      )}

      {tab === "brief" && (
        <DailyBriefView onOpenThread={(id) => { setSelectedThreadId(id); setTab("inbox"); }} />
      )}
    </div>
  );
}

function ThreadPanel({ threadId, onChanged }: { threadId: string; onChanged: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch(`/api/email/thread/${threadId}`);
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "thread_load_failed");
      setData(j);
    } catch (e: any) {
      setErr(e?.message ?? "unknown_error");
    } finally {
      setLoading(false);
    }
  }

  async function markDone() {
    await fetch("/api/email/triage/update", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ threadId, status: "done", needs_reply: false, suggested_action: "ignore" }),
    });
    await onChanged();
    await load();
  }

  async function generateDraft() {
    await fetch("/api/email/draft/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ threadId }),
    });
    await load();
    await onChanged();
  }

  async function convertToTask() {
    await fetch("/api/email/task/convert", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ threadId }),
    });
    await onChanged();
    await load();
  }

  useEffect(() => {
    load();
  }, [threadId]);

  if (loading)
    return (
      <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-950/40 text-zinc-400 text-center">
        Loading…
      </div>
    );
  if (err)
    return (
      <div className="p-6 rounded-2xl border border-red-500/50 bg-red-500/10 text-red-200">{err}</div>
    );
  if (!data)
    return (
      <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-950/40 text-zinc-400 text-center">
        No data.
      </div>
    );

  const thread = data.thread;
  const messages = data.messages ?? [];
  const drafts = data.drafts ?? [];

  return (
    <div className="space-y-4">
      <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950/40">
        <div className="text-lg font-semibold text-zinc-100">{thread?.subject ?? "(no subject)"}</div>
        <div className="text-xs text-zinc-400 mt-1">Thread: {threadId}</div>

        <div className="flex gap-2 mt-4">
          <button
            className="px-4 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 text-sm font-semibold text-emerald-100"
            onClick={generateDraft}
          >
            Generate draft
          </button>
          <button
            className="px-4 py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/15 text-sm font-semibold text-cyan-100"
            onClick={convertToTask}
          >
            Convert to task
          </button>
          <button
            className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/45 text-sm font-semibold text-zinc-200"
            onClick={markDone}
          >
            Mark done
          </button>
        </div>
      </div>

      <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950/40">
        <div className="font-semibold text-zinc-100 mb-3">Messages</div>
        <div className="space-y-3">
          {messages.map((m: any) => (
            <div key={m.id} className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60">
              <div className="text-xs text-zinc-400 mb-2">
                {m.direction} · {m.from_email} ·{" "}
                {m.sent_at ? new Date(m.sent_at).toLocaleString() : ""}
              </div>
              <div className="mt-2 whitespace-pre-wrap text-sm text-zinc-200">{m.body_text ?? ""}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-950/40">
        <div className="font-semibold text-zinc-100 mb-3">Drafts</div>
        {!drafts.length && <div className="text-zinc-400 text-sm">No drafts yet.</div>}
        <div className="space-y-3">
          {drafts.map((d: any) => (
            <div key={d.id} className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60">
              <div className="text-sm font-semibold text-zinc-100">{d.subject}</div>
              <div className="text-xs text-zinc-400 mt-1">{d.status}</div>
              <div className="mt-3 whitespace-pre-wrap text-sm text-zinc-200">{d.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DraftsView({ onOpenThread }: { onOpenThread: (threadId: string) => void }) {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    try {
      const res = await fetch("/api/email/drafts?limit=100");
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "drafts_load_failed");
      setDrafts(j.drafts ?? []);
    } catch (e: any) {
      setErr(e?.message ?? "unknown_error");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 space-y-4">
      <div className="text-lg font-semibold text-zinc-100">Drafts</div>
      {err && (
        <div className="p-4 rounded-xl border border-red-500/50 bg-red-500/10 text-red-200">{err}</div>
      )}
      {!drafts.length && <div className="text-zinc-400">No drafts yet.</div>}
      <div className="space-y-3">
        {drafts.map((d) => (
          <div key={d.id} className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="font-semibold text-zinc-100">{d.subject}</div>
                <div className="text-xs text-zinc-400 mt-1">
                  {d.status} · {new Date(d.updated_at).toLocaleString()}
                </div>
              </div>
              <button
                className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/45 text-sm font-semibold text-zinc-200"
                onClick={() => onOpenThread(d.thread_id)}
              >
                Open thread
              </button>
            </div>
            <div className="mt-3 whitespace-pre-wrap text-sm text-zinc-200">{d.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FollowupsView({ onOpenThread }: { onOpenThread: (threadId: string) => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    try {
      const res = await fetch("/api/email/followups?status=scheduled&limit=200");
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "followups_load_failed");
      setItems(j.followups ?? []);
    } catch (e: any) {
      setErr(e?.message ?? "unknown_error");
    }
  }

  async function mark(id: string, status: "done" | "canceled") {
    await fetch("/api/email/followups/update", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 space-y-4">
      <div className="text-lg font-semibold text-zinc-100">Follow-ups</div>
      {err && (
        <div className="p-4 rounded-xl border border-red-500/50 bg-red-500/10 text-red-200">{err}</div>
      )}
      {!items.length && <div className="text-zinc-400">No scheduled follow-ups.</div>}
      <div className="space-y-3">
        {items.map((f) => (
          <div key={f.id} className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <div className="font-semibold text-zinc-100">
                  {new Date(f.follow_up_at).toLocaleString()}
                </div>
                <div className="text-xs text-zinc-400 mt-1">Thread: {f.thread_id}</div>
                <div className="text-sm text-zinc-200 mt-2">{f.reason}</div>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/45 text-sm font-semibold text-zinc-200"
                  onClick={() => onOpenThread(f.thread_id)}
                >
                  Open
                </button>
                <button
                  className="px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 text-sm font-semibold text-emerald-100"
                  onClick={() => mark(f.id, "done")}
                >
                  Done
                </button>
                <button
                  className="px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/45 text-sm font-semibold text-zinc-200"
                  onClick={() => mark(f.id, "canceled")}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DailyBriefView({ onOpenThread }: { onOpenThread: (threadId: string) => void }) {
  const [bullets, setBullets] = useState<string[]>([]);
  const [day, setDay] = useState<string>("");
  const [cached, setCached] = useState<boolean>(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    try {
      const res = await fetch("/api/email/brief/today");
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "brief_load_failed");
      setBullets(j.bullets ?? []);
      setDay(j.day ?? "");
      setCached(!!j.cached);
    } catch (e: any) {
      setErr(e?.message ?? "unknown_error");
    }
  }

  useEffect(() => {
    load();
  }, []);

  function tryExtractThreadId(line: string) {
    const m = line.match(/thread\s+([0-9a-fA-F-]{8,})/);
    return m?.[1] ?? null;
  }

  return (
    <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-semibold text-zinc-100">Daily Brief</div>
          <div className="text-xs text-zinc-400 mt-1">
            {day} {cached ? "(cached)" : "(fresh)"}
          </div>
        </div>
        <button
          className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/45 text-sm font-semibold text-zinc-200"
          onClick={load}
        >
          Refresh
        </button>
      </div>

      {err && (
        <div className="p-4 rounded-xl border border-red-500/50 bg-red-500/10 text-red-200">{err}</div>
      )}

      {!bullets.length && <div className="text-zinc-400">No brief yet.</div>}

      <div className="space-y-3">
        {bullets.map((b, idx) => {
          const tid = tryExtractThreadId(b);
          return (
            <div
              key={idx}
              className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/60 flex items-center justify-between gap-3"
            >
              <div className="text-sm text-zinc-200 flex-1">{b}</div>
              {tid && (
                <button
                  className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/45 text-sm font-semibold text-zinc-200"
                  onClick={() => onOpenThread(tid)}
                >
                  Open
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
