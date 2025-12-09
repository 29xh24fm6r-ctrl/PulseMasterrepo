"use client";

import { useState } from "react";
import { Mic, X, Sparkles } from "lucide-react";
import { VoiceChat } from "./VoiceChat";

export function DashboardVoiceWidget() {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isExpanded) {
    return (
      <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
        <VoiceChat
          sessionEndpoint="/api/voice/realtime-config"
          title="Pulse Assistant"
          subtitle="Ask me anything"
          accentColor="purple"
          onClose={() => setIsExpanded(false)}
          className="h-[400px]"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsExpanded(true)}
      className="w-full bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-2xl p-6 hover:border-purple-500/50 transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Mic className="w-7 h-7 text-white" />
        </div>
        <div className="text-left">
          <h3 className="font-semibold text-white flex items-center gap-2">
            Talk to Pulse
            <Sparkles className="w-4 h-4 text-purple-400" />
          </h3>
          <p className="text-sm text-zinc-400">
            Ask about your schedule, tasks, contacts, or get coaching
          </p>
        </div>
      </div>
    </button>
  );
}

