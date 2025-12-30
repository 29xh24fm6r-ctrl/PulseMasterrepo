"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createFollowUp,
  getFollowUps,
  updateFollowUpStatus,
  FollowUp,
} from "@/lib/api/core";

export default function FollowUpsPage() {
  const [items, setItems] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const open = useMemo(() => items.filter((x) => x.status !== "done"), [items]);
  const done = useMemo(() => items.filter((x) => x.status === "done"), [items]);

  async function refresh() {
    setErr(null);
    setLoading(true);
    try {
      const res = await getFollowUps();
      setItems(res.followUps);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load follow-ups");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onCreate() {
    if (!title.trim()) return;
    setErr(null);
    try {
      const res = await createFollowUp({
        title: title.trim(),
        body: body.trim(),
        status: "open",
        source: "ui",
      });
      setItems((prev) => [res.followUp, ...prev]);
      setTitle("");
      setBody("");
    } catch (e: any) {
      setErr(e?.message ?? "Failed to create follow-up");
    }
  }

  async function setStatus(id: string, status: string) {
    setErr(null);
    try {
      const res = await updateFollowUpStatus({ id, status });
      setItems((prev) => prev.map((x) => (x.id === id ? res.followUp : x)));
    } catch (e: any) {
      setErr(e?.message ?? "Failed to update status");
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Follow-ups</h1>
        <p className="text-sm opacity-70">
          Backed by canon DB + real APIs (no stubs).
        </p>
      </div>

      {err && (
        <div className="border rounded-lg p-3 text-sm">
          <span className="font-medium">Error:</span> {err}
        </div>
      )}

      <div className="border rounded-xl p-4 space-y-3">
        <div className="font-medium">Create follow-up</div>
        <input
          className="w-full border rounded-lg p-2"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full border rounded-lg p-2"
          placeholder="Body (optional)"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button
          className="border rounded-lg px-3 py-2"
          onClick={onCreate}
          disabled={!title.trim()}
        >
          Add
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="border rounded-xl p-4 space-y-3">
          <div className="font-medium">Open ({open.length})</div>
          {loading ? (
            <div className="text-sm opacity-70">Loading…</div>
          ) : open.length ? (
            <ul className="space-y-2">
              {open.map((x) => (
                <li key={x.id} className="border rounded-lg p-3 space-y-2">
                  <div className="font-medium">{x.title}</div>
                  {x.body ? <div className="text-sm opacity-70">{x.body}</div> : null}
                  <div className="flex gap-2">
                    <button
                      className="border rounded-lg px-2 py-1 text-sm"
                      onClick={() => setStatus(x.id, "done")}
                    >
                      Mark done
                    </button>
                    <button
                      className="border rounded-lg px-2 py-1 text-sm"
                      onClick={() => setStatus(x.id, "snoozed")}
                    >
                      Snooze
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm opacity-70">No follow-ups yet.</div>
          )}
        </div>

        <div className="border rounded-xl p-4 space-y-3">
          <div className="font-medium">Done ({done.length})</div>
          {loading ? (
            <div className="text-sm opacity-70">Loading…</div>
          ) : done.length ? (
            <ul className="space-y-2">
              {done.map((x) => (
                <li key={x.id} className="border rounded-lg p-3">
                  <div className="font-medium">{x.title}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm opacity-70">Nothing completed yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
