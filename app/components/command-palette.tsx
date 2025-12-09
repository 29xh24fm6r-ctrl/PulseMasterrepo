"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Command,
  ArrowRight,
  Home,
  CheckSquare,
  Briefcase,
  Users,
  BookOpen,
  Sparkles,
  Calendar,
  Trophy,
  Settings,
  Sun,
  Moon,
  Flame,
  Target,
  Brain,
  Zap,
  Plus,
  FileText,
  BarChart3,
  MessageSquare,
  Mic,
  Mail,
  Bell,
} from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  category: string;
  keywords?: string[];
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Navigation commands
  const navigationCommands: CommandItem[] = [
    {
      id: "home",
      label: "Go to Home",
      icon: <Home className="w-4 h-4" />,
      action: () => router.push("/"),
      category: "Navigation",
      keywords: ["dashboard", "main"],
    },
    {
      id: "tasks",
      label: "Go to Tasks",
      icon: <CheckSquare className="w-4 h-4" />,
      action: () => router.push("/tasks"),
      category: "Navigation",
      keywords: ["todo", "checklist"],
    },
    {
      id: "deals",
      label: "Go to Deals",
      icon: <Briefcase className="w-4 h-4" />,
      action: () => router.push("/deals"),
      category: "Navigation",
      keywords: ["pipeline", "sales", "crm"],
    },
    {
      id: "habits",
      label: "Go to Habits",
      icon: <Flame className="w-4 h-4" />,
      action: () => router.push("/habits"),
      category: "Navigation",
      keywords: ["routine", "daily"],
    },
    {
      id: "journal",
      label: "Go to Journal",
      icon: <BookOpen className="w-4 h-4" />,
      action: () => router.push("/journal"),
      category: "Navigation",
      keywords: ["diary", "notes", "reflection"],
    },
    {
      id: "identity",
      label: "Go to Identity Dashboard",
      icon: <Sparkles className="w-4 h-4" />,
      action: () => router.push("/identity/dashboard"),
      category: "Navigation",
      keywords: ["archetype", "values", "resonance"],
    },
    {
      id: "identity-quiz",
      label: "Take Identity Quiz",
      icon: <Target className="w-4 h-4" />,
      action: () => router.push("/identity/quiz"),
      category: "Navigation",
      keywords: ["discover", "archetype", "personality"],
    },
    {
      id: "streaks",
      label: "Go to Streak Calendar",
      icon: <Calendar className="w-4 h-4" />,
      action: () => router.push("/streaks"),
      category: "Navigation",
      keywords: ["calendar", "activity", "heatmap"],
    },
    {
      id: "achievements",
      label: "Go to Achievements",
      icon: <Trophy className="w-4 h-4" />,
      action: () => router.push("/achievements"),
      category: "Navigation",
      keywords: ["badges", "rewards", "milestones"],
    },
    {
      id: "xp",
      label: "Go to XP Overview",
      icon: <Zap className="w-4 h-4" />,
      action: () => router.push("/xp"),
      category: "Navigation",
      keywords: ["experience", "points", "level"],
    },
    {
      id: "xp-history",
      label: "Go to XP History",
      icon: <BarChart3 className="w-4 h-4" />,
      action: () => router.push("/xp/history"),
      category: "Navigation",
      keywords: ["timeline", "log"],
    },
    {
      id: "weekly-review",
      label: "Go to Weekly Review",
      icon: <FileText className="w-4 h-4" />,
      action: () => router.push("/weekly-review"),
      category: "Navigation",
      keywords: ["summary", "report"],
    },
    {
      id: "monthly-review",
      label: "Go to Monthly Review",
      icon: <FileText className="w-4 h-4" />,
      action: () => router.push("/monthly-review"),
      category: "Navigation",
      keywords: ["summary", "report"],
    },
    {
      id: "morning-brief",
      label: "Go to Morning Brief",
      icon: <Sun className="w-4 h-4" />,
      action: () => router.push("/morning-brief"),
      category: "Navigation",
      keywords: ["daily", "start"],
    },
    {
      id: "shutdown",
      label: "Go to Nightly Shutdown",
      icon: <Moon className="w-4 h-4" />,
      action: () => router.push("/shutdown"),
      category: "Navigation",
      keywords: ["end", "evening", "close"],
    },
    {
      id: "confidant",
      label: "Go to Confidant",
      icon: <MessageSquare className="w-4 h-4" />,
      action: () => router.push("/confidant"),
      category: "Navigation",
      keywords: ["chat", "ai", "assistant"],
    },
    {
      id: "second-brain",
      label: "Go to Second Brain",
      icon: <Brain className="w-4 h-4" />,
      action: () => router.push("/second-brain"),
      category: "Navigation",
      keywords: ["contacts", "people", "network"],
    },
    {
      id: "follow-ups",
      label: "Go to Follow-Ups",
      icon: <Mail className="w-4 h-4" />,
      action: () => router.push("/follow-ups"),
      category: "Navigation",
      keywords: ["email", "reminders"],
    },
    {
      id: "notifications",
      label: "Go to Notifications",
      icon: <Bell className="w-4 h-4" />,
      action: () => router.push("/notifications"),
      category: "Navigation",
      keywords: ["alerts", "updates"],
    },
    {
      id: "settings",
      label: "Go to Settings",
      icon: <Settings className="w-4 h-4" />,
      action: () => router.push("/settings"),
      category: "Navigation",
      keywords: ["preferences", "config"],
    },
    {
      id: "autonomy",
      label: "Go to Autonomy Settings",
      icon: <Settings className="w-4 h-4" />,
      action: () => router.push("/settings/autonomy"),
      category: "Navigation",
      keywords: ["preferences", "proactive"],
    },
  ];

  // Quick action commands
  const actionCommands: CommandItem[] = [
    {
      id: "new-task",
      label: "Create New Task",
      description: "Add a new task to your list",
      icon: <Plus className="w-4 h-4" />,
      action: () => {
        // Trigger the FAB or navigate to tasks with modal
        router.push("/tasks?action=new");
      },
      category: "Quick Actions",
      keywords: ["add", "todo"],
    },
    {
      id: "new-deal",
      label: "Create New Deal",
      description: "Add a new deal to your pipeline",
      icon: <Plus className="w-4 h-4" />,
      action: () => {
        router.push("/deals?action=new");
      },
      category: "Quick Actions",
      keywords: ["add", "sale"],
    },
    {
      id: "new-journal",
      label: "Write Journal Entry",
      description: "Start a new journal entry",
      icon: <BookOpen className="w-4 h-4" />,
      action: () => router.push("/journal"),
      category: "Quick Actions",
      keywords: ["write", "reflect"],
    },
    {
      id: "track-identity",
      label: "Track Identity Action",
      description: "Log an identity-aligned action",
      icon: <Sparkles className="w-4 h-4" />,
      action: () => router.push("/identity/dashboard"),
      category: "Quick Actions",
      keywords: ["log", "archetype"],
    },
    {
      id: "voice-note",
      label: "Record Voice Note",
      description: "Capture a quick voice memo",
      icon: <Mic className="w-4 h-4" />,
      action: () => router.push("/voice"),
      category: "Quick Actions",
      keywords: ["audio", "memo", "record"],
    },
    {
      id: "pulse-capture",
      label: "Capture Content",
      description: "Save content to your second brain",
      icon: <Brain className="w-4 h-4" />,
      action: () => router.push("/pulse-capture"),
      category: "Quick Actions",
      keywords: ["save", "bookmark"],
    },
  ];

  const allCommands = [...actionCommands, ...navigationCommands];

  // Filter commands based on search
  const filteredCommands = search
    ? allCommands.filter((cmd) => {
        const searchLower = search.toLowerCase();
        return (
          cmd.label.toLowerCase().includes(searchLower) ||
          cmd.description?.toLowerCase().includes(searchLower) ||
          cmd.keywords?.some((k) => k.toLowerCase().includes(searchLower)) ||
          cmd.category.toLowerCase().includes(searchLower)
        );
      })
    : allCommands;

  // Group by category
  const groupedCommands: Record<string, CommandItem[]> = {};
  for (const cmd of filteredCommands) {
    if (!groupedCommands[cmd.category]) {
      groupedCommands[cmd.category] = [];
    }
    groupedCommands[cmd.category].push(cmd);
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Open with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }

      // Close with Escape
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setSearch("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Navigate with arrow keys
  const handleKeyNavigation = useCallback(
    (e: React.KeyboardEvent) => {
      const flatCommands = Object.values(groupedCommands).flat();

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, flatCommands.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const selectedCommand = flatCommands[selectedIndex];
        if (selectedCommand) {
          executeCommand(selectedCommand);
        }
      }
    },
    [groupedCommands, selectedIndex]
  );

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    selectedElement?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  function executeCommand(cmd: CommandItem) {
    setIsOpen(false);
    cmd.action();
  }

  if (!isOpen) return null;

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Command palette */}
      <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-full max-w-xl">
        <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
            <Search className="w-5 h-5 text-zinc-500" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyNavigation}
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent text-white placeholder-zinc-500 outline-none text-lg"
            />
            <div className="flex items-center gap-1 text-zinc-600 text-xs">
              <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">esc</kbd>
              <span>to close</span>
            </div>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
            {filteredCommands.length === 0 ? (
              <div className="px-4 py-8 text-center text-zinc-500">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No commands found</p>
              </div>
            ) : (
              Object.entries(groupedCommands).map(([category, commands]) => (
                <div key={category}>
                  <div className="px-4 py-2 text-xs text-zinc-500 uppercase tracking-wide">
                    {category}
                  </div>
                  {commands.map((cmd) => {
                    const currentIndex = flatIndex++;
                    const isSelected = currentIndex === selectedIndex;

                    return (
                      <button
                        key={cmd.id}
                        data-index={currentIndex}
                        onClick={() => executeCommand(cmd)}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        className={`
                          w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                          ${isSelected ? "bg-violet-600/20 text-white" : "text-zinc-300 hover:bg-zinc-800"}
                        `}
                      >
                        <div
                          className={`
                            w-8 h-8 rounded-lg flex items-center justify-center
                            ${isSelected ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400"}
                          `}
                        >
                          {cmd.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{cmd.label}</div>
                          {cmd.description && (
                            <div className="text-sm text-zinc-500 truncate">{cmd.description}</div>
                          )}
                        </div>
                        {isSelected && (
                          <div className="flex items-center gap-1 text-zinc-500">
                            <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded text-xs">↵</kbd>
                          </div>
                        )}
                        <ArrowRight
                          className={`w-4 h-4 transition-opacity ${isSelected ? "opacity-100" : "opacity-0"}`}
                        />
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">↓</kbd>
                <span>navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">↵</kbd>
                <span>select</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Command className="w-3 h-3" />
              <span>K to toggle</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
