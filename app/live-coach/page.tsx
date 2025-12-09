"use client";
import { VoiceOverlay } from "@/components/VoiceOverlay";

import { CoachModal } from "@/app/components/coach-modal";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

type Person = {
  id: string;
  name: string;
  company: string;
};

type LiveAnalysis = {
  controlAssessment: string;
  immediateActions: string[];
  openEndedQuestions: string[];
  objectionHandling: {
    detected: string;
    response: string;
    followUp: string;
  };
  controlTactics: string[];
  goingWell: string[];
  criticalMistakes: string[];
  redFlags: string[];
  buyingSignals: string[];
  talkRatio: string;
  talkRatioComment: string;
  conversationStage: string;
  stageAction: string;
  keyInformation: string[];
  actionItems: string[];
  next30Seconds: string;
};

type CallSummary = {
  executiveSummary: string;
  keyPoints: string[];
  decisionsMade: string[];
  actionItems: string[];
  importantQuotes: string[];
  nextSteps: string[];
  sentiment: string;
  sentimentReason: string;
  dealTemperature: string;
  dealReasoning: string;
};

export default function LiveCoachPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string>("");
  const [selectedPersonName, setSelectedPersonName] = useState<string>("");
  
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState<string>("");
  const [liveAnalysis, setLiveAnalysis] = useState<LiveAnalysis | null>(null);
  const [quickCoaching, setQuickCoaching] = useState<string>("");
  const [callSummary, setCallSummary] = useState<CallSummary | null>(null);
  
  const [duration, setDuration] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  
  const [activityLog, setActivityLog] = useState<string[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const transcriptBufferRef = useRef<string>("");
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);

  function pushLog(msg: string) {
    const stamp = new Date().toLocaleTimeString();
    setActivityLog((prev) => [`${stamp} — ${msg}`, ...prev].slice(0, 30));
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

  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      transcriptBufferRef.current = "";

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(3000); // Capture in 3-second chunks
      setIsRecording(true);
      setDuration(0);
      setTranscript("");
      setLiveAnalysis(null);
      setQuickCoaching("");
      setCallSummary(null);
      
      const person = people.find(p => p.id === selectedPersonId);
      setSelectedPersonName(person?.name || "Unknown");
      
      pushLog(`🎤 Started recording${person ? ` - ${person.name}` : ""}`);

      // Start duration counter
      durationIntervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // Start rapid transcription (every 3 seconds for quick feedback)
      let quickCounter = 0;
      analysisIntervalRef.current = setInterval(() => {
        quickCounter++;
        
        // Quick analysis every 3 seconds
        if (quickCounter % 1 === 0) {
          quickTranscribeAndCoach();
        }
        
        // Deep analysis every 15 seconds (every 5th cycle)
        if (quickCounter % 5 === 0) {
          transcribeAndAnalyze();
        }
      }, 3000);

    } catch (err) {
      pushLog("❌ Microphone access denied");
      console.error("Microphone error:", err);
    }
  }

  function pauseRecording() {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
        pushLog("▶️ Resumed recording");
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
        pushLog("⏸️ Paused recording");
      }
    }
  }

  async function stopRecording() {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop timers
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
      }

      pushLog("🛑 Stopped recording");
      
      // Final transcription
      await new Promise(resolve => setTimeout(resolve, 500));
      await transcribeAndAnalyze();
      
      // Generate summary
      await generateSummary();
    }
  }

  async function quickTranscribeAndCoach() {
    if (audioChunksRef.current.length === 0) return;

    try {
      // Get only the latest audio chunks for speed (last 6 seconds)
      const latestChunks = audioChunksRef.current.slice(-2);
      const audioBlob = new Blob(latestChunks, { type: "audio/webm" });
      const audioFile = new File([audioBlob], "quick.webm", { type: "audio/webm" });

      // Quick transcribe
      const formData = new FormData();
      formData.append("audio", audioFile);

      const transcribeRes = await fetch("/api/pulse-listen/transcribe", {
        method: "POST",
        body: formData,
      });

      const transcribeData = await transcribeRes.json();

      if (transcribeData.ok) {
        const newText = transcribeData.transcript;
        
        // Append to buffer
        transcriptBufferRef.current += " " + newText;
        
        // Update main transcript
        setTranscript(prev => prev + " " + newText);

        // Quick AI coaching (lightweight)
        await quickAICoach(transcriptBufferRef.current);
      }
    } catch (err) {
      console.error("Quick transcribe error:", err);
    }
  }

  async function quickAICoach(recentTranscript: string) {
    if (!recentTranscript || recentTranscript.length < 20) return;

    try {
      // Use only last 500 chars for speed
      const recentText = recentTranscript.slice(-500);

      const res = await fetch("/api/live-coach/quick-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recentTranscript: recentText,
          personId: selectedPersonId || null,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setQuickCoaching(data.coaching);
      }
    } catch (err) {
      console.error("Quick coach error:", err);
    }
  }

  async function transcribeAndAnalyze() {
    if (audioChunksRef.current.length === 0) return;

    pushLog("🎤 Deep transcribing...");

    try {
      // Create blob from all audio chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      
      // Convert to file
      const audioFile = new File([audioBlob], "recording.webm", { type: "audio/webm" });

      // Transcribe with Whisper
      const formData = new FormData();
      formData.append("audio", audioFile);

      const transcribeRes = await fetch("/api/pulse-listen/transcribe", {
        method: "POST",
        body: formData,
      });

      const transcribeData = await transcribeRes.json();

      if (transcribeData.ok) {
        const newTranscript = transcribeData.transcript;
        setTranscript(newTranscript);
        transcriptBufferRef.current = newTranscript;
        pushLog("✅ Full transcription updated");

        // Analyze with AI
        await analyzeLive(newTranscript);
      }
    } catch (err) {
      pushLog("❌ Transcription failed");
    }
  }

  async function analyzeLive(transcriptText: string) {
    if (!transcriptText) return;

    setAnalyzing(true);
    pushLog("🧠 Deep AI analyzing...");

    try {
      const res = await fetch("/api/live-coach/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcriptText,
          personId: selectedPersonId || null,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setLiveAnalysis(data.analysis);
        pushLog("✅ Deep coaching updated");
      }
    } catch (err) {
      pushLog("❌ Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  async function generateSummary() {
    if (!transcript) return;

    setGeneratingSummary(true);
    pushLog("📝 Generating summary...");

    try {
      const res = await fetch("/api/live-coach/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          personName: selectedPersonName,
          duration: formatDuration(duration),
        }),
      });

      const data = await res.json();

      if (data.ok) {
        setCallSummary(data.summary);
        pushLog("✅ Summary generated!");
        
        // AUTO-CREATE FOLLOW-UPS
        pushLog("🔍 Creating follow-ups...");
        await createFollowUps();
      }
    } catch (err) {
      pushLog("❌ Summary failed");
    } finally {
      setGeneratingSummary(false);
    }
  }

  async function createFollowUps() {
    if (!transcript) return;

    try {
      const res = await fetch("/api/follow-ups/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          personId: selectedPersonId || null,
          personName: selectedPersonName || "Unknown",
          callType: "Live Call",
        }),
      });

      const data = await res.json();

      if (data.ok) {
        pushLog(`✅ ${data.followUpsCreated} follow-ups scheduled!`);
      }
    } catch (err) {
      pushLog("❌ Follow-up creation failed");
      console.error("Follow-up error:", err);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">🎤 Pulse Live Coach</h1>
          <p className="text-slate-400 text-sm">Real-Time AI Coaching During Calls</p>
        </div>
        <Link href="/" className="px-4 py-2 bg-slate-800 text-slate-200 font-semibold rounded-xl hover:bg-slate-700">
          ← Back to Dashboard
        </Link>
      </header>

      {/* CONTROL PANEL */}
      <section className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">🎙️ Call Controls</h2>
        
        {!isRecording && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Who are you talking to? (Optional)</label>
              <select
                value={selectedPersonId}
                onChange={(e) => setSelectedPersonId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm"
              >
                <option value="">Select person (or skip)...</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} - {p.company}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={startRecording}
              className="w-full px-6 py-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold text-lg rounded-xl hover:from-emerald-400 hover:to-green-400 shadow-lg"
            >
              🎤 Start Call
            </button>
          </div>
        )}

        {isRecording && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-900/50 rounded-xl p-4">
              <div>
                <div className="text-sm text-slate-400">Recording</div>
                <div className="text-2xl font-bold text-emerald-400">{formatDuration(duration)}</div>
                {selectedPersonName && <div className="text-sm text-cyan-300 mt-1">📞 {selectedPersonName}</div>}
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full ${isPaused ? 'bg-yellow-400' : 'bg-red-500 animate-pulse'}`} />
                <span className="text-sm text-slate-400">{isPaused ? 'Paused' : 'Live'}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={pauseRecording}
                className="flex-1 px-4 py-3 bg-yellow-500 text-slate-950 font-semibold rounded-xl hover:bg-yellow-400"
              >
                {isPaused ? '▶️ Resume' : '⏸️ Pause'}
              </button>
              <button
                onClick={stopRecording}
                className="flex-1 px-4 py-3 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-400"
              >
                🛑 End Call
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* LEFT COLUMN - LIVE COACHING */}
        <div className="space-y-6">
          {/* Live Analysis */}
          {liveAnalysis && (
            <>
              {/* INSTANT QUICK COACHING - Shows every 3 seconds */}
              {quickCoaching && (
                <section className="bg-gradient-to-br from-yellow-900/40 to-orange-900/40 border-2 border-yellow-400 rounded-2xl p-4 shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                    <h2 className="text-xs font-semibold uppercase text-yellow-300">⚡ INSTANT COACH (Live - 3s updates)</h2>
                  </div>
                  <div className="text-base font-semibold text-yellow-100">{quickCoaching}</div>
                </section>
              )}

              {/* Next 30 Seconds - PRIORITY */}
              <section className="bg-gradient-to-br from-red-900/30 to-orange-900/30 border-2 border-red-500 rounded-2xl p-6">
                <h2 className="text-sm font-semibold uppercase text-red-300 mb-3">🔥 DO THIS NOW (NEXT 30 SECONDS)</h2>
                <div className="text-xl font-bold text-red-200">{liveAnalysis.next30Seconds}</div>
              </section>

              {/* Control Assessment */}
              <section className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl p-6">
                <h2 className="text-sm font-semibold uppercase text-purple-300 mb-3">🎯 Conversation Control</h2>
                <div className="text-lg text-purple-200 mb-3">{liveAnalysis.controlAssessment}</div>
                <div className="text-xs uppercase text-purple-400 mb-2">Stage: {liveAnalysis.conversationStage}</div>
                <div className="text-sm text-purple-300">{liveAnalysis.stageAction}</div>
              </section>

              {/* Immediate Actions */}
              <section className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 rounded-2xl p-6">
                <h2 className="text-sm font-semibold uppercase text-cyan-300 mb-3">⚡ IMMEDIATE ACTIONS</h2>
                <div className="space-y-2">
                  {liveAnalysis.immediateActions.map((action, idx) => (
                    <div key={idx} className="flex items-start gap-2 bg-cyan-500/10 rounded-lg p-3 border border-cyan-500/20">
                      <div className="text-cyan-400 text-lg font-bold">{idx + 1}.</div>
                      <div className="text-sm text-slate-200 font-medium">{action}</div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Open-Ended Questions */}
              <section className="bg-gradient-to-br from-emerald-900/30 to-green-900/30 border border-emerald-500/30 rounded-2xl p-6">
                <h2 className="text-sm font-semibold uppercase text-emerald-300 mb-3">❓ POWERFUL QUESTIONS TO ASK</h2>
                <div className="space-y-3">
                  {liveAnalysis.openEndedQuestions.map((question, idx) => (
                    <div key={idx} className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
                      <div className="text-sm text-emerald-200 italic">"{question}"</div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Objection Handling */}
              {liveAnalysis.objectionHandling.detected !== "None detected yet - stay alert" && (
                <section className="bg-gradient-to-br from-orange-900/30 to-red-900/30 border border-orange-500/30 rounded-2xl p-6">
                  <h2 className="text-sm font-semibold uppercase text-orange-300 mb-3">🛡️ OBJECTION DETECTED</h2>
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs uppercase text-orange-400 mb-1">Objection:</div>
                      <div className="text-sm text-orange-200">{liveAnalysis.objectionHandling.detected}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase text-orange-400 mb-1">Response:</div>
                      <div className="text-sm text-white font-medium bg-orange-500/20 rounded-lg p-3 border border-orange-500/30">
                        "{liveAnalysis.objectionHandling.response}"
                      </div>
                    </div>
                    <div>
                      <div className="text-xs uppercase text-orange-400 mb-1">Follow-Up:</div>
                      <div className="text-sm text-orange-200 italic">"{liveAnalysis.objectionHandling.followUp}"</div>
                    </div>
                  </div>
                </section>
              )}

              {/* Control Tactics */}
              {liveAnalysis.controlTactics[0] !== "Control is good - maintain pace" && (
                <section className="bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border border-yellow-500/30 rounded-2xl p-6">
                  <h2 className="text-sm font-semibold uppercase text-yellow-300 mb-3">⚔️ REGAIN CONTROL</h2>
                  <div className="space-y-2">
                    {liveAnalysis.controlTactics.map((tactic, idx) => (
                      <div key={idx} className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/20">
                        <div className="text-sm text-yellow-200 font-medium">"{tactic}"</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Buying Signals */}
              {liveAnalysis.buyingSignals.length > 0 && (
                <section className="bg-gradient-to-br from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-2xl p-6">
                  <h2 className="text-sm font-semibold uppercase text-green-300 mb-3">🎯 BUYING SIGNALS DETECTED</h2>
                  <div className="space-y-2">
                    {liveAnalysis.buyingSignals.map((signal, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className="text-green-400 text-lg">✓</div>
                        <div className="text-sm text-green-200">{signal}</div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* What's Going Well */}
              <section className="bg-green-900/20 border border-green-500/30 rounded-2xl p-6">
                <h2 className="text-sm font-semibold uppercase text-green-300 mb-3">✅ Going Well</h2>
                <div className="space-y-2">
                  {liveAnalysis.goingWell.map((item, idx) => (
                    <div key={idx} className="text-sm text-slate-300">• {item}</div>
                  ))}
                </div>
              </section>

              {/* Critical Mistakes */}
              {liveAnalysis.criticalMistakes.length > 0 && liveAnalysis.criticalMistakes[0] !== "No critical mistakes" && (
                <section className="bg-red-900/20 border border-red-500/30 rounded-2xl p-6">
                  <h2 className="text-sm font-semibold uppercase text-red-300 mb-3">❌ CRITICAL MISTAKES</h2>
                  <div className="space-y-2">
                    {liveAnalysis.criticalMistakes.map((mistake, idx) => (
                      <div key={idx} className="text-sm text-red-200 bg-red-500/10 rounded-lg p-2 border border-red-500/20">{mistake}</div>
                    ))}
                  </div>
                </section>
              )}

              {/* Red Flags */}
              {liveAnalysis.redFlags.length > 0 && (
                <section className="bg-red-900/20 border border-red-500/30 rounded-2xl p-6">
                  <h2 className="text-sm font-semibold uppercase text-red-300 mb-3">⚠️ Red Flags</h2>
                  <div className="space-y-2">
                    {liveAnalysis.redFlags.map((flag, idx) => (
                      <div key={idx} className="text-sm text-red-200">⚠️ {flag}</div>
                    ))}
                  </div>
                </section>
              )}

              {/* Talk Ratio */}
              <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-sm font-semibold uppercase text-slate-300 mb-3">🗣️ Talk Ratio</h2>
                <div className="text-2xl font-mono mb-2">{liveAnalysis.talkRatio}</div>
                <div className="text-sm text-slate-400">{liveAnalysis.talkRatioComment}</div>
              </section>

              {/* Key Information */}
              {liveAnalysis.keyInformation.length > 0 && (
                <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
                  <h2 className="text-sm font-semibold uppercase text-slate-300 mb-3">📌 Key Information Captured</h2>
                  <div className="space-y-1">
                    {liveAnalysis.keyInformation.map((info, idx) => (
                      <div key={idx} className="text-sm text-slate-300">• {info}</div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {!liveAnalysis && !isRecording && (
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4">🎤</div>
              <h3 className="text-xl font-semibold mb-2">Ready to Coach You</h3>
              <p className="text-slate-400 text-sm">Start a call to get real-time AI coaching</p>
            </div>
          )}

          {isRecording && !liveAnalysis && (
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4 animate-pulse">🎤</div>
              <h3 className="text-xl font-semibold mb-2">Listening...</h3>
              <p className="text-slate-400 text-sm">AI will start coaching in a few seconds</p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN - NOTES & TRANSCRIPT */}
        <div className="space-y-6">
          {/* Action Items */}
          {liveAnalysis && liveAnalysis.actionItems.length > 0 && liveAnalysis.actionItems[0] !== "None yet" && (
            <section className="bg-purple-900/20 border border-purple-500/30 rounded-2xl p-6">
              <h2 className="text-sm font-semibold uppercase text-purple-300 mb-3">✅ Action Items</h2>
              <div className="space-y-2">
                {liveAnalysis.actionItems.map((item, idx) => (
                  <div key={idx} className="text-sm text-slate-300">✓ {item}</div>
                ))}
              </div>
            </section>
          )}

          {/* Call Summary (Post-Call) */}
          {callSummary && (
            <>
              <section className="bg-gradient-to-br from-emerald-900/30 to-green-900/30 border border-emerald-500/30 rounded-2xl p-6">
                <h2 className="text-lg font-semibold uppercase text-emerald-300 mb-3">📊 Call Summary</h2>
                
                <div className="mb-4">
                  <div className="text-xs uppercase text-slate-400 mb-1">Executive Summary</div>
                  <div className="text-sm text-slate-200">{callSummary.executiveSummary}</div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-xs text-slate-400">Sentiment</div>
                    <div className="text-lg font-semibold text-emerald-300">{callSummary.sentiment}</div>
                    <div className="text-xs text-slate-400 mt-1">{callSummary.sentimentReason}</div>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="text-xs text-slate-400">Deal Temperature</div>
                    <div className="text-lg font-semibold text-emerald-300">{callSummary.dealTemperature}</div>
                    <div className="text-xs text-slate-400 mt-1">{callSummary.dealReasoning}</div>
                  </div>
                </div>
              </section>

              <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold uppercase text-slate-300 mb-3">📋 Key Points</h3>
                <div className="space-y-2">
                  {callSummary.keyPoints.map((point, idx) => (
                    <div key={idx} className="text-sm text-slate-300">• {point}</div>
                  ))}
                </div>
              </section>

              {callSummary.actionItems.length > 0 && callSummary.actionItems[0] !== "None" && (
                <section className="bg-purple-900/20 border border-purple-500/30 rounded-2xl p-6">
                  <h3 className="text-sm font-semibold uppercase text-purple-300 mb-3">✅ Final Action Items</h3>
                  <div className="space-y-2">
                    {callSummary.actionItems.map((item, idx) => (
                      <div key={idx} className="text-sm text-slate-300 bg-purple-500/10 rounded-lg p-2">✓ {item}</div>
                    ))}
                  </div>
                </section>
              )}

              {callSummary.importantQuotes.length > 0 && (
                <section className="bg-yellow-900/20 border border-yellow-500/30 rounded-2xl p-6">
                  <h3 className="text-sm font-semibold uppercase text-yellow-300 mb-3">💬 Important Quotes</h3>
                  <div className="space-y-3">
                    {callSummary.importantQuotes.map((quote, idx) => (
                      <div key={idx} className="text-sm text-slate-300 italic border-l-2 border-yellow-500 pl-3">"{quote}"</div>
                    ))}
                  </div>
                </section>
              )}

              <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-sm font-semibold uppercase text-slate-300 mb-3">🎯 Next Steps</h3>
                <div className="space-y-2">
                  {callSummary.nextSteps.map((step, idx) => (
                    <div key={idx} className="text-sm text-slate-300">{idx + 1}. {step}</div>
                  ))}
                </div>
              </section>

              <button
                onClick={() => {
                  const summaryText = `
CALL SUMMARY - ${selectedPersonName} - ${formatDuration(duration)}

${callSummary.executiveSummary}

KEY POINTS:
${callSummary.keyPoints.map(p => `• ${p}`).join('\n')}

ACTION ITEMS:
${callSummary.actionItems.map(a => `✓ ${a}`).join('\n')}

NEXT STEPS:
${callSummary.nextSteps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Sentiment: ${callSummary.sentiment}
Deal Temperature: ${callSummary.dealTemperature}
`;
                  navigator.clipboard.writeText(summaryText);
                  pushLog("📋 Summary copied!");
                }}
                className="w-full px-4 py-3 bg-emerald-500 text-slate-950 font-semibold rounded-xl hover:bg-emerald-400"
              >
                📋 Copy Summary
              </button>
            </>
          )}

          {generatingSummary && (
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-12 text-center">
              <div className="text-6xl mb-4 animate-pulse">📝</div>
              <h3 className="text-xl font-semibold mb-2">Generating Summary...</h3>
              <p className="text-slate-400 text-sm">AI is analyzing the full call</p>
            </div>
          )}

          {/* Live Transcript */}
          {transcript && (
            <section className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-semibold uppercase text-slate-300 mb-3">📝 Live Transcript</h3>
              <div className="max-h-96 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg p-4">
                <div className="text-xs text-slate-400 whitespace-pre-wrap">{transcript}</div>
              </div>
            </section>
          )}

          {/* Activity Log */}
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
      </div>
      {/* Coach Modal */}
      <CoachModal
        coach="call-coach"
        coachName="Live Call Coach"
        coachIcon="📞"
        coachDescription="Real-time call guidance"
      />
    <VoiceOverlay coachType="life" />
    </main>
  );
}