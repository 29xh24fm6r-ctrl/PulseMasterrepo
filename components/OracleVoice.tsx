"use client";

import { useState } from "react";
import { Search, Mic, X } from "lucide-react";
import { VoiceChat } from "./VoiceChat";

export function OracleVoice() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-500/30 rounded-xl hover:border-cyan-500/50 transition-all"
      >
        <Mic className="w-4 h-4 text-cyan-400" />
        <span className="text-sm text-white">Voice Search</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md animate-in zoom-in-95 duration-200">
            <VoiceChat
              sessionEndpoint="/api/voice/oracle"
              title="Oracle Voice"
              subtitle="Ask about any contact"
              accentColor="blue"
              onClose={() => setIsOpen(false)}
              className="h-[500px]"
            />
          </div>
        </div>
      )}
    </>
  );
}

// Compact oracle voice button for embedding in other pages
export function OracleVoiceButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 bg-cyan-600/20 border border-cyan-500/30 rounded-lg hover:border-cyan-500/50 transition-all"
        title="Voice search contacts"
      >
        <Mic className="w-4 h-4 text-cyan-400" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <VoiceChat
              sessionEndpoint="/api/voice/oracle"
              title="Oracle"
              subtitle="Search contacts by voice"
              accentColor="blue"
              onClose={() => setIsOpen(false)}
              className="h-[70vh] sm:h-[500px]"
            />
          </div>
        </div>
      )}
    </>
  );
}
