"use client";

import React, { useState, useEffect, useRef } from "react";
import { VoiceChat } from "./voice-chat";

interface CoachInterfaceProps {
  coach: string;
  coachName: string;
  coachIcon: string;
  coachDescription: string;
  context?: any;
}

export function CoachInterface({ coach, coachName, coachIcon, coachDescription, context }: CoachInterfaceProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
  const [messages, setMessages] = useState<Array<{ role: string; text: string }>>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [mode, setMode] = useState<"voice" | "text">("text");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch suggestions on mount
  useEffect(() => {
    fetchSuggestions();
  }, [coach]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchSuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const res = await fetch("/api/coach/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coach, count: 4 }),
      });
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch (e) {
      console.error("Failed to load suggestions:", e);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    handleSend(suggestion);
  };

  const handleSend = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim()) return;

    setInput("");
    setMessages(prev => [...prev, { role: "user", text: messageText }]);
    setIsTyping(true);

    try {
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coach, message: messageText, context, history: messages }),
      });
      const data = await res.json();
      
      setMessages(prev => [...prev, { role: "assistant", text: data.response }]);
      
      // Refresh suggestions after conversation
      if (messages.length > 0 && messages.length % 4 === 0) {
        fetchSuggestions();
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", text: "Sorry, I had trouble responding. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleVoiceTranscript = (text: string, role: "user" | "assistant") => {
    setMessages(prev => [...prev, { role, text }]);
    
    // Refresh suggestions periodically during voice chat
    if (role === "assistant" && messages.length > 0 && messages.length % 6 === 0) {
      fetchSuggestions();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-200px)]">
      {/* Mode Toggle */}
      <div className="flex justify-center mb-4">
        <div className="bg-zinc-900 rounded-full p-1 flex gap-1">
          <button
            onClick={() => setMode("text")}
            className={`px-4 py-2 rounded-full text-sm transition-all ${
              mode === "text" ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            💬 Text
          </button>
          <button
            onClick={() => setMode("voice")}
            className={`px-4 py-2 rounded-full text-sm transition-all ${
              mode === "voice" ? "bg-violet-600 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            🎙️ Voice
          </button>
        </div>
      </div>

      {mode === "voice" ? (
        /* Voice Mode */
        <div className="flex-1 flex flex-col items-center justify-center">
          <VoiceChat coach={coach} context={context} onTranscript={handleVoiceTranscript} />
          
          {/* Voice Transcript */}
          {messages.length > 0 && (
            <div className="mt-6 w-full max-w-md bg-zinc-900/50 rounded-xl p-4 max-h-48 overflow-y-auto">
              {messages.slice(-4).map((msg, i) => (
                <div key={i} className={`text-sm mb-2 ${msg.role === "user" ? "text-zinc-400" : "text-violet-300"}`}>
                  <span className="font-medium">{msg.role === "user" ? "You: " : `${coachName}: `}</span>
                  {msg.text}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Text Mode */
        <div className="flex-1 flex flex-col">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto mb-4 space-y-4 min-h-[200px]">
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">{coachIcon}</div>
                <h3 className="text-lg font-medium text-zinc-300">{coachName}</h3>
                <p className="text-sm text-zinc-500 max-w-md mx-auto">{coachDescription}</p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-violet-600 text-white"
                        : "bg-zinc-800 text-zinc-100"
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 rounded-2xl px-4 py-3 text-zinc-400">
                  <span className="animate-pulse">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          <div className="mb-4">
            {loadingSuggestions ? (
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-9 w-32 bg-zinc-800 rounded-full animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-sm text-zinc-300 hover:text-white transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
                <button
                  onClick={fetchSuggestions}
                  className="px-3 py-2 text-zinc-500 hover:text-zinc-300 text-sm"
                  title="Get new suggestions"
                >
                  🔄
                </button>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${coachName}...`}
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-violet-500"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              className="px-6 py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl font-medium transition-all"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}