// Email Command Center
// app/email/command-center/page.tsx

"use client";

import { useState, useEffect } from "react";
import { Mail, Clock, CheckCircle2, AlertCircle, Send, Archive, Brain } from "lucide-react";
import Link from "next/link";

interface OverviewData {
  todayDate: string;
  attentionScore: {
    score: number;
    riskLevel: string;
    breakdown: {
      urgentFollowups: number;
      overduePromises: number;
      overdueTasks: number;
      unreadPriorityEmails: number;
    };
  };
  urgentFollowups: any[];
  openEmailTasks: any[];
  suggestedTasks: any[];
  waitingOnOthers: any[];
  lowPriorityFeed: any[];
  brokenPromises: any[];
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-zinc-700 text-zinc-300",
  normal: "bg-blue-500/20 text-blue-400",
  high: "bg-amber-500/20 text-amber-400",
  critical: "bg-red-500/20 text-red-400",
};

export default function EmailCommandCenterPage() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLowPriority, setShowLowPriority] = useState(false);

  useEffect(() => {
    loadOverview();
  }, []);

  async function loadOverview() {
    try {
      const res = await fetch("/api/email/overview");
      const data = await res.json();
      if (res.ok) {
        setOverview(data);
      }
    } catch (err) {
      console.error("Failed to load overview:", err);
    } finally {
      setLoading(false);
    }
  }

  async function markTaskDone(taskId: string) {
    try {
      const res = await fetch("/api/email/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, status: "done" }),
      });
      if (res.ok) {
        loadOverview();
      }
    } catch (err) {
      console.error("Failed to mark task done:", err);
    }
  }

  async function acceptTask(taskId: string) {
    try {
      const res = await fetch("/api/email/tasks/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, feedback: "accepted" }),
      });
      if (res.ok) {
        loadOverview();
      }
    } catch (err) {
      console.error("Failed to accept task:", err);
    }
  }

  async function rejectTask(taskId: string) {
    try {
      const res = await fetch("/api/email/tasks/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, feedback: "rejected" }),
      });
      if (res.ok) {
        loadOverview();
      }
    } catch (err) {
      console.error("Failed to reject task:", err);
    }
  }

  async function markFollowupHandled(followupId: string) {
    try {
      const res = await fetch("/api/email/followups", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followupId, status: "cancelled" }),
      });
      if (res.ok) {
        loadOverview();
      }
    } catch (err) {
      console.error("Failed to mark followup handled:", err);
    }
  }

  async function captureToBrain(threadId: string) {
    try {
      const res = await fetch("/api/email/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId }),
      });
      if (res.ok) {
        alert("Thread captured to Second Brain!");
      }
    } catch (err) {
      console.error("Failed to capture to brain:", err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading email command center...</div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-6xl mx-auto text-center text-zinc-400">
          No email data available.
        </div>
      </div>
    );
  }

  const totalOwed = overview.urgentFollowups.length;
  const totalTasks = overview.openEmailTasks.length;
  const totalPromises = overview.brokenPromises.length;
  const riskColor =
    overview.attentionScore.riskLevel === "High"
      ? "text-red-400"
      : overview.attentionScore.riskLevel === "Moderate"
      ? "text-amber-400"
      : "text-green-400";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Mail className="w-6 h-6 text-violet-400" />
              Email Command Center
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              You owe {totalOwed} replies, {totalTasks} tasks, {totalPromises} promises
            </p>
          </div>
        </div>

        {/* Attention Score Bar */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-zinc-400">Attention Score</div>
              <div className="text-4xl font-bold text-white mt-1">
                {overview.attentionScore.score}
                <span className="text-lg text-zinc-400">/100</span>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-lg font-semibold ${riskColor}`}>
                Risk Level: {overview.attentionScore.riskLevel}
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                {overview.attentionScore.breakdown.urgentFollowups} followups ·{" "}
                {overview.attentionScore.breakdown.overduePromises} promises ·{" "}
                {overview.attentionScore.breakdown.overdueTasks} tasks
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left: People Waiting on You */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-white">People Waiting on You</h2>
            </div>

            {overview.urgentFollowups.length === 0 ? (
              <div className="text-sm text-zinc-400">No urgent followups. You're all caught up!</div>
            ) : (
              <div className="space-y-3">
                {overview.urgentFollowups.map((followup) => (
                  <div
                    key={followup.id}
                    className={`border rounded-lg p-3 space-y-2 ${
                      followup.isOverdue
                        ? "border-red-500/50 bg-red-500/10"
                        : "border-amber-500/50 bg-amber-500/10"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{followup.from}</div>
                        <div className="text-xs text-zinc-400">{followup.subject}</div>
                        <div className="text-xs text-zinc-400 mt-1">
                          Due: {new Date(followup.responseDueAt).toLocaleString()}
                          {followup.isOverdue && (
                            <span className="ml-2 text-red-400 font-medium">OVERDUE</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => markFollowupHandled(followup.id)}
                          className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-xs transition-colors"
                        >
                          Handled
                        </button>
                        <button
                          onClick={() => captureToBrain(followup.threadId)}
                          className="px-2 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded text-xs transition-colors flex items-center gap-1"
                          title="Send to Brain"
                        >
                          <Brain className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: To-Dos from Emails */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">To-Dos from Emails</h2>
            </div>

            {overview.openEmailTasks.length === 0 ? (
              <div className="text-sm text-zinc-400">No open tasks from emails.</div>
            ) : (
              <div className="space-y-3">
                {overview.openEmailTasks.map((task) => (
                  <div
                    key={task.id}
                    className="border border-zinc-700 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{task.title}</div>
                        {task.description && (
                          <div className="text-xs text-zinc-400 mt-1">{task.description}</div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {task.dueAt && (
                            <div className="text-xs text-zinc-400">
                              Due: {new Date(task.dueAt).toLocaleDateString()}
                            </div>
                          )}
                          {task.priority && (
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal}`}
                            >
                              {task.priority}
                            </span>
                          )}
                        </div>
                        {task.threadSubject && (
                          <div className="text-xs text-zinc-500 mt-1">
                            From: {task.threadSubject}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => markTaskDone(task.id)}
                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Suggested Tasks Section */}
        {overview.suggestedTasks && overview.suggestedTasks.length > 0 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-semibold text-white">Suggested Tasks From Email</h2>
            </div>

            <div className="space-y-3">
              {overview.suggestedTasks.map((task) => (
                <div
                  key={task.id}
                  className="border border-amber-500/30 rounded-lg p-3 space-y-2 bg-amber-500/5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{task.title}</div>
                      {task.description && (
                        <div className="text-xs text-zinc-400 mt-1">{task.description}</div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {task.dueAt && (
                          <div className="text-xs text-zinc-400">
                            Due: {new Date(task.dueAt).toLocaleDateString()}
                          </div>
                        )}
                        {task.confidence && (
                          <div className="text-xs text-zinc-500">
                            Confidence: {(task.confidence * 100).toFixed(0)}%
                          </div>
                        )}
                      </div>
                      {task.threadSubject && (
                        <div className="text-xs text-zinc-500 mt-1">
                          From: {task.threadFrom} — {task.threadSubject}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => acceptTask(task.id)}
                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => rejectTask(task.id)}
                        className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-xs transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Promises At Risk Section */}
        {overview.brokenPromises && overview.brokenPromises.length > 0 && (
          <div className="bg-zinc-900/50 border border-red-500/30 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <h2 className="text-lg font-semibold text-white">Promises At Risk</h2>
            </div>

            <div className="space-y-3">
              {overview.brokenPromises.map((promise) => (
                <div
                  key={promise.id}
                  className="border border-red-500/50 rounded-lg p-3 space-y-2 bg-red-500/10"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{promise.promiseText}</div>
                      {promise.promiseDueAt && (
                        <div className="text-xs text-red-400 mt-1">
                          Due: {new Date(promise.promiseDueAt).toLocaleString()}
                          {new Date(promise.promiseDueAt) < new Date() && (
                            <span className="ml-2 font-medium">OVERDUE</span>
                          )}
                        </div>
                      )}
                      {promise.threadSubject && (
                        <div className="text-xs text-zinc-500 mt-1">
                          Thread: {promise.threadSubject}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => markFollowupHandled(promise.id)}
                      className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-xs transition-colors"
                    >
                      Handled
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

            {overview.openEmailTasks.length === 0 ? (
              <div className="text-sm text-zinc-400">No open tasks from emails.</div>
            ) : (
              <div className="space-y-3">
                {overview.openEmailTasks.map((task) => (
                  <div
                    key={task.id}
                    className="border border-zinc-700 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{task.title}</div>
                        {task.description && (
                          <div className="text-xs text-zinc-400 mt-1">{task.description}</div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {task.dueAt && (
                            <div className="text-xs text-zinc-400">
                              Due: {new Date(task.dueAt).toLocaleDateString()}
                            </div>
                          )}
                          {task.priority && (
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal}`}
                            >
                              {task.priority}
                            </span>
                          )}
                        </div>
                        {task.threadSubject && (
                          <div className="text-xs text-zinc-500 mt-1">
                            From: {task.threadSubject}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => markTaskDone(task.id)}
                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Waiting on Others */}
        {overview.waitingOnOthers.length > 0 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Waiting on Others</h2>
            </div>

            <div className="space-y-2">
              {overview.waitingOnOthers.map((thread) => (
                <div
                  key={thread.id}
                  className="border border-zinc-700 rounded-lg p-3 flex items-center justify-between"
                >
                  <div>
                    <div className="text-sm font-medium text-white">{thread.subject}</div>
                    <div className="text-xs text-zinc-400">
                      To: {Array.isArray(thread.to) ? thread.to.join(", ") : thread.to}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      Last message: {new Date(thread.lastMessageAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Low Priority Feed */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-zinc-400" />
              <h2 className="text-lg font-semibold text-white">Low Priority Feed</h2>
            </div>
            <button
              onClick={() => setShowLowPriority(!showLowPriority)}
              className="text-xs text-zinc-400 hover:text-zinc-300 transition-colors"
            >
              {showLowPriority ? "Hide" : "Show"}
            </button>
          </div>

          {showLowPriority && (
            <div className="space-y-2">
              {overview.lowPriorityFeed.length === 0 ? (
                <div className="text-sm text-zinc-400">No low priority emails.</div>
              ) : (
                overview.lowPriorityFeed.map((thread) => (
                  <div
                    key={thread.id}
                    className="border border-zinc-700 rounded-lg p-2 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-medium text-zinc-300">{thread.subject}</div>
                      <div className="text-xs text-zinc-500">{thread.from}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

