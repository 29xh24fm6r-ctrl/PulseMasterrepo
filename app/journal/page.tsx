"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send, Loader2, Zap, Brain, Sparkles,
  Mic, BookOpen, Compass, Save, Moon,
  MoreHorizontal, Calendar, Share2
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/ui/premium/PageHeader";
import { GlassCard } from "@/components/ui/premium/GlassCard";
import { useXPToast } from "../components/xp-toast";

// ============================================
// TYPES
// ============================================

interface Option {
  id: string;
  label: string;
  value: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  options?: Option[] | null;
  mood?: string;     // New: AI detected mood
  topics?: string[]; // New: AI detected topics
}

interface DaySummary {
  completedTasks: string[];
  habitsCompleted: string[];
  dealsProgress: { name: string; stage: string }[];
  reflectionStreak: number;
}

// ============================================
// PULSE ORB COMPONENT (Refined)
// ============================================
function PulseOrb({ active, listening }: { active: boolean, listening: boolean }) {
  return (
    <div className="relative w-10 h-10 flex items-center justify-center">
      <div className={`absolute inset-0 rounded-full blur-md transition-all duration-500 ${active ? "bg-violet-500/50" : listening ? "bg-emerald-500/50" : "bg-zinc-500/20"
        }`} />
      <div className={`relative w-3 h-3 rounded-full transition-all duration-300 ${active ? "bg-violet-400 scale-125" : listening ? "bg-emerald-400 scale-110" : "bg-zinc-600"
        }`} />
      {active && (
        <div className="absolute inset-0 border-2 border-violet-500/30 rounded-full animate-ping" />
      )}
    </div>
  )
}

export default function JournalPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [journalMode, setJournalMode] = useState<"select" | "freeflow" | "guided" | "quick">("select");
  const [daySummary, setDaySummary] = useState<DaySummary | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  // XP Toast hook
  const { showXPToast } = useXPToast();

  // Voice state
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceConnected, setVoiceConnected] = useState(false);

  // Refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => disconnectVoice();
  }, []);

  // ============================================
  // VOICE FUNCTIONS (Preserved Logic)
  // ============================================
  const connectVoice = async () => {
    try {
      const tokenResponse = await fetch("/api/realtime/session", { method: "POST" });
      if (!tokenResponse.ok) throw new Error("Failed to get session");
      const { client_secret } = await tokenResponse.json();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const pc = new RTCPeerConnection();
      peerConnectionRef.current = pc;

      pc.ontrack = (event) => {
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.play();
      };

      stream.getAudioTracks().forEach(track => pc.addTrack(track, stream));
      const dc = pc.createDataChannel("oai-events");
      dataChannelRef.current = dc;

      dc.onopen = () => setVoiceConnected(true);
      dc.onmessage = (event) => handleVoiceEvent(JSON.parse(event.data));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // SDP exchange proxied through our server (CSP stays first-party only)
      const sdpResponse = await fetch("/api/voice/sdp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: client_secret, sdp: offer.sdp }),
      });

      if (!sdpResponse.ok) throw new Error("SDP negotiation failed");

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      setIsVoiceMode(true);
    } catch (err) {
      console.error("Voice connection error:", err);
      setIsVoiceMode(false);
    }
  };

  const handleVoiceEvent = (event: any) => {
    switch (event.type) {
      case "input_audio_buffer.speech_started":
        setIsListening(true);
        setIsSpeaking(false);
        break;
      case "input_audio_buffer.speech_stopped":
        setIsListening(false);
        break;
      case "response.audio.delta":
        setIsSpeaking(true);
        break;
      case "response.audio.done":
        setIsSpeaking(false);
        break;
      case "conversation.item.input_audio_transcription.completed":
        if (event.transcript) {
          setMessages(prev => [...prev, { role: "user", content: event.transcript, timestamp: new Date() }]);
        }
        break;
      case "response.audio_transcript.done":
        if (event.transcript) {
          setMessages(prev => [...prev, { role: "assistant", content: event.transcript, timestamp: new Date() }]);
        }
        break;
    }
  };

  const disconnectVoice = () => {
    if (dataChannelRef.current) dataChannelRef.current.close();
    if (peerConnectionRef.current) peerConnectionRef.current.close();
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());

    peerConnectionRef.current = null;
    dataChannelRef.current = null;
    localStreamRef.current = null;

    setVoiceConnected(false);
    setIsVoiceMode(false);
    setIsListening(false);
    setIsSpeaking(false);
  };

  // ============================================
  // TEXT FUNCTIONS
  // ============================================
  const startJournal = async (mode: "freeflow" | "guided" | "quick") => {
    setJournalMode(mode);
    setIsLoading(true);

    const modePrompts = {
      freeflow: "I want to do free flow journaling tonight - let me just share what's on my mind.",
      guided: "Guide me through my evening reflection with your questions.",
      quick: "I only have a few minutes tonight - let's do a quick check-in.",
    };

    try {
      const response = await fetch("/api/journal/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: modePrompts[mode] }] }),
      });

      const data = await response.json();
      setDaySummary(data.daySummary);

      setMessages([
        { role: "user", content: modePrompts[mode], timestamp: new Date() },
        { role: "assistant", content: data.response, timestamp: new Date(), options: data.options },
      ]);
    } catch (error) {
      console.error("Error starting journal:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input.trim();
    if (!textToSend || isLoading) return;

    const userMessage: Message = { role: "user", content: textToSend, timestamp: new Date() };

    setMessages(prev => prev.map(m => ({ ...m, options: null })));
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    if (inputRef.current) inputRef.current.style.height = "auto";

    try {
      const response = await fetch("/api/journal/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await response.json();

      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
        options: data.options,
      }]);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const saveJournal = async () => {
    setIsSaving(true);
    const transcript = messages.map(m => `${m.role === "user" ? "Me" : "Pulse"}: ${m.content}`).join("\n\n");
    const xpAmount = journalMode === "quick" ? 25 : 50;

    try {
      await fetch("/api/journal/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          journalData: {
            title: `Evening Reflection - ${new Date().toLocaleDateString()}`,
            mode: journalMode === "freeflow" ? "Free Flow" : journalMode === "guided" ? "Guided" : "Quick",
            transcript,
            streak: (daySummary?.reflectionStreak || 0) + 1,
            xpEarned: xpAmount,
          },
        }),
      });

      showXPToast({
        amount: xpAmount,
        category: "DXP",
        activity: "Journal entry saved",
      });

      if (isVoiceMode) disconnectVoice();
      setShowSaveModal(true);
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // ============================================
  // UI RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-violet-500/30 flex flex-col">
      <PageHeader
        title="Cognitive Stream"
        subtitle="Capture thoughts, reflect, and grow."
        searchPlaceholder="Search journal history..."
        actionLabel={messages.length > 2 ? (isSaving ? "Saving..." : "Save Entry") : undefined}
        onAdd={messages.length > 2 ? saveJournal : undefined}
      />

      <div className="flex-1 overflow-y-auto pb-32">
        <div className="max-w-4xl mx-auto px-6 py-8">

          {/* 1. Mode Selection (Empty State) */}
          {journalMode === "select" && (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in fade-in zoom-in duration-500">
              <div className="relative">
                <div className="absolute inset-0 bg-violet-500/20 blur-3xl rounded-full" />
                <Brain className="w-24 h-24 text-violet-300 relative z-10" />
              </div>

              <div className="space-y-4 max-w-lg">
                <h2 className="text-4xl font-bold bg-gradient-to-br from-white to-zinc-500 bg-clip-text text-transparent">
                  What's on your mind?
                </h2>
                <p className="text-zinc-400 text-lg">
                  Choose a mode to begin your reflection session.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
                <ModeCard
                  title="Free Flow"
                  desc="Unstructured thought capture."
                  icon={BookOpen}
                  color="from-blue-500 to-cyan-500"
                  onClick={() => startJournal("freeflow")}
                />
                <ModeCard
                  title="Guided"
                  desc="Structured deep dive."
                  icon={Compass}
                  color="from-violet-500 to-fuchsia-500"
                  onClick={() => startJournal("guided")}
                />
                <ModeCard
                  title="Quick"
                  desc="Rapid daily check-in."
                  icon={Zap}
                  color="from-amber-500 to-orange-500"
                  onClick={() => startJournal("quick")}
                />
              </div>
            </div>
          )}

          {/* 2. Active Journal Stream */}
          {journalMode !== "select" && (
            <div className="space-y-6">
              {/* Day Summary Widget */}
              {daySummary && messages.length <= 3 && (
                <GlassCard className="mb-8 p-6 flex justify-between items-center">
                  <div>
                    <h3 className="text-zinc-400 text-sm font-medium uppercase tracking-wider mb-1">Daily Pulse</h3>
                    <p className="text-2xl font-bold text-white">{(daySummary.reflectionStreak || 0)} Day Streak 🔥</p>
                  </div>
                  <div className="flex gap-8 text-center">
                    <div>
                      <p className="text-xl font-bold text-white">{daySummary.completedTasks.length}</p>
                      <p className="text-xs text-zinc-500">Tasks</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-emerald-400">{daySummary.habitsCompleted.length}</p>
                      <p className="text-xs text-zinc-500">Habits</p>
                    </div>
                  </div>
                </GlassCard>
              )}

              <AnimatePresence>
                {messages.filter(m => m.role === "assistant" || messages.indexOf(m) > 0).map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[85%] ${msg.role === "user" ? "ml-12" : "mr-12"}`}>
                      {msg.role === "assistant" && (
                        <div className="flex items-center gap-3 mb-2">
                          <PulseOrb active={isSpeaking && idx === messages.length - 1} listening={isListening} />
                          <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">Pulse AI</span>
                        </div>
                      )}

                      <GlassCard
                        className={`p-5 ${msg.role === "user" ? "bg-zinc-800/50 border-zinc-700/50" : "bg-black/20 border-white/5"}`}
                        hoverEffect={false}
                      >
                        <div className="whitespace-pre-wrap text-base leading-relaxed text-zinc-200">
                          {msg.content}
                        </div>

                        {/* Auto-detected Tags (Mock for now, ready for AI injection) */}
                        {msg.topics && (
                          <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                            {msg.topics.map(t => (
                              <span key={t} className="text-xs px-2 py-1 rounded bg-white/5 text-zinc-400">#{t}</span>
                            ))}
                          </div>
                        )}
                      </GlassCard>

                      {/* Action Chips */}
                      {msg.role === "assistant" && msg.options && !isLoading && !isVoiceMode && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {msg.options.map(opt => (
                            <button
                              key={opt.id}
                              onClick={() => sendMessage(opt.value)}
                              className="px-4 py-2 rounded-xl text-sm font-medium bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 transition-colors"
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isLoading && (
                <div className="flex items-center gap-3 text-violet-400 animate-pulse">
                  <Brain className="w-5 h-5" />
                  <span className="text-sm">Thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Dock */}
      {journalMode !== "select" && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent z-20">
          <div className="max-w-4xl mx-auto">
            {isVoiceMode ? (
              <GlassCard className="flex items-center justify-between p-4 border-violet-500/30 bg-violet-900/10">
                <div className="flex items-center gap-4">
                  <PulseOrb active={isSpeaking} listening={isListening} />
                  <div>
                    <p className="font-semibold text-white">{isListening ? "Listening..." : isSpeaking ? "Speaking..." : "Listening..."}</p>
                    <p className="text-xs text-violet-300">Voice Mode Active</p>
                  </div>
                </div>
                <button onClick={disconnectVoice} className="px-4 py-2 bg-zinc-800 rounded-lg text-xs font-medium hover:bg-zinc-700">
                  End Session
                </button>
              </GlassCard>
            ) : (
              <div className="relative flex items-end gap-2">
                <div className="relative flex-1">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      e.target.style.height = "auto";
                      e.target.style.height = Math.min(e.target.scrollHeight, 150) + "px";
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your thoughts..."
                    className="w-full bg-zinc-900/80 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 resize-none shadow-xl backdrop-blur-md"
                    rows={1}
                    style={{ minHeight: "60px" }}
                  />
                  <button
                    onClick={connectVoice}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-zinc-400 hover:text-white transition-colors"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                </div>
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading}
                  className="h-[60px] w-[60px] flex items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20 hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100"
                >
                  <Send className="w-6 h-6" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-in fade-in duration-300">
          <GlassCard className="max-w-md w-full text-center p-8 border-violet-500/30">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6 ring-1 ring-emerald-500/50">
              <Sparkles className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Entry Saved</h2>
            <div className="flex items-center justify-center gap-2 mb-6">
              <span className="text-amber-400 font-bold">+{journalMode === 'quick' ? 25 : 50} XP</span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400">Streak Extended</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/" className="px-4 py-3 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors font-medium">
                Dashboard
              </Link>
              <button onClick={() => setShowSaveModal(false)} className="px-4 py-3 rounded-xl bg-violet-600 text-white hover:bg-violet-500 transition-colors font-medium">
                Continue
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

function ModeCard({ title, desc, icon: Icon, color, onClick }: any) {
  return (
    <button onClick={onClick} className="group relative overflow-hidden rounded-2xl bg-zinc-900/50 border border-white/5 p-6 text-left hover:border-violet-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/10 hover:-translate-y-1">
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${color} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 text-white shadow-lg`}>
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-bold text-white mb-1 group-hover:text-violet-300 transition-colors">{title}</h3>
      <p className="text-sm text-zinc-500">{desc}</p>
    </button>
  )
}
