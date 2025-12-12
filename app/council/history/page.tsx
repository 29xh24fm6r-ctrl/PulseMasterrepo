// Council History Page
// app/council/history/page.tsx

"use client";

import { useState, useEffect } from "users";
import { Users, Calendar, MessageSquare } from "lucide-react";
import Link from "next/link";

export default function CouncilHistoryPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    try {
      const res = await fetch("/api/council/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading council history...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-violet-400" />
          <div>
            <h1 className="text-3xl font-bold text-white">Coach Council History</h1>
            <p className="text-sm text-zinc-400">
              View past sessions where multiple coaches collaborated
            </p>
          </div>
        </div>

        {/* Sessions List */}
        <div className="space-y-4">
          {sessions.length === 0 ? (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 text-center">
              <Users className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
              <p className="text-zinc-400">No council sessions yet</p>
              <p className="text-sm text-zinc-500 mt-2">
                Council sessions are created when multiple coaches collaborate on complex questions
              </p>
            </div>
          ) : (
            sessions.map((session) => (
              <Link
                key={session.id}
                href={`/council/sessions/${session.id}`}
                className="block bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-violet-500 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-violet-600/20 text-violet-400 rounded text-xs font-medium">
                        {session.council_mode.replace("_", " ").toUpperCase()}
                      </span>
                      <span className="text-sm text-zinc-400">
                        {session.primary_coach_id}
                      </span>
                    </div>
                    <div className="text-sm text-zinc-300 mb-2">
                      {session.trigger_reason.replace("_", " ")}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(session.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <MessageSquare className="w-5 h-5 text-zinc-400" />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}




