"use client";

import { useState } from "react";
import { createTask, updateTask, Task } from "@/lib/api/core";

export default function TasksPage() {
  const [items, setItems] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function add() {
    setErr(null);
    try {
      const res = await createTask({ title: title.trim(), status: "open" });
      setItems((prev) => [res.task, ...prev]);
      setTitle("");
    } catch (e: any) {
      setErr(e?.message ?? "Failed to create task");
    }
  }

  async function toggle(id: string, currentStatus?: string | null) {
    setErr(null);
    try {
      const next = currentStatus === "done" ? "open" : "done";
      const res = await updateTask({ id, status: next });
      setItems((prev) => prev.map((t) => (t.id === id ? res.task : t)));
    } catch (e: any) {
      setErr(e?.message ?? "Failed to update task");
    }
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Tasks</h1>

      {err && (
        <div className="border rounded-lg p-3 text-sm">
          <span className="font-medium">Error:</span> {err}
        </div>
      )}

      <div className="border rounded-xl p-4 space-y-3">
        <div className="font-medium">Create task</div>
        <div className="flex gap-2">
          <input
            className="flex-1 border rounded-lg p-2"
            placeholder="Task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button
            className="border rounded-lg px-3"
            onClick={add}
            disabled={!title.trim()}
          >
            Add
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((t) => (
          <div key={t.id} className="border rounded-lg p-3 flex items-center justify-between">
            <div className="text-sm font-medium">{t.title}</div>
            <button
              className="border rounded-lg px-2 py-1 text-sm"
              onClick={() => toggle(t.id, t.status)}
            >
              {t.status === "done" ? "Reopen" : "Done"}
            </button>
          </div>
        ))}
        {!items.length && <div className="text-sm opacity-70">No tasks created in this session yet.</div>}
      </div>
    </div>
  );
}
