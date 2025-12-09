"use client";

import { useState, useEffect } from "react";
import { Mic, X, Phone, PhoneOff, Send, Loader2, Volume2, Minimize2, Maximize2 } from "lucide-react";
import { useRealtimeVoice } from "@/lib/hooks/useRealtimeVoice";
import { useWakeLock } from "@/lib/hooks/useWakeLock";

interface GlobalVoiceButtonProps {
  position?: "bottom-right" | "bottom-left" | "bottom-center";
  defaultMinimized?: boolean;
}

export function GlobalVoiceButton({ 
  position = "bottom-right",
  defaultMinimized = true 
}: GlobalVoiceButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
  const [textInput, setTextInput] = useState("");
  
  const {
    status,
    error,
    messages,
    currentTranscript,
    isUserSpeaking,
    isAssistantSpeaking,
    connect,
    disconnect,
    sendTextMessage,
  } = useRealtimeVoice({ sessionEndpoint: "/api/voice/realtime-config" });

  const wakeLock = useWakeLock();

  const isConnected = ["connected", "listening", "speaking", "processing"].includes(status);

  // Acquire wake lock when connected
  useEffect(() => {
    if (isConnected && wakeLock.isSupported) {
      wakeLock.request();
    } else {
      wakeLock.release();
    }
  }, [isConnected]);

  const handleConnect = async () => {
    setIsOpen(true);
    setIsMinimized(false);
    await connect();
  };

  const handleDisconnect = () => {
    disconnect();
  };

  const handleClose = () => {
    disconnect();
    setIsOpen(false);
  };

  const handleSendText = () => {
    if (!textInput.trim()) return;
    sendTextMessage(textInput);
    setTextInput("");
  };

  const positionClasses = {
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
    "bottom-center": "bottom-6 left-1/2 -translate-x-1/2",
  };

  // Floating button when closed
  if (!isOpen) {
    return (
      <button
        onClick={handleConnect}
        className={`fixed ${positionClasses[position]} z-50 p-4 bg-purple-600 hover:bg-purple-500 rounded-full shadow-lg transition-all hover:scale-110`}
        title="Talk to Pulse"
      >
        <Mic className="w-6 h-6 text-white" />
      </button>
    );
  }

  // Minimized pill when connected but minimized
  if (isMinimized && isConnected) {
    return (
      <div className={`fixed ${positionClasses[position]} z-50 flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-full px-4 py-2 shadow-lg`}>
        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
        <span className="text-sm text-white">Pulse Active</span>
        <button
          onClick={() => setIsMinimized(false)}
          className="p-1 hover:bg-zinc-800 rounded-full"
        >
          <Maximize2 className="w-4 h-4 text-zinc-400" />
        </button>
        <button
          onClick={handleClose}
          className="p-1 hover:bg-zinc-800 rounded-full"
        >
          <X className="w-4 h-4 text-zinc-400" />
        </button>
      </div>
    );
  }

  // Full voice chat panel
  return (
    <div className={`fixed ${positionClasses[position]} z-50 w-80 sm:w-96 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-white text-sm">Pulse</h3>
            {isConnected && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Live
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isConnected && (
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 hover:bg-zinc-800 rounded-lg transition"
            >
              <Minimize2 className="w-4 h-4 text-zinc-400" />
            </button>
          )}
          <button
            onClick={handleClose}
            className="p-1.5 hover:bg-zinc-800 rounded-lg transition"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="h-64 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && !isConnected && (
          <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500">
            <Phone className="w-8 h-8 mb-2" />
            <p className="text-sm">Tap to connect</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-3 py-1.5 text-sm ${
                msg.role === "user"
                  ? "bg-purple-600 text-white"
                  : "bg-zinc-800 text-white"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {currentTranscript && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-xl px-3 py-1.5 bg-zinc-800 text-white text-sm">
              {currentTranscript}
              <span className="inline-block w-1.5 h-3 bg-purple-400 animate-pulse ml-1" />
            </div>
          </div>
        )}

        {isUserSpeaking && (
          <div className="text-center text-xs text-zinc-500">
            <Mic className="w-3 h-3 inline mr-1 text-red-400 animate-pulse" />
            Listening...
          </div>
        )}

        {isAssistantSpeaking && !currentTranscript && (
          <div className="text-center text-xs text-zinc-500">
            <Volume2 className="w-3 h-3 inline mr-1 text-purple-400 animate-pulse" />
            Speaking...
          </div>
        )}

        {status === "processing" && (
          <div className="text-center text-xs text-zinc-500">
            <Loader2 className="w-3 h-3 inline mr-1 animate-spin" />
            Thinking...
          </div>
        )}

        {error && (
          <div className="text-center text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 p-3 space-y-2">
        {isConnected && (
          <div className="flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendText()}
              placeholder="Type or speak..."
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={handleSendText}
              disabled={!textInput.trim()}
              className="p-1.5 bg-purple-600 rounded-lg disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex justify-center">
          {!isConnected ? (
            <button
              onClick={connect}
              disabled={status === "connecting"}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-full text-sm font-medium transition disabled:opacity-50"
            >
              {status === "connecting" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4" />
                  Start
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-500 rounded-full text-sm font-medium transition"
            >
              <PhoneOff className="w-4 h-4" />
              End
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
