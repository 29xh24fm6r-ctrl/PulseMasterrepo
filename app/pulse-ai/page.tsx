"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { isGmailConnected, getGmailTokens, saveGmailTokens, clearGmailTokens } from "@/app/lib/gmail-storage";
import { 
  getScanStatus, 
  setLastScanTime, 
  formatTimeSince,
  type ScanStatus 
} from "@/app/lib/auto-scan-scheduler";

type ProcessingResults = {
  scanned: number;
  analyzed: number;
  blocked: number;
  actionsCreated: number;
  actionsDuplicate: number;
  contactsCreated: number;
  contactsDuplicate: number;
  errors: number;
};

type CreatedItems = {
  tasks: string[];
  followUps: string[];
  contacts: string[];
};

export default function PulseAIPage() {
  const [processing, setProcessing] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [results, setResults] = useState<ProcessingResults | null>(null);
  const [created, setCreated] = useState<CreatedItems | null>(null);
  const [daysBack, setDaysBack] = useState(7);
  const [log, setLog] = useState<string[]>([]);
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [scanStatus, setScanStatus] = useState<ScanStatus | null>(null);

  useEffect(() => {
    setGmailConnected(isGmailConnected());
    setScanStatus(getScanStatus());
  }, []);

  function pushLog(msg: string) {
    const stamp = new Date().toLocaleTimeString();
    setLog((prev) => [`${stamp} — ${msg}`, ...prev].slice(0, 50));
  }

  async function runAutonomousProcessor() {
    if (!gmailConnected) {
      pushLog("❌ Gmail not connected");
      return;
    }

    setProcessing(true);
    setHasRun(false);
    pushLog("🤖 PULSE AI ACTIVATED");
    pushLog("🔍 Scanning emails...");

    try {
      const { accessToken, refreshToken } = getGmailTokens();

      const res = await fetch("/api/pulse/autonomous", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, refreshToken, maxResults: 100, daysBack }),
      });

      const data = await res.json();

      if (data.newAccessToken) {
        saveGmailTokens(data.newAccessToken, refreshToken || "");
        pushLog("🔄 Token refreshed");
      }

      if (data.needsReconnect) {
        clearGmailTokens();
        setGmailConnected(false);
        pushLog("❌ Session expired - reconnect Gmail");
        setProcessing(false);
        return;
      }

      if (data.ok) {
        setResults(data.summary);
        setCreated(data.created);
        setHasRun(true);

        // Update scan time
        setLastScanTime({
          actionsCreated: data.summary.actionsCreated,
          contactsCreated: data.summary.contactsCreated,
        });
        setScanStatus(getScanStatus());

        pushLog("✅ AUTONOMOUS PROCESSING COMPLETE");
        pushLog(`📧 ${data.summary.scanned} emails scanned`);
        pushLog(`🚫 ${data.summary.blocked} junk filtered`);
        
        if (data.summary.actionsCreated > 0) {
          pushLog(`📋 ${data.summary.actionsCreated} actions AUTO-CREATED`);
          for (const task of data.created.tasks) {
            pushLog(`   ✅ Task: ${task.slice(0, 50)}...`);
          }
          for (const followUp of data.created.followUps) {
            pushLog(`   ✅ Follow-up: ${followUp.slice(0, 50)}...`);
          }
        }

        if (data.summary.contactsCreated > 0) {
          pushLog(`👥 ${data.summary.contactsCreated} contacts AUTO-ADDED`);
          for (const contact of data.created.contacts) {
            pushLog(`   ✅ Contact: ${contact}`);
          }
        }

        if (data.summary.actionsDuplicate + data.summary.contactsDuplicate > 0) {
          pushLog(`⏭️ ${data.summary.actionsDuplicate + data.summary.contactsDuplicate} duplicates skipped`);
        }

        if (data.summary.errors > 0) {
          pushLog(`⚠️ ${data.summary.errors} errors occurred`);
        }

        pushLog("🧠 Your mind is now clear. Pulse has it handled.");
      } else {
        pushLog(`❌ ${data.error}`);
      }
    } catch (err: any) {
      pushLog(`❌ Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  }

  if (gmailConnected === null) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-6xl animate-pulse">🧠</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            🧠 Pulse AI
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Autonomous Intelligence • Never Forget Anything
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/morning-brief" className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:from-amber-400 hover:to-orange-400">
            🌅 Morning Brief
          </Link>
          <Link href="/follow-ups" className="px-4 py-2 bg-slate-800 rounded-xl hover:bg-slate-700">
            ⚡ Follow-Ups
          </Link>
          <Link href="/" className="px-4 py-2 bg-slate-800 rounded-xl hover:bg-slate-700">
            🏠 Dashboard
          </Link>
        </div>
      </header>

      {/* Scan Status */}
      {scanStatus && (
        <section className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${scanStatus.needsScan ? "bg-yellow-500" : "bg-green-500"}`} />
                <span className="text-sm text-slate-400">
                  Last scan: <span className="text-slate-200">{formatTimeSince(scanStatus.lastScan)}</span>
                </span>
              </div>
              {scanStatus.needsScan && (
                <span className="text-xs text-yellow-400">⚠️ Scan recommended</span>
              )}
            </div>
            <div className="text-xs text-slate-500">
              Auto-scan runs every 4 hours on Morning Brief
            </div>
          </div>
        </section>
      )}

      {/* Gmail Connection */}
      {!gmailConnected && (
        <section className="bg-gradient-to-br from-red-900/30 to-orange-900/30 border border-red-500/30 rounded-2xl p-8 mb-8 text-center">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-xl font-semibold mb-2">Connect Gmail to Activate Pulse AI</h2>
          <p className="text-slate-400 mb-6">Pulse needs email access to automatically capture tasks and contacts</p>
          <Link
            href="/follow-ups"
            className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold rounded-xl"
          >
            🔗 Connect Gmail
          </Link>
        </section>
      )}

      {/* Main AI Panel */}
      {gmailConnected && !hasRun && (
        <section className="bg-gradient-to-br from-slate-900 to-slate-800 border border-cyan-500/30 rounded-3xl p-12 mb-8 text-center relative overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-purple-500/5 animate-pulse" />
          
          <div className="relative z-10">
            <div className="text-8xl mb-6">🧠</div>
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              Pulse AI Ready
            </h2>
            <p className="text-slate-400 mb-2 text-lg">
              One click. Everything captured. Nothing forgotten.
            </p>
            <p className="text-slate-500 mb-8 max-w-lg mx-auto">
              Pulse will scan your emails, extract every task, follow-up, and commitment,
              then automatically create them in your system. You just focus on doing.
            </p>

            <div className="flex items-center justify-center gap-4 mb-8">
              <span className="text-slate-400">Scan last:</span>
              <select
                value={daysBack}
                onChange={(e) => setDaysBack(Number(e.target.value))}
                className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
              >
                <option value={1}>1 day</option>
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
            </div>

            <button
              onClick={runAutonomousProcessor}
              disabled={processing}
              className="px-12 py-6 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-2xl text-xl hover:from-cyan-400 hover:to-purple-400 disabled:opacity-50 transition-all transform hover:scale-105 shadow-lg shadow-cyan-500/25"
            >
              {processing ? (
                <span className="flex items-center gap-3">
                  <span className="animate-spin">🔄</span> Processing...
                </span>
              ) : (
                <span className="flex items-center gap-3">
                  🚀 Activate Pulse AI
                </span>
              )}
            </button>

            <div className="mt-8 grid grid-cols-3 gap-6 max-w-2xl mx-auto">
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="text-2xl mb-2">📋</div>
                <div className="text-sm text-slate-400">Auto-Create Tasks</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="text-2xl mb-2">📅</div>
                <div className="text-sm text-slate-400">Schedule Follow-Ups</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="text-2xl mb-2">👥</div>
                <div className="text-sm text-slate-400">Add Contacts</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Results */}
      {hasRun && results && (
        <>
          {/* Success Banner */}
          <section className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="text-5xl">✅</div>
              <div>
                <h2 className="text-xl font-bold text-green-400">Pulse AI Complete</h2>
                <p className="text-slate-400">
                  Your mind is clear. {results.actionsCreated + results.contactsCreated} items auto-created.
                </p>
              </div>
              <button
                onClick={runAutonomousProcessor}
                disabled={processing}
                className="ml-auto px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-bold rounded-xl"
              >
                {processing ? "🔄 Running..." : "🔄 Run Again"}
              </button>
            </div>
          </section>

          {/* Stats Grid */}
          <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 uppercase mb-1">Scanned</div>
              <div className="text-2xl font-bold text-slate-200">{results.scanned}</div>
            </div>
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
              <div className="text-xs text-slate-400 uppercase mb-1">Analyzed</div>
              <div className="text-2xl font-bold text-slate-200">{results.analyzed}</div>
            </div>
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-4">
              <div className="text-xs text-red-400 uppercase mb-1">Junk Blocked</div>
              <div className="text-2xl font-bold text-red-300">{results.blocked}</div>
            </div>
            <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4">
              <div className="text-xs text-green-400 uppercase mb-1">Actions Created</div>
              <div className="text-2xl font-bold text-green-300">{results.actionsCreated}</div>
            </div>
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
              <div className="text-xs text-blue-400 uppercase mb-1">Contacts Added</div>
              <div className="text-2xl font-bold text-blue-300">{results.contactsCreated}</div>
            </div>
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-4">
              <div className="text-xs text-yellow-400 uppercase mb-1">Duplicates Skipped</div>
              <div className="text-2xl font-bold text-yellow-300">{results.actionsDuplicate + results.contactsDuplicate}</div>
            </div>
            <div className="bg-purple-900/20 border border-purple-500/30 rounded-xl p-4">
              <div className="text-xs text-purple-400 uppercase mb-1">Errors</div>
              <div className="text-2xl font-bold text-purple-300">{results.errors}</div>
            </div>
          </section>

          {/* Created Items */}
          {created && (created.tasks.length > 0 || created.followUps.length > 0 || created.contacts.length > 0) && (
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Tasks Created */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>📋</span> Tasks Created
                  <span className="text-sm text-slate-400">({created.tasks.length})</span>
                </h3>
                {created.tasks.length === 0 ? (
                  <p className="text-slate-500 text-sm">No new tasks found</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {created.tasks.map((task, i) => (
                      <div key={i} className="p-2 bg-green-900/20 border border-green-500/30 rounded-lg text-sm text-green-300">
                        ✅ {task}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Follow-Ups Created */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>📅</span> Follow-Ups Created
                  <span className="text-sm text-slate-400">({created.followUps.length})</span>
                </h3>
                {created.followUps.length === 0 ? (
                  <p className="text-slate-500 text-sm">No new follow-ups found</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {created.followUps.map((followUp, i) => (
                      <div key={i} className="p-2 bg-purple-900/20 border border-purple-500/30 rounded-lg text-sm text-purple-300">
                        ✅ {followUp}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Contacts Created */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span>👥</span> Contacts Added
                  <span className="text-sm text-slate-400">({created.contacts.length})</span>
                </h3>
                {created.contacts.length === 0 ? (
                  <p className="text-slate-500 text-sm">No new contacts found</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {created.contacts.map((contact, i) => (
                      <div key={i} className="p-2 bg-blue-900/20 border border-blue-500/30 rounded-lg text-sm text-blue-300">
                        ✅ {contact}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Quick Links */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Link
              href="/morning-brief"
              className="bg-gradient-to-br from-amber-900/30 to-orange-900/30 border border-amber-500/30 rounded-2xl p-6 hover:border-amber-400 transition-all"
            >
              <div className="text-3xl mb-2">🌅</div>
              <h3 className="font-semibold">Morning Brief</h3>
              <p className="text-sm text-slate-400">AI-powered daily summary</p>
            </Link>
            <Link
              href="/follow-ups"
              className="bg-gradient-to-br from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-2xl p-6 hover:border-purple-400 transition-all"
            >
              <div className="text-3xl mb-2">⚡</div>
              <h3 className="font-semibold">View Follow-Ups</h3>
              <p className="text-sm text-slate-400">See all scheduled follow-ups</p>
            </Link>
            <Link
              href="/second-brain"
              className="bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border border-blue-500/30 rounded-2xl p-6 hover:border-blue-400 transition-all"
            >
              <div className="text-3xl mb-2">🧠</div>
              <h3 className="font-semibold">Second Brain</h3>
              <p className="text-sm text-slate-400">View all contacts</p>
            </Link>
          </section>
        </>
      )}

      {/* Activity Log */}
      <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <div className="flex justify-between mb-3">
          <h3 className="text-sm font-semibold uppercase text-slate-300 flex items-center gap-2">
            <span>📜</span> AI Activity Log
          </h3>
          <button onClick={() => setLog([])} className="text-xs px-2 py-1 border border-slate-700 rounded hover:bg-slate-800">
            Clear
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto space-y-1 font-mono text-xs">
          {log.length === 0 ? (
            <div className="text-slate-500">Pulse AI waiting for activation...</div>
          ) : (
            log.map((line, i) => (
              <div key={i} className={`${line.includes("✅") ? "text-green-400" : line.includes("❌") ? "text-red-400" : line.includes("⏭️") ? "text-yellow-400" : "text-slate-400"}`}>
                {line}
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
