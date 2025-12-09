"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { isGmailConnected, getGmailTokens, saveGmailTokens, clearGmailTokens } from "@/app/lib/gmail-storage";

type DuplicateMatch = {
  name: string;
  email: string;
  confidence: number;
  reason: string;
  existingId?: string;
};

type ClassifiedContact = {
  name: string;
  email: string;
  company: string;
  subject: string;
  classification: "real_person" | "marketing" | "automated" | "uncertain";
  confidence: number;
  reason: string;
  selected: boolean;
  status: "pending" | "creating" | "created" | "error" | "skipped";
  hasDuplicate?: boolean;
  duplicateType?: "existing" | "scan" | null;
  duplicateMatches?: DuplicateMatch[];
  mergeWith?: string; // email of contact to merge with
};

type ScanSummary = {
  realPeople: number;
  marketing: number;
  automated: number;
  uncertain: number;
  possibleDuplicates: number;
};

export default function ContactScannerPage() {
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [contacts, setContacts] = useState<ClassifiedContact[]>([]);
  const [duplicateContacts, setDuplicateContacts] = useState<ClassifiedContact[]>([]);
  const [stats, setStats] = useState({
    totalScanned: 0,
    uniqueSenders: 0,
    blockedByPatterns: 0,
    existingContacts: 0,
  });
  const [summary, setSummary] = useState<ScanSummary>({
    realPeople: 0,
    marketing: 0,
    automated: 0,
    uncertain: 0,
    possibleDuplicates: 0,
  });
  const [activeTab, setActiveTab] = useState<"real_person" | "duplicates" | "uncertain" | "blocked">("real_person");
  const [creating, setCreating] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [blockedContacts, setBlockedContacts] = useState<ClassifiedContact[]>([]);

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
    pushLog("📧 Scanning emails...");

    try {
      const { accessToken, refreshToken } = getGmailTokens();

      const res = await fetch("/api/gmail/scan-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, refreshToken, maxResults: 100 }),
      });

      const data = await res.json();

      if (data.newAccessToken) {
        pushLog("🔄 Token refreshed automatically");
        saveGmailTokens(data.newAccessToken, refreshToken || "");
      }

      if (data.needsReconnect) {
        pushLog("❌ Session expired - please reconnect Gmail");
        clearGmailTokens();
        setGmailConnected(false);
        setScanning(false);
        return;
      }

      if (data.ok) {
        setStats({
          totalScanned: data.totalScanned,
          uniqueSenders: data.uniqueSenders,
          blockedByPatterns: data.blockedByPatterns,
          existingContacts: data.existingContacts,
        });

        setSummary(data.summary);

        // Real people (no duplicates)
        const realPeople = (data.realPeople || []).map((c: any) => ({
          ...c,
          selected: true,
          status: "pending" as const,
        }));

        // Uncertain (no duplicates)
        const uncertain = (data.uncertain || []).map((c: any) => ({
          ...c,
          selected: false,
          status: "pending" as const,
        }));

        // Possible duplicates
        const duplicates = (data.possibleDuplicates || []).map((c: any) => ({
          ...c,
          selected: false, // Don't auto-select duplicates
          status: "pending" as const,
        }));

        // Blocked (marketing + automated)
        const blocked = [
          ...(data.marketing || []).map((c: any) => ({
            ...c,
            selected: false,
            status: "pending" as const,
          })),
          ...(data.automated || []).map((c: any) => ({
            ...c,
            selected: false,
            status: "pending" as const,
          })),
        ];

        setContacts([...realPeople, ...uncertain]);
        setDuplicateContacts(duplicates);
        setBlockedContacts(blocked);
        setScanned(true);

        pushLog(`🧠 AI Analysis Complete!`);
        pushLog(`✅ ${realPeople.length} real people found`);
        pushLog(`⚠️ ${duplicates.length} possible duplicates`);
        pushLog(`❓ ${uncertain.length} need review`);
        pushLog(`🚫 ${blocked.length + data.blockedByPatterns} filtered out`);

        // Auto-switch to duplicates tab if any found
        if (duplicates.length > 0) {
          setActiveTab("duplicates");
        }
      } else {
        pushLog(`❌ Scan failed: ${data.error}`);
      }
    } catch (err: any) {
      pushLog(`❌ Error: ${err.message}`);
    } finally {
      setScanning(false);
    }
  }

  function toggleContact(email: string) {
    setContacts((prev) =>
      prev.map((c) => (c.email === email ? { ...c, selected: !c.selected } : c))
    );
    setDuplicateContacts((prev) =>
      prev.map((c) => (c.email === email ? { ...c, selected: !c.selected } : c))
    );
    setBlockedContacts((prev) =>
      prev.map((c) => (c.email === email ? { ...c, selected: !c.selected } : c))
    );
  }

  function skipDuplicate(email: string) {
    setDuplicateContacts((prev) =>
      prev.map((c) => (c.email === email ? { ...c, status: "skipped" as const, selected: false } : c))
    );
    pushLog(`⏭️ Skipped duplicate: ${email}`);
  }

  function selectAllInTab() {
    if (activeTab === "real_person") {
      setContacts((prev) =>
        prev.map((c) => (c.classification === "real_person" ? { ...c, selected: true } : c))
      );
    } else if (activeTab === "uncertain") {
      setContacts((prev) =>
        prev.map((c) => (c.classification === "uncertain" ? { ...c, selected: true } : c))
      );
    } else if (activeTab === "duplicates") {
      setDuplicateContacts((prev) =>
        prev.map((c) => (c.status === "pending" ? { ...c, selected: true } : c))
      );
    }
  }

  function selectNoneInTab() {
    if (activeTab === "real_person") {
      setContacts((prev) =>
        prev.map((c) => (c.classification === "real_person" ? { ...c, selected: false } : c))
      );
    } else if (activeTab === "uncertain") {
      setContacts((prev) =>
        prev.map((c) => (c.classification === "uncertain" ? { ...c, selected: false } : c))
      );
    } else if (activeTab === "duplicates") {
      setDuplicateContacts((prev) => prev.map((c) => ({ ...c, selected: false })));
    }
  }

  async function createSelectedContacts() {
    const allContacts = [...contacts, ...duplicateContacts, ...blockedContacts];
    const selected = allContacts.filter((c) => c.selected && c.status === "pending");

    if (selected.length === 0) {
      pushLog("⚠️ No contacts selected");
      return;
    }

    setCreating(true);
    pushLog(`📇 Creating ${selected.length} contacts...`);

    let created = 0;
    let errors = 0;

    for (const contact of selected) {
      const updateStatus = (status: ClassifiedContact["status"]) => {
        setContacts((prev) =>
          prev.map((c) => (c.email === contact.email ? { ...c, status } : c))
        );
        setDuplicateContacts((prev) =>
          prev.map((c) => (c.email === contact.email ? { ...c, status } : c))
        );
        setBlockedContacts((prev) =>
          prev.map((c) => (c.email === contact.email ? { ...c, status } : c))
        );
      };

      updateStatus("creating");

      try {
        const res = await fetch("/api/second-brain/create-from-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: contact.name,
            email: contact.email,
            company: contact.company,
          }),
        });

        const data = await res.json();

        if (data.ok) {
          updateStatus("created");
          created++;
          pushLog(`✅ Created: ${contact.name}`);
        } else {
          updateStatus("error");
          errors++;
          pushLog(`❌ Failed: ${contact.name} - ${data.error}`);
        }
      } catch (err) {
        updateStatus("error");
        errors++;
      }

      await new Promise((r) => setTimeout(r, 300));
    }

    pushLog(`🎉 Done! Created ${created}, Errors: ${errors}`);
    setCreating(false);
  }

  function getClassificationBadge(classification: string, confidence: number) {
    const pct = Math.round(confidence * 100);
    switch (classification) {
      case "real_person":
        return (
          <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded">
            ✅ Real Person ({pct}%)
          </span>
        );
      case "uncertain":
        return (
          <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 text-xs rounded">
            ❓ Uncertain ({pct}%)
          </span>
        );
      case "marketing":
        return (
          <span className="px-2 py-1 bg-red-900/30 text-red-400 text-xs rounded">
            📢 Marketing
          </span>
        );
      case "automated":
        return (
          <span className="px-2 py-1 bg-purple-900/30 text-purple-400 text-xs rounded">
            🤖 Automated
          </span>
        );
    }
  }

  function getStatusBadge(status: ClassifiedContact["status"]) {
    switch (status) {
      case "pending":
        return null;
      case "creating":
        return (
          <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 text-xs rounded animate-pulse">
            Creating...
          </span>
        );
      case "created":
        return (
          <span className="px-2 py-1 bg-green-900/30 text-green-400 text-xs rounded">
            ✅ Added
          </span>
        );
      case "skipped":
        return (
          <span className="px-2 py-1 bg-slate-700/50 text-slate-400 text-xs rounded">
            ⏭️ Skipped
          </span>
        );
      case "error":
        return (
          <span className="px-2 py-1 bg-red-900/30 text-red-400 text-xs rounded">
            ❌ Error
          </span>
        );
    }
  }

  const realPeopleContacts = contacts.filter((c) => c.classification === "real_person");
  const uncertainContacts = contacts.filter((c) => c.classification === "uncertain");

  const selectedCount = [...contacts, ...duplicateContacts, ...blockedContacts].filter(
    (c) => c.selected && c.status === "pending"
  ).length;
  const createdCount = [...contacts, ...duplicateContacts, ...blockedContacts].filter(
    (c) => c.status === "created"
  ).length;

  const getTabContacts = () => {
    switch (activeTab) {
      case "real_person":
        return realPeopleContacts;
      case "uncertain":
        return uncertainContacts;
      case "duplicates":
        return duplicateContacts;
      case "blocked":
        return blockedContacts;
      default:
        return [];
    }
  };

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
          <h1 className="text-2xl font-semibold">🧠 Smart Contact Scanner</h1>
          <p className="text-slate-400 text-sm">
            AI-powered email analysis with duplicate detection
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
              <p className="text-sm text-slate-400">Connect Gmail first to scan for contacts</p>
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
        <section className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-2xl p-8 mb-6 text-center">
          <div className="text-6xl mb-4">🧠</div>
          <h2 className="text-xl font-semibold mb-2">AI-Powered Contact Discovery</h2>
          <p className="text-slate-400 mb-2">
            Scans your inbox, identifies real people, and catches duplicates
          </p>
          <p className="text-slate-500 text-sm mb-6">
            ✅ Real People → Auto-selected for import<br />
            ⚠️ Duplicates → Review before adding<br />
            🚫 Marketing/Automated → Filtered out
          </p>
          <button
            onClick={scanEmails}
            disabled={scanning}
            className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-xl hover:from-blue-400 hover:to-purple-400 disabled:opacity-50 text-lg"
          >
            {scanning ? "🔍 Analyzing with AI..." : "🔍 Scan & Analyze Inbox"}
          </button>
        </section>
      )}

      {scanned && (
        <>
          {/* Stats */}
          <section className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 uppercase mb-1">Scanned</div>
              <div className="text-2xl font-bold text-slate-200">{stats.totalScanned}</div>
            </div>
            <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4">
              <div className="text-xs text-green-400 uppercase mb-1">Real People</div>
              <div className="text-2xl font-bold text-green-300">{summary.realPeople}</div>
            </div>
            <div className="bg-orange-900/20 border border-orange-500/30 rounded-xl p-4">
              <div className="text-xs text-orange-400 uppercase mb-1">Duplicates</div>
              <div className="text-2xl font-bold text-orange-300">{summary.possibleDuplicates}</div>
            </div>
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4">
              <div className="text-xs text-yellow-400 uppercase mb-1">Review</div>
              <div className="text-2xl font-bold text-yellow-300">{summary.uncertain}</div>
            </div>
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
              <div className="text-xs text-red-400 uppercase mb-1">Filtered</div>
              <div className="text-2xl font-bold text-red-300">
                {summary.marketing + summary.automated + stats.blockedByPatterns}
              </div>
            </div>
            <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-xl p-4">
              <div className="text-xs text-cyan-400 uppercase mb-1">Saved</div>
              <div className="text-2xl font-bold text-cyan-300">{stats.existingContacts}</div>
            </div>
          </section>

          {/* Tabs */}
          <section className="flex items-center gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setActiveTab("real_person")}
              className={`px-4 py-2 rounded-lg font-medium text-sm ${
                activeTab === "real_person"
                  ? "bg-green-500 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              ✅ Real People ({summary.realPeople})
            </button>
            <button
              onClick={() => setActiveTab("duplicates")}
              className={`px-4 py-2 rounded-lg font-medium text-sm ${
                activeTab === "duplicates"
                  ? "bg-orange-500 text-white"
                  : summary.possibleDuplicates > 0
                  ? "bg-orange-900/50 text-orange-300 hover:bg-orange-900/70 border border-orange-500/50"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              ⚠️ Duplicates ({summary.possibleDuplicates})
            </button>
            <button
              onClick={() => setActiveTab("uncertain")}
              className={`px-4 py-2 rounded-lg font-medium text-sm ${
                activeTab === "uncertain"
                  ? "bg-yellow-500 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              ❓ Review ({summary.uncertain})
            </button>
            <button
              onClick={() => setActiveTab("blocked")}
              className={`px-4 py-2 rounded-lg font-medium text-sm ${
                activeTab === "blocked"
                  ? "bg-red-500 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              🚫 Filtered ({summary.marketing + summary.automated})
            </button>
          </section>

          {/* Action Bar */}
          <section className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={selectAllInTab}
                className="px-3 py-1 bg-slate-800 text-slate-300 text-sm rounded-lg hover:bg-slate-700"
              >
                Select All
              </button>
              <button
                onClick={selectNoneInTab}
                className="px-3 py-1 bg-slate-800 text-slate-300 text-sm rounded-lg hover:bg-slate-700"
              >
                Select None
              </button>
              <span className="text-sm text-slate-400">
                {selectedCount} selected | {createdCount} added
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
                onClick={createSelectedContacts}
                disabled={creating || selectedCount === 0}
                className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:from-green-400 hover:to-emerald-400 disabled:opacity-50"
              >
                {creating ? "Adding..." : `➕ Add ${selectedCount} to Second Brain`}
              </button>
            </div>
          </section>

          {/* Contact List */}
          <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 mb-6">
            {activeTab === "duplicates" && duplicateContacts.length > 0 && (
              <div className="mb-4 p-3 bg-orange-900/20 border border-orange-500/30 rounded-lg">
                <p className="text-orange-300 text-sm">
                  ⚠️ These contacts may already exist in your Second Brain or appear multiple times in this scan.
                  Review carefully before adding.
                </p>
              </div>
            )}

            {getTabContacts().length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-2">
                  {activeTab === "real_person" && "🎯"}
                  {activeTab === "duplicates" && "✨"}
                  {activeTab === "uncertain" && "✨"}
                  {activeTab === "blocked" && "🧹"}
                </div>
                <div className="text-slate-400">
                  {activeTab === "real_person" && "No new real people found"}
                  {activeTab === "duplicates" && "No duplicates detected - your data is clean!"}
                  {activeTab === "uncertain" && "No uncertain contacts to review"}
                  {activeTab === "blocked" && "No marketing/automated emails filtered"}
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {getTabContacts().map((contact) => (
                  <div
                    key={contact.email}
                    className={`p-4 rounded-xl border transition-all ${
                      contact.status === "created"
                        ? "bg-green-900/20 border-green-500/30"
                        : contact.status === "skipped"
                        ? "bg-slate-800/30 border-slate-700 opacity-60"
                        : contact.selected
                        ? "bg-slate-800/50 border-cyan-500/50"
                        : contact.hasDuplicate
                        ? "bg-orange-900/10 border-orange-500/30"
                        : "bg-slate-900/50 border-slate-700"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {contact.status === "pending" && (
                        <input
                          type="checkbox"
                          checked={contact.selected}
                          onChange={() => toggleContact(contact.email)}
                          className="w-5 h-5 mt-1 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-200">{contact.name}</span>
                          {getClassificationBadge(contact.classification, contact.confidence)}
                          {getStatusBadge(contact.status)}
                        </div>
                        <div className="text-sm text-slate-400">{contact.email}</div>
                        <div className="text-xs text-slate-500 mt-1">
                          {contact.company} • &quot;{contact.subject.slice(0, 50)}...&quot;
                        </div>
                        {contact.reason && (
                          <div className="text-xs text-slate-600 mt-1 italic">
                            AI: {contact.reason}
                          </div>
                        )}

                        {/* Duplicate Warning */}
                        {contact.hasDuplicate && contact.duplicateMatches && contact.duplicateMatches.length > 0 && (
                          <div className="mt-3 p-3 bg-orange-900/20 border border-orange-500/20 rounded-lg">
                            <div className="text-xs text-orange-400 font-semibold mb-2">
                              ⚠️ Possible duplicate of:
                            </div>
                            {contact.duplicateMatches.map((match, idx) => (
                              <div key={idx} className="text-sm text-orange-300 mb-1">
                                <span className="font-medium">{match.name}</span>
                                <span className="text-orange-400/70"> ({match.email})</span>
                                <span className="text-xs text-orange-500 ml-2">
                                  {Math.round(match.confidence * 100)}% • {match.reason}
                                </span>
                              </div>
                            ))}
                            {contact.status === "pending" && (
                              <div className="mt-2 flex gap-2">
                                <button
                                  onClick={() => toggleContact(contact.email)}
                                  className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-500"
                                >
                                  {contact.selected ? "Deselect" : "Add Anyway"}
                                </button>
                                <button
                                  onClick={() => skipDuplicate(contact.email)}
                                  className="px-3 py-1 bg-slate-600 text-white text-xs rounded hover:bg-slate-500"
                                >
                                  Skip This
                                </button>
                              </div>
                            )}
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
