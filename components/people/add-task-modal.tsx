"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface AddTaskModalProps {
  personId: string; // ✅ required: crm_contacts.id
  personName?: string; // optional (UI only)
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddTaskModal({
  personId,
  personName,
  onClose,
  onSuccess,
}: AddTaskModalProps) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Convert YYYY-MM-DD to ISO string at local noon to avoid timezone day-shift
  const dueAtIso = dueDate ? new Date(`${dueDate}T12:00:00`).toISOString() : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/crm/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact_id: personId, // ✅ CRITICAL: link task to CRM contact
          title: title.trim(),
          due_at: dueAtIso,
          priority: 2,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create task");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-800 rounded-lg border border-zinc-700 w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <div>
            <h2 className="text-lg font-semibold">Add Task</h2>
            {personName && (
              <div className="text-xs text-gray-400 mt-0.5">For: {personName}</div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-700 rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Task Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Follow up on proposal"
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
              required
              maxLength={500}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:outline-none focus:border-purple-500"
            />
            <div className="text-xs text-gray-500 mt-1">
              Stored as UTC timestamp.
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
            >
              {loading ? "Creating..." : "Add Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
