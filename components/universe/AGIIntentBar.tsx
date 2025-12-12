// AGI Intent Bar - Natural language + voice interface
// components/universe/AGIIntentBar.tsx

"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Sparkles, Send, X } from "lucide-react";
import { classifyIntent, AGIIntentType } from "@/lib/universe/intent";
import { UniverseNodeConfig, UNIVERSE_NODES } from "@/lib/universe/config";
import { Button } from "@/components/ui/button";

interface AGIIntentBarProps {
  onIntent: (intent: AGIIntentType, result: any) => void;
  onNavigateRealm?: (realmId: string) => void;
  onSuggestFocus?: () => void;
}

export function AGIIntentBar({ onIntent, onNavigateRealm, onSuggestFocus }: AGIIntentBarProps) {
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const result = classifyIntent(input);
    setResponse(result.message || "Processing...");

    // Handle intent
    switch (result.type) {
      case "navigate_realm":
        if (result.targetRealm && onNavigateRealm) {
          const node = UNIVERSE_NODES.find((n) => n.id === result.targetRealm);
          if (node) {
            onNavigateRealm(result.targetRealm);
          }
        }
        break;
      case "suggest_focus":
        if (onSuggestFocus) {
          onSuggestFocus();
        }
        break;
      case "calm_me_down":
        // Navigate to wellness
        if (onNavigateRealm) {
          onNavigateRealm("wellness");
        }
        break;
      case "growth_push":
        // Navigate to growth
        if (onNavigateRealm) {
          onNavigateRealm("growth");
        }
        break;
      case "summarize_state":
        setResponse("Your universe is active. Life and Productivity are your strongest systems right now.");
        break;
      default:
        setResponse(result.message || "I'm not sure how to help with that. Try asking about a specific realm.");
    }

    onIntent(result.type, result);
    setInput("");
  };

  const handleVoiceClick = () => {
    setIsListening(!isListening);
    // TODO: Integrate with voice recognition
    if (!isListening) {
      setResponse("Voice input coming soon. For now, type your request.");
    }
  };

  useEffect(() => {
    if (response) {
      const timer = setTimeout(() => setResponse(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [response]);

  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 pointer-events-auto">
      {/* Response Panel */}
      <AnimatePresence>
        {response && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 px-6 py-4 rounded-2xl backdrop-blur-xl max-w-md"
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-white text-sm leading-relaxed flex-1">{response}</p>
              <button
                onClick={() => setResponse(null)}
                className="text-white/60 hover:text-white transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intent Bar */}
      <form onSubmit={handleSubmit} className="relative">
        <motion.div
          animate={{
            scale: isFocused ? 1.02 : 1,
            boxShadow: isFocused
              ? "0 10px 40px rgba(139, 92, 246, 0.4)"
              : "0 4px 20px rgba(0,0,0,0.2)",
          }}
          className="flex items-center gap-2 px-6 py-4 rounded-full backdrop-blur-xl"
          style={{
            background: isFocused
              ? "rgba(255, 255, 255, 0.2)"
              : "rgba(255, 255, 255, 0.15)",
            border: "2px solid rgba(255, 255, 255, 0.3)",
            minWidth: "400px",
          }}
        >
          <button
            type="button"
            onClick={handleVoiceClick}
            className={`p-2 rounded-full transition-colors ${
              isListening
                ? "bg-red-500/20 text-red-400"
                : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            <Mic className="w-5 h-5" />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Ask Pulse anything about your life…"
            className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/50 text-base"
          />

          <button
            type="submit"
            className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>

          <Sparkles className="w-5 h-5 text-purple-400" />
        </motion.div>
      </form>
    </div>
  );
}



