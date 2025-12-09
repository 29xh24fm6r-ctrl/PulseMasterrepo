"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { isGmailConnected, getGmailTokens, saveGmailTokens, clearGmailTokens } from "@/app/lib/gmail-storage";

type Contact = {
  name: string;
  email: string;
  company: string;
  subject: string;
  classification: string;
  confidence: number;
  reason: string;
  duplicateMatches?: Array<{ name: string; email: string; confidence: number; reason: string }>;
  selected: boolean;
  status: "pending" | "creating" | "created" | "skipped" | "error";
};

type Action = {
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
  status: "pending" | "creating" | "created" | "dismissed" | "error";
};

export default function EmailIntelligencePage() {
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [daysBack, setDaysBack] = useState(7);

  // Contacts
  const [realPeople, setRealPeople] = useState<Contact[]>([]);
  const [duplicates, setDuplicates] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);

  // Actions
  const [actions, setActions] = useState<Action[]>([]);

  // Stats
  const [stats, setStats] = useState({
    totalScanned: 0,
    emailsAnalyzed: 0,
    blockedCount: 0,
    existingContactsCount: 0,
  });
  const [contactSummary, setContactSummary] = useState({ realPeople: 0, marketing: 0, automated: 0, uncertain: 0, possibleDuplicates: 0 });
  const [actionSummary, setActionSummary] = useState({ tasks: 0, followUps: 0, commitments: 0, waitingOn: 0, total: 0 });

  // UI State
  const [activeTab, setActiveTab] = useState<"actions" | "contacts" | "duplicates" | "filtered">("actions");
  const [actionFilter, setActionFilter] = useState<"all" | "task" | "follow_up" | "commitment" | "waiting_on">("all");
  const [creating, setCreating] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);

  useEffect(() => {
    setGmailConnected(isGmailConnected());
  }, []);

  function pushLog(msg: string) {
    const stamp = new Date().toLocaleTimeString();
    setLog((prev) => [`${stamp} — ${msg}`, ...prev].slice(0, 50));
  }

  async function scanEmails() {
    if (!gmailConnected) return pushLog("❌ Gmail not connected");

    setScanning(true);
    setScanned(false);
    pushLog(`🔍 Scanning last ${daysBack} days...`);

    try {
      const { accessToken, refreshToken } = getGmailTokens();
      const res = await fetch("/api/gmail/email-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, refreshToken, maxResults: 50, daysBack }),
      });

      // Handle response parsing with better error catching
      let data;
      try {
        const text = await res.text();
        if (!text || text.trim() === "") {
          throw new Error("Empty response from server");
        }
        data = JSON.parse(text);
      } catch (parseError: any) {
        pushLog(`❌ Failed to parse response: ${parseError.message}`);
        setScanning(false);
        return;
      }

      if (data.newAccessToken) {
        saveGmailTokens(data.newAccessToken, refreshToken || "");
        pushLog("🔄 Token refreshed");
      }

      if (data.needsReconnect) {
        clearGmailTokens();
        setGmailConnected(false);
        return pushLog("❌ Session expired - reconnect Gmail");
      }

      if (data.ok) {
        setStats({
          totalScanned: data.totalScanned,
          emailsAnalyzed: data.emailsAnalyzed,
          blockedCount: data.blockedCount,
          existingContactsCount: data.existingContactsCount,
        });

        setContactSummary(data.contactSummary);
        setActionSummary(data.actionSummary);

        // Process contacts
        setRealPeople((data.contacts.realPeople || []).map((c: any) => ({ ...c, selected: true, status: "pending" })));
        setDuplicates((data.contacts.possibleDuplicates || []).map((c: any) => ({ ...c, selected: false, status: "pending" })));
        setFilteredContacts([
          ...(data.contacts.marketing || []).map((c: any) => ({ ...c, selected: false, status: "pending" })),
          ...(data.contacts.automated || []).map((c: any) => ({ ...c, selected: false, status: "pending" })),
        ]);

        // Process actions - ALL start unselected, user picks what to import
        const allActions = [
          ...(data.actions.tasks || []),
          ...(data.actions.followUps || []),
          ...(data.actions.commitments || []),
          ...(data.actions.waitingOn || []),
        ].map((a: any) => ({ ...a, selected: false, status: "pending" }));
        setActions(allActions);

        setScanned(true);
        pushLog(`✅ Analysis complete!`);
        pushLog(`📋 ${data.actionSummary.total} actions found`);
        if (data.actionSummary.duplicatesFiltered > 0) {
          pushLog(`⏭️ ${data.actionSummary.duplicatesFiltered} duplicate actions skipped`);
        }
        pushLog(`👥 ${data.contactSummary.realPeople} new contacts`);
        pushLog(`⚠️ ${data.contactSummary.possibleDuplicates} duplicates`);
        pushLog(`🚫 ${data.blockedCount} junk filtered`);

        // Auto-select tab based on results
        if (data.actionSummary.total > 0) setActiveTab("actions");
        else if (data.contactSummary.realPeople > 0) setActiveTab("contacts");
        else if (data.contactSummary.possibleDuplicates > 0) setActiveTab("duplicates");
      } else {
        pushLog(`❌ ${data.error}`);
      }
    } catch (err: any) {
      pushLog(`❌ ${err.message}`);
    } finally {
      setScanning(false);
    }
  }

  // Toggle functions
  function toggleAction(messageId: string, description: string) {
    setActions((prev) => prev.map((a) => 
      a.messageId === messageId && a.description === description ? { ...a, selected: !a.selected } : a
    ));
  }

  function toggleContact(email: string, list: "real" | "duplicate") {
    if (list === "real") {
      setRealPeople((prev) => prev.map((c) => c.email === email ? { ...c, selected: !c.selected } : c));
    } else {
      setDuplicates((prev) => prev.map((c) => c.email === email ? { ...c, selected: !c.selected } : c));
    }
  }

  function dismissAction(messageId: string, description: string) {
    setActions((prev) => prev.map((a) => 
      a.messageId === messageId && a.description === description ? { ...a, status: "dismissed", selected: false } : a
    ));
    pushLog("🚫 Action dismissed");
  }

  function skipContact(email: string) {
    setDuplicates((prev) => prev.map((c) => c.email === email ? { ...c, status: "skipped", selected: false } : c));
    pushLog("⏭️ Contact skipped");
  }

  // Bulk selection for actions
  // FIX: Removed redundant `&& a.status !== "dismissed"` - if status is "pending", it can't be "dismissed"
  function selectAllActions() {
    setActions((prev) => prev.map((a) => 
      a.status === "pending"
        ? { ...a, selected: true } 
        : a
    ));
    pushLog("✅ Selected all actions");
  }

  function deselectAllActions() {
    setActions((prev) => prev.map((a) => ({ ...a, selected: false })));
    pushLog("⬜ Deselected all actions");
  }

  function selectHighPriorityActions() {
    setActions((prev) => prev.map((a) => 
      a.status === "pending" && a.priority === "high" 
        ? { ...a, selected: true } 
        : a
    ));
    pushLog("🔥 Selected high priority actions");
  }

  function selectByType(type: string) {
    setActions((prev) => prev.map((a) => 
      a.status === "pending" && a.type === type 
        ? { ...a, selected: true } 
        : a
    ));
    pushLog(`✅ Selected all ${type.replace("_", " ")}s`);
  }

  // Create actions
  async function createSelectedActions() {
    const selected = actions.filter((a) => a.selected && a.status === "pending");
    if (!selected.length) return pushLog("⚠️ No actions selected");

    setCreating(true);
    pushLog(`📝 Creating ${selected.length} items...`);

    for (const action of selected) {
      setActions((prev) => prev.map((a) => 
        a.messageId === action.messageId && a.description === action.description ? { ...a, status: "creating" } : a
      ));

      try {
        const res = await fetch("/api/gmail/create-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const data = await res.json();

        setActions((prev) => prev.map((a) => 
          a.messageId === action.messageId && a.description === action.description 
            ? { ...a, status: data.ok ? "created" : "error" } : a
        ));
        
        if (data.ok) pushLog(`✅ ${action.description.slice(0, 30)}...`);
        else pushLog(`❌ Failed: ${data.error}`);
      } catch {
        setActions((prev) => prev.map((a) => 
          a.messageId === action.messageId && a.description === action.description ? { ...a, status: "error" } : a
        ));
      }

      await new Promise((r) => setTimeout(r, 300));
    }

    setCreating(false);
    pushLog("🎉 Done!");
  }

  // Create contacts
  async function createSelectedContacts() {
    const selected = [...realPeople, ...duplicates].filter((c) => c.selected && c.status === "pending");
    if (!selected.length) return pushLog("⚠️ No contacts selected");

    setCreating(true);
    pushLog(`👥 Creating ${selected.length} contacts...`);

    for (const contact of selected) {
      const updateStatus = (status: Contact["status"]) => {
        setRealPeople((prev) => prev.map((c) => c.email === contact.email ? { ...c, status } : c));
        setDuplicates((prev) => prev.map((c) => c.email === contact.email ? { ...c, status } : c));
      };

      updateStatus("creating");

      try {
        const res = await fetch("/api/second-brain/create-from-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: contact.name, email: contact.email, company: contact.company }),
        });
        const data = await res.json();
        updateStatus(data.ok ? "created" : "error");
        if (data.ok) pushLog(`✅ ${contact.name}`);
      } catch {
        updateStatus("error");
      }

      await new Promise((r) => setTimeout(r, 300));
    }

    setCreating(false);
    pushLog("🎉 Done!");
  }

  // Filtered views
  const filteredActions = actions.filter((a) => {
    if (a.status === "dismissed") return false;
    if (actionFilter === "all") return true;
    return a.type === actionFilter;
  });

  // FIX: Removed redundant `&& a.status !== "dismissed"` - if status is "pending", it can't be "dismissed"
  const pendingActions = actions.filter((a) => a.status === "pending");
  const selectedActionsCount = actions.filter((a) => a.selected && a.status === "pending").length;
  const selectedContactsCount = [...realPeople, ...duplicates].filter((c) => c.selected && c.status === "pending").length;

  // Count by type
  const actionCounts = {
    task: actions.filter(a => a.type === "task" && a.status !== "dismissed").length,
    follow_up: actions.filter(a => a.type === "follow_up" && a.status !== "dismissed").length,
    commitment: actions.filter(a => a.type === "commitment" && a.status !== "dismissed").length,
    waiting_on: actions.filter(a => a.type === "waiting_on" && a.status !== "dismissed").length,
  };

  // Render helpers
  const getTypeIcon = (type: string) => ({ task: "📋", follow_up: "📅", commitment: "📤", waiting_on: "⏳" }[type] || "📌");
  const getTypeColor = (type: string) => ({
    task: "bg-blue-900/30 text-blue-400 border-blue-500/30",
    follow_up: "bg-purple-900/30 text-purple-400 border-purple-500/30",
    commitment: "bg-orange-900/30 text-orange-400 border-orange-500/30",
    waiting_on: "bg-cyan-900/30 text-cyan-400 border-cyan-500/30",
  }[type] || "bg-slate-900/30 text-slate-400");

  const getPriorityBadge = (p: string) => ({
    high: <span className="px-2 py-0.5 bg-red-900/30 text-red-400 text-xs rounded">🔥 High</span>,
    medium: <span className="px-2 py-0.5 bg-yellow-900/30 text-yellow-400 text-xs rounded">⚡ Med</span>,
    low: <span className="px-2 py-0.5 bg-green-900/30 text-green-400 text-xs rounded">📎 Low</span>,
  }[p]);

  if (gmailConnected === null) {
    return <main className="min-h-screen bg-slate-950 text-slate-100 p-6 flex items-center justify-center"><div className="text-4xl animate-pulse">📧</div></main>;
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">🧠 Email Intelligence</h1>
          <p className="text-slate-400 text-sm">Scan once → Get contacts + actions + insights</p>
        </div>
        <div className="flex gap-3">
          <Link href="/follow-ups" className="px-4 py-2 bg-slate-800 rounded-xl hover:bg-slate-700">← Follow-Ups</Link>
          <Link href="/" className="px-4 py-2 bg-slate-800 rounded-xl hover:bg-slate-700">🏠 Dashboard</Link>
        </div>
      </header>

      {/* Gmail not connected */}
      {!gmailConnected && (
        <section className="bg-red-900/20 border border-red-500/30 rounded-2xl p-6 mb-6">
          <h2 className="font-semibold mb-2">📧 Gmail Not Connected</h2>
          <Link href="/follow-ups" className="px-4 py-2 bg-red-500 text-white rounded-xl">🔗 Connect Gmail</Link>
        </section>
      )}

      {/* Scan UI */}
      {gmailConnected && !scanned && (
        <section className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 rounded-2xl p-8 mb-6 text-center">
          <div className="text-6xl mb-4">🧠</div>
          <h2 className="text-xl font-semibold mb-2">One Scan. Complete Intelligence.</h2>
          <p className="text-slate-400 mb-6">Find new contacts, detect duplicates, and extract every action item.</p>

          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="text-slate-400">Scan last:</span>
            <select value={daysBack} onChange={(e) => setDaysBack(Number(e.target.value))} className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2">
              <option value={1}>1 day</option>
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </div>

          <button onClick={scanEmails} disabled={scanning} className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold rounded-xl text-lg disabled:opacity-50">
            {scanning ? "🔍 Analyzing..." : "🔍 Scan & Analyze"}
          </button>
        </section>
      )}

      {/* Results */}
      {scanned && (
        <>
          {/* Stats */}
          <section className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
              <div className="text-xs text-slate-400 uppercase">Scanned</div>
              <div className="text-xl font-bold">{stats.totalScanned}</div>
            </div>
            <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-3">
              <div className="text-xs text-green-400 uppercase">Actions</div>
              <div className="text-xl font-bold text-green-300">{actionSummary.total}</div>
            </div>
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-3">
              <div className="text-xs text-blue-400 uppercase">New Contacts</div>
              <div className="text-xl font-bold text-blue-300">{contactSummary.realPeople}</div>
            </div>
            <div className="bg-orange-900/20 border border-orange-500/30 rounded-xl p-3">
              <div className="text-xs text-orange-400 uppercase">Duplicates</div>
              <div className="text-xl font-bold text-orange-300">{contactSummary.possibleDuplicates}</div>
            </div>
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-3">
              <div className="text-xs text-red-400 uppercase">Filtered</div>
              <div className="text-xl font-bold text-red-300">{stats.blockedCount + contactSummary.marketing + contactSummary.automated}</div>
            </div>
            <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-xl p-3">
              <div className="text-xs text-cyan-400 uppercase">In Second Brain</div>
              <div className="text-xl font-bold text-cyan-300">{stats.existingContactsCount}</div>
            </div>
          </section>

          {/* Tabs */}
          <section className="flex gap-2 mb-4 flex-wrap">
            <button onClick={() => setActiveTab("actions")} className={`px-4 py-2 rounded-lg font-medium ${activeTab === "actions" ? "bg-green-500 text-white" : "bg-slate-800 text-slate-300"}`}>
              📋 Actions ({actionSummary.total})
            </button>
            <button onClick={() => setActiveTab("contacts")} className={`px-4 py-2 rounded-lg font-medium ${activeTab === "contacts" ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-300"}`}>
              👥 Contacts ({contactSummary.realPeople})
            </button>
            <button onClick={() => setActiveTab("duplicates")} className={`px-4 py-2 rounded-lg font-medium ${activeTab === "duplicates" ? "bg-orange-500 text-white" : contactSummary.possibleDuplicates > 0 ? "bg-orange-900/50 text-orange-300 border border-orange-500/50" : "bg-slate-800 text-slate-300"}`}>
              ⚠️ Duplicates ({contactSummary.possibleDuplicates})
            </button>
            <button onClick={() => setActiveTab("filtered")} className={`px-4 py-2 rounded-lg font-medium ${activeTab === "filtered" ? "bg-red-500 text-white" : "bg-slate-800 text-slate-300"}`}>
              🚫 Filtered ({filteredContacts.length})
            </button>
          </section>

          {/* Action filters and bulk selection (when on actions tab) */}
          {activeTab === "actions" && (
            <>
              {/* Type filters with counts */}
              <section className="flex gap-2 mb-3 flex-wrap">
                <button onClick={() => setActionFilter("all")} className={`px-3 py-1.5 rounded text-sm ${actionFilter === "all" ? "bg-slate-600" : "bg-slate-800"}`}>
                  All ({actions.filter(a => a.status !== "dismissed").length})
                </button>
                <button onClick={() => setActionFilter("task")} className={`px-3 py-1.5 rounded text-sm ${actionFilter === "task" ? "bg-blue-600" : "bg-slate-800"}`}>
                  📋 Tasks ({actionCounts.task})
                </button>
                <button onClick={() => setActionFilter("follow_up")} className={`px-3 py-1.5 rounded text-sm ${actionFilter === "follow_up" ? "bg-purple-600" : "bg-slate-800"}`}>
                  📅 Follow-ups ({actionCounts.follow_up})
                </button>
                <button onClick={() => setActionFilter("commitment")} className={`px-3 py-1.5 rounded text-sm ${actionFilter === "commitment" ? "bg-orange-600" : "bg-slate-800"}`}>
                  📤 Commitments ({actionCounts.commitment})
                </button>
                <button onClick={() => setActionFilter("waiting_on")} className={`px-3 py-1.5 rounded text-sm ${actionFilter === "waiting_on" ? "bg-cyan-600" : "bg-slate-800"}`}>
                  ⏳ Waiting ({actionCounts.waiting_on})
                </button>
              </section>

              {/* Bulk selection buttons */}
              <section className="flex gap-2 mb-4 flex-wrap items-center">
                <span className="text-sm text-slate-400 mr-2">Quick select:</span>
                <button onClick={selectAllActions} className="px-3 py-1.5 bg-green-900/30 border border-green-500/30 text-green-400 rounded text-sm hover:bg-green-900/50">
                  ✅ Select All
                </button>
                <button onClick={deselectAllActions} className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-400 rounded text-sm hover:bg-slate-700">
                  ⬜ Deselect All
                </button>
                <button onClick={selectHighPriorityActions} className="px-3 py-1.5 bg-red-900/30 border border-red-500/30 text-red-400 rounded text-sm hover:bg-red-900/50">
                  🔥 High Priority Only
                </button>
                {actionFilter !== "all" && (
                  <button onClick={() => selectByType(actionFilter)} className="px-3 py-1.5 bg-purple-900/30 border border-purple-500/30 text-purple-400 rounded text-sm hover:bg-purple-900/50">
                    ✅ Select All {actionFilter.replace("_", " ")}s
                  </button>
                )}
              </section>
            </>
          )}

          {/* Selection summary and action bar */}
          <section className="flex justify-between items-center mb-4 p-3 bg-slate-900/50 border border-slate-800 rounded-xl">
            <div className="flex items-center gap-4">
              {activeTab === "actions" && (
                <>
                  <span className={`text-sm font-medium ${selectedActionsCount > 0 ? "text-green-400" : "text-slate-400"}`}>
                    {selectedActionsCount > 0 ? `✅ ${selectedActionsCount} actions selected to import` : "Select actions to import"}
                  </span>
                  {selectedActionsCount > 0 && (
                    <span className="text-xs text-slate-500">
                      ({pendingActions.length - selectedActionsCount} will be skipped)
                    </span>
                  )}
                </>
              )}
              {(activeTab === "contacts" || activeTab === "duplicates") && (
                <span className="text-sm text-slate-400">
                  {selectedContactsCount} contacts selected
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={scanEmails} disabled={scanning} className="px-4 py-2 bg-slate-800 rounded-xl hover:bg-slate-700">
                🔄 Re-scan
              </button>
              {activeTab === "actions" && (
                <button 
                  onClick={createSelectedActions} 
                  disabled={creating || !selectedActionsCount} 
                  className={`px-5 py-2 font-bold rounded-xl disabled:opacity-50 transition-all ${
                    selectedActionsCount > 0 
                      ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-400 hover:to-emerald-400" 
                      : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {creating ? "⏳ Creating..." : `✅ Import ${selectedActionsCount} Selected`}
                </button>
              )}
              {(activeTab === "contacts" || activeTab === "duplicates") && (
                <button onClick={createSelectedContacts} disabled={creating || !selectedContactsCount} className="px-4 py-2 bg-blue-500 text-white font-bold rounded-xl disabled:opacity-50">
                  {creating ? "Creating..." : `👥 Add ${selectedContactsCount} Contacts`}
                </button>
              )}
            </div>
          </section>

          {/* Content */}
          <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 mb-6 max-h-[600px] overflow-y-auto">
            {/* Actions Tab */}
            {activeTab === "actions" && (
              filteredActions.length === 0 ? (
                <div className="text-center py-12 text-slate-400">✨ No actions found</div>
              ) : (
                <div className="space-y-3">
                  {filteredActions.map((a, i) => (
                    <div 
                      key={`${a.messageId}-${i}`} 
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        a.status === "created" 
                          ? "bg-green-900/20 border-green-500/30" 
                          : a.selected 
                            ? "bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border-cyan-500/50 shadow-lg shadow-cyan-500/10" 
                            : "bg-slate-900/50 border-slate-700 hover:border-slate-600"
                      }`}
                      onClick={() => a.status === "pending" && toggleAction(a.messageId, a.description)}
                    >
                      <div className="flex items-start gap-3">
                        {a.status === "pending" && (
                          <div className={`mt-1 w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            a.selected 
                              ? "bg-cyan-500 border-cyan-500 text-white" 
                              : "border-slate-500 hover:border-cyan-400"
                          }`}>
                            {a.selected && <span className="text-sm">✓</span>}
                          </div>
                        )}
                        {a.status === "created" && (
                          <div className="mt-1 w-6 h-6 rounded-md bg-green-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm text-white">✓</span>
                          </div>
                        )}
                        {a.status === "creating" && (
                          <div className="mt-1 w-6 h-6 rounded-md border-2 border-yellow-500 flex items-center justify-center flex-shrink-0 animate-pulse">
                            <span className="text-xs">⏳</span>
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs border ${getTypeColor(a.type)}`}>
                              {getTypeIcon(a.type)} {a.type.replace("_", " ")}
                            </span>
                            {getPriorityBadge(a.priority)}
                            {a.status === "created" && <span className="text-xs text-green-400 font-medium">✅ Imported</span>}
                            {a.status === "creating" && <span className="text-xs text-yellow-400 animate-pulse">Importing...</span>}
                          </div>
                          <div className={`font-medium ${a.selected ? "text-white" : "text-slate-200"}`}>
                            {a.description}
                          </div>
                          <div className="text-sm text-slate-400 mt-1">
                            From: {a.fromName} 
                            {a.inSecondBrain && <span className="text-green-400 text-xs ml-2">✓ In Second Brain</span>}
                          </div>
                          {a.context && (
                            <div className="text-xs text-slate-500 mt-1 italic bg-slate-800/50 p-2 rounded">
                              &quot;{a.context}&quot;
                            </div>
                          )}
                          {a.status === "pending" && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); dismissAction(a.messageId, a.description); }} 
                              className="text-xs text-slate-500 mt-2 hover:text-red-400 transition-colors"
                            >
                              🚫 Not relevant
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Contacts Tab */}
            {activeTab === "contacts" && (
              realPeople.length === 0 ? (
                <div className="text-center py-12 text-slate-400">✨ No new contacts found</div>
              ) : (
                <div className="space-y-3">
                  {realPeople.map((c) => (
                    <div key={c.email} className={`p-4 rounded-xl border ${c.status === "created" ? "bg-green-900/20 border-green-500/30" : c.selected ? "bg-slate-800/50 border-cyan-500/50" : "bg-slate-900/50 border-slate-700"}`}>
                      <div className="flex items-center gap-3">
                        {c.status === "pending" && <input type="checkbox" checked={c.selected} onChange={() => toggleContact(c.email, "real")} className="w-5 h-5 rounded bg-slate-800 border-slate-600" />}
                        <div>
                          <div className="font-medium text-slate-200">{c.name} <span className="text-xs text-green-400">✅ Real Person ({Math.round(c.confidence * 100)}%)</span></div>
                          <div className="text-sm text-slate-400">{c.email}</div>
                          <div className="text-xs text-slate-500">{c.company} • {c.subject.slice(0, 40)}...</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Duplicates Tab */}
            {activeTab === "duplicates" && (
              duplicates.length === 0 ? (
                <div className="text-center py-12 text-slate-400">✨ No duplicates - your data is clean!</div>
              ) : (
                <div className="space-y-3">
                  {duplicates.map((c) => (
                    <div key={c.email} className={`p-4 rounded-xl border ${c.status === "skipped" ? "opacity-50" : ""} bg-orange-900/10 border-orange-500/30`}>
                      <div className="flex items-start gap-3">
                        {c.status === "pending" && <input type="checkbox" checked={c.selected} onChange={() => toggleContact(c.email, "duplicate")} className="mt-1 w-5 h-5 rounded bg-slate-800 border-slate-600" />}
                        <div className="flex-1">
                          <div className="font-medium text-slate-200">{c.name}</div>
                          <div className="text-sm text-slate-400">{c.email}</div>
                          {c.duplicateMatches && c.duplicateMatches.length > 0 && (
                            <div className="mt-2 p-2 bg-orange-900/20 rounded">
                              <div className="text-xs text-orange-400 mb-1">⚠️ Possible duplicate of:</div>
                              {c.duplicateMatches.map((m, i) => (
                                <div key={i} className="text-sm text-orange-300">{m.name} ({m.email}) - {Math.round(m.confidence * 100)}%</div>
                              ))}
                            </div>
                          )}
                          {c.status === "pending" && (
                            <button onClick={() => skipContact(c.email)} className="text-xs text-slate-500 mt-2 hover:text-slate-300">⏭️ Skip</button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* Filtered Tab */}
            {activeTab === "filtered" && (
              filteredContacts.length === 0 ? (
                <div className="text-center py-12 text-slate-400">🧹 No junk filtered</div>
              ) : (
                <div className="space-y-2">
                  {filteredContacts.slice(0, 20).map((c) => (
                    <div key={c.email} className="p-3 rounded-lg bg-slate-800/30 border border-slate-700">
                      <div className="text-sm text-slate-400">{c.name} ({c.email})</div>
                      <div className="text-xs text-slate-500">{c.classification} • {c.reason}</div>
                    </div>
                  ))}
                  {filteredContacts.length > 20 && <div className="text-center text-slate-500 text-sm">+ {filteredContacts.length - 20} more</div>}
                </div>
              )
            )}
          </section>
        </>
      )}

      {/* Activity Log */}
      <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <div className="flex justify-between mb-2">
          <h3 className="text-sm font-semibold uppercase text-slate-300">Activity Log</h3>
          <button onClick={() => setLog([])} className="text-xs px-2 py-1 border border-slate-700 rounded">Clear</button>
        </div>
        <div className="max-h-32 overflow-y-auto space-y-1 text-xs text-slate-400">
          {log.length === 0 ? <div className="text-slate-500">No activity</div> : log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </section>
    </main>
  );
}
