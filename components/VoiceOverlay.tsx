"use client";

import { useState } from "react";
import { Mic, X } from "lucide-react";
import { VoiceChat } from "./VoiceChat";

interface VoiceOverlayProps {
  coachType: "life" | "career" | "call" | "roleplay";
  accentColor?: string;
}

const coachConfig = {
  life: { title: "Life Coach", subtitle: "Personal growth & wellbeing", color: "purple" },
  career: { title: "Career Coach", subtitle: "Strategic career advice", color: "blue" },
  call: { title: "Call Prep", subtitle: "Meeting preparation", color: "emerald" },
  roleplay: { title: "Roleplay Coach", subtitle: "Practice conversations", color: "amber" },
};

export function VoiceOverlay({ coachType, accentColor }: VoiceOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const config = coachConfig[coachType];
  const color = accentColor || config.color;

  const colorClasses: Record<string, string> = {
    purple: "bg-purple-600 hover:bg-purple-500",
    blue: "bg-blue-600 hover:bg-blue-500",
    emerald: "bg-emerald-600 hover:bg-emerald-500",
    amber: "bg-amber-600 hover:bg-amber-500",
    rose: "bg-rose-600 hover:bg-rose-500",
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-6 right-6 p-4 rounded-full shadow-lg transition-all z-50 ${colorClasses[color]}`}
          title={`Talk to ${config.title}`}
        >
          <Mic className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Voice Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md animate-in slide-in-from-bottom-4 duration-200">
            <VoiceChat
              sessionEndpoint={`/api/voice/coach?type=${coachType}`}
              title={config.title}
              subtitle={config.subtitle}
              accentColor={color}
              onClose={() => setIsOpen(false)}
              className="h-[70vh] sm:h-[500px]"
            />
          </div>
        </div>
      )}
    </>
  );
}
