"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { isGmailConnected, getGmailTokens, clearGmailTokens } from "@/app/lib/gmail-storage";

type FollowUp = {
  id: string;
  name: string;
  type: string;
  status: string;
  priority: string;
  channel: string;
  context: string;
  messageDraft: string;
  triggerDate: string | null;
  dueDate: string | null;
  personId: string | null;
};

type Stats = {
  total: number;
  pending: number;
  approved: number;
  sent: number;
  responded: number;
  overdue: number;
  dueToday: number;
};

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    approved: 0,
    sent: 0,
    responded: 0,
    overdue: 0,
    dueToday: 0,
  });
  const [overdue, setOverdue] = useState<FollowUp[]>([]);
  const [dueToday, setDueToday] = useState<FollowUp[]>([]);

  const [loading, setLoading] = useState(true);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [drafting, setDrafting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [filter, setFilter] = useState<string>("all");
  const [activityLog, setActivityLog] = useState<string[]>([]);

  const [gmailConnected, setGmailConnected] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  function pushLog(msg: string) {
    const stamp = new Date().toLocaleTimeString();
    setActivityLog((prev) => [`${stamp} — ${msg}`, ...prev].slice(0, 20));
  }

  useEffect(() => {
    loadFollowUps();
    
    setGmailConnected(isGmailConnected());
    
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      
      if (accessToken) {
        pushLog("✅ Gmail token received!");
        localStorage.setItem("gmail_access_token", accessToken);
        localStorage.setItem("gmail_refresh_token", "implicit_flow");
        setGmailConnected(true);
        pushLog("✅ Gmail connected!");
        
        window.history.replaceState({}, "", "/follow-ups");
      }
    }
    
    const params = new URLSearchParams(window.location.search);
    if (params.get("gmail_connected") === "true") {
      pushLog("✅ Gmail connected!");
      window.history.replaceState({}, "", "/follow-ups");
    }
  }, []);

  async function loadFollowUps() {
    setLoading(true);
    pushLog("📥 Loading follow-ups...");

    try {
      const res = await fetch("/api/follow-ups/pull");
      const data = await res.json();

      if (data.ok) {
        setFollowUps(data.followUps || []);
        setStats(data.stats || {});
        setOverdue(data.overdue || []);
        setDueToday(data.dueToday || []);
        pushLog(`✅ Loaded ${data.followUps?.length || 0} follow-ups`);
      } else {
        pushLog(`❌ ${data.error || "Failed to load"}`);
      }
    } catch (err) {
      pushLog("❌ Failed to load follow-ups");
    } finally {
      setLoading(false);
    }
  }

  async function draftMessage(followUp: FollowUp) {
    setDrafting(true);
    pushLog(`✍️ Drafting message for ${followUp.name}...`);

    try {
      const res = await fetch("/api/follow-ups/draft-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followUpId: followUp.id }),
      });

      const data = await res.json();

      if (data.ok) {
        pushLog("✅ Message drafted!");
        setFollowUps((prev) =>
          prev.map((f) =>
            f.id === followUp.id
              ? {
                  ...f,
                  messageDraft: data.draft.subject
                    ? `Subject: ${data.draft.subject}\n\n${data.draft.message}`
                    : data.draft.message,
                }
              : f
          )
        );
        
        if (selectedFollowUp?.id === followUp.id) {
          setSelectedFollowUp({
            ...selectedFollowUp,
            messageDraft: data.draft.subject
              ? `Subject: ${data.draft.subject}\n\n${data.draft.message}`
              : data.draft.message,
          });
        }
      }
    } catch (err) {
      pushLog("❌ Message drafting failed");
    } finally {
      setDrafting(false);
    }
  }

  async function updateStatus(followUpId: string, newStatus: string) {
    setUpdatingStatus(true);
    pushLog(`📝 Updating status to ${newStatus}...`);

    try {
      const res = await fetch("/api/follow-ups/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ followUpId, status: newStatus }),
      });

      const data = await res.json();

      if (data.ok) {
        pushLog(`✅ Status updated to ${newStatus}`);
        await loadFollowUps();
        setSelectedFollowUp(null);
      }
    } catch (err) {
      pushLog("❌ Status update failed");
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function connectGmail() {
    pushLog("🔗 Initiating Gmail connection...");
    
    try {
      const res = await fetch("/api/gmail/auth");
      const data = await res.json();
      
      if (!data.ok || !data.clientId) {
        pushLog("❌ Missing client configuration");
        return;
      }

      const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.searchParams.set("client_id", data.clientId);
      authUrl.searchParams.set("redirect_uri", window.location.origin + "/api/gmail/callback");
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.readonly");
      authUrl.searchParams.set("access_type", "offline");
      authUrl.searchParams.set("prompt", "consent");
      
      window.location.href = authUrl.toString();
      
    } catch (err) {
      pushLog("❌ Gmail connection failed");
      console.error(err);
    }
  }

  async function sendEmail(followUp: FollowUp) {
    if (!followUp.messageDraft) {
      pushLog("❌ No message to send");
      return;
    }
    
    setSendingEmail(true);
    pushLog(`📧 Sending email...`);
    
    try {
      const lines = followUp.messageDraft.split("\n");
      let subject = "";
      let message = "";
      
      if (lines[0].startsWith("Subject:")) {
        subject = lines[0].replace("Subject:", "").trim();
        message = lines.slice(2).join("\n").trim();
      } else {
        subject = `Follow-up: ${followUp.name}`;
        message = followUp.messageDraft;
      }
      
      const recipientEmail = prompt("Enter recipient email:");
      if (!recipientEmail) {
        pushLog("❌ Email cancelled");
        setSendingEmail(false);
        return;
      }
      
      const { accessToken } = getGmailTokens();
      
      if (!accessToken) {
        pushLog("❌ Not connected to Gmail");
        setSendingEmail(false);
        return;
      }
      
      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipientEmail,
          subject,
          message,
          accessToken,
        }),
      });
      
      const data = await res.json();
      
      if (data.ok) {
        pushLog("✅ Email sent!");
        await updateStatus(followUp.id, "Sent");
      } else {
        pushLog(`❌ Send failed: ${data.error}`);
      }
    } catch (err) {
      pushLog("❌ Email send failed");
    } finally {
      setSendingEmail(false);
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "No date";
    const date = new Date(dateStr);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    return `In ${days}d`;
  }

  function getPriorityColor(priority: string): string {
    switch (priority) {
      case "High":
        return "text-red-400 border-red-500/30 bg-red-900/20";
      case "Medium":
        return "text-yellow-400 border-yellow-500/30 bg-yellow-900/20";
      case "Low":
        return "text-green-400 border-green-500/30 bg-green-900/20";
      default:
        return "text-slate-400 border-slate-700 bg-slate-900/20";
    }
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case "Pending":
        return "text-yellow-400 bg-yellow-900/30";
      case "Approved":
        return "text-blue-400 bg-blue-900/30";
      case "Sent":
        return "text-green-400 bg-green-900/30";
      case "Responded":
        return "text-emerald-400 bg-emerald-900/30";
      case "Cancelled":
        return "text-red-400 bg-red-900/30";
      default:
        return "text-slate-400 bg-slate-900/30";
    }
  }

  const filteredFollowUps = followUps.filter((f) => {
    if (filter === "all") return true;
    if (filter === "overdue") return overdue.some((o) => o.id === f.id);
    if (filter === "today") return dueToday.some((d) => d.id === f.id);
    return f.status === filter;
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">⚡ Follow-Up Command Center</h1>
          <p className="text-slate-400 text-sm">Auto-scheduled follow-ups with AI-drafted messages</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/email-intelligence"
            className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-xl hover:from-indigo-400 hover:to-purple-400"
          >
            🧠 Email Intelligence
          </Link>
          <button
            onClick={loadFollowUps}
            disabled={loading}
            className="px-4 py-2 bg-slate-800 text-slate-200 font-semibold rounded-xl hover:bg-slate-700"
          >
            🔄 Refresh
          </button>
          <Link 
            href="/" 
            className="px-4 py-2 bg-slate-800 text-slate-200 font-semibold rounded-xl hover:bg-slate-700"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      {!gmailConnected && (
        <section className="bg-gradient-to-br from-red-900/30 to-orange-900/30 border border-red-500/30 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-2">📧 Gmail Not Connected</h2>
              <p className="text-sm text-slate-400">Connect Gmail to send follow-ups directly from Pulse OS</p>
            </div>
            <button
              onClick={connectGmail}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold rounded-xl hover:from-red-400 hover:to-orange-400"
            >
              🔗 Connect Gmail
            </button>
          </div>
        </section>
      )}

      {gmailConnected && (
        <section className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">✅</div>
              <div>
                <h2 className="text-sm font-semibold">Gmail Connected</h2>
                <p className="text-xs text-slate-400">Ready to send emails</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (confirm("Disconnect Gmail?")) {
                  clearGmailTokens();
                  setGmailConnected(false);
                  pushLog("🔌 Gmail disconnected");
                }
              }}
              className="px-3 py-1 bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-600"
            >
              Disconnect
            </button>
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 uppercase mb-1">Total</div>
          <div className="text-2xl font-bold text-slate-200">{stats.total}</div>
        </div>
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4">
          <div className="text-xs text-yellow-400 uppercase mb-1">Pending</div>
          <div className="text-2xl font-bold text-yellow-300">{stats.pending}</div>
        </div>
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
          <div className="text-xs text-blue-400 uppercase mb-1">Approved</div>
          <div className="text-2xl font-bold text-blue-300">{stats.approved}</div>
        </div>
        <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4">
          <div className="text-xs text-green-400 uppercase mb-1">Sent</div>
          <div className="text-2xl font-bold text-green-300">{stats.sent}</div>
        </div>
        <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-4">
          <div className="text-xs text-emerald-400 uppercase mb-1">Responded</div>
          <div className="text-2xl font-bold text-emerald-300">{stats.responded}</div>
        </div>
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4 cursor-pointer hover:bg-red-900/30" onClick={() => setFilter("overdue")}>
          <div className="text-xs text-red-400 uppercase mb-1">Overdue</div>
          <div className="text-2xl font-bold text-red-300">{stats.overdue}</div>
        </div>
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4 cursor-pointer hover:bg-purple-900/30" onClick={() => setFilter("today")}>
          <div className="text-xs text-purple-400 uppercase mb-1">Due Today</div>
          <div className="text-2xl font-bold text-purple-300">{stats.dueToday}</div>
        </div>
      </section>

      <section className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setFilter("all")} className={`px-4 py-2 rounded-lg font-medium text-sm ${filter === "all" ? "bg-cyan-500 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
          All ({stats.total})
        </button>
        <button onClick={() => setFilter("overdue")} className={`px-4 py-2 rounded-lg font-medium text-sm ${filter === "overdue" ? "bg-red-500 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
          Overdue ({stats.overdue})
        </button>
        <button onClick={() => setFilter("today")} className={`px-4 py-2 rounded-lg font-medium text-sm ${filter === "today" ? "bg-purple-500 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
          Due Today ({stats.dueToday})
        </button>
        <button onClick={() => setFilter("Pending")} className={`px-4 py-2 rounded-lg font-medium text-sm ${filter === "Pending" ? "bg-yellow-500 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
          Pending ({stats.pending})
        </button>
        <button onClick={() => setFilter("Approved")} className={`px-4 py-2 rounded-lg font-medium text-sm ${filter === "Approved" ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
          Approved ({stats.approved})
        </button>
        <button onClick={() => setFilter("Sent")} className={`px-4 py-2 rounded-lg font-medium text-sm ${filter === "Sent" ? "bg-green-500 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>
          Sent ({stats.sent})
        </button>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
            <h2 className="text-lg font-semibold mb-4">
              {filter === "all" && "All Follow-Ups"}
              {filter === "overdue" && "⚠️ Overdue Follow-Ups"}
              {filter === "today" && "📅 Due Today"}
              {filter === "Pending" && "⏳ Pending Approval"}
              {filter === "Approved" && "✅ Ready to Send"}
              {filter === "Sent" && "📤 Sent"}
            </h2>

            {loading && (
              <div className="text-center py-12">
                <div className="text-4xl mb-2 animate-pulse">⏳</div>
                <div className="text-slate-400">Loading follow-ups...</div>
              </div>
            )}

            {!loading && filteredFollowUps.length === 0 && (
              <div className="text-center py-12">
                <div className="text-4xl mb-2">🎉</div>
                <div className="text-slate-400">No follow-ups in this category!</div>
              </div>
            )}

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredFollowUps.map((followUp) => (
                <div
                  key={followUp.id}
                  onClick={() => setSelectedFollowUp(followUp)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedFollowUp?.id === followUp.id
                      ? "bg-cyan-900/30 border-cyan-500"
                      : "bg-slate-900/50 border-slate-700 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-200">{followUp.name}</h3>
                      <div className="text-xs text-slate-400 mt-1">{followUp.type}</div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(followUp.priority)}`}>
                      {followUp.priority}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(followUp.status)}`}>
                      {followUp.status}
                    </span>
                    <span className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300">
                      {followUp.channel}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDate(followUp.dueDate)}
                    </span>
                  </div>

                  {followUp.context && (
                    <div className="mt-2 text-xs text-slate-400 line-clamp-2">
                      {followUp.context}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {!selectedFollowUp && (
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4">📬</div>
              <h3 className="text-xl font-semibold mb-2">Select a Follow-Up</h3>
              <p className="text-slate-400 text-sm">Click on a follow-up to view details and draft messages</p>
            </div>
          )}

          {selectedFollowUp && (
            <>
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">{selectedFollowUp.name}</h2>
                    <div className="text-sm text-slate-400">{selectedFollowUp.type}</div>
                  </div>
                  <button
                    onClick={() => setSelectedFollowUp(null)}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-24">Status:</span>
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(selectedFollowUp.status)}`}>
                      {selectedFollowUp.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-24">Priority:</span>
                    <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(selectedFollowUp.priority)}`}>
                      {selectedFollowUp.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-24">Channel:</span>
                    <span className="text-sm text-slate-200">{selectedFollowUp.channel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-24">Due:</span>
                    <span className="text-sm text-slate-200">{formatDate(selectedFollowUp.dueDate)}</span>
                  </div>
                </div>

                {selectedFollowUp.context && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <div className="text-xs text-slate-400 mb-2">Context:</div>
                    <div className="text-sm text-slate-300 whitespace-pre-wrap">{selectedFollowUp.context}</div>
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">✍️ Message Draft</h3>
                  {!selectedFollowUp.messageDraft && (
                    <button
                      onClick={() => draftMessage(selectedFollowUp)}
                      disabled={drafting}
                      className="px-3 py-1 bg-purple-500 text-white text-sm font-semibold rounded-lg hover:bg-purple-400 disabled:opacity-50"
                    >
                      {drafting ? "Drafting..." : "🤖 Draft Message"}
                    </button>
                  )}
                  {selectedFollowUp.messageDraft && (
                    <button
                      onClick={() => draftMessage(selectedFollowUp)}
                      disabled={drafting}
                      className="px-3 py-1 bg-slate-700 text-slate-200 text-sm font-semibold rounded-lg hover:bg-slate-600"
                    >
                      {drafting ? "Redrafting..." : "🔄 Redraft"}
                    </button>
                  )}
                </div>

                {!selectedFollowUp.messageDraft && !drafting && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">📝</div>
                    <div className="text-slate-400 text-sm">Click &quot;Draft Message&quot; to generate AI message</div>
                  </div>
                )}

                {drafting && (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2 animate-pulse">✍️</div>
                    <div className="text-slate-400 text-sm">AI is crafting the perfect message...</div>
                  </div>
                )}

                {selectedFollowUp.messageDraft && !drafting && (
                  <div className="bg-slate-950 border border-slate-700 rounded-lg p-4">
                    <div className="text-sm text-slate-200 whitespace-pre-wrap font-mono">
                      {selectedFollowUp.messageDraft}
                    </div>
                  </div>
                )}
              </div>

              {selectedFollowUp.messageDraft && (
                <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-4">⚡ Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedFollowUp.status === "Pending" && (
                      <button
                        onClick={() => updateStatus(selectedFollowUp.id, "Approved")}
                        disabled={updatingStatus}
                        className="px-4 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-400 disabled:opacity-50"
                      >
                        ✅ Approve
                      </button>
                    )}
                    {selectedFollowUp.status === "Approved" && (
                      <button
                        onClick={() => updateStatus(selectedFollowUp.id, "Sent")}
                        disabled={updatingStatus}
                        className="px-4 py-3 bg-green-500 text-white font-semibold rounded-xl hover:bg-green-400 disabled:opacity-50"
                      >
                        📤 Mark as Sent
                      </button>
                    )}
                    {(selectedFollowUp.status === "Pending" || selectedFollowUp.status === "Approved") && (
                      <button
                        onClick={() => updateStatus(selectedFollowUp.id, "Cancelled")}
                        disabled={updatingStatus}
                        className="px-4 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-400 disabled:opacity-50"
                      >
                        ❌ Cancel
                      </button>
                    )}
                    {selectedFollowUp.status === "Sent" && (
                      <button
                        onClick={() => updateStatus(selectedFollowUp.id, "Responded")}
                        disabled={updatingStatus}
                        className="px-4 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-400 disabled:opacity-50"
                      >
                        💬 Mark Responded
                      </button>
                    )}
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedFollowUp.messageDraft);
                        pushLog("📋 Message copied!");
                      }}
                      className="px-4 py-3 bg-purple-500 text-white font-semibold rounded-xl hover:bg-purple-400"
                    >
                      📋 Copy Message
                    </button>
                    
                    {gmailConnected && selectedFollowUp.messageDraft && (
                      <button
                        onClick={() => sendEmail(selectedFollowUp)}
                        disabled={sendingEmail}
                        className="px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl hover:from-blue-400 hover:to-cyan-400 disabled:opacity-50 col-span-2"
                      >
                        {sendingEmail ? "📤 Sending..." : "📧 Send Email Now"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold uppercase text-slate-300">Activity Log</h3>
              <button onClick={() => setActivityLog([])} className="text-xs px-2 py-1 rounded border border-slate-700">
                Clear
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1 text-[11px]">
              {activityLog.length === 0 && <div className="text-slate-500">No activity yet</div>}
              {activityLog.map((line, idx) => (
                <div key={idx} className="text-slate-400">
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
