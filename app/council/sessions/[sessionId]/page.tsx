// Council Session Details Page
// app/council/sessions/[sessionId]/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Users, ArrowLeft, MessageSquare } from "lucide-react";
import Link from "next/link";

export default function CouncilSessionPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [session, setSession] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [deliberations, setDeliberations] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  async function loadSession() {
    try {
      const res = await fetch(`/api/council/sessions/${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        setMembers(data.members || []);
        setDeliberations(data.deliberations || []);
        setSummary(data.summary);
      }
    } catch (err) {
      console.error("Failed to load session:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading session...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Session not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href="/council/history"
            className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Users className="w-8 h-8 text-violet-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Council Session</h1>
            <p className="text-sm text-zinc-400">
              {session.council_mode.replace("_", " ").toUpperCase()} • {session.primary_coach_id}
            </p>
          </div>
        </div>

        {/* Final Answer */}
        {summary && (
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Final Answer</h2>
            <div className="text-zinc-300 whitespace-pre-wrap">{summary.final_answer}</div>
          </section>
        )}

        {/* Council Insights */}
        {summary?.summary_json?.by_coach && (
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Council Insights</h2>
            <div className="space-y-4">
              {summary.summary_json.by_coach.map((coach: any, idx: number) => (
                <div key={idx} className="border-l-2 border-violet-500 pl-4">
                  <div className="font-semibold text-white mb-1">
                    {coach.coach_id} • {coach.short_role}
                  </div>
                  <div className="text-sm text-zinc-400 mb-2">{coach.key_contribution}</div>
                  {coach.focus && coach.focus.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {coach.focus.map((f: string, i: number) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded text-xs"
                        >
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Deliberations */}
        {deliberations.length > 0 && (
          <section className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Individual Analyses</h2>
            <div className="space-y-4">
              {deliberations.map((delib, idx) => (
                <div key={idx} className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="font-semibold text-white mb-2">{delib.coach_id}</div>
                  {delib.content && (
                    <div className="space-y-2 text-sm text-zinc-300">
                      {delib.content.analysis && (
                        <div>
                          <div className="text-zinc-400 mb-1">Analysis:</div>
                          <div>{delib.content.analysis}</div>
                        </div>
                      )}
                      {delib.content.key_concerns && delib.content.key_concerns.length > 0 && (
                        <div>
                          <div className="text-zinc-400 mb-1">Key Concerns:</div>
                          <ul className="list-disc list-inside">
                            {delib.content.key_concerns.map((c: string, i: number) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {delib.content.recommended_steps && delib.content.recommended_steps.length > 0 && (
                        <div>
                          <div className="text-zinc-400 mb-1">Recommended Steps:</div>
                          <ul className="list-disc list-inside">
                            {delib.content.recommended_steps.map((s: string, i: number) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}




