"use client";
import { VoiceOverlay } from "@/components/VoiceOverlay";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { CoachModal } from "@/app/components/coach-modal";
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
  Target,
  Zap,
  ChevronDown,
  ChevronUp,
  HelpCircle,
} from "lucide-react";

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

const CONTEXT_OPTIONS: { value: ContextType; label: string; icon: string }[] = [
  { value: "sales", label: "Sales Call", icon: "💼" },
  { value: "interview", label: "Job Interview", icon: "🎤" },
  { value: "leadership", label: "Leadership/Management", icon: "👔" },
  { value: "networking", label: "Networking", icon: "🤝" },
  { value: "dating", label: "Dating", icon: "💕" },
  { value: "romantic", label: "Romantic Partner", icon: "❤️" },
  { value: "family", label: "Family", icon: "👨‍👩‍👧" },
  { value: "friends", label: "Friends", icon: "👯" },
  { value: "personal_conflict", label: "Conflict Resolution", icon: "⚖️" },
  { value: "social_skills_practice", label: "Social Skills", icon: "🗣️" },
  { value: "business", label: "Business", icon: "📊" },
  { value: "other", label: "Other", icon: "✨" },
];

const SCENARIO_TEMPLATES: Record<ContextType, { scenarios: string[]; goals: string[] }> = {
  sales: {
    scenarios: [
      "Cold call to a skeptical decision-maker",
      "Discovery call with a new prospect",
      "Handling pricing objections",
      "Closing call for a large deal",
    ],
    goals: [
      "Book a follow-up meeting",
      "Understand their pain points",
      "Handle the 'too expensive' objection",
      "Get verbal commitment to move forward",
    ],
  },
  interview: {
    scenarios: [
      "First round phone screen",
      "Final round with hiring manager",
      "Salary negotiation",
      "Behavioral interview",
    ],
    goals: [
      "Make a strong first impression",
      "Demonstrate relevant experience",
      "Negotiate a fair compensation",
      "Show leadership qualities",
    ],
  },
  dating: {
    scenarios: [
      "First date at a coffee shop",
      "Second date dinner conversation",
      "Meeting their friends",
      "Defining the relationship talk",
    ],
    goals: [
      "Build genuine connection",
      "Show authentic personality",
      "Make a good impression",
      "Communicate intentions clearly",
    ],
  },
  romantic: {
    scenarios: [
      "Discussing a recurring issue",
      "Talking about future plans",
      "Addressing feeling unappreciated",
      "Working through a disagreement",
    ],
    goals: [
      "Be heard and understood",
      "Find common ground",
      "Express needs without blame",
      "Repair and reconnect",
    ],
  },
  family: {
    scenarios: [
      "Setting boundaries with a parent",
      "Discussing life choices they disagree with",
      "Handling holiday stress",
      "Talking about sensitive topics",
    ],
    goals: [
      "Maintain relationship while setting limits",
      "Be respected as an adult",
      "Keep peace while being authentic",
      "Have a productive conversation",
    ],
  },
  friends: {
    scenarios: [
      "Addressing a friend who's been distant",
      "Setting boundaries with a needy friend",
      "Discussing money they owe you",
      "Reconnecting after a fight",
    ],
    goals: [
      "Strengthen the friendship",
      "Address the issue calmly",
      "Resolve the situation fairly",
      "Rebuild trust",
    ],
  },
  personal_conflict: {
    scenarios: [
      "Resolving a misunderstanding",
      "Addressing hurt feelings",
      "Working through a betrayal",
      "Apologizing for a mistake",
    ],
    goals: [
      "Clear up the misunderstanding",
      "Feel heard and validated",
      "Decide how to move forward",
      "Make amends genuinely",
    ],
  },
  social_skills_practice: {
    scenarios: [
      "Starting conversation with a stranger",
      "Making small talk at a party",
      "Joining a group conversation",
      "Ending a conversation gracefully",
    ],
    goals: [
      "Feel comfortable initiating",
      "Keep conversation flowing",
      "Integrate naturally",
      "Leave a positive impression",
    ],
  },
  leadership: {
    scenarios: [
      "Giving difficult feedback to a direct report",
      "Motivating an underperforming team member",
      "Managing up to your boss",
      "Leading a team through change",
    ],
    goals: [
      "Deliver feedback constructively",
      "Inspire improved performance",
      "Advocate for your needs",
      "Build team confidence",
    ],
  },
  networking: {
    scenarios: [
      "Introducing yourself at a conference",
      "Following up after meeting someone",
      "Asking for an introduction",
      "Building rapport with a new contact",
    ],
    goals: [
      "Make a memorable impression",
      "Establish ongoing connection",
      "Get the introduction",
      "Find common ground",
    ],
  },
  business: {
    scenarios: [
      "Presenting to stakeholders",
      "Negotiating a contract",
      "Handling a difficult client",
      "Cross-functional collaboration",
    ],
    goals: [
      "Get buy-in on proposal",
      "Reach favorable terms",
      "Resolve client concerns",
      "Align on shared goals",
    ],
  },
  other: {
    scenarios: ["Custom scenario"],
    goals: ["Custom goal"],
  },
};

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

  // Setup form state
  const [config, setConfig] = useState<SessionConfig>({
    scenario_description: "",
    user_goal: "",
    difficulty: 3,
    context_type: "sales",
    user_profile: {
      social_confidence: 3,
      anxiety_level: 2,
      prefers_short_turns: false,
      wants_soft_training: false,
    },
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function startSession() {
    if (!config.scenario_description || !config.user_goal) {
      alert("Please fill in the scenario and your goal");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/roleplay-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", config }),
      });
      const data = await res.json();

      setSessionId(data.session_id);
      setState(data.state);
      setCharacterName(data.character_name || "Character");
      setMessages([{ role: "system", content: data.message, timestamp: new Date() }]);
      if (data.suggested_responses) {
        setSuggestedResponses(data.suggested_responses);
      }
    } catch (err) {
      console.error("Failed to start session:", err);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(messageText?: string) {
    const text = messageText || input.trim();
    if (!text || !sessionId) return;

    setInput("");
    setLoading(true);
    setSuggestedResponses([]);

    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: text, timestamp: new Date() }]);

    try {
      const res = await fetch("/api/roleplay-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "message", session_id: sessionId, message: text }),
      });
      const data = await res.json();

      setState(data.state);
      if (data.internal_hint) setMoodHint(data.internal_hint);
      if (data.suggested_responses) setSuggestedResponses(data.suggested_responses);

      if (data.state === "COACH") {
        setMessages((prev) => [...prev, { role: "coach", content: data.message, timestamp: new Date() }]);
        if (data.summary) setSummary(data.summary);
      } else {
        setMessages((prev) => [...prev, { role: "character", content: data.message, timestamp: new Date() }]);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function endSession() {
    if (!sessionId) return;
    setLoading(true);

    try {
      const res = await fetch("/api/roleplay-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end", session_id: sessionId }),
      });
      const data = await res.json();

      setState("COACH");
      setMessages((prev) => [...prev, { role: "coach", content: data.message, timestamp: new Date() }]);
      if (data.summary) setSummary(data.summary);
    } catch (err) {
      console.error("Failed to end session:", err);
    } finally {
      setLoading(false);
    }
  }

  function resetSession() {
    setState("SETUP");
    setSessionId(null);
    setMessages([]);
    setMoodHint(null);
    setSuggestedResponses([]);
    setSummary(null);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function selectTemplate(scenario: string, goal: string) {
    setConfig((prev) => ({
      ...prev,
      scenario_description: scenario,
      user_goal: goal,
    }));
  }

  // ==========================================
  // RENDER: SETUP STATE
  // ==========================================
  if (state === "SETUP") {
    const templates = SCENARIO_TEMPLATES[config.context_type];

    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-zinc-800 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <MessageCircle className="w-7 h-7 text-violet-400" />
                Roleplay Coach
              </h1>
              <p className="text-zinc-400 text-sm">Practice any conversation scenario</p>
            </div>
          </div>

          {/* Context Type */}
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-5">
            <h2 className="font-semibold mb-3">What type of conversation?</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {CONTEXT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setConfig((prev) => ({ ...prev, context_type: opt.value }))}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    config.context_type === opt.value
                      ? "border-violet-500 bg-violet-500/10"
                      : "border-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <div className="text-xs mt-1">{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Templates */}
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-5">
            <h2 className="font-semibold mb-3">Quick Start Templates</h2>
            <div className="space-y-2">
              {templates.scenarios.slice(0, 4).map((scenario, i) => (
                <button
                  key={i}
                  onClick={() => selectTemplate(scenario, templates.goals[i] || templates.goals[0])}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                    config.scenario_description === scenario
                      ? "border-violet-500 bg-violet-500/10"
                      : "border-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  <div className="font-medium text-sm">{scenario}</div>
                  <div className="text-xs text-zinc-500">Goal: {templates.goals[i] || templates.goals[0]}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Scenario */}
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-5">
            <h2 className="font-semibold mb-3">Or describe your scenario</h2>
            <textarea
              value={config.scenario_description}
              onChange={(e) => setConfig((prev) => ({ ...prev, scenario_description: e.target.value }))}
              placeholder="Describe the situation... (e.g., 'I need to ask my boss for a raise after a successful project')"
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-sm resize-none focus:outline-none focus:border-violet-500"
              rows={3}
            />
            <div className="mt-3">
              <label className="text-sm text-zinc-400 mb-1 block">Your goal for this conversation</label>
              <input
                type="text"
                value={config.user_goal}
                onChange={(e) => setConfig((prev) => ({ ...prev, user_goal: e.target.value }))}
                placeholder="What do you want to achieve?"
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          {/* Difficulty */}
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-5">
            <h2 className="font-semibold mb-3">Difficulty</h2>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((d) => (
                <button
                  key={d}
                  onClick={() => setConfig((prev) => ({ ...prev, difficulty: d }))}
                  className={`flex-1 py-2 rounded-lg border text-sm transition-all ${
                    config.difficulty === d
                      ? "border-violet-500 bg-violet-500/10 text-violet-400"
                      : "border-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  {"⭐".repeat(d)}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              {config.difficulty <= 2 && "Easy: More forgiving, obvious openings to succeed"}
              {config.difficulty === 3 && "Moderate: Realistic baseline difficulty"}
              {config.difficulty >= 4 && "Challenging: Less forgiving, requires excellent communication"}
            </p>
          </div>

          {/* Advanced Options */}
          <div className="bg-zinc-900/80 rounded-xl border border-zinc-800">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full p-4 flex items-center justify-between text-left"
            >
              <span className="font-semibold flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Advanced Options
              </span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showAdvanced && (
              <div className="px-5 pb-5 space-y-4">
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Your social confidence (1-5)</label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={config.user_profile?.social_confidence || 3}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        user_profile: { ...prev.user_profile!, social_confidence: parseInt(e.target.value) as any },
                      }))
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-sm text-zinc-400 mb-2 block">Anxiety level (1-5)</label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={config.user_profile?.anxiety_level || 2}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        user_profile: { ...prev.user_profile!, anxiety_level: parseInt(e.target.value) as any },
                      }))
                    }
                    className="w-full"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.user_profile?.wants_soft_training || false}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        user_profile: { ...prev.user_profile!, wants_soft_training: e.target.checked },
                      }))
                    }
                    className="rounded"
                  />
                  <span className="text-sm">Gentle training mode (more encouraging feedback)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.user_profile?.prefers_short_turns || false}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        user_profile: { ...prev.user_profile!, prefers_short_turns: e.target.checked },
                      }))
                    }
                    className="rounded"
                  />
                  <span className="text-sm">Prefer short responses</span>
                </label>
              </div>
            )}
          </div>

          {/* Start Button */}
          <button
            onClick={startSession}
            disabled={loading || !config.scenario_description || !config.user_goal}
            className="w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium text-lg flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            Start Roleplay
          </button>
        </div>
      </main>
    );
  }

  // ==========================================
  // RENDER: ROLEPLAY & COACH STATE
  // ==========================================
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={resetSession} className="p-2 hover:bg-zinc-800 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
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
            onClick={endSession}
            className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm flex items-center gap-2"
          >
            <Square className="w-4 h-4" />
            End & Get Feedback
          </button>
        )}
        {state === "COACH" && (
          <button
            onClick={resetSession}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg text-sm flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            New Session
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-violet-600 text-white"
                  : msg.role === "system"
                  ? "bg-zinc-800 text-zinc-300"
                  : msg.role === "coach"
                  ? "bg-amber-900/30 border border-amber-500/30 text-zinc-100"
                  : "bg-zinc-800 text-zinc-100"
              }`}
            >
              {msg.role !== "user" && (
                <div className="flex items-center gap-2 mb-1 text-xs text-zinc-400">
                  {msg.role === "character" && <User className="w-3 h-3" />}
                  {msg.role === "system" && <Bot className="w-3 h-3" />}
                  {msg.role === "coach" && <Sparkles className="w-3 h-3 text-amber-400" />}
                  <span>
                    {msg.role === "character" && characterName}
                    {msg.role === "system" && "System"}
                    {msg.role === "coach" && "Coach"}
                  </span>
                </div>
              )}
              <div className="whitespace-pre-wrap text-sm prose prose-invert max-w-none">
                {msg.content.split("\n").map((line, j) => (
                  <React.Fragment key={j}>
                    {line}
                    {j < msg.content.split("\n").length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Responses */}
      {suggestedResponses.length > 0 && state === "ROLEPLAY" && (
        <div className="px-4 py-2 border-t border-zinc-800">
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="text-xs text-zinc-500 flex items-center gap-1 mb-2"
          >
            <HelpCircle className="w-3 h-3" />
            {showSuggestions ? "Hide suggestions" : "Show suggestions"}
          </button>
          {showSuggestions && (
            <div className="flex flex-wrap gap-2">
              {suggestedResponses.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(suggestion)}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs text-zinc-300 text-left max-w-full truncate"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input */}
      {state === "ROLEPLAY" && (
        <div className="border-t border-zinc-800 p-4">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your response..."
              className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-sm resize-none focus:outline-none focus:border-violet-500"
              rows={2}
              disabled={loading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="px-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* XP Summary (Coach state) */}
      {state === "COACH" && summary && (
        <div className="border-t border-zinc-800 p-4 bg-zinc-900">
          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center gap-2 text-amber-400">
              <Zap className="w-5 h-5" />
              <span className="font-bold">
                +{Object.values(summary.xp_awards).reduce((a: number, b: any) => a + (b || 0), 0)} XP
              </span>
            </div>
            <div className="text-sm text-zinc-500">
              Avg Score: {(Object.values(summary.scores).reduce((a: number, b: any) => a + b, 0) / 6).toFixed(1)}/10
            </div>
          </div>
        </div>
      )}
      {/* Coach Modal */}
      <CoachModal
        coach="roleplay-coach"
        coachName="Roleplay Coach"
        coachIcon="🎭"
        coachDescription="Practice difficult conversations"
      />
    </main>
  );
}
 
