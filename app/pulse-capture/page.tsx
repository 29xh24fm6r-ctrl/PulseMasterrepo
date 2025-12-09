"use client";

import React, { useState } from "react";
import Link from "next/link";

type KnowledgeAnalysis = {
  summary: string;
  keyInsights: string[];
  actionableItems: string[];
  quotes: string[];
  tags: string[];
  relatedConcepts: string[];
  oneSentenceValue: string;
};

export default function PulseCapturePage() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [contentType, setContentType] = useState("YouTube");
  const [relatedTo, setRelatedTo] = useState("");
  
  const [processing, setProcessing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [analysis, setAnalysis] = useState<KnowledgeAnalysis | null>(null);
  
  const [activityLog, setActivityLog] = useState<string[]>([]);

  function pushLog(msg: string) {
    const stamp = new Date().toLocaleTimeString();
    setActivityLog((prev) => [`${stamp} — ${msg}`, ...prev].slice(0, 20));
  }

  async function handleYouTubeProcess() {
    if (!youtubeUrl) {
      pushLog("❌ Enter YouTube URL");
      return;
    }

    setProcessing(true);
    setTitle("");
    setTranscript("");
    setAnalysis(null);
    pushLog("🎥 Processing YouTube video...");
    pushLog("📝 Trying transcript method first (faster & more reliable)...");

    try {
      // Try transcript method first (faster, no download)
      const transcriptRes = await fetch("/api/pulse-capture/youtube-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeUrl }),
      });

      const transcriptData = await transcriptRes.json();

      if (transcriptData.ok) {
        // Transcript method worked!
        setTitle(transcriptData.title);
        setDuration(transcriptData.duration);
        setTranscript(transcriptData.transcript);
        setContentType("YouTube");
        pushLog(`✅ Transcript fetched: ${transcriptData.title}`);
        await analyzeContent(transcriptData.transcript, transcriptData.title, "YouTube");
        return;
      }

      // Transcript failed, try download method
      pushLog("⚠️ No transcript available, trying audio download...");
      
      const downloadRes = await fetch("/api/pulse-capture/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeUrl }),
      });

      const downloadData = await downloadRes.json();

      if (downloadData.ok) {
        setTitle(downloadData.title);
        setDuration(downloadData.duration);
        setTranscript(downloadData.transcript);
        setContentType("YouTube");
        pushLog(`✅ Audio processed: ${downloadData.title}`);
        await analyzeContent(downloadData.transcript, downloadData.title, "YouTube");
      } else {
        pushLog(`❌ ${downloadData.error}`);
        pushLog("💡 Try uploading an audio file instead!");
      }
    } catch (err) {
      pushLog("❌ Processing failed");
      pushLog("💡 Try uploading an audio file instead!");
    } finally {
      setProcessing(false);
    }
  }

  async function handleAudioTranscribe() {
    if (!audioFile) {
      pushLog("❌ Select audio file");
      return;
    }

    setProcessing(true);
    setTranscript("");
    setAnalysis(null);
    pushLog("🎤 Transcribing audio...");

    try {
      const formData = new FormData();
      formData.append("audio", audioFile);

      const res = await fetch("/api/pulse-listen/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.ok) {
        setTitle(audioFile.name.replace(/\.[^/.]+$/, ""));
        setDuration(Math.floor((data.duration || 0) / 60));
        setTranscript(data.transcript);
        setContentType("Podcast");
        pushLog(`✅ Transcribed ${data.duration?.toFixed(0)}s`);
        await analyzeContent(data.transcript, audioFile.name, "Podcast");
      } else {
        pushLog("❌ Transcription failed");
      }
    } catch (err) {
      pushLog("❌ Transcription failed");
    } finally {
      setProcessing(false);
    }
  }

  async function analyzeContent(transcriptText: string, titleText: string, type: string) {
    setAnalyzing(true);
    pushLog("🧠 Analyzing...");

    try {
      const res = await fetch("/api/pulse-capture/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: transcriptText, title: titleText, type }),
      });

      const data = await res.json();

      if (data.ok) {
        setAnalysis(data.analysis);
        pushLog("✅ Analysis complete!");
      } else {
        pushLog("❌ Analysis failed");
      }
    } catch (err) {
      pushLog("❌ Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSaveToNotion() {
    if (!analysis || !title) {
      pushLog("❌ Nothing to save");
      return;
    }

    setSaving(true);
    pushLog("💾 Saving to Knowledge Base...");

    try {
      const res = await fetch("/api/pulse-capture/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          type: contentType,
          sourceUrl: youtubeUrl || null,
          summary: analysis.summary,
          keyInsights: analysis.keyInsights,
          actionableItems: analysis.actionableItems,
          quotes: analysis.quotes,
          tags: analysis.tags,
          transcript,
          duration,
          relatedTo: relatedTo || null,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        pushLog("✅ Saved to Notion!");
        setYoutubeUrl("");
        setAudioFile(null);
        setTranscript("");
        setAnalysis(null);
        setTitle("");
      } else {
        pushLog("❌ Save failed");
      }
    } catch (err) {
      pushLog("❌ Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">📚 Pulse Capture - Knowledge Extraction</h1>
          <p className="text-slate-400 text-sm">Learn from YouTube, Podcasts, and Audio</p>
        </div>
        <Link href="/" className="px-4 py-2 bg-slate-800 text-slate-200 font-semibold rounded-xl hover:bg-slate-700">
          ← Back to Dashboard
        </Link>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <section className="bg-gradient-to-br from-red-900/20 to-pink-900/20 border border-red-500/30 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">🎥 YouTube Video</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">YouTube URL</label>
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm"
                />
              </div>
              <button
                onClick={handleYouTubeProcess}
                disabled={!youtubeUrl || processing}
                className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold rounded-xl hover:from-red-400 hover:to-pink-400 disabled:opacity-40"
              >
                {processing ? "🎥 Processing..." : "🎥 Try YouTube (or use audio below)"}
              </button>
            </div>
          </section>

          <section className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-2">🎙️ Podcast / Audio File</h2>
            <p className="text-xs text-purple-300 mb-4">✨ Most reliable method - works 100% of the time!</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Upload Audio (MP3, WAV, M4A)</label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm"
                />
              </div>
              <button
                onClick={handleAudioTranscribe}
                disabled={!audioFile || processing}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-xl hover:from-purple-400 hover:to-blue-400 disabled:opacity-40"
              >
                {processing ? "🎤 Transcribing..." : "🎤 Transcribe Audio"}
              </button>
            </div>
          </section>

          {(title || analysis) && (
            <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4">📝 Metadata</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Related To (Optional)</label>
                  <input
                    type="text"
                    value={relatedTo}
                    onChange={(e) => setRelatedTo(e.target.value)}
                    placeholder="e.g., Marcus Chen, TechFlow deal"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm"
                  />
                </div>
                {analysis && (
                  <button
                    onClick={handleSaveToNotion}
                    disabled={saving}
                    className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-green-400 hover:to-emerald-400 disabled:opacity-40"
                  >
                    {saving ? "💾 Saving..." : "💾 Save to Knowledge Base"}
                  </button>
                )}
              </div>
            </section>
          )}

          <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold uppercase text-slate-300">Activity Log</h3>
              <button onClick={() => setActivityLog([])} className="text-xs px-2 py-1 rounded border border-slate-700">Clear</button>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1 text-[11px]">
              {activityLog.length === 0 && <div className="text-slate-500">No activity yet</div>}
              {activityLog.map((line, idx) => (
                <div key={idx} className="text-slate-400">{line}</div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {!analysis && !analyzing && (
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold mb-2">Ready to Capture Knowledge</h3>
              <p className="text-slate-400 text-sm">Process a YouTube video or upload audio to extract insights</p>
            </div>
          )}

          {analyzing && (
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4 animate-pulse">🧠</div>
              <h3 className="text-xl font-semibold mb-2">AI Analyzing Content...</h3>
              <p className="text-slate-400 text-sm">Extracting key insights and actionable intelligence</p>
            </div>
          )}

          {analysis && (
            <>
              <section className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 rounded-2xl p-6">
                <h2 className="text-sm font-semibold uppercase text-cyan-300 mb-3">💎 Core Value</h2>
                <div className="text-lg text-slate-200 italic">{analysis.oneSentenceValue}</div>
              </section>

              <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold uppercase text-slate-300 mb-3">📋 Summary</h3>
                <div className="text-sm text-slate-300">{analysis.summary}</div>
              </section>

              <section className="bg-purple-900/20 border border-purple-500/30 rounded-2xl p-6">
                <h3 className="text-sm font-semibold uppercase text-purple-300 mb-3">💡 Key Insights</h3>
                <div className="space-y-2">
                  {analysis.keyInsights.map((insight, idx) => (
                    <div key={idx} className="text-sm text-slate-300">• {insight}</div>
                  ))}
                </div>
              </section>

              <section className="bg-green-900/20 border border-green-500/30 rounded-2xl p-6">
                <h3 className="text-sm font-semibold uppercase text-green-300 mb-3">🎯 Actionable Items</h3>
                <div className="space-y-2">
                  {analysis.actionableItems.map((item, idx) => (
                    <div key={idx} className="text-sm text-slate-300">{idx + 1}. {item}</div>
                  ))}
                </div>
              </section>

              {analysis.quotes.length > 0 && (
                <section className="bg-yellow-900/20 border border-yellow-500/30 rounded-2xl p-6">
                  <h3 className="text-sm font-semibold uppercase text-yellow-300 mb-3">💬 Best Quotes</h3>
                  <div className="space-y-3">
                    {analysis.quotes.map((quote, idx) => (
                      <div key={idx} className="text-sm text-slate-300 italic border-l-2 border-yellow-500 pl-3">"{quote}"</div>
                    ))}
                  </div>
                </section>
              )}

              <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold uppercase text-slate-300 mb-3">🏷️ Topics</h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.tags.map((tag, idx) => (
                    <span key={idx} className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-full text-xs text-slate-300">
                      {tag}
                    </span>
                  ))}
                </div>
              </section>

              {analysis.relatedConcepts.length > 0 && (
                <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-sm font-semibold uppercase text-slate-300 mb-3">🔗 Related Concepts</h3>
                  <div className="space-y-1">
                    {analysis.relatedConcepts.map((concept, idx) => (
                      <div key={idx} className="text-sm text-slate-400">• {concept}</div>
                    ))}
                  </div>
                </section>
              )}

              {transcript && (
                <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
                  <h3 className="text-sm font-semibold uppercase text-slate-300 mb-3">📝 Transcript</h3>
                  <div className="max-h-64 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg p-4">
                    <div className="text-xs text-slate-400 whitespace-pre-wrap font-mono">{transcript}</div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}