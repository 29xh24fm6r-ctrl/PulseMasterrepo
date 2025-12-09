"use client";

import { useState } from "react";
import { Headphones, Mic, Phone, PhoneOff, Loader2, Volume2, X } from "lucide-react";
import { useRealtimeVoice } from "@/lib/hooks/useRealtimeVoice";

export function MorningBriefVoice() {
  const [isOpen, setIsOpen] = useState(false);

  const {
    status,
    error,
    messages,
    currentTranscript,
    isUserSpeaking,
    isAssistantSpeaking,
    connect,
    disconnect,
  } = useRealtimeVoice({ sessionEndpoint: "/api/voice/morning" });

  const isConnected = ["connected", "listening", "speaking", "processing"].includes(status);

  const handleStart = async () => {
    setIsOpen(true);
    await connect();
  };

  const handleEnd = () => {
    disconnect();
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={handleStart}
        className="flex items-center gap-3 w-full p-4 bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-500/30 rounded-xl hover:border-amber-500/50 transition-all group"
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Headphones className="w-6 h-6 text-white" />
        </div>
        <div className="text-left">
          <h3 className="font-semibold text-white">Listen to Brief</h3>
          <p className="text-sm text-zinc-400">Have Pulse read your morning brief</p>
        </div>
      </button>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Headphones className="w-5 h-5 text-amber-400" />
          <span className="font-medium text-white">Morning Brief</span>
          {isConnected && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Live
            </span>
          )}
        </div>
        <button onClick={handleEnd} className="p-1.5 hover:bg-zinc-800 rounded-lg">
          <X className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 min-h-[200px] max-h-[300px] overflow-y-auto space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-amber-600 text-white"
                  : "bg-zinc-800 text-white"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {currentTranscript && (
          <div className="flex justify-start">
            <div className="max-w-[90%] rounded-xl px-3 py-2 bg-zinc-800 text-white text-sm">
              {currentTranscript}
              <span className="inline-block w-1.5 h-3 bg-amber-400 animate-pulse ml-1" />
            </div>
          </div>
        )}

        {isAssistantSpeaking && !currentTranscript && (
          <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm py-4">
            <Volume2 className="w-5 h-5 text-amber-400 animate-pulse" />
            Pulse is speaking...
          </div>
        )}

        {isUserSpeaking && (
          <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm">
            <Mic className="w-4 h-4 text-red-400 animate-pulse" />
            Listening...
          </div>
        )}

        {status === "connecting" && (
          <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm py-8">
            <Loader2 className="w-5 h-5 animate-spin" />
            Preparing your brief...
          </div>
        )}

        {error && (
          <div className="text-center text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-800 p-3 flex justify-center">
        <button
          onClick={handleEnd}
          className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-500 rounded-full text-sm font-medium transition"
        >
          <PhoneOff className="w-4 h-4" />
          End Session
        </button>
      </div>
    </div>
  );
}
