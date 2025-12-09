"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { Mic, MicOff, Volume2, VolumeX, Loader2, Sparkles, X } from "lucide-react";

type JarvisState = "idle" | "listening" | "processing" | "speaking";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function JarvisPage() {
  const { userId } = useAuth();
  const [state, setState] = useState<JarvisState>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [transcript, setTranscript] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [waveform, setWaveform] = useState<number[]>(Array(20).fill(0.1));
  
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: any) => {
        const current = event.resultIndex;
        const result = event.results[current];
        const transcriptText = result[0].transcript;
        setTranscript(transcriptText);

        if (result.isFinal) {
          handleUserInput(transcriptText);
        }
      };

      recognitionRef.current.onend = () => {
        if (state === "listening") {
          setState("processing");
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setState("idle");
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Animate waveform
  useEffect(() => {
    if (state === "listening" || state === "speaking") {
      const interval = setInterval(() => {
        setWaveform(prev => prev.map(() => 0.1 + Math.random() * 0.9));
      }, 100);
      return () => clearInterval(interval);
    } else {
      setWaveform(Array(20).fill(0.1));
    }
  }, [state]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && state === "idle") {
      setTranscript("");
      setState("listening");
      recognitionRef.current.start();
    }
  }, [state]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (isMuted) return;
    
    setState("speaking");
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Try to use a natural voice
    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.includes("Samantha") || 
      v.name.includes("Google") || 
      v.name.includes("Natural")
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onend = () => {
      setState("idle");
    };

    synthRef.current = utterance;
    speechSynthesis.speak(utterance);
  }, [isMuted]);

  const handleUserInput = async (input: string) => {
    if (!input.trim()) {
      setState("idle");
      return;
    }

    // Add user message
    setMessages(prev => [...prev, { role: "user", content: input, timestamp: new Date() }]);
    setTranscript("");
    setState("processing");

    try {
      const response = await fetch("/api/jarvis/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: input }),
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage = data.spoken || data.response || "I'm not sure how to help with that.";
        
        setMessages(prev => [...prev, { 
          role: "assistant", 
          content: assistantMessage, 
          timestamp: new Date() 
        }]);
        
        speak(assistantMessage);
      } else {
        throw new Error("Request failed");
      }
    } catch (error) {
      console.error("Jarvis error:", error);
      const errorMessage = "Sorry, I encountered an error. Please try again.";
      setMessages(prev => [...prev, { role: "assistant", content: errorMessage, timestamp: new Date() }]);
      speak(errorMessage);
    }
  };

  const toggleMute = () => {
    setIsMuted(prev => !prev);
    if (!isMuted && synthRef.current) {
      speechSynthesis.cancel();
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p>Please sign in to access Jarvis</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            state === "idle" ? "bg-zinc-600" :
            state === "listening" ? "bg-green-500 animate-pulse" :
            state === "processing" ? "bg-yellow-500 animate-pulse" :
            "bg-violet-500 animate-pulse"
          }`} />
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            Jarvis Mode
          </h1>
        </div>
        <button
          onClick={toggleMute}
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-zinc-500" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Ambient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-violet-900/10 via-transparent to-cyan-900/10 pointer-events-none" />
        
        {/* Voice visualization */}
        <div className="flex items-end gap-1 h-32 mb-8">
          {waveform.map((height, i) => (
            <div
              key={i}
              className={`w-2 rounded-full transition-all duration-100 ${
                state === "listening" ? "bg-green-500" :
                state === "speaking" ? "bg-violet-500" :
                "bg-zinc-700"
              }`}
              style={{ height: `${height * 100}%` }}
            />
          ))}
        </div>

        {/* Status text */}
        <p className="text-2xl font-light text-zinc-300 mb-4">
          {state === "idle" && "Tap to speak"}
          {state === "listening" && (transcript || "Listening...")}
          {state === "processing" && "Thinking..."}
          {state === "speaking" && "Speaking..."}
        </p>

        {/* Main button */}
        <button
          onClick={state === "listening" ? stopListening : startListening}
          disabled={state === "processing" || state === "speaking"}
          className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
            state === "listening" 
              ? "bg-red-600 hover:bg-red-700 scale-110" 
              : state === "processing" || state === "speaking"
                ? "bg-zinc-700 cursor-not-allowed"
                : "bg-gradient-to-br from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 hover:scale-105"
          }`}
        >
          {state === "processing" ? (
            <Loader2 className="w-10 h-10 animate-spin" />
          ) : state === "listening" ? (
            <MicOff className="w-10 h-10" />
          ) : (
            <Mic className="w-10 h-10" />
          )}
        </button>

        {/* Quick commands */}
        <div className="flex flex-wrap justify-center gap-2 mt-8 max-w-lg">
          {[
            "How am I doing today?",
            "What's my next task?",
            "How am I feeling?",
            "Summarize yesterday",
            "Run a simulation"
          ].map((cmd) => (
            <button
              key={cmd}
              onClick={() => handleUserInput(cmd)}
              disabled={state !== "idle"}
              className="px-3 py-1.5 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-full text-sm text-zinc-400 disabled:opacity-50 transition-colors"
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>

      {/* Message history (collapsible) */}
      {messages.length > 0 && (
        <div className="border-t border-zinc-800 max-h-64 overflow-y-auto">
          <div className="p-4 space-y-3">
            {messages.slice(-6).map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                  msg.role === "user" 
                    ? "bg-violet-600 text-white" 
                    : "bg-zinc-800 text-zinc-200"
                }`}>
                  <p className="text-sm">{msg.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}