"use client";
import { VoiceOverlay } from "@/components/VoiceOverlay";

import React, { useState, useEffect } from "react";
import { CoachModal } from "@/app/components/coach-modal";
import Link from "next/link";

type Person = {
  id: string;
  name: string;
  company: string;
};

type CallAnalysis = {
  performanceScore: number;
  whatWentWell: string[];
  criticalMistakes: Array<{
    quote: string;
    why: string;
    shouldHaveSaid: string;
  }>;
  missedOpportunities: string[];
  talkRatio: string;
  objectionHandling: string;
  nextBestActions: string[];
  followUpMessage: string;
  keyInsights: string;
  coachBrutalTruth: string;
};

export default function CallCoachPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string>("");
  const [dealName, setDealName] = useState<string>("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [transcribing, setTranscribing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<CallAnalysis | null>(null);
  const [activityLog, setActivityLog] = useState<string[]>([]);

  function pushLog(msg: string) {
    const stamp = new Date().toLocaleTimeString();
    setActivityLog((prev) => [`${stamp} — ${msg}`, ...prev].slice(0, 20));
  }

  useEffect(() => {
    loadPeople();
  }, []);

  async function loadPeople() {
    try {
      const res = await fetch("/api/second-brain/pull");
      if (!res.ok) return;
      const data = await res.json();
      setPeople(data.people ?? []);
    } catch (err) {
      console.error("Failed to load people:", err);
    }
  }

  async function handleTranscribe() {
    if (!audioFile) {
      pushLog("❌ No audio file selected");
      return;
    }

    setTranscribing(true);
    setTranscript("");
    pushLog("🎤 Transcribing audio with Whisper...");

    try {
      const formData = new FormData();
      formData.append("audio", audioFile);

      const res = await fetch("/api/pulse-listen/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.ok) {
        setTranscript(data.transcript);
        pushLog(`✅ Transcribed ${data.duration?.toFixed(0)}s of audio`);
      } else {
        pushLog("❌ Transcription failed");
      }
    } catch (err) {
      pushLog("❌ Transcription failed");
    } finally {
      setTranscribing(false);
    }
  }

  async function handleAnalyze() {
    if (!transcript) {
      pushLog("❌ No transcript to analyze");
      return;
    }

    setAnalyzing(true);
    setAnalysis(null);
    pushLog("🧠 AI analyzing call performance...");

    try {
      const res = await fetch("/api/pulse-listen/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          personId: selectedPersonId || null,
          dealName: dealName || null,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setAnalysis(data.analysis);
        pushLog(`✅ Analysis complete! Score: ${data.analysis.performanceScore}/100`);
      } else {
        pushLog("❌ Analysis failed");
      }
    } catch (err) {
      pushLog("❌ Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  function getScoreColor(score: number): string {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  }

  function getScoreLabel(score: number): string {
    if (score >= 90) return "🔥 LEGENDARY";
    if (score >= 80) return "💪 EXCELLENT";
    if (score >= 70) return "✅ GOOD";
    if (score >= 60) return "⚠️ NEEDS WORK";
    return "❌ CRITICAL";
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">🎤 Pulse Listen - Call Coach</h1>
          <p className="text-slate-400 text-sm">AI-Powered Call Analysis & Coaching</p>
        </div>
        <Link
          href="/"
          className="px-4 py-2 bg-slate-800 text-slate-200 font-semibold rounded-xl hover:bg-slate-700"
        >
          ← Back to Dashboard
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN - UPLOAD & TRANSCRIPT */}
        <div className="space-y-6">
          {/* Upload Section */}
          <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">📁 Upload Call Recording</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Select Audio File (MP3, WAV, M4A)</label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Link to Person (Optional)</label>
                <select
                  value={selectedPersonId}
                  onChange={(e) => setSelectedPersonId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm"
                >
                  <option value="">Select person...</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {p.company}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-2">Deal Name (Optional)</label>
                <input
                  type="text"
                  value={dealName}
                  onChange={(e) => setDealName(e.target.value)}
                  placeholder="e.g., TechFlow Solutions - $24K"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm"
                />
              </div>

              <button
                onClick={handleTranscribe}
                disabled={!audioFile || transcribing}
                className="w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:from-cyan-400 hover:to-blue-400 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {transcribing ? "🎤 Transcribing..." : "🎤 Transcribe with Whisper"}
              </button>
            </div>
          </section>

          {/* Transcript Section */}
          <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">📝 Transcript</h2>
            
            {!transcript && (
              <div className="text-sm text-slate-500 text-center py-8">
                Upload an audio file and transcribe, or paste a transcript below
              </div>
            )}

            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste transcript here or transcribe audio above..."
              className="w-full h-64 px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm font-mono resize-none"
            />

            <button
              onClick={handleAnalyze}
              disabled={!transcript || analyzing}
              className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-400 hover:to-pink-400 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {analyzing ? "🧠 Analyzing..." : "🧠 Analyze Call with AI"}
            </button>
          </section>

          {/* Activity Log */}
          <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold uppercase text-slate-300">Activity Log</h3>
              <button onClick={() => setActivityLog([])} className="text-xs px-2 py-1 rounded border border-slate-700 hover:border-slate-500">
                Clear
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1 text-[11px]">
              {activityLog.length === 0 && <div className="text-slate-500">No activity yet</div>}
              {activityLog.map((line, idx) => (
                <div key={idx} className="text-slate-400">{line}</div>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN - ANALYSIS */}
        <div className="space-y-6">
          {!analysis && (
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4">🎤</div>
              <h3 className="text-xl font-semibold mb-2">Ready to Coach You</h3>
              <p className="text-slate-400 text-sm">Upload a call recording or paste a transcript to get started</p>
            </div>
          )}

          {analysis && (
            <>
              {/* Performance Score */}
              <section className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl p-6">
                <h2 className="text-sm font-semibold uppercase text-purple-300 mb-4">📊 Performance Score</h2>
                <div className="flex items-center justify-center gap-6">
                  <div className="text-center">
                    <div className={`text-6xl font-bold ${getScoreColor(analysis.performanceScore)}`}>
                      {analysis.performanceScore}
                    </div>
                    <div className="text-sm text-slate-400 mt-2">out of 100</div>
                  </div>
                  <div className="text-2xl">{getScoreLabel(analysis.performanceScore)}</div>
                </div>
              </section>

              {/* What Went Well */}
              <section className="bg-green-900/20 border border-green-500/30 rounded-2xl p-6">
                <h3 className="text-sm font-semibold uppercase text-green-300 mb-3">✅ What Went Well</h3>
                <div className="space-y-2">
                  {analysis.whatWentWell.map((item, idx) => (
                    <div key={idx} className="text-sm text-slate-300">• {item}</div>
                  ))}
                </div>
              </section>

              {/* Critical Mistakes */}
              {analysis.criticalMistakes.length > 0 && (
                <section className="bg-red-900/20 border border-red-500/30 rounded-2xl p-6">
                  <h3 className="text-sm font-semibold uppercase text-red-300 mb-3">❌ Critical Mistakes</h3>
                  <div className="space-y-4">
                    {analysis.criticalMistakes.map((mistake, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="text-sm text-red-200 italic">"{mistake.quote}"</div>
                        <div className="text-xs text-slate-400">❌ Why: {mistake.why}</div>
                        <div className="text-xs text-green-300">✅ Should have said: {mistake.shouldHaveSaid}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Missed Opportunities */}
              <section className="bg-yellow-900/20 border border-yellow-500/30 rounded-2xl p-6">
                <h3 className="text-sm font-semibold uppercase text-yellow-300 mb-3">💡 Missed Opportunities</h3>
                <div className="space-y-2">
                  {analysis.missedOpportunities.map((item, idx) => (
                    <div key={idx} className="text-sm text-slate-300">• {item}</div>
                  ))}
                </div>
              </section>

              {/* Talk Ratio */}
              <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold uppercase text-slate-300 mb-3">🗣️ Talk Ratio Analysis</h3>
                <div className="text-sm text-slate-300">{analysis.talkRatio}</div>
              </section>

              {/* Next Best Actions */}
              <section className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-6">
                <h3 className="text-sm font-semibold uppercase text-blue-300 mb-3">🎯 Next Best Actions</h3>
                <div className="space-y-2">
                  {analysis.nextBestActions.map((action, idx) => (
                    <div key={idx} className="text-sm text-slate-300">{idx + 1}. {action}</div>
                  ))}
                </div>
              </section>

              {/* Follow-Up Message */}
              <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold uppercase text-slate-300 mb-3">✉️ Follow-Up Message</h3>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
                  <pre className="text-sm text-slate-300 whitespace-pre-wrap font-sans">{analysis.followUpMessage}</pre>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(analysis.followUpMessage);
                    pushLog("📋 Follow-up message copied!");
                  }}
                  className="mt-3 px-4 py-2 bg-cyan-500 text-slate-950 font-semibold rounded-xl hover:bg-cyan-400 text-sm"
                >
                  📋 Copy Message
                </button>
              </section>

              {/* Coach's Brutal Truth */}
              <section className="bg-gradient-to-br from-red-900/30 to-orange-900/30 border border-red-500/30 rounded-2xl p-6">
                <h3 className="text-sm font-semibold uppercase text-red-300 mb-3">💥 Coach's Brutal Truth</h3>
                <div className="text-sm text-slate-200 italic">{analysis.coachBrutalTruth}</div>
              </section>
            </>
          )}
        </div>
      </div>
      {/* Coach Modal */}
      <CoachModal
        coach="call-coach"
        coachName="Call Coach"
        coachIcon="📞"
        coachDescription="Prepare and debrief your calls"
      />
    </main>
  );
}