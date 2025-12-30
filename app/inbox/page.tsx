"use client";

import { useEffect, useState } from "react";
import {
    getInboxItems,
    seedInboxDemo,
    updateInboxItem,
    inboxToFollowUp,
    inboxToTask,
    getInboxRules,
    createInboxRule,
    runInboxAutopilot,
    suggestInboxTriage,
    inboxQuickComplete,
    inboxSnooze,
    createReplyDraft,
    getReplyDraft,
    updateReplyDraft,
    InboxItem,
} from "@/lib/api/core";

export default function InboxPage() {
    const [items, setItems] = useState<InboxItem[]>([]);
    const [rules, setRules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);
    const [showRules, setShowRules] = useState(false);
    const [lastRun, setLastRun] = useState<any>(null);

    // Rule form
    const [ruleMeta, setRuleMeta] = useState({ match_from_email: "", action_type: "create_follow_up", action_due_minutes: 0 });

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

    async function load() {
        setErr(null);
        setLoading(true);
        try {
            const [iRes, rRes] = await Promise.all([
                getInboxItems({ archived: false }),
                getInboxRules(),
            ]);
            setItems(iRes.items);
            setRules(rRes.rules);
        } catch (e: any) {
            setErr(e?.message ?? "Failed to load inbox");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    async function seed() {
        setErr(null);
        try {
            const res = await seedInboxDemo();
            setItems((prev) => [...res.items, ...prev]);
        } catch (e: any) {
            setErr(e?.message ?? "Failed to seed demo");
        }
    }

    async function markRead(id: string) {
        const res = await updateInboxItem({ id, is_unread: false });
        setItems((prev) => prev.map((x) => (x.id === id ? res.item : x)));
    }

    async function archive(id: string) {
        const res = await updateInboxItem({ id, is_archived: true });
        setItems((prev) => prev.filter((x) => x.id !== id));
    }

    async function toFollowUp(id: string) {
        await inboxToFollowUp({ inboxItemId: id });
        await markRead(id);
    }

    async function toTask(id: string) {
        await inboxToTask({ inboxItemId: id });
        await markRead(id);
    }

    async function saveRule() {
        if (!ruleMeta.match_from_email) return;
        try {
            await createInboxRule({
                match_from_email: ruleMeta.match_from_email,
                action_type: ruleMeta.action_type,
                action_due_minutes: ruleMeta.action_due_minutes || null,
            });
            const rRes = await getInboxRules();
            setRules(rRes.rules);
            setRuleMeta({ match_from_email: "", action_type: "create_follow_up", action_due_minutes: 0 });
        } catch (e: any) {
            setErr(e?.message ?? "Failed to save rule");
        }
    }

    async function runAutopilot() {
        try {
            const res = await runInboxAutopilot();
            setLastRun(res);
            load(); // reload items
        } catch (e: any) {
            setErr(e?.message ?? "Autopilot failed");
        }
    }

    async function runTriage() {
        try {
            await suggestInboxTriage();
            load();
        } catch (e: any) {
            setErr(e?.message ?? "Triage failed");
        }
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Inbox</h1>
                    <p className="text-sm opacity-70">Turn messages into follow-ups and tasks.</p>
                </div>
                <div className="flex gap-2">
                    <button className="border rounded-lg px-3 py-2 bg-zinc-900 hover:bg-zinc-800" onClick={runTriage}>
                        ✳ Suggest Triage
                    </button>
                    <button className="border rounded-lg px-3 py-2 bg-zinc-900 hover:bg-zinc-800" onClick={runAutopilot}>
                        ⚡ Run Autopilot
                    </button>
                    <button className="border rounded-lg px-3 py-2" onClick={() => setShowRules(!showRules)}>
                        {showRules ? "Hide Rules" : "Rules"}
                    </button>
                    <button className="border rounded-lg px-3 py-2" onClick={seed}>
                        Seed demo
                    </button>
                </div>
            </div>

            {err && <div className="border rounded-lg p-3 text-sm text-red-400 border-red-900 bg-red-900/10">Error: {err}</div>}

            {lastRun && (
                <div className="border border-green-900 bg-green-900/10 p-3 rounded-lg text-sm text-green-300">
                    Autopilot: Processed {lastRun.processed}, Matched {lastRun.matched}, Actions {lastRun.actions}
                </div>
            )}

            {showRules && (
                <div className="border border-zinc-800 rounded-xl p-4 bg-zinc-900/50 space-y-4">
                    <h3 className="font-medium">Autopilot Rules ({rules.length})</h3>
                    <div className="flex gap-2 items-end">
                        <div className="space-y-1">
                            <label className="text-xs opacity-70">From Email</label>
                            <input
                                className="block bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm"
                                placeholder="client@example.com"
                                value={ruleMeta.match_from_email}
                                onChange={(e) => setRuleMeta({ ...ruleMeta, match_from_email: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs opacity-70">Action</label>
                            <select
                                className="block bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-sm"
                                value={ruleMeta.action_type}
                                onChange={(e) => setRuleMeta({ ...ruleMeta, action_type: e.target.value })}
                            >
                                <option value="create_follow_up">Create Follow-up</option>
                                <option value="create_task">Create Task</option>
                                <option value="archive">Archive</option>
                            </select>
                        </div>
                        <button className="border bg-zinc-800 hover:bg-zinc-700 rounded px-3 py-1 text-sm" onClick={saveRule}>
                            Add Rule
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-sm opacity-70">Loading…</div>
            ) : (
                <div className="space-y-2">
                    {items.map((x) => (
                        <div key={x.id} className="border border-zinc-800 rounded-xl p-4 space-y-2 bg-zinc-900/30">
                            <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        {x.triage_status && x.triage_status !== 'new' && (
                                            <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${x.triage_priority === 'high' ? 'border-red-900 bg-red-900/20 text-red-400' : 'border-zinc-700 bg-zinc-800 text-zinc-400'
                                                }`}>
                                                {x.triage_status.replace('_', ' ')}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm font-medium truncate">
                                        {x.subject ?? "(no subject)"}
                                        {x.is_unread ? <span className="ml-2 text-xs text-blue-400 font-medium tracking-wide">(unread)</span> : null}
                                    </div>
                                    <div className="text-xs opacity-70 truncate">
                                        {x.from_name ?? x.from_email ?? "Unknown sender"}
                                    </div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button className="border border-zinc-700 hover:bg-zinc-800 rounded-lg px-2 py-1 text-sm" onClick={() => openDraft(x.id)}>
                                        ✍ Draft
                                    </button>
                                    <button className="border border-zinc-700 hover:bg-zinc-800 rounded-lg px-2 py-1 text-sm" onClick={async () => { await inboxSnooze(x.id, "tomorrow_morning"); await load(); }}>
                                        💤 Tomorrow
                                    </button>
                                    <button className="border border-zinc-700 hover:bg-zinc-800 rounded-lg px-2 py-1 text-sm" onClick={async () => { await inboxQuickComplete(x.id, false); await load(); }}>
                                        ✅ Done
                                    </button>
                                    <button className="border border-zinc-700 hover:bg-zinc-800 rounded-lg px-2 py-1 text-sm transition-colors" onClick={() => toFollowUp(x.id)}>
                                        → Follow-up
                                    </button>
                                    <button className="border border-zinc-700 hover:bg-zinc-800 rounded-lg px-2 py-1 text-sm transition-colors" onClick={() => toTask(x.id)}>
                                        → Task
                                    </button>
                                    <button className="border border-zinc-700 hover:bg-zinc-800 rounded-lg px-2 py-1 text-sm transition-colors" onClick={() => archive(x.id)}>
                                        Archive
                                    </button>
                                </div>
                            </div>
                            {x.snippet ? <div className="text-sm opacity-80">{x.snippet}</div> : null}
                            {x.suggested_action && (
                                <div className="text-xs opacity-50 flex gap-2 items-center pt-1">
                                    <span>💡 Suggested: {x.suggested_action}</span>
                                    {x.triage_meta?.triage_reason && <span>(reason: {x.triage_meta.triage_reason})</span>}
                                </div>
                            )}
                        </div>
                    ))}
                    {!items.length && <div className="text-sm opacity-70 p-8 text-center border border-dashed border-zinc-800 rounded-xl">Inbox is empty.</div>}
                </div>
            )}


            {
                draftOpen && draft ? (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                        <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-xl border border-zinc-700 p-4 space-y-3 shadow-2xl">
                            <div className="flex items-center justify-between">
                                <div className="font-medium">Reply Draft</div>
                                <button className="border rounded-lg px-2 py-1 text-sm hover:bg-zinc-800" onClick={() => setDraftOpen(false)}>
                                    Close
                                </button>
                            </div>

                            <input
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2"
                                value={draft.subject ?? ""}
                                onChange={(e) => setDraft((d: any) => ({ ...d, subject: e.target.value }))}
                                onBlur={() => saveDraft({ subject: draft.subject })}
                            />

                            <textarea
                                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 min-h-[220px]"
                                value={draft.body ?? ""}
                                onChange={(e) => setDraft((d: any) => ({ ...d, body: e.target.value }))}
                                onBlur={() => saveDraft({ body: draft.body })}
                            />

                            <div className="flex justify-end gap-2">
                                <button
                                    className="border bg-zinc-800 hover:bg-zinc-700 rounded-lg px-3 py-2 text-sm"
                                    onClick={async () => { await saveDraft({ status: "ready" }); }}
                                >
                                    Mark Ready
                                </button>
                                <button
                                    className="border rounded-lg px-3 py-2 text-sm hover:bg-zinc-800"
                                    onClick={() => setDraftOpen(false)}
                                >
                                    Done
                                </button>
                            </div>

                            <div className="text-xs opacity-60">
                                Stub only: this saves drafts; sending will be wired next.
                            </div>
                        </div>
                    </div>
                ) : null
            }
        </div>
    );
}
