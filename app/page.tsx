"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock, Send, Loader2, AlertCircle } from "lucide-react";
import { GlobalNav } from "@/components/GlobalNav";
import ExecutionTimeline from "@/components/tasks/ExecutionTimeline";
import XpStreakCard from "@/components/xp/XpStreakCard";
import DailyQuestsCard from "@/components/quests/DailyQuestsCard";

// Types matching /api/today response
type DashboardData = {
  handling: Array<{ id: string; title: string; ts?: string; description?: string }>;
  needs_attention: Array<{ id: string; title: string; kind: string; description?: string; href?: string; severity?: string }>;
};

export default function HomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Capture state
  const [captureText, setCaptureText] = useState("");
  const [isCapturing, setIsCapturing] = useState(false);

  // Initial Fetch
  useEffect(() => {
    fetch("/api/today")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load dashboard data");
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Pulse is offline. Check your connection.");
        setLoading(false);
      });
  }, []);

  // Quick Capture Handler
  const handleCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captureText.trim()) return;

    setIsCapturing(true);
    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: captureText }),
      });
      if (!res.ok) throw new Error("Capture failed");

      setCaptureText("");
      // Ideally show a toast here
    } catch (err) {
      console.error(err);
      alert("Failed to capture item. Please try again.");
    } finally {
      setIsCapturing(false);
    }
  };

  // Render Loading
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  // Render Error
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-black text-white p-4 text-center">
        <div className="max-w-md space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h1 className="text-xl font-bold">System Error</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-cyan-900">
      <GlobalNav />

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-12">

        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Pulse Dashboard
          </h1>
          <p className="text-gray-400">Everything is under control.</p>
        </header>

        <div className="grid gap-8 md:grid-cols-2">

          {/* SECTION 1: What Pulse Is Handling */}
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Pulse Is Handling
            </h2>

            <div className="space-y-3">
              {data?.handling.map((item) => (
                <div key={item.id} className="p-4 rounded-xl bg-gray-900/50 border border-gray-800 flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-green-500" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-200">{item.title}</p>
                    {item.ts && (
                      <p className="text-xs text-gray-500">
                        {new Date(item.ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 2: What Needs You */}
          <section className="space-y-4">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Needs Your Attention
            </h2>

            <div className="space-y-3">
              {data?.needs_attention.length === 0 ? (
                <p className="text-gray-500 text-sm">All clear! Nothing needs review.</p>
              ) : (
                data?.needs_attention.map((item) => (
                  <div key={item.id} className="p-4 rounded-xl bg-gray-900 border border-gray-800 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        {item.description && <p className="text-xs text-gray-400 mt-1">{item.description}</p>}
                      </div>
                      <span className="text-[10px] bg-gray-800 px-2 py-0.5 rounded text-gray-400 uppercase whitespace-nowrap ml-2">
                        {item.kind}
                      </span>
                    </div>
                    {/* @ts-ignore */}
                    {item.href ? (
                      <div className="flex gap-2">
                        {/* @ts-ignore */}
                        <a href={item.href} className="flex-1 py-1.5 text-xs font-medium bg-cyan-900/30 text-cyan-400 rounded hover:bg-cyan-900/50 transition text-center">
                          Review
                        </a>
                      </div>
                    ) : (
                      null
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* SECTION 2.2: Execution Timeline */}
          <section className="md:col-span-2 space-y-4">
            <XpStreakCard />
            <DailyQuestsCard />
            <ExecutionTimeline />
          </section>

        </div>

        {/* SECTION 2.5: Recent Activity */}
        <section>
          <RecentActivity />
        </section>

        {/* SECTION 3: Quick Capture */}
        <section className="pt-8 border-t border-gray-800">
          <form onSubmit={handleCapture} className="relative">
            <input
              type="text"
              value={captureText}
              onChange={(e) => setCaptureText(e.target.value)}
              placeholder="Quick capture..."
              disabled={isCapturing}
              className="w-full bg-gray-900/50 text-white placeholder:text-gray-600 rounded-full py-4 pl-6 pr-14 border border-gray-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!captureText.trim() || isCapturing}
              className="absolute right-2 top-2 bottom-2 aspect-square rounded-full bg-cyan-500 text-black flex items-center justify-center hover:bg-cyan-400 disabled:opacity-0 transition-all transform active:scale-95"
            >
              {isCapturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
          <p className="text-center text-xs text-gray-600 mt-3">
            Press Enter to save to your second brain
          </p>
        </section>

      </main>
    </div>
  );
}

function RecentActivity() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const r = await fetch("/api/activity/recent?limit=10", { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) throw new Error(j.detail || j.error || "Failed to load activity");
      setItems(j.items ?? []);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-gray-200">Recent Activity</div>
        <button
          onClick={load}
          className="text-xs opacity-80 hover:opacity-100 underline text-cyan-400"
        >
          Refresh
        </button>
      </div>

      {loading && <div className="text-sm opacity-80 text-gray-500">Loading…</div>}

      {err && (
        <div className="text-sm">
          <div className="opacity-90 text-red-400">Failed to load: {err}</div>
        </div>
      )}

      {!loading && !err && items.length === 0 && (
        <div className="text-sm opacity-80 text-gray-500">No activity yet.</div>
      )}

      {!loading && !err && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((x) => (
            <li key={x.id} className="text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-gray-300">{x.title}</div>
                  {x.detail ? <div className="opacity-80 truncate text-gray-500">{x.detail}</div> : null}
                </div>
                <div className="text-xs opacity-60 whitespace-nowrap text-gray-600">
                  {new Date(x.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
