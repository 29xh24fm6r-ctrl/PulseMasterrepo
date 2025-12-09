"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Mic,
  MicOff,
  ArrowLeft,
  Send,
  Loader2,
  Phone,
  PhoneOff,
  Volume2,
  Sparkles,
  MessageSquare,
  Calendar,
  ListTodo,
  Users,
  Brain,
} from "lucide-react";
import { useRealtimeVoice } from "@/lib/hooks/useRealtimeVoice";

export default function VoicePage() {
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
  } = useRealtimeVoice({ 
    sessionEndpoint: "/api/voice/realtime-config" 
  });

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

  const quickPrompts = [
    { icon: Calendar, text: "What's on my calendar?", color: "text-blue-400" },
    { icon: ListTodo, text: "What should I focus on?", color: "text-emerald-400" },
    { icon: Users, text: "Tell me about my contacts", color: "text-amber-400" },
    { icon: Brain, text: "How am I doing?", color: "text-purple-400" },
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 hover:bg-zinc-800 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <div>
              <h1 className="font-semibold">Pulse Voice</h1>
              <p className="text-xs text-zinc-500">Your AI Executive Assistant</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && (
            <span className="flex items-center gap-2 text-sm text-emerald-400">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Live
            </span>
          )}
        </div>
      </header>

      {/* Capabilities Banner */}
      {!isConnected && messages.length === 0 && (
        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
          <p className="text-xs text-zinc-400 text-center">
            Pulse can access your calendar, tasks, contacts, and more
          </p>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !isConnected && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-4">
              <Mic className="w-10 h-10 text-white" />
            </div>
            <p className="text-lg font-medium mb-1">Talk to Pulse</p>
            <p className="text-sm text-zinc-500 mb-6">
              Your voice-activated executive assistant
            </p>

            {/* Quick prompts */}
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              {quickPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => {
                    connect();
                  }}
                  className="flex items-center gap-2 p-3 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition text-left"
                >
                  <prompt.icon className={`w-4 h-4 ${prompt.color}`} />
                  <span className="text-xs text-zinc-300">{prompt.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                msg.role === "user"
                  ? "bg-purple-600 text-white rounded-br-sm"
                  : "bg-zinc-800 text-white rounded-bl-sm"
              }`}
            >
              <p className="text-sm">{msg.content}</p>
              <p className="text-[10px] mt-1 opacity-60">
                {msg.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}

        {/* Current transcript (streaming) */}
        {currentTranscript && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-4 py-2 bg-zinc-800 text-white rounded-bl-sm">
              <p className="text-sm">{currentTranscript}</p>
              <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-1" />
            </div>
          </div>
        )}

        {/* Status indicators */}
        {isUserSpeaking && (
          <div className="flex justify-center">
            <span className="text-xs text-zinc-500 flex items-center gap-2">
              <Mic className="w-3 h-3 text-red-400 animate-pulse" />
              Listening...
            </span>
          </div>
        )}

        {isAssistantSpeaking && !currentTranscript && (
          <div className="flex justify-center">
            <span className="text-xs text-zinc-500 flex items-center gap-2">
              <Volume2 className="w-3 h-3 text-purple-400 animate-pulse" />
              Pulse is speaking...
            </span>
          </div>
        )}

        {status === "processing" && (
          <div className="flex justify-center">
            <span className="text-xs text-zinc-500 flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              Thinking...
            </span>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <span className="text-xs text-red-400 bg-red-500/10 px-3 py-1 rounded-full">
              {error}
            </span>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-zinc-800 p-4 space-y-3">
        {/* Text input (fallback) */}
        {isConnected && (
          <div className="flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendText()}
              placeholder="Type a message..."
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={handleSendText}
              disabled={!textInput.trim()}
              className="p-2 bg-purple-600 rounded-xl hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Call button */}
        <div className="flex justify-center">
          {!isConnected ? (
            <button
              onClick={connect}
              disabled={status === "connecting"}
              className="flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-full font-medium transition disabled:opacity-50"
            >
              {status === "connecting" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Phone className="w-5 h-5" />
                  Start Call
                </>
              )}
            </button>
          ) : (
            <button
              onClick={disconnect}
              className="flex items-center gap-2 px-8 py-4 bg-red-600 hover:bg-red-500 rounded-full font-medium transition"
            >
              <PhoneOff className="w-5 h-5" />
              End Call
            </button>
          )}
        </div>

        {isConnected && (
          <p className="text-center text-xs text-zinc-500">
            Ask about your calendar, tasks, contacts, or just chat
          </p>
        )}
      </div>
    </div>
  );
}
