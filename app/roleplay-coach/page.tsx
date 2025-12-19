"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { CoachModal } from "@/app/components/coach-modal";
import { VoiceOverlay } from "@/components/VoiceOverlay";

import {
  ArrowLeft,
  MessageCircle,
  Send,
  Settings,
  Play,
  Square,
  User,
  Bot,
  Sparkles,
  Zap,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from "lucide-react";

/* =========================
   Types
========================= */

type RoleplayState = "SETUP" | "ROLEPLAY" | "COACH";

type ContextType =
  | "business"
  | "sales"
  | "leadership"
  | "interview"
  | "networking"
  | "dating"
  | "romantic"
  | "family"
  | "friends"
  | "personal_conflict"
  | "social_skills_practice"
  | "other";

interface Message {
  role: "user" | "character" | "coach" | "system";
  content: string;
  timestamp: Date;
}

interface SessionConfig {
  scenario_description: string;
  user_goal: string;
  difficulty: number;
  context_type: ContextType;
  user_profile?: {
    social_confidence: number;
    anxiety_level: number;
    prefers_short_turns: boolean;
    wants_soft_training: boolean;
  };
}

/* =========================
   Constants
========================= */

const CONTEXT_OPTIONS: { value: ContextType; label: string; icon: string }[] = [
  { value: "sales", label: "Sales Call", icon: "💼" },
  { value: "interview", label: "Job Interview", icon: "🎤" },
  { value: "leadership", label: "Leadership", icon: "👔" },
  { value: "networking", label: "Networking", icon: "🤝" },
  { value: "dating", label: "Dating", icon: "💕" },
  { value: "romantic", label: "Romantic", icon: "❤️" },
  { value: "family", label: "Family", icon: "👨‍👩‍👧" },
  { value: "friends", label: "Friends", icon: "👯" },
  { value: "personal_conflict", label: "Conflict", icon: "⚖️" },
  { value: "social_skills_practice", label: "Social Skills", icon: "🗣️" },
  { value: "business", label: "Business", icon: "📊" },
  { value: "other", label: "Other", icon: "✨" },
];

const SCENARIO_TEMPLATES: Record<
  ContextType,
  { scenarios: string[]; goals: string[] }
> = {
  sales: {
    scenarios: [
      "Cold call to a skeptical decision-maker",
      "Discovery call with a new prospect",
      "Handling pricing objections",
      "Closing call for a large deal",
    ],
    goals: [
      "Book a follow-up meeting",
      "Understand pain points",
      "Handle objections",
      "Get commitment",
    ],
  },
  interview: {
    scenarios: ["Phone screen", "Final interview", "Salary negotiation"],
    goals: ["Strong impression", "Show experience", "Negotiate offer"],
  },
  dating: {
    scenarios: ["First date", "Second date", "Define relationship"],
    goals: ["Build connection", "Be authentic", "Communicate intentions"],
  },
  romantic: {
    scenarios: ["Discuss an issue", "Future plans", "Resolve conflict"],
    goals: ["Be heard", "Find common ground", "Repair trust"],
  },
  family: {
    scenarios: ["Set boundaries", "Sensitive discussion"],
    goals: ["Stay calm", "Be respected"],
  },
  friends: {
    scenarios: ["Address distance", "Resolve conflict"],
    goals: ["Strengthen friendship", "Restore trust"],
  },
  personal_conflict: {
    scenarios: ["Misunderstanding", "Apology"],
    goals: ["Clear issue", "Move forward"],
  },
  social_skills_practice: {
    scenarios: ["Start conversation", "Join group"],
    goals: ["Feel confident", "Integrate naturally"],
  },
  leadership: {
    scenarios: ["Give feedback", "Motivate team"],
    goals: ["Be constructive", "Inspire action"],
  },
  networking: {
    scenarios: ["Conference intro", "Follow-up"],
    goals: ["Make impression", "Build connection"],
  },
  business: {
    scenarios: ["Stakeholder presentation", "Negotiation"],
    goals: ["Get buy-in", "Reach agreement"],
  },
  other: {
    scenarios: ["Custom scenario"],
    goals: ["Custom goal"],
  },
};

/* =========================
   Component
========================= */

export default function RoleplayCoachPage() {
  const [state, setState] = useState<RoleplayState>("SETUP");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [characterName, setCharacterName] = useState("Character");
  const [moodHint, setMoodHint] = useState<string | null>(null);
  const [suggestedResponses, setSuggestedResponses] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [summary, setSummary] = useState<any>(null);

  const [config, setConfig] = useState<SessionConfig>({
    scenario_description: "",
    user_goal: "",
    difficulty: 3,
    context_type: "sales",
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* =========================
     Render: Setup
  ========================= */

  if (state === "SETUP") {
    const templates = SCENARIO_TEMPLATES[config.context_type];

    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <header className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-zinc-800 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-violet-400" />
                Roleplay Coach
              </h1>
              <p className="text-zinc-400 text-sm">
                Practice any conversation scenario
              </p>
            </div>
          </header>

          <button
            onClick={() => setState("ROLEPLAY")}
            className="w-full py-4 bg-violet-600 rounded-xl font-medium flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            Start Roleplay
          </button>
        </div>
      </main>
    );
  }

  /* =========================
     Render: Roleplay / Coach
  ========================= */

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/coaches" className="p-2 hover:bg-zinc-800 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div>
              <h1 className="font-semibold flex items-center gap-2">
                {state === "ROLEPLAY" ? (
                  <>
                    <User className="w-4 h-4 text-violet-400" />
                    Talking to: {characterName}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Coach Feedback
                  </>
                )}
              </h1>

              {moodHint && state === "ROLEPLAY" && (
                <p className="text-xs text-zinc-500">{moodHint}</p>
              )}
            </div>
          </div>

          {state === "ROLEPLAY" && (
            <button
              onClick={() => setState("COACH")}
              className="px-4 py-2 bg-red-600/20 text-red-400 rounded-lg text-sm flex items-center gap-2"
            >
              <Square className="w-4 h-4" />
              End Session
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className="flex">
            <div className="bg-zinc-800 rounded-xl px-4 py-3 text-sm">
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {state === "ROLEPLAY" && (
        <div className="border-t border-zinc-800 p-4">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-4 py-3 bg-zinc-800 rounded-xl"
            />
            <button className="px-4 bg-violet-600 rounded-xl">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <CoachModal
        coach="roleplay-coach"
        coachName="Roleplay Coach"
        coachIcon="🎭"
        coachDescription="Practice difficult conversations"
      />
    </main>
  );
}
