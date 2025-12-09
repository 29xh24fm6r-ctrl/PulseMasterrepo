"use client";

import { useState } from "react";
import { Mic, Calendar, ListTodo, Brain, Zap } from "lucide-react";
import { VoiceChat } from "./VoiceChat";

interface PageVoiceProps {
  onClose?: () => void;
}

// Planner Voice Component
export function PlannerVoice() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-xl hover:border-blue-500/50 transition-all"
      >
        <Mic className="w-4 h-4 text-blue-400" />
        <span className="text-sm text-white">Voice Plan</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <VoiceChat
              sessionEndpoint="/api/voice/planner"
              title="Day Planner"
              subtitle="Plan your day by voice"
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

// Tasks Voice Component
export function TasksVoice() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600/20 to-green-600/20 border border-emerald-500/30 rounded-xl hover:border-emerald-500/50 transition-all"
      >
        <Mic className="w-4 h-4 text-emerald-400" />
        <span className="text-sm text-white">Voice Tasks</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <VoiceChat
              sessionEndpoint="/api/voice/tasks"
              title="Quick Tasks"
              subtitle="Add and manage tasks by voice"
              accentColor="emerald"
              onClose={() => setIsOpen(false)}
              className="h-[70vh] sm:h-[500px]"
            />
          </div>
        </div>
      )}
    </>
  );
}

// Third Brain Voice Component
export function ThirdBrainVoice() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600/20 to-purple-600/20 border border-violet-500/30 rounded-xl hover:border-violet-500/50 transition-all"
      >
        <Mic className="w-4 h-4 text-violet-400" />
        <span className="text-sm text-white">Voice Search</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <VoiceChat
              sessionEndpoint="/api/voice/third-brain"
              title="Third Brain"
              subtitle="Search your memory by voice"
              accentColor="purple"
              onClose={() => setIsOpen(false)}
              className="h-[70vh] sm:h-[500px]"
            />
          </div>
        </div>
      )}
    </>
  );
}

// Autonomy Voice Component
export function AutonomyVoice() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-500/30 rounded-xl hover:border-amber-500/50 transition-all"
      >
        <Mic className="w-4 h-4 text-amber-400" />
        <span className="text-sm text-white">Voice AI</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <VoiceChat
              sessionEndpoint="/api/voice/autonomy"
              title="Autonomy"
              subtitle="Get AI suggestions by voice"
              accentColor="amber"
              onClose={() => setIsOpen(false)}
              className="h-[70vh] sm:h-[500px]"
            />
          </div>
        </div>
      )}
    </>
  );
}

// Compact mic buttons for tight spaces
export function PlannerVoiceButton() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button onClick={() => setIsOpen(true)} className="p-2 bg-blue-600/20 border border-blue-500/30 rounded-lg hover:border-blue-500/50" title="Voice plan">
        <Mic className="w-4 h-4 text-blue-400" />
      </button>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md animate-in slide-in-from-bottom-4 duration-200">
            <VoiceChat sessionEndpoint="/api/voice/planner" title="Day Planner" subtitle="Plan by voice" accentColor="blue" onClose={() => setIsOpen(false)} className="h-[70vh] sm:h-[500px]" />
          </div>
        </div>
      )}
    </>
  );
}

export function TasksVoiceButton() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button onClick={() => setIsOpen(true)} className="p-2 bg-emerald-600/20 border border-emerald-500/30 rounded-lg hover:border-emerald-500/50" title="Voice tasks">
        <Mic className="w-4 h-4 text-emerald-400" />
      </button>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md animate-in slide-in-from-bottom-4 duration-200">
            <VoiceChat sessionEndpoint="/api/voice/tasks" title="Quick Tasks" subtitle="Manage tasks by voice" accentColor="emerald" onClose={() => setIsOpen(false)} className="h-[70vh] sm:h-[500px]" />
          </div>
        </div>
      )}
    </>
  );
}

export function ThirdBrainVoiceButton() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button onClick={() => setIsOpen(true)} className="p-2 bg-violet-600/20 border border-violet-500/30 rounded-lg hover:border-violet-500/50" title="Voice search">
        <Mic className="w-4 h-4 text-violet-400" />
      </button>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md animate-in slide-in-from-bottom-4 duration-200">
            <VoiceChat sessionEndpoint="/api/voice/third-brain" title="Third Brain" subtitle="Search memory by voice" accentColor="purple" onClose={() => setIsOpen(false)} className="h-[70vh] sm:h-[500px]" />
          </div>
        </div>
      )}
    </>
  );
}

export function AutonomyVoiceButton() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button onClick={() => setIsOpen(true)} className="p-2 bg-amber-600/20 border border-amber-500/30 rounded-lg hover:border-amber-500/50" title="Voice AI">
        <Mic className="w-4 h-4 text-amber-400" />
      </button>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md animate-in slide-in-from-bottom-4 duration-200">
            <VoiceChat sessionEndpoint="/api/voice/autonomy" title="Autonomy" subtitle="AI suggestions by voice" accentColor="amber" onClose={() => setIsOpen(false)} className="h-[70vh] sm:h-[500px]" />
          </div>
        </div>
      )}
    </>
  );
}
