"use client";
import React, { useState, useEffect, useRef } from "react";
import { Search, X, FileText, CheckSquare, Briefcase, Target, User, Flame, ArrowRight } from "lucide-react";

interface SearchResult {
  id: string;
  type: "task" | "deal" | "contact" | "goal" | "habit" | "page";
  title: string;
  subtitle?: string;
  url: string;
  icon: any;
}

const MOCK_DATA: SearchResult[] = [
  { id: "t1", type: "task", title: "Review Q4 pipeline", subtitle: "Due today", url: "/tasks", icon: CheckSquare },
  { id: "t2", type: "task", title: "Send follow-up emails", subtitle: "Due tomorrow", url: "/tasks", icon: CheckSquare },
  { id: "d1", type: "deal", title: "TechCorp Enterprise", subtitle: "$150,000 • Negotiation", url: "/deals", icon: Briefcase },
  { id: "d2", type: "deal", title: "Acme Upgrade", subtitle: "$75,000 • Proposal", url: "/deals", icon: Briefcase },
  { id: "c1", type: "contact", title: "Sarah Chen", subtitle: "TechCorp Inc", url: "/contacts/scoring", icon: User },
  { id: "c2", type: "contact", title: "Michael Roberts", subtitle: "Acme Corp", url: "/contacts/scoring", icon: User },
  { id: "g1", type: "goal", title: "Close $500K in Q4", subtitle: "73% complete", url: "/goals", icon: Target },
  { id: "h1", type: "habit", title: "Morning Routine", subtitle: "12 day streak", url: "/habits", icon: Flame },
  { id: "p1", type: "page", title: "Analytics Dashboard", url: "/analytics", icon: FileText },
  { id: "p2", type: "page", title: "Weekly Review", url: "/weekly-review", icon: FileText },
  { id: "p3", type: "page", title: "Daily Planner", url: "/planner", icon: FileText },
  { id: "p4", type: "page", title: "Pomodoro Timer", url: "/pomodoro", icon: FileText },
];

export function QuickSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const q = query.toLowerCase();
    const filtered = MOCK_DATA.filter(
      (item) => item.title.toLowerCase().includes(q) || item.subtitle?.toLowerCase().includes(q)
    ).slice(0, 8);
    setResults(filtered);
    setSelectedIndex(0);
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      window.location.href = results[selectedIndex].url;
      setIsOpen(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 border border-zinc-700 rounded-lg text-sm text-zinc-400 hover:text-white hover:border-zinc-600 transition-colors"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline px-1.5 py-0.5 bg-zinc-700 rounded text-xs">⌘/</kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <Search className="w-5 h-5 text-zinc-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks, deals, contacts, pages..."
            className="flex-1 bg-transparent text-lg outline-none placeholder:text-zinc-600"
          />
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-zinc-800 rounded">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <div className="max-h-80 overflow-y-auto p-2">
            {results.map((result, i) => {
              const Icon = result.icon;
              return (
                <a
                  key={result.id}
                  href={result.url}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    i === selectedIndex ? "bg-violet-600/20 text-white" : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    i === selectedIndex ? "bg-violet-600/30" : "bg-zinc-800"
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{result.title}</div>
                    {result.subtitle && <div className="text-xs text-zinc-500 truncate">{result.subtitle}</div>}
                  </div>
                  <span className="text-xs text-zinc-600 capitalize">{result.type}</span>
                  {i === selectedIndex && <ArrowRight className="w-4 h-4 text-violet-400" />}
                </a>
              );
            })}
          </div>
        ) : query ? (
          <div className="p-8 text-center text-zinc-500">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No results for "{query}"</p>
          </div>
        ) : (
          <div className="p-4 text-center text-zinc-600 text-sm">
            Start typing to search...
          </div>
        )}

        {/* Footer */}
        <div className="px-4 py-2 border-t border-zinc-800 flex items-center gap-4 text-xs text-zinc-600">
          <span><kbd className="px-1 bg-zinc-800 rounded">↑↓</kbd> navigate</span>
          <span><kbd className="px-1 bg-zinc-800 rounded">↵</kbd> open</span>
          <span><kbd className="px-1 bg-zinc-800 rounded">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}

export default QuickSearch;
