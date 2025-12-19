"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, CheckSquare, Clock, AlertCircle, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface NeedsResponseThread {
  id: string;
  threadId: string;
  subject: string;
  snippet: string;
  from: string;
  to: string;
  occurredAt: string;
  unread: boolean;
  starred: boolean;
  importance: string;
  category: string;
  contactEmail: string | null;
}

interface NeedsResponsePanelProps {
  limit?: number;
}

export function NeedsResponsePanel({ limit = 10 }: NeedsResponsePanelProps) {
  const router = useRouter();
  const [threads, setThreads] = useState<NeedsResponseThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingTasks, setCreatingTasks] = useState(false);
  const [taskResult, setTaskResult] = useState<{ created: number; skipped: number } | null>(null);

  useEffect(() => {
    loadThreads();
  }, []);

  async function loadThreads() {
    setLoading(true);
    try {
      const res = await fetch(`/api/email/needs-response?limit=${limit}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setThreads(data.items || []);
      }
    } catch (err) {
      console.error("Failed to load needs-response threads:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTasks() {
    setCreatingTasks(true);
    setTaskResult(null);
    try {
      const res = await fetch("/api/email/needs-response/tasks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit }),
      });
      if (res.ok) {
        const data = await res.json();
        setTaskResult({ created: data.created || 0, skipped: data.skipped || 0 });
        // Reload threads to refresh UI
        await loadThreads();
      }
    } catch (err) {
      console.error("Failed to create tasks:", err);
    } finally {
      setCreatingTasks(false);
    }
  }

  function handleThreadClick(thread: NeedsResponseThread) {
    if (thread.contactEmail) {
      // Try to navigate to contact page
      // We'll need to resolve email to contact_id, but for now just show modal
      alert(`Thread: ${thread.subject}\n\nFrom: ${thread.from}\n\n${thread.snippet}`);
    } else {
      alert(`Thread: ${thread.subject}\n\nFrom: ${thread.from}\n\n${thread.snippet}`);
    }
  }

  function getImportanceColor(importance: string): string {
    switch (importance?.toLowerCase()) {
      case "high":
      case "urgent":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "normal":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "low":
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  }

  function getCategoryColor(category: string): string {
    switch (category?.toLowerCase()) {
      case "primary":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "social":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "promotions":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Clock className="w-4 h-4 animate-spin" />
          Loading needs response...
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Needs Response
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {threads.length} thread{threads.length !== 1 ? "s" : ""} requiring response
          </div>
        </div>
        <button
          onClick={handleCreateTasks}
          disabled={creatingTasks || threads.length === 0}
          className="text-xs px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-200 hover:bg-purple-500/15 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {creatingTasks ? (
            <>
              <Clock className="w-3 h-3 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <CheckSquare className="w-3 h-3" />
              Create Tasks
            </>
          )}
        </button>
      </div>

      {taskResult && (
        <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-300">
          Created {taskResult.created} task{taskResult.created !== 1 ? "s" : ""}
          {taskResult.skipped > 0 && `, skipped ${taskResult.skipped} duplicate${taskResult.skipped !== 1 ? "s" : ""}`}
        </div>
      )}

      {threads.length === 0 ? (
        <div className="text-sm text-gray-400 text-center py-8">
          <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No emails need response</p>
        </div>
      ) : (
        <div className="space-y-2">
          {threads.slice(0, limit).map((thread) => (
            <div
              key={thread.id}
              onClick={() => handleThreadClick(thread)}
              className="p-3 rounded-lg border border-white/10 bg-black/10 hover:bg-black/20 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {thread.unread && (
                      <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                    )}
                    <div className="text-sm font-medium text-white truncate">
                      {thread.subject || "(No subject)"}
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mb-2 truncate">
                    From: {thread.from}
                  </div>
                  {thread.snippet && (
                    <div className="text-xs text-gray-500 line-clamp-2 mb-2">
                      {thread.snippet}
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs px-2 py-0.5 rounded border ${getImportanceColor(thread.importance)}`}
                    >
                      {thread.importance || "normal"}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded border ${getCategoryColor(thread.category)}`}
                    >
                      {thread.category || "primary"}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(thread.occurredAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

