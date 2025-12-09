"use client";

import { useState } from "react";
import Link from "next/link";
import { VoiceChat } from "@/app/components/voice-chat";

export default function VoiceTestPage() {
  const [transcript, setTranscript] = useState<Array<{ role: string; text: string }>>([]);
  const [selectedCoach, setSelectedCoach] = useState("life-coach");

  const coaches = [
    { id: "life-coach", name: "Life Coach", icon: "🎯" },
    { id: "career-coach", name: "Career Coach", icon: "💼" },
    { id: "roleplay-coach", name: "Roleplay Coach", icon: "🎭" },
    { id: "call-coach", name: "Call Coach", icon: "📞" },
    { id: "oracle", name: "Oracle", icon: "🔮" },
  ];

  const handleTranscript = (text: string, role: "user" | "assistant") => {
    setTranscript(prev => [...prev, { role, text }]);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-violet-400">🎙️ Voice Chat</h1>
          <p className="text-sm text-zinc-500">Talk naturally with Pulse AI coaches</p>
        </div>
        <Link href="/" className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg">
          ← Back
        </Link>
      </header>

      {/* Coach Selector */}
      <div className="flex flex-wrap gap-2 mb-8 justify-center">
        {coaches.map((coach) => (
          <button
            key={coach.id}
            onClick={() => setSelectedCoach(coach.id)}
            className={`px-4 py-2 rounded-lg transition-all ${
              selectedCoach === coach.id
                ? "bg-violet-600 text-white"
                : "bg-zinc-800 hover:bg-zinc-700"
            }`}
          >
            {coach.icon} {coach.name}
          </button>
        ))}
      </div>

      {/* Voice Chat */}
      <div className="max-w-md mx-auto mb-8">
        <VoiceChat
          coach={selectedCoach}
          onTranscript={handleTranscript}
        />
      </div>

      {/* Transcript */}
      {transcript.length > 0 && (
        <div className="max-w-2xl mx-auto bg-zinc-900 rounded-xl p-4 border border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-400 mb-3">Conversation</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {transcript.map((item, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg ${
                  item.role === "user"
                    ? "bg-zinc-800 ml-8"
                    : "bg-violet-900/30 mr-8"
                }`}
              >
                <p className="text-xs text-zinc-500 mb-1">
                  {item.role === "user" ? "You" : "Pulse"}
                </p>
                <p className="text-sm">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}