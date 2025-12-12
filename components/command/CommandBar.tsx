"use client";

/**
 * Command Bar - Universal Command Portal
 * components/command/CommandBar.tsx
 */

import { useState, useEffect, useRef } from "react";
import { Search, Mic, Sparkles, X } from "lucide-react";

interface CommandBarProps {
  onOpen?: () => void;
  expanded?: boolean;
  onClose?: () => void;
}

export function CommandBar({ onOpen, expanded = false, onClose }: CommandBarProps) {
  const [query, setQuery] = useState("");
  const [intent, setIntent] = useState<any>(null);
  const [executing, setExecuting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [expanded]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpen?.();
      }
      if (e.key === "Escape" && expanded) {
        onClose?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [expanded, onOpen, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setExecuting(true);
    try {
      const response = await fetch("/api/command/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: query,
          context: {
            surface: window.location.pathname.split("/")[1] || "home",
          },
        }),
      });

      const result = await response.json();
      setIntent(result);

      // Execute plan immediately
      if (result.plan) {
        await executePlan(result.plan);
      }
    } catch (error) {
      console.error("Command parse error:", error);
    } finally {
      setExecuting(false);
    }
  }

  async function executePlan(plan: any[]) {
    for (const action of plan) {
      switch (action.type) {
        case "OPEN_SURFACE":
          window.location.href = `/${action.surface}`;
          break;
        case "GENERATE_PREP_PACKET":
          // Trigger prep packet generation
          await fetch(`/api/surfaces/time/prep/${action.eventId}`, { method: "POST" });
          break;
        case "CREATE_TASK":
          // Create task
          await fetch("/api/organism/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(action.payload),
          });
          break;
        default:
          console.log("Unknown action:", action);
      }
    }
  }

  if (expanded) {
    return (
      <div className="p-4">
        <div className="flex items-center space-x-3 mb-4">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h2 className="text-lg font-semibold text-white">Command Portal</h2>
          <button
            onClick={onClose}
            className="ml-auto p-1 hover:bg-purple-500/20 rounded-lg text-gray-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What do you need? (e.g., 'prep my 2pm', 'create task', 'find contact')"
              className="w-full pl-10 pr-20 py-3 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={executing}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 hover:bg-purple-500/20 rounded-lg text-gray-400 hover:text-white"
            >
              <Mic className="w-5 h-5" />
            </button>
          </div>
        </form>

        {intent && (
          <div className="mt-4 p-3 bg-purple-900/20 rounded-lg border border-purple-500/30">
            <div className="text-sm text-purple-300 font-semibold mb-1">Intent: {intent.intent}</div>
            {intent.plan && (
              <div className="text-xs text-gray-400">
                Executing {intent.plan.length} action{intent.plan.length !== 1 ? "s" : ""}...
              </div>
            )}
          </div>
        )}

        <IntentChips onSelect={(text) => setQuery(text)} />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={onOpen}
        placeholder="Command or search... (⌘K)"
        className="w-full pl-9 pr-10 py-2 bg-slate-700/30 border border-purple-500/20 rounded-lg text-white placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
      />
      <button
        type="button"
        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 hover:bg-purple-500/20 rounded text-gray-400 hover:text-white"
      >
        <Mic className="w-4 h-4" />
      </button>
    </form>
  );
}

function IntentChips({ onSelect }: { onSelect: (text: string) => void }) {
  const intents = [
    "Prep my next meeting",
    "What needs my attention?",
    "Create a task",
    "Find contact",
    "Show my day",
    "What should I focus on?",
  ];

  return (
    <div className="mt-4">
      <div className="text-xs text-gray-400 mb-2">Quick Actions</div>
      <div className="flex flex-wrap gap-2">
        {intents.map((intent) => (
          <button
            key={intent}
            onClick={() => onSelect(intent)}
            className="px-3 py-1.5 text-xs bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/20 rounded-lg text-purple-300 transition-colors"
          >
            {intent}
          </button>
        ))}
      </div>
    </div>
  );
}

