"use client";
import { OracleVoice } from "@/components/OracleVoice";
import React, { useState, useEffect } from "react";
import Link from "next/link";

interface Contact { id: string; name: string; email?: string; phone?: string; company?: string; title?: string; relationship?: string; status?: string; lastContact?: string; notes?: string; }
interface IntelResult { summary: string; insights: string[]; suggestedActions: string[]; talkingPoints: string[]; relationshipHealth: string; nextBestAction: string; }

export default function OraclePage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [intel, setIntel] = useState<IntelResult | null>(null);
  const [generatingIntel, setGeneratingIntel] = useState(false);
  const [query, setQuery] = useState("");
  const [askingOracle, setAskingOracle] = useState(false);
  const [oracleResponse, setOracleResponse] = useState<string | null>(null);

  useEffect(() => { fetch("/api/contacts").then(r => r.json()).then(d => setContacts(d.contacts || [])).finally(() => setLoading(false)); }, []);

  const generateIntel = async (contact: Contact) => {
    setSelectedContact(contact); setIntel(null); setGeneratingIntel(true);
    try {
      const res = await fetch("/api/oracle/intel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contactId: contact.id, contact }) });
      if (res.ok) setIntel((await res.json()).intel);
    } catch (e) { console.error(e); }
    finally { setGeneratingIntel(false); }
  };

  const askOracle = async () => {
    if (!query.trim()) return; setAskingOracle(true); setOracleResponse(null);
    try {
      const res = await fetch("/api/oracle/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, contacts }) });
      if (res.ok) setOracleResponse((await res.json()).response);
    } catch (e) { console.error(e); }
    finally { setAskingOracle(false); }
  };  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6">
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-3xl">🔮</Link>
          <div><h1 className="text-2xl font-bold text-violet-400">Oracle</h1><p className="text-sm text-zinc-500">AI-powered relationship intelligence</p></div>
        </div>
        <div className="flex gap-2">
          <Link href="/second-brain" className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg">🧠 Second Brain</Link>
          <Link href="/" className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg">🏠 Dashboard</Link>
        </div>
      </header>

      <div className="mb-8 p-6 bg-gradient-to-r from-violet-900/30 to-purple-900/30 border border-violet-500/30 rounded-2xl">
        <h2 className="text-lg font-semibold mb-3">🔮 Ask the Oracle</h2>
        <div className="flex gap-3">
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && askOracle()} placeholder="Who should I follow up with?" className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl" />
          <button onClick={askOracle} disabled={askingOracle || !query.trim()} className="px-6 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl">{askingOracle ? "..." : "Ask"}</button>
        </div>
        {oracleResponse && <div className="mt-4 p-4 bg-zinc-900/50 border border-violet-500/20 rounded-xl whitespace-pre-wrap">{oracleResponse}</div>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-zinc-300 mb-4">Select Contact</h2>
          {loading ? <p className="text-zinc-500">Loading...</p> : contacts.length === 0 ? <p className="text-zinc-500">No contacts</p> : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {contacts.map((c) => (
                <button key={c.id} onClick={() => generateIntel(c)} className={"w-full p-3 text-left rounded-xl " + (selectedContact?.id === c.id ? "bg-violet-600/30 border border-violet-500" : "bg-zinc-900 border border-zinc-800")}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-500/20 rounded-full flex items-center justify-center text-violet-400 font-bold">{c.name?.charAt(0)}</div>
                    <div><div className="font-medium">{c.name}</div>{c.company && <div className="text-sm text-zinc-500">{c.company}</div>}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          {generatingIntel ? (
            <div className="text-center py-12"><div className="text-4xl mb-4 animate-pulse">🔮</div><p className="text-zinc-400">Generating intel...</p></div>
          ) : intel && selectedContact ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4 pb-4 border-b border-zinc-800">
                <div className="w-16 h-16 bg-violet-500/20 rounded-full flex items-center justify-center text-2xl text-violet-400 font-bold">{selectedContact.name?.charAt(0)}</div>
                <div><h2 className="text-xl font-bold">{selectedContact.name}</h2><p className="text-zinc-500">{selectedContact.title} {selectedContact.company && "at " + selectedContact.company}</p></div>
              </div>
              <div className="p-4 bg-violet-900/20 border border-violet-500/20 rounded-xl"><h3 className="text-sm font-semibold text-violet-400 mb-2">Relationship Health</h3><p>{intel.relationshipHealth}</p></div>
              <div><h3 className="text-sm font-semibold text-zinc-400 mb-2">Summary</h3><p>{intel.summary}</p></div>
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl"><h3 className="text-sm font-semibold text-green-400 mb-2">🎯 Next Best Action</h3><p>{intel.nextBestAction}</p></div>
              {intel.insights?.length > 0 && <div><h3 className="text-sm font-semibold text-zinc-400 mb-2">💡 Insights</h3><ul className="space-y-1">{intel.insights.map((i,x) => <li key={x}>• {i}</li>)}</ul></div>}
              {intel.talkingPoints?.length > 0 && <div><h3 className="text-sm font-semibold text-zinc-400 mb-2">💬 Talking Points</h3><ul className="space-y-1">{intel.talkingPoints.map((t,x) => <li key={x}>→ {t}</li>)}</ul></div>}
              <div className="flex gap-3 pt-4 border-t border-zinc-800">
                <Link href={"/calls?phone=" + selectedContact.phone} className="flex-1 py-2 text-center bg-green-600/20 text-green-400 rounded-lg">📞 Call</Link>
                <button className="flex-1 py-2 bg-blue-600/20 text-blue-400 rounded-lg">✉️ Email</button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-500"><div className="text-4xl mb-4">🔮</div><p>Select a contact for AI intel</p></div>
          )}
        </div>
      </div>
    </main>
  );
}