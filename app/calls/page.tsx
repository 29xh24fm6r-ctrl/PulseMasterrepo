"use client";

export const dynamic = "force-dynamic";
import { Suspense } from "react";
import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface CallSession {
  id: string;
  direction: "inbound" | "outbound";
  status: string;
  fromNumber: string;
  toNumber: string;
  contactId?: string;
  startedAt: string;
  durationSec?: number;
  transcriptText?: string;
  summaryShort?: string;
  summaryDetailed?: string;
  sentiment?: "positive" | "neutral" | "negative";
  tags?: string[];
  actionsJson?: any;
}

interface CallStats {
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  missedCalls: number;
  completedCalls: number;
}

interface Contact {
  id: string;
  name: string;
  company?: string;
  phone?: string;
  notionUrl?: string;
}

interface VerifiedCallerId {
  sid: string;
  phoneNumber: string;
}

const formatPhone = (p: string) => {
  const c = p.replace(/\D/g, "");
  if (c.length === 10) return `(${c.slice(0,3)}) ${c.slice(3,6)}-${c.slice(6)}`;
  if (c.length === 11 && c[0] === "1") return `+1 (${c.slice(1,4)}) ${c.slice(4,7)}-${c.slice(7)}`;
  return p;
};

const formatDuration = (s: number) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,"0")}`;

const formatTime = (d: string) => {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff/60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(diff/3600000);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(diff/86400000)}d ago`;
};

const statusColors: Record<string, string> = {
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  in_progress: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  ringing: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  voicemail: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
  missed: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

function CallsContent() {
  const searchParams = useSearchParams();
  const [calls, setCalls] = useState<CallSession[]>([]);
  const [stats, setStats] = useState<CallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CallSession | null>(null);
  const [dialerOpen, setDialerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [contactName, setContactName] = useState("");
  const [useCallerId, setUseCallerId] = useState(true);
  const [calling, setCalling] = useState(false);
  const [callStatus, setCallStatus] = useState<string | null>(null);
  
  const [lookupContact, setLookupContact] = useState<Contact | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  
  const [verifiedIds, setVerifiedIds] = useState<VerifiedCallerId[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<string | null>(null);
  
  // Save to brain state
  const [savingToBrain, setSavingToBrain] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [newContactName, setNewContactName] = useState("");

  useEffect(() => {
    const p = localStorage.getItem("pulse_user_phone");
    if (p) setUserPhone(p);
    const c = localStorage.getItem("pulse_use_caller_id");
    if (c) setUseCallerId(c === "true");
    loadVerifiedIds();
  }, []);

  // Read phone and contactId from URL and open dialer
  useEffect(() => {
    const phoneParam = searchParams.get("phone");
    const contactIdParam = searchParams.get("contactId");
    if (phoneParam) {
      setPhoneNumber(phoneParam);
      setDialerOpen(true);
    }
    if (contactIdParam) {
      // Fetch contact details
      fetch(`/api/contacts/${contactIdParam}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.contact) {
            setLookupContact(data.contact);
            setContactName(data.contact.name || "");
          }
        })
        .catch(() => {});
    }
  }, [searchParams]);
  const saveUserPhone = (p: string) => { setUserPhone(p); localStorage.setItem("pulse_user_phone", p); };
  const saveCallerIdPref = (u: boolean) => { setUseCallerId(u); localStorage.setItem("pulse_use_caller_id", u.toString()); };

  const loadVerifiedIds = async () => {
    try {
      const r = await fetch("/api/comm/caller-id");
      if (r.ok) setVerifiedIds((await r.json()).callerIds || []);
    } catch {}
  };

  const verifyCallerId = async () => {
    if (!userPhone) return;
    setVerifying(true);
    setVerifyStatus("Calling...");
    try {
      const r = await fetch("/api/comm/caller-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: userPhone }),
      });
      const d = await r.json();
      if (d.alreadyVerified) { setVerifyStatus("✅ Verified!"); loadVerifiedIds(); }
      else if (d.success) { setVerifyStatus(`📞 Code: ${d.validationCode}`); setTimeout(loadVerifiedIds, 30000); }
      else setVerifyStatus(`❌ ${d.error}`);
    } catch { setVerifyStatus("❌ Failed"); }
    finally { setVerifying(false); }
  };

  const isVerified = (p: string) => {
    const c = p.replace(/\D/g, "");
    const f = c.length === 10 ? `+1${c}` : `+${c}`;
    return verifiedIds.some(v => v.phoneNumber === f);
  };

  useEffect(() => {
    const lookup = async () => {
      const c = phoneNumber.replace(/\D/g, "");
      if (c.length < 10) { setLookupContact(null); return; }
      setLookingUp(true);
      try {
        const r = await fetch(`/api/comm/contact-lookup?phone=${encodeURIComponent(phoneNumber)}`);
        if (r.ok) {
          const d = await r.json();
          if (d.found) { setLookupContact(d.contact); if (!contactName) setContactName(d.contact.name); }
          else setLookupContact(null);
        }
      } catch {}
      finally { setLookingUp(false); }
    };
    const t = setTimeout(lookup, 500);
    return () => clearTimeout(t);
  }, [phoneNumber]);

  const loadCalls = useCallback(async () => {
    try {
      const r = await fetch("/api/comm/call/list");
      if (r.ok) { const d = await r.json(); setCalls(d.calls || []); setStats(d.stats); }
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadCalls(); const i = setInterval(loadCalls, 10000); return () => clearInterval(i); }, [loadCalls]);

  const makeCall = async () => {
    if (!phoneNumber || !userPhone) return;
    setCalling(true);
    setCallStatus("📞 Calling you...");
    try {
      const r = await fetch("/api/comm/call/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toNumber: phoneNumber,
          userPhone,
          contactName: contactName || lookupContact?.name,
          contactId: lookupContact?.id,
          useCallerIdSpoof: useCallerId && isVerified(userPhone),
        }),
      });
      if (r.ok) {
        setCallStatus("📱 Answer your phone!");
        setTimeout(() => { loadCalls(); setDialerOpen(false); setCallStatus(null); setPhoneNumber(""); setContactName(""); setLookupContact(null); }, 5000);
      } else {
        const e = await r.json();
        setCallStatus(`❌ ${e.error}`);
        setTimeout(() => setCallStatus(null), 3000);
      }
    } catch { setCallStatus("❌ Failed"); setTimeout(() => setCallStatus(null), 3000); }
    finally { setCalling(false); }
  };

  const saveToBrain = async (createNew = false) => {
    if (!selected) return;
    setSavingToBrain(true);
    setSaveStatus("Saving...");
    try {
      const r = await fetch("/api/comm/call/save-to-brain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callSessionId: selected.id,
          contactId: selected.contactId || lookupContact?.id,
          contactName: newContactName || contactName || selected.tags?.find(t => t.startsWith("contact:"))?.replace("contact:", ""),
          createNew,
        }),
      });
      if (r.ok) {
        const d = await r.json();
        setSaveStatus(d.action === "created" ? "✅ Created in Second Brain!" : "✅ Saved to Second Brain!");
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        const e = await r.json();
        setSaveStatus(`❌ ${e.error}`);
      }
    } catch { setSaveStatus("❌ Failed"); }
    finally { setSavingToBrain(false); }
  };

  const keys = ["1","2","3","4","5","6","7","8","9","*","0","#"];

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-zinc-800 rounded-lg">←</Link>
          <div>
            <h1 className="text-2xl font-bold">📞 Pulse Phone</h1>
            <p className="text-sm text-zinc-500">AI call tracking + Second Brain</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSettingsOpen(true)} className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg">⚙️</button>
          <button onClick={() => setDialerOpen(true)} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-medium">�� Call</button>
        </div>
      </header>

      {stats && (
        <div className="grid grid-cols-5 gap-3 mb-6">
          {[
            { l: "Total", v: stats.totalCalls, c: "text-white" },
            { l: "In", v: stats.inboundCalls, c: "text-green-400" },
            { l: "Out", v: stats.outboundCalls, c: "text-blue-400" },
            { l: "Missed", v: stats.missedCalls, c: "text-orange-400" },
            { l: "Done", v: stats.completedCalls, c: "text-emerald-400" },
          ].map(s => (
            <div key={s.l} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
              <div className={`text-2xl font-bold ${s.c}`}>{s.v}</div>
              <div className="text-xs text-zinc-500">{s.l}</div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-lg font-semibold text-zinc-300 mb-4">Recent Calls</h2>
          {loading ? <div className="text-center py-12 text-zinc-500">Loading...</div> :
           calls.length === 0 ? <div className="text-center py-12 bg-zinc-900/50 border border-zinc-800 rounded-2xl"><div className="text-4xl mb-3">📞</div><p className="text-zinc-400">No calls yet</p></div> :
           calls.map(call => (
            <div key={call.id} onClick={() => { setSelected(call); setSaveStatus(null); setNewContactName(""); }}
              className={`p-4 bg-zinc-900 border rounded-xl cursor-pointer hover:border-violet-500/50 ${selected?.id === call.id ? "border-violet-500" : "border-zinc-800"}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center">
                    {call.direction === "inbound" ? <span className="text-green-400">↙</span> : <span className="text-blue-400">↗</span>}
                  </div>
                  <div>
                    <div className="font-medium">{call.tags?.find(t => t.startsWith("contact:"))?.replace("contact:", "") || formatPhone(call.direction === "inbound" ? call.fromNumber : call.toNumber)}</div>
                    <div className="text-sm text-zinc-500">{formatPhone(call.direction === "inbound" ? call.fromNumber : call.toNumber)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-zinc-400">{formatTime(call.startedAt)}</div>
                  <div className="flex items-center gap-2 mt-1">
                    {call.durationSec ? <span className="text-xs text-zinc-500">{formatDuration(call.durationSec)}</span> : null}
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[call.status] || "bg-zinc-500/20 text-zinc-400"}`}>{call.status}</span>
                    {call.contactId && <span className="text-xs text-green-400">🧠</span>}
                  </div>
                </div>
              </div>
              {call.summaryShort && <div className="mt-3 text-sm text-zinc-400 border-t border-zinc-800 pt-3">{call.summaryShort}</div>}
            </div>
          ))}
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          {selected ? (
            <div className="space-y-5">
              <div className="text-center">
                <div className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center text-2xl mx-auto mb-2">
                  {selected.direction === "inbound" ? "↙" : "↗"}
                </div>
                <h2 className="text-lg font-bold">{selected.tags?.find(t => t.startsWith("contact:"))?.replace("contact:", "") || formatPhone(selected.toNumber)}</h2>
                <p className="text-sm text-zinc-500">{formatPhone(selected.toNumber)}</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[selected.status] || ""}`}>{selected.status}</span>
                  {selected.contactId && <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">🧠 In Brain</span>}
                </div>
              </div>

              <div className="text-sm space-y-2">
                <div className="flex justify-between py-1 border-b border-zinc-800">
                  <span className="text-zinc-500">Time</span>
                  <span>{new Date(selected.startedAt).toLocaleString()}</span>
                </div>
                {selected.durationSec ? <div className="flex justify-between py-1 border-b border-zinc-800">
                  <span className="text-zinc-500">Duration</span>
                  <span>{formatDuration(selected.durationSec)}</span>
                </div> : null}
                {selected.sentiment && <div className="flex justify-between py-1 border-b border-zinc-800">
                  <span className="text-zinc-500">Sentiment</span>
                  <span className={selected.sentiment === "positive" ? "text-green-400" : selected.sentiment === "negative" ? "text-red-400" : ""}>{selected.sentiment}</span>
                </div>}
              </div>

              {selected.transcriptText && (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-400 mb-2">Transcript</h3>
                  <div className="p-3 bg-zinc-800/50 rounded-lg text-sm max-h-32 overflow-y-auto">{selected.transcriptText}</div>
                </div>
              )}

              {selected.summaryDetailed && (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-400 mb-2">AI Summary</h3>
                  <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-lg text-sm">{selected.summaryDetailed}</div>
                </div>
              )}

              {selected.actionsJson?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-zinc-400 mb-2">Actions</h3>
                  {selected.actionsJson.map((a: any, i: number) => (
                    <div key={i} className="p-2 bg-zinc-800/50 rounded text-sm mb-1">
                      <span className={`text-xs px-1 py-0.5 rounded mr-2 ${a.priority === "high" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>{a.priority}</span>
                      {a.action}
                    </div>
                  ))}
                </div>
              )}

              {/* Save to Second Brain */}
              {(selected.transcriptText || selected.summaryShort) && !selected.contactId && (
                <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl">
                  <h3 className="font-semibold mb-2">💾 Save to Second Brain</h3>
                  <input
                    type="text"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    placeholder="Contact name"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm mb-2"
                  />
                  <button
                    onClick={() => saveToBrain(true)}
                    disabled={!newContactName.trim() || savingToBrain}
                    className="w-full py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-sm font-medium"
                  >
                    {savingToBrain ? "Saving..." : "🧠 Create Contact & Save"}
                  </button>
                </div>
              )}

              {selected.contactId && (selected.transcriptText || selected.summaryShort) && (
                <button
                  onClick={() => saveToBrain(false)}
                  disabled={savingToBrain}
                  className="w-full py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-sm font-medium"
                >
                  {savingToBrain ? "Saving..." : "🧠 Update Second Brain"}
                </button>
              )}

              {saveStatus && (
                <div className={`text-center text-sm py-2 rounded-lg ${saveStatus.includes("✅") ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                  {saveStatus}
                </div>
              )}

              <button
                onClick={() => { setPhoneNumber(selected.direction === "inbound" ? selected.fromNumber : selected.toNumber); setDialerOpen(true); }}
                className="w-full py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium"
              >
                📞 Call Back
              </button>
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-500">
              <div className="text-4xl mb-3">👆</div>
              <p>Select a call</p>
            </div>
          )}
        </div>
      </div>

      {/* Settings */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setSettingsOpen(false)}>
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-6">
              <h2 className="text-xl font-bold">Settings</h2>
              <button onClick={() => setSettingsOpen(false)} className="p-2 hover:bg-zinc-800 rounded-lg">✕</button>
            </div>
            <div className="mb-6">
              <label className="block text-sm text-zinc-400 mb-2">Your Phone</label>
              <input type="tel" value={userPhone} onChange={e => saveUserPhone(e.target.value)} placeholder="(555) 123-4567"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg" />
            </div>
            <div className="mb-6 p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl">
              <div className="flex justify-between mb-3">
                <div><h3 className="font-semibold">Caller ID</h3><p className="text-xs text-zinc-500">Show your # to recipients</p></div>
                {isVerified(userPhone) ? <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">✓</span> : <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full">Unverified</span>}
              </div>
              {!isVerified(userPhone) && <button onClick={verifyCallerId} disabled={verifying || !userPhone} className="w-full py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-lg text-sm">{verifying ? "..." : "Verify"}</button>}
              {verifyStatus && <p className="text-sm text-center mt-2 text-violet-300">{verifyStatus}</p>}
            </div>
            <div className="flex justify-between p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl">
              <div><h3 className="font-semibold">Show My #</h3><p className="text-xs text-zinc-500">Instead of Twilio</p></div>
              <button onClick={() => saveCallerIdPref(!useCallerId)} className={`w-12 h-6 rounded-full ${useCallerId ? "bg-green-500" : "bg-zinc-600"}`}>
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${useCallerId ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dialer */}
      {dialerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => !calling && setDialerOpen(false)}>
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Call</h2>
              <button onClick={() => !calling && setDialerOpen(false)} className="p-2 hover:bg-zinc-800 rounded-lg" disabled={calling}>✕</button>
            </div>

            {lookupContact ? (
              <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">🧠</div>
                  <div>
                    <div className="font-semibold text-green-400">{lookupContact.name}</div>
                    {lookupContact.company && <div className="text-sm text-zinc-400">{lookupContact.company}</div>}
                  </div>
                </div>
              </div>
            ) : lookingUp ? (
              <div className="mb-4 p-3 bg-zinc-800 rounded-lg text-sm text-zinc-400">🔍 Searching...</div>
            ) : phoneNumber.replace(/\D/g, "").length >= 10 ? (
              <div className="mb-4 p-3 bg-zinc-800 rounded-lg text-sm text-zinc-400">❓ Unknown - enter name below</div>
            ) : null}

            {userPhone && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${isVerified(userPhone) && useCallerId ? "bg-green-500/20 border border-green-500/30 text-green-400" : "bg-zinc-800 text-zinc-400"}`}>
                {isVerified(userPhone) && useCallerId ? `✓ Shows: ${formatPhone(userPhone)}` : "Shows: Twilio #"}
              </div>
            )}

            <input type="tel" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="Number"
              className="w-full text-center text-2xl font-mono bg-zinc-800 border border-zinc-700 rounded-xl p-4 mb-4" disabled={calling} />

            <input type="text" value={contactName} onChange={e => setContactName(e.target.value)}
              placeholder={lookupContact?.name || "Contact name"} className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm mb-4" disabled={calling} />

            {callStatus && <div className="mb-4 text-center py-3 bg-violet-500/20 border border-violet-500/30 rounded-lg text-violet-300 text-sm">{callStatus}</div>}

            <div className="grid grid-cols-3 gap-2 mb-4">
              {keys.map(k => <button key={k} onClick={() => setPhoneNumber(p => p + k)} className="py-3 text-lg font-semibold bg-zinc-800 hover:bg-zinc-700 rounded-xl" disabled={calling}>{k}</button>)}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setPhoneNumber(p => p.slice(0, -1))} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl" disabled={calling}>⌫</button>
              <button onClick={makeCall} disabled={!phoneNumber || !userPhone || calling} className="flex-1 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-xl font-medium">
                {calling ? "..." : "📞"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// Wrapper with Suspense for useSearchParams
export default function CallsPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </main>
    }>
      <CallsContent />
    </Suspense>
  );
}
