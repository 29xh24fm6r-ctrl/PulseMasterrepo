"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, TrendingUp, ChevronRight, Loader2, Search } from "lucide-react";

type Contact = {
  id: string;
  name?: string;
  full_name?: string;
  email?: string;
  company?: string;
  last_contacted_at?: string;
};

export default function ContactsLandingPage() {
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Contact[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/contacts");
        const data = await res.json();
        setItems(data.contacts || data.items || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = items.filter((c) => {
    const name = (c.name || c.full_name || "").toLowerCase();
    const email = (c.email || "").toLowerCase();
    const company = (c.company || "").toLowerCase();
    const qq = q.toLowerCase().trim();
    if (!qq) return true;
    return name.includes(qq) || email.includes(qq) || company.includes(qq);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl">
              <Users className="w-7 h-7 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Contacts</h1>
              <p className="text-zinc-400">Your network, organized. Scoring + follow-ups + relationships.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href="/contacts/scoring"
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              Scoring
            </Link>
            <Link
              href="/relationships"
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              Relationships <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center gap-3">
          <Search className="w-4 h-4 text-zinc-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, email, company…"
            className="w-full bg-transparent outline-none text-sm"
          />
          <div className="text-xs text-zinc-500">{filtered.length} shown</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((c) => {
            const name = c.name || c.full_name || "Unnamed Contact";
            return (
              <div key={c.id} className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold">{name}</div>
                    <div className="text-xs text-zinc-400">
                      {(c.company || "—")} • {(c.email || "—")}
                    </div>
                  </div>
                  <Link
                    href={`/relationships/${c.id}`}
                    className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    Open <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center text-zinc-500 py-12 col-span-full">
              No contacts found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
