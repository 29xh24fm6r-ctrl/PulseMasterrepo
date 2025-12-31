"use client";

import { useEffect, useState } from "react";
import {
  getWorkQueue,
  patchInboxTriage,
  inboxToTask,
  inboxToFollowUp,
  suggestInboxTriage,
  inboxQuickComplete,
  inboxSnooze,
  taskQuickComplete,
  taskSnooze,
  followUpQuickComplete,
  followUpSnooze,
  createReplyDraft,
  getReplyDraft,
  updateReplyDraft,
  aiSuggestReplyDraft,
  sendReplyDraft,
  generateDailyBrief,
  getScoreboardDays,
} from "@/lib/api/core";

export default function WorkPage() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Scoreboard & Brief
  const [scoreboard, setScoreboard] = useState<any[]>([]);
  const [brief, setBrief] = useState<any>(null);
  const [briefLoading, setBriefLoading] = useState(false);

  // Draft state
  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState<any | null>(null);
  const [draftInboxItemId, setDraftInboxItemId] = useState<string | null>(null);

  async function openDraft(inboxItemId: string) {
    setErr(null);
    setDraftInboxItemId(inboxItemId);
    const existing = await getReplyDraft(inboxItemId);
    const d = existing.draft ?? (await createReplyDraft(inboxItemId)).draft;
    setDraft(d);
    setDraftOpen(true);
  }

  async function saveDraft(patch: Partial<{ subject: string; body: string; status: string }>) {
    if (!draft?.id) return;
    const res = await updateReplyDraft({ id: draft.id, ...patch });
    setDraft(res.draft);
  }

  async function aiSuggest() {
    if (!draftInboxItemId) return;
    const res = await aiSuggestReplyDraft(draftInboxItemId);
    if (res.draft) {
      setDraft((d: any) => ({ ...d, ...res.draft }));
      await saveDraft(res.draft);
    }
  }

  async function sendDraft(sendAt?: string) {
    if (!draft?.id) return;
    try {
      await sendReplyDraft(draft.id, sendAt);
      setDraftOpen(false);
      await load(); // re-load queue
    } catch (e: any) {
      alert("Send failed: " + e.message);
    }
  }

  async function load() {
    setErr(null);
    setLoading(true);
    try {
      const [wRes, sRes] = await Promise.all([getWorkQueue(), getScoreboardDays()]);
      setData(wRes);
      setScoreboard(sRes.days);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load work queue");
    } finally {
      setLoading(false);
    }
  }

  async function genBrief() {
    setBriefLoading(true);
    try {
      const res = await generateDailyBrief();
      setBrief(res.brief);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBriefLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function runTriage() {
    setErr(null);
    try {
      await suggestInboxTriage(50);
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "Triage suggest failed");
    }
  }

  async function setStatus(id: string, triage_status: string) {
    await patchInboxTriage({ id, triage_status });
    await load();
  }

  async function convertToTask(id: string) {
    await inboxToTask({ inboxItemId: id });
    await setStatus(id, "to_do");
  }

  async function convertToFollowUp(id: string) {
    await inboxToFollowUp({ inboxItemId: id });
    await setStatus(id, "to_do");
  }

  const inbox = data?.inbox ?? [];
  const followUps = data?.followUpsDueToday ?? [];
  const tasks = data?.tasksDueToday ?? [];
  const lastRun = data?.lastAutopilotRun ?? null;

  return (
    <div className="p-6 space-y-8">
      {/* Header & Controls */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Work Queue</h1>
          <p className="text-sm opacity-70">Inbox → Triage → Execute.</p>
          {lastRun && (
            <p className="text-xs opacity-60 mt-1">
              Last autopilot: {new Date(lastRun.started_at).toLocaleString()} ({lastRun.actions_count} actions)
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {!brief && <button className="border rounded-lg px-3 py-2 bg-zinc-900 hover:bg-zinc-800" disabled={briefLoading} onClick={genBrief}>
            {briefLoading ? "Generating..." : "📄 Daily Brief"}
          </button>}
          <button className="border rounded-lg px-3 py-2 bg-zinc-900 hover:bg-zinc-800" onClick={runTriage}>
            ✳ Suggest Triage
          </button>
          <button className="border rounded-lg px-3 py-2" onClick={load}>
            Refresh
          </button>
        </div>
      </div>

      {err && <div className="border rounded-lg p-3 text-sm border-red-900 bg-red-900/10">Error: {err}</div>}

      {/* Brief */}
      {brief && (
        <div className="border border-blue-900/30 bg-blue-900/10 rounded-xl p-4 space-y-2">
          <div className="font-semibold text-blue-200">Daily Brief ({brief.day})</div>
          <div className="whitespace-pre-wrap text-sm opacity-90 font-mono">{brief.content}</div>
        </div>
      )}

      {/* Scoreboard */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {scoreboard.slice(0, 5).map(day => (
          <div key={day.id} className="border border-zinc-800 bg-zinc-900/20 rounded-lg p-3 space-y-1">
            <div className="text-xs opacity-50 uppercase tracking-widest">{day.day}</div>
            <div className="text-lg font-bold flex gap-3">
              <span title="Inbox Done">📥 {day.inbox_done_count}</span>
              <span title="Replies Sent">✉ {day.replies_sent_count}</span>
            </div>
            <div className="text-xs opacity-60 flex gap-2">
              <span>Tasks: {day.tasks_done_count}</span>
              <span>F/U: {day.followups_done_count}</span>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="text-sm opacity-70">Loading…</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3 items-start">
          {/* Inbox */}
          <section className="border rounded-xl p-4 space-y-3 bg-zinc-900/10">
            <div className="flex items-center justify-between">
              <div className="font-medium">Inbox Needing Action</div>
              <div className="text-xs opacity-60">{inbox.length}</div>
            </div>
            <div className="space-y-2">
              {inbox.slice(0, 20).map((x: any) => (
                <div key={x.id} className="border rounded-lg p-3 space-y-2 bg-zinc-900/20">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium truncate">{x.subject ?? "(no subject)"}</div>
                    {x.triage_priority === 'high' && <span className="text-[10px] bg-red-900/30 text-red-200 px-1 rounded">HIGH</span>}
                  </div>
                  <div className="text-xs opacity-70 truncate">{x.from_name ?? x.from_email ?? "Unknown"}</div>
                  {x.snippet ? <div className="text-sm opacity-80 line-clamp-2">{x.snippet}</div> : null}

                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button className="border rounded px-2 py-1 text-xs hover:bg-zinc-800" onClick={() => openDraft(x.id)}>
                      ✍ Draft Reply
                    </button>
                    <button className="border rounded px-2 py-1 text-xs hover:bg-zinc-800" onClick={async () => { await inboxQuickComplete(x.id, false); await load(); }}>
                      ✅ Done
                    </button>
                    <button className="border rounded px-2 py-1 text-xs hover:bg-zinc-800" onClick={async () => { await inboxSnooze(x.id, "tomorrow_morning"); await load(); }}>
                      💤 Tomorrow
                    </button>
                    <div className="flex gap-1">
                      <button className="flex-1 border rounded px-1 py-1 text-xs hover:bg-zinc-800" onClick={() => convertToTask(x.id)}>Task</button>
                      <button className="flex-1 border rounded px-1 py-1 text-xs hover:bg-zinc-800" onClick={() => convertToFollowUp(x.id)}>F/U</button>
                    </div>
                  </div>
                </div>
              ))}
              {!inbox.length && <div className="text-sm opacity-60">No inbox items require action.</div>}
            </div>
          </section>

          {/* Follow-ups due today */}
          <section className="border rounded-xl p-4 space-y-3 bg-zinc-900/10">
            <div className="flex items-center justify-between">
              <div className="font-medium">Follow-ups Due Today</div>
              <div className="text-xs opacity-60">{followUps.length}</div>
            </div>
            <div className="space-y-2">
              {followUps.slice(0, 20).map((x: any) => (
                <div key={x.id} className="border rounded-lg p-3 bg-zinc-900/20 space-y-2">
                  <div className="text-sm font-medium">{x.title}</div>
                  <div className="text-xs opacity-70">{x.due_at ? new Date(x.due_at).toLocaleTimeString() : "No time"}</div>
                  <div className="flex gap-2">
                    <button className="border rounded px-2 py-1 text-xs hover:bg-zinc-800" onClick={async () => { await followUpQuickComplete(x.id); await load(); }}>
                      ✅ Done
                    </button>
                    <button className="border rounded px-2 py-1 text-xs hover:bg-zinc-800" onClick={async () => { await followUpSnooze(x.id, "tomorrow_morning"); await load(); }}>
                      💤 Tmrw
                    </button>
                  </div>
                </div>
              ))}
              {!followUps.length && <div className="text-sm opacity-60">No follow-ups due today.</div>}
            </div>
          </section>

          {/* Tasks due today */}
          <section className="border rounded-xl p-4 space-y-3 bg-zinc-900/10">
            <div className="flex items-center justify-between">
              <div className="font-medium">Tasks Due Today</div>
              <div className="text-xs opacity-60">{tasks.length}</div>
            </div>
            <div className="space-y-2">
              {tasks.slice(0, 20).map((x: any) => (
                <div key={x.id} className="border rounded-lg p-3 bg-zinc-900/20 space-y-2">
                  <div className="text-sm font-medium">{x.title}</div>
                  <div className="text-xs opacity-70">{x.due_at ? new Date(x.due_at).toLocaleTimeString() : "No time"}</div>
                  <div className="flex gap-2">
                    <button className="border rounded px-2 py-1 text-xs hover:bg-zinc-800" onClick={async () => { await taskQuickComplete(x.id); await load(); }}>
                      ✅ Done
                    </button>
                    <button className="border rounded px-2 py-1 text-xs hover:bg-zinc-800" onClick={async () => { await taskSnooze(x.id, "tomorrow_morning"); await load(); }}>
                      💤 Tmrw
                    </button>
                  </div>
                </div>
              ))}
              {!tasks.length && <div className="text-sm opacity-60">No tasks due today.</div>}
            </div>
          </section>
        </div>
      )}

      {/* Modal */}
      {draftOpen && draft ? (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 w-full max-w-2xl rounded-xl border border-zinc-700 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="font-medium text-lg">Reply Draft</div>
              <div className="flex gap-2">
                <button className="text-xs border rounded px-2 py-1 hover:bg-zinc-800" onClick={aiSuggest}>
                  ✨ AI Suggest
                </button>
                <button className="border rounded-lg px-2 py-1 text-sm hover:bg-zinc-800" onClick={() => setDraftOpen(false)}>
                  Wait
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <input
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 focus:border-blue-500 outline-none"
                placeholder="Subject"
                value={draft.subject ?? ""}
                onChange={(e) => setDraft((d: any) => ({ ...d, subject: e.target.value }))}
                onBlur={() => saveDraft({ subject: draft.subject })}
              />

              <textarea
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 min-h-[300px] font-mono text-sm focus:border-blue-500 outline-none"
                placeholder="Write your reply..."
                value={draft.body ?? ""}
                onChange={(e) => setDraft((d: any) => ({ ...d, body: e.target.value }))}
                onBlur={() => saveDraft({ body: draft.body })}
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <div className="text-xs opacity-50">Draft saved automatically.</div>
              <div className="flex gap-2">
                <button
                  className="border border-zinc-600 hover:bg-zinc-800 rounded-lg px-4 py-2 text-sm"
                  onClick={() => sendDraft(new Date(Date.now() + 86400000).toISOString())}
                >
                  💤 Send Tmrw 9am
                </button>
                <button
                  className="bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg px-6 py-2 text-sm"
                  onClick={() => sendDraft()}
                >
                  🚀 Queue Send
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
