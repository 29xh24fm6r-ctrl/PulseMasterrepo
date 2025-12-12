"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, FileAudio, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";

export default function VoiceCoachPage() {
  const [uploading, setUploading] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setTranscript(null);
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append("audio", file);

      const res = await fetch("/api/coaches/voice/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");

      setTranscript(data.transcript);
      setAnalysis(data.analysis);
    } catch (err: any) {
      setError(err.message || "Failed to process audio");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <nav className="flex items-center gap-2 text-xs text-zinc-500 mb-3">
            <Link href="/coaches" className="hover:text-zinc-300 transition-colors">
              Coaches Corner
            </Link>
            <span>/</span>
            <span className="text-zinc-400">Voice Coach</span>
          </nav>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/coaches"
                className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-white">Voice Coach</h1>
                <p className="text-xs text-zinc-500">
                  Upload call recordings to get AI-powered coaching insights
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Section */}
          <div className="space-y-4">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileAudio className="w-5 h-5 text-violet-400" />
                Upload Recording
              </h2>
              <label className="block">
                <div className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center cursor-pointer hover:border-violet-500 transition-colors">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
                  <p className="text-sm text-zinc-400 mb-1">
                    {uploading ? "Processing..." : "Click to upload audio file"}
                  </p>
                  <p className="text-xs text-zinc-500">Supports: WebM, MP3, WAV</p>
                </div>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              {error && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-sm text-red-400">
                  {error}
                </div>
              )}
            </div>

            {/* Transcript */}
            {transcript && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <h3 className="font-semibold mb-3">Transcript</h3>
                <div className="text-sm text-zinc-300 whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {transcript}
                </div>
              </div>
            )}
          </div>

          {/* Analysis Results */}
          {analysis && (
            <div className="space-y-4">
              {/* Patterns */}
              {analysis.patterns && (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                    Conversation Patterns
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-zinc-400">Filler words:</span>{" "}
                      <span className="text-white">
                        {analysis.patterns.fillerWords?.join(", ") || "None detected"}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400">Interruptions:</span>{" "}
                      <span className="text-white">{analysis.patterns.interruptions || 0}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400">Pacing:</span>{" "}
                      <span className="text-white capitalize">
                        {analysis.patterns.averagePacing || "normal"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Sentiment */}
              {analysis.sentiment && (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                  <h3 className="font-semibold mb-3">Sentiment</h3>
                  <div className="text-sm">
                    <span className="text-zinc-400">Overall:</span>{" "}
                    <span className="text-white capitalize">{analysis.sentiment.overall}</span>
                  </div>
                </div>
              )}

              {/* Coaching Actions */}
              {analysis.coachingActions && analysis.coachingActions.length > 0 && (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-400" />
                    Coaching Actions
                  </h3>
                  <ul className="space-y-2">
                    {analysis.coachingActions.map((action: string, idx: number) => (
                      <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2">
                        <span className="text-orange-400 mt-1">•</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggested Drills */}
              {analysis.suggestedDrills && analysis.suggestedDrills.length > 0 && (
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    Suggested Drills
                  </h3>
                  <ul className="space-y-2">
                    {analysis.suggestedDrills.map((drill: string, idx: number) => (
                      <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2">
                        <span className="text-green-400 mt-1">•</span>
                        <span>{drill}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

