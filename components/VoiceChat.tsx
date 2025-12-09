"use client";

import { useState } from "react";
import {
  Mic,
  Phone,
  PhoneOff,
  Send,
  Loader2,
  Volume2,
  X,
  MessageSquare,
} from "lucide-react";
import { useRealtimeVoice } from "@/lib/hooks/useRealtimeVoice";

interface VoiceChatProps {
  sessionEndpoint?: string;
  title?: string;
  subtitle?: string;
  accentColor?: string;
  onClose?: () => void;
  className?: string;
}

export function VoiceChat({
  sessionEndpoint = "/api/voice/realtime-config",
  title = "Pulse Voice",
  subtitle = "Speak naturally",
  accentColor = "purple",
  onClose,
  className = "",
}: VoiceChatProps) {
  const [textInput, setTextInput] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);

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
  } = useRealtimeVoice({ sessionEndpoint });

  const handleSendText = () => {
    if (!textInput.trim()) return;
    sendTextMessage(textInput);
    setTextInput("");
  };

  const isConnected =
    status === "connected" ||
    status === "listening" ||
    status === "speaking" ||
    status === "processing";

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    purple: { bg: "bg-purple-600", text: "text-purple-400", border: "border-purple-500" },
    blue: { bg: "bg-blue-600", text: "text-blue-400", border: "border-blue-500" },
    emerald: { bg: "bg-emerald-600", text: "text-emerald-400", border: "border-emerald-500" },
    amber: { bg: "bg-amber-600", text: "text-amber-400", border: "border-amber-500" },
    rose: { bg: "bg-rose-600", text: "text-rose-400", border: "border-rose-500" },
  };

  const colors = colorClasses[accentColor] || colorClasses.purple;

  return (
    <div className={`flex flex-col bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div>
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="text-xs text-zinc-500">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Live
            </span>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-800 rounded-lg transition"
            >
              <X className="w-4 h-4 text-zinc-400" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[400px]">
        {messages.length === 0 && !isConnected && (
          <div className="flex flex-col items-center justify-center h-full text-center text-zinc-500">
            <Phone className="w-8 h-8 mb-2" />
            <p className="text-sm">Tap call to start</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                msg.role === "user"
                  ? `${colors.bg} text-white rounded-br-sm`
                  : "bg-zinc-800 text-white rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {currentTranscript && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl px-3 py-2 bg-zinc-800 text-white text-sm rounded-bl-sm">
              {currentTranscript}
              <span className={`inline-block w-1.5 h-3 ${colors.bg} animate-pulse ml-1`} />
            </div>
          </div>
        )}

        {isUserSpeaking && (
          <div className="flex justify-center">
            <span className="text-xs text-zinc-500 flex items-center gap-1.5">
              <Mic className="w-3 h-3 text-red-400 animate-pulse" />
              Listening...
            </span>
          </div>
        )}

        {isAssistantSpeaking && !currentTranscript && (
          <div className="flex justify-center">
            <span className={`text-xs text-zinc-500 flex items-center gap-1.5`}>
              <Volume2 className={`w-3 h-3 ${colors.text} animate-pulse`} />
              Speaking...
            </span>
          </div>
        )}

        {status === "processing" && (
          <div className="flex justify-center">
            <span className="text-xs text-zinc-500 flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" />
              Thinking...
            </span>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <span className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-full">
              {error}
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="border-t border-zinc-800 p-3 space-y-2">
        {/* Text input toggle */}
        {isConnected && (
          <>
            {showTextInput ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendText()}
                  placeholder="Type a message..."
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-zinc-500"
                />
                <button
                  onClick={handleSendText}
                  disabled={!textInput.trim()}
                  className={`p-2 ${colors.bg} rounded-xl disabled:opacity-50 transition`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowTextInput(true)}
                className="w-full text-xs text-zinc-500 hover:text-zinc-400 flex items-center justify-center gap-1"
              >
                <MessageSquare className="w-3 h-3" />
                Type instead
              </button>
            )}
          </>
        )}

        {/* Call button */}
        <div className="flex justify-center">
          {!isConnected ? (
            <button
              onClick={connect}
              disabled={status === "connecting"}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-full font-medium text-sm transition disabled:opacity-50"
            >
              {status === "connecting" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Phone className="w-4 h-4" />
                  Start Call
                </>
              )}
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 rounded-full font-medium text-sm transition"
            >
              <PhoneOff className="w-4 h-4" />
              End Call
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Floating voice button component
interface VoiceButtonProps {
  onClick: () => void;
  isActive?: boolean;
  accentColor?: string;
}

export function VoiceButton({ onClick, isActive, accentColor = "purple" }: VoiceButtonProps) {
  const colorClasses: Record<string, string> = {
    purple: "bg-purple-600 hover:bg-purple-500",
    blue: "bg-blue-600 hover:bg-blue-500",
    emerald: "bg-emerald-600 hover:bg-emerald-500",
    amber: "bg-amber-600 hover:bg-amber-500",
    rose: "bg-rose-600 hover:bg-rose-500",
  };

  return (
    <button
      onClick={onClick}
      className={`fixed bottom-6 right-6 p-4 rounded-full shadow-lg transition-all z-50 ${
        isActive ? "bg-red-600 hover:bg-red-500" : colorClasses[accentColor] || colorClasses.purple
      }`}
    >
      {isActive ? (
        <PhoneOff className="w-6 h-6 text-white" />
      ) : (
        <Mic className="w-6 h-6 text-white" />
      )}
    </button>
  );
}
