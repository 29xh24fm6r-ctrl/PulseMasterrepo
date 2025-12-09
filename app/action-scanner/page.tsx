"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { isGmailConnected, getGmailTokens, saveGmailTokens, clearGmailTokens } from "@/app/lib/gmail-storage";

type DetectedAction = {
  type: "task" | "follow_up" | "commitment" | "waiting_on";
  priority: "high" | "medium" | "low";
  description: string;
  dueDate: string | null;
  context: string;
  fromName: string;
  fromEmail: string;
  subject: string;
  messageId: string;
  confidence: number;
  personId?: string;
  personName?: string;
  inSecondBrain?: boolean;
  selected: boolean;
  status: "pending" | "creating" | "created" | "error" | "dismissed";
};

type ScanSummary = {
  tasks: number;
  followUps: number;
  commitments: number;
  waitingOn: number;
};

export default function ActionScannerPage() {
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [actions, setActions] = useState<DetectedAction[]>([]);
  const [stats, setStats] = useState({
    totalScanned: 0,
    emailsAnalyzed: 0,
    actionsFound: 0,
  });
  const [summary, setSummary] = useState<ScanSummary>({
    tasks: 0,
    followUps: 0,
    commitments: 0,
    waitingOn: 0,
  });
  const [activeTab, setActiveTab] = useState<"all" | "task" | "follow_up" | "commitment" | "waiting_on">("all");
  const [creating, setCreating] = useState(false);
  const [daysBack, setDaysBack] = useState(7);
  const [log, setLog] = useState<string[]>([]);
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);

  useEffect(() => {
    setGmailConnected(isGmailConnected());
  }, []);

  function pushLog(msg: string) {
    const stamp = new Date().toLocaleTimeString();
    setLog((prev) => [`${stamp} — ${msg}`, ...prev].slice(0, 30));
  }

  async function scanEmails() {
    if (!gmailConnected) {
      pushLog("❌ Gmail not connected");
      return;
    }

    setScanning(true);
    setScanned(false);
    pushLog(`📧 Scanning last ${daysBack} days for actions...`);

    try {
      const { accessToken, refreshToken } = getGmailTokens();

      const res = await fetch("/api/gmail/scan-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, refreshToken, maxResults: 100, daysBack }),
      });

      const data = await res.json();

      if (data.newAccessToken) {
        pushLog("🔄 Token refreshed");
        saveGmailTokens(data.newAccessToken, refreshToken || "");
      }

      if (data.needsReconnect) {
        pushLog("❌ Session expired - reconnect Gmail");
        clearGmailTokens();
        setGmailConnected(false);
        setScanning(false);
        return;
      }

      if (data.ok) {
        setStats({
          totalScanned: data.totalScanned,
          emailsAnalyzed: data.emailsAnalyzed,
          actionsFound: data.actionsFound,
        });

        setSummary(data.summary);

        const actionsWithState = (data.actions || []).map((a: any) => ({
          ...a,
          selected: a.priority === "high", // Auto-select high priority
          status: "pending" as const,
        }));

        setActions(actionsWithState);
        setScanned(true);

        pushLog(`🧠 Analysis Complete!`);
        pushLog(`📋 ${data.summary.tasks} tasks to do`);
        pushLog(`📅 ${data.summary.followUps} follow-ups needed`);
        pushLog(`📤 ${data.summary.commitments} commitments you made`);
        pushLog(`⏳ ${data.summary.waitingOn} things to track`);
      } else {
        pushLog(`❌ Scan failed: ${data.error}`);
      }
    } catch (err: any) {
      pushLog(`❌ Error: ${err.message}`);
    } finally {
      setScanning(false);
    }
  }

  function toggleAction(messageId: string, description: string) {
    setActions((prev) =>
      prev.map((a) =>
        a.messageId === messageId && a.description === description
          ? { ...a, selected: !a.selected }
          : a
      )
    );
  }

  function dismissAction(messageId: string, description: string) {
    setActions((prev) =>
      prev.map((a) =>
        a.messageId === messageId && a.description === description
          ? { ...a, status: "dismissed" as const, selected: false }
          : a
      )
    );
    pushLog("🚫 Action dismissed");
  }

  function selectAll() {
    const currentTab = activeTab;
    setActions((prev) =>
      prev.map((a) =>
        (currentTab === "all" || a.type === currentTab) && a.status === "pending"
          ? { ...a, selected: true }
          : a
      )
    );
  }

  function selectNone() {
    const currentTab = activeTab;
    setActions((prev) =>
      prev.map((a) =>
        currentTab === "all" || a.type === currentTab ? { ...a, selected: false } : a
      )
    );
  }

  async function createSelectedActions() {
    const selected = actions.filter((a) => a.selected && a.status === "pending");

    if (selected.length === 0) {
      pushLog("⚠️ No actions selected");
      return;
    }

    setCreating(true);
    pushLog(`📝 Creating ${selected.length} items...`);

    let created = 0;
    let errors = 0;

    for (const action of selected) {
      setActions((prev) =>
        prev.map((a) =>
          a.messageId === action.messageId && a.description === action.description
            ? { ...a, status: "creating" as const }
            : a
        )
      );

      try {
        const res = await fetch("/api/gmail/create-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });

        const data = await res.json();

        if (data.ok) {
          setActions((prev) =>
            prev.map((a) =>
              a.messageId === action.messageId && a.description === action.description
                ? { ...a, status: "created" as const }
                : a
            )
          );
          created++;
          pushLog(`✅ Created: ${action.description.slice(0, 40)}...`);
        } else {
          setActions((prev) =>
            prev.map((a) =>
              a.messageId === action.messageId && a.description === action.description
                ? { ...a, status: "error" as const }
                : a
            )
          );
          errors++;
          pushLog(`❌ Failed: ${data.error}`);
        }
      } catch (err) {
        setActions((prev) =>
          prev.map((a) =>
            a.messageId === action.messageId && a.description === action.description
              ? { ...a, status: "error" as const }
              : a
          )
        );
        errors++;
      }

      await new Promise((r) => setTimeout(r, 300));
    }

    pushLog(`🎉 Done! Created ${created}, Errors: ${errors}`);
    setCreating(false);
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case "task":
        return "📋";
      case "follow_up":
        return "📅";
      case "commitment":
        return "📤";
      case "waiting_on":
        return "⏳";
      default:
        return "📌";
    }
  }

  function getTypeLabel(type: string) {
    switch (type) {
      case "task":
        return "Task";
      case "follow_up":
        return "Follow-Up";
      case "commitment":
        return "Your Commitment";
      case "waiting_on":
        return "Waiting On";
      default:
        return type;
    }
  }

  function getTypeBadgeColor(type: string) {
    switch (type) {
      case "task":
        return "bg-blue-900/30 text-blue-400 border-blue-500/30";
      case "follow_up":
        return "bg-purple-900/30 text-purple-400 border-purple-500/30";
      case "commitment":
        return "bg-orange-900/30 text-orange-400 border-orange-500/30";
      case "waiting_on":
        return "bg-cyan-900/30 text-cyan-400 border-cyan-500/30";
      default:
        return "bg-slate-900/30 text-slate-400 border-slate-500/30";
    }
  }

  function getPriorityBadge(priority: string) {
    switch (priority) {
      case "high":
        return <span className="px-2 py-0.5 bg-red-900/30 text-red-400 text-xs rounded">🔥 High</span>;
      case "medium":
        return <span className="px-2 py-0.5 bg-yellow-900/30 text-yellow-400 text-xs rounded">⚡ Medium</span>;
      case "low":
        return <span className="px-2 py-0.5 bg-green-900/30 text-green-400 text-xs rounded">📎 Low</span>;
      default:
        return null;
    }
  }

  function getStatusBadge(status: DetectedAction["status"]) {
    switch (status) {
      case "pending":
        return null;
      case "creating":
        return <span className="px-2 py-0.5 bg-yellow-900/30 text-yellow-400 text-xs rounded animate-pulse">Creating...</span>;
      case "created":
        return <span className="px-2 py-0.5 bg-green-900/30 text-green-400 text-xs rounded">✅ Created</span>;
      case "dismissed":
        return <span className="px-2 py-0.5 bg-slate-700/50 text-slate-500 text-xs rounded">Dismissed</span>;
      case "error":
        return <span className="px-2 py-0.5 bg-red-900/30 text-red-400 text-xs rounded">❌ Error</span>;
      default:
        return null;
    }
  }

  const filteredActions = actions.filter((a) => {
    if (activeTab === "all") return a.status !== "dismissed";
    return a.type === activeTab && a.status !== "dismissed";
  });

  const selectedCount = actions.filter((a) => a.selected && a.status === "pending").length;
  const createdCount = actions.filter((a) => a.status === "created").length;

  if (gmailConnected === null) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">📧</div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">🎯 Action Scanner</h1>
          <p className="text-slate-400 text-sm">
            Never miss a to-do, follow-up, or commitment from your emails
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/follow-ups"
            className="px-4 py-2 bg-slate-800 text-slate-200 font-semibold rounded-xl hover:bg-slate-700"
          >
            ← Follow-Ups
          </Link>
          <Link
            href="/"
            className="px-4 py-2 bg-slate-800 text-slate-200 font-semibold rounded-xl hover:bg-slate-700"
          >
            🏠 Dashboard
          </Link>
        </div>
      </header>

      {!gmailConnected && (
        <section className="bg-gradient-to-br from-red-900/30 to-orange-900/30 border border-red-500/30 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-2">📧 Gmail Not Connected</h2>
              <p className="text-sm text-slate-400">Connect Gmail to scan for actions</p>
            </div>
            <Link
              href="/follow-ups"
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold rounded-xl"
            >
              🔗 Connect Gmail
            </Link>
          </div>
        </section>
      )}

      {gmailConnected && !scanned && (
        <section className="bg-gradient-to-br from-green-900/30 to-cyan-900/30 border border-green-500/30 rounded-2xl p-8 mb-6 text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h2 className="text-xl font-semibold mb-2">Never Miss an Action</h2>
          <p className="text-slate-400 mb-4">
            AI scans your emails to find tasks, follow-ups, and commitments
          </p>

          <div className="flex items-center justify-center gap-4 mb-6">
            <label className="text-slate-400 text-sm">Scan last:</label>
            <select
              value={daysBack}
              onChange={(e) => setDaysBack(Number(e.target.value))}
              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white"
            >
              <option value={1}>1 day</option>
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 max-w-2xl mx-auto text-left">
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
              <div className="text-2xl mb-1">📋</div>
              <div className="text-sm font-medium text-blue-300">Tasks</div>
              <div className="text-xs text-blue-400/70">Things to do</div>
            </div>
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3">
              <div className="text-2xl mb-1">📅</div>
              <div className="text-sm font-medium text-purple-300">Follow-Ups</div>
              <div className="text-xs text-purple-400/70">Reconnect later</div>
            </div>
            <div className="bg-orange-900/20 border border-orange-500/30 rounded-lg p-3">
              <div className="text-2xl mb-1">📤</div>
              <div className="text-sm font-medium text-orange-300">Commitments</div>
              <div className="text-xs text-orange-400/70">Promises you made</div>
            </div>
            <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-3">
              <div className="text-2xl mb-1">⏳</div>
              <div className="text-sm font-medium text-cyan-300">Waiting On</div>
              <div className="text-xs text-cyan-400/70">Track their promises</div>
            </div>
          </div>

          <button
            onClick={scanEmails}
            disabled={scanning}
            className="px-8 py-4 bg-gradient-to-r from-green-500 to-cyan-500 text-white font-bold rounded-xl hover:from-green-400 hover:to-cyan-400 disabled:opacity-50 text-lg"
          >
            {scanning ? "🔍 Scanning & Analyzing..." : "🔍 Scan Emails for Actions"}
          </button>
        </section>
      )}

      {scanned && (
        <>
          {/* Stats */}
          <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 uppercase mb-1">Scanned</div>
              <div className="text-2xl font-bold text-slate-200">{stats.totalScanned}</div>
            </div>
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 uppercase mb-1">Analyzed</div>
              <div className="text-2xl font-bold text-slate-200">{stats.emailsAnalyzed}</div>
            </div>
            <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4">
              <div className="text-xs text-green-400 uppercase mb-1">Actions</div>
              <div className="text-2xl font-bold text-green-300">{stats.actionsFound}</div>
            </div>
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
              <div className="text-xs text-blue-400 uppercase mb-1">Tasks</div>
              <div className="text-2xl font-bold text-blue-300">{summary.tasks}</div>
            </div>
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4">
              <div className="text-xs text-purple-400 uppercase mb-1">Follow-Ups</div>
              <div className="text-2xl font-bold text-purple-300">{summary.followUps}</div>
            </div>
            <div className="bg-orange-900/20 border border-orange-500/30 rounded-xl p-4">
              <div className="text-xs text-orange-400 uppercase mb-1">Commitments</div>
              <div className="text-2xl font-bold text-orange-300">{summary.commitments}</div>
            </div>
            <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-xl p-4">
              <div className="text-xs text-cyan-400 uppercase mb-1">Waiting</div>
              <div className="text-2xl font-bold text-cyan-300">{summary.waitingOn}</div>
            </div>
          </section>

          {/* Tabs */}
          <section className="flex items-center gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-lg font-medium text-sm ${
                activeTab === "all"
                  ? "bg-green-500 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              🎯 All ({stats.actionsFound})
            </button>
            <button
              onClick={() => setActiveTab("task")}
              className={`px-4 py-2 rounded-lg font-medium text-sm ${
                activeTab === "task"
                  ? "bg-blue-500 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              📋 Tasks ({summary.tasks})
            </button>
            <button
              onClick={() => setActiveTab("follow_up")}
              className={`px-4 py-2 rounded-lg font-medium text-sm ${
                activeTab === "follow_up"
                  ? "bg-purple-500 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              📅 Follow-Ups ({summary.followUps})
            </button>
            <button
              onClick={() => setActiveTab("commitment")}
              className={`px-4 py-2 rounded-lg font-medium text-sm ${
                activeTab === "commitment"
                  ? "bg-orange-500 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              📤 Commitments ({summary.commitments})
            </button>
            <button
              onClick={() => setActiveTab("waiting_on")}
              className={`px-4 py-2 rounded-lg font-medium text-sm ${
                activeTab === "waiting_on"
                  ? "bg-cyan-500 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              ⏳ Waiting ({summary.waitingOn})
            </button>
          </section>

          {/* Action Bar */}
          <section className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={selectAll}
                className="px-3 py-1 bg-slate-800 text-slate-300 text-sm rounded-lg hover:bg-slate-700"
              >
                Select All
              </button>
              <button
                onClick={selectNone}
                className="px-3 py-1 bg-slate-800 text-slate-300 text-sm rounded-lg hover:bg-slate-700"
              >
                Select None
              </button>
              <span className="text-sm text-slate-400">
                {selectedCount} selected | {createdCount} created
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={scanEmails}
                disabled={scanning}
                className="px-4 py-2 bg-slate-800 text-slate-200 font-semibold rounded-xl hover:bg-slate-700"
              >
                🔄 Re-scan
              </button>
              <button
                onClick={createSelectedActions}
                disabled={creating || selectedCount === 0}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:from-green-400 hover:to-emerald-400 disabled:opacity-50"
              >
                {creating ? "Creating..." : `✅ Create ${selectedCount} Items`}
              </button>
            </div>
          </section>

          {/* Action List */}
          <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 mb-6">
            {filteredActions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-2">✨</div>
                <div className="text-slate-400">No actions found in this category</div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredActions.map((action, idx) => (
                  <div
                    key={`${action.messageId}-${idx}`}
                    className={`p-4 rounded-xl border transition-all ${
                      action.status === "created"
                        ? "bg-green-900/20 border-green-500/30"
                        : action.status === "dismissed"
                        ? "bg-slate-800/30 border-slate-700 opacity-50"
                        : action.selected
                        ? "bg-slate-800/50 border-cyan-500/50"
                        : "bg-slate-900/50 border-slate-700"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {action.status === "pending" && (
                        <input
                          type="checkbox"
                          checked={action.selected}
                          onChange={() => toggleAction(action.messageId, action.description)}
                          className="w-5 h-5 mt-1 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className={`px-2 py-0.5 rounded text-xs border ${getTypeBadgeColor(action.type)}`}>
                            {getTypeIcon(action.type)} {getTypeLabel(action.type)}
                          </span>
                          {getPriorityBadge(action.priority)}
                          {getStatusBadge(action.status)}
                          <span className="text-xs text-slate-500">
                            {Math.round(action.confidence * 100)}% confidence
                          </span>
                        </div>

                        <div className="font-semibold text-slate-200 mb-1">
                          {action.description}
                        </div>

                        <div className="text-sm text-slate-400 mb-2">
                          From: <span className="text-slate-300">{action.fromName}</span>
                          {action.inSecondBrain && (
                            <span className="ml-2 text-xs text-green-400">✓ In Second Brain</span>
                          )}
                        </div>

                        <div className="text-xs text-slate-500">
                          Subject: {action.subject}
                        </div>

                        {action.context && (
                          <div className="mt-2 text-xs text-slate-500 italic bg-slate-800/50 p-2 rounded">
                            &quot;{action.context}&quot;
                          </div>
                        )}

                        {action.dueDate && (
                          <div className="mt-2 text-xs text-cyan-400">
                            📅 Due: {action.dueDate}
                          </div>
                        )}

                        {action.status === "pending" && (
                          <div className="mt-3">
                            <button
                              onClick={() => dismissAction(action.messageId, action.description)}
                              className="text-xs text-slate-500 hover:text-slate-300"
                            >
                              🚫 Not relevant, dismiss
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* Activity Log */}
      <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold uppercase text-slate-300">Activity Log</h3>
          <button
            onClick={() => setLog([])}
            className="text-xs px-2 py-1 rounded border border-slate-700"
          >
            Clear
          </button>
        </div>
        <div className="max-h-32 overflow-y-auto space-y-1 text-[11px]">
          {log.length === 0 && <div className="text-slate-500">No activity yet</div>}
          {log.map((line, idx) => (
            <div key={idx} className="text-slate-400">
              {line}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
