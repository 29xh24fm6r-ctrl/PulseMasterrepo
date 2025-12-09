"use client";
import React from "react";
import Link from "next/link";
import { ArrowLeft, Keyboard, Command } from "lucide-react";

const SHORTCUTS = [
  { category: "Navigation", shortcuts: [
    { keys: ["⌘", "K"], description: "Open Command Palette" },
    { keys: ["⌘", "H"], description: "Go to Home" },
    { keys: ["⌘", "T"], description: "Go to Tasks" },
    { keys: ["⌘", "D"], description: "Go to Deals" },
    { keys: ["⌘", "J"], description: "Go to Journal" },
    { keys: ["⌘", "G"], description: "Go to Goals" },
  ]},
  { category: "Quick Actions", shortcuts: [
    { keys: ["⌘", "N"], description: "New Task" },
    { keys: ["⌘", "⇧", "N"], description: "New Deal" },
    { keys: ["⌘", "⇧", "J"], description: "New Journal Entry" },
    { keys: ["⌘", "⇧", "H"], description: "Log Habit" },
  ]},
  { category: "Focus & Productivity", shortcuts: [
    { keys: ["⌘", "⇧", "F"], description: "Toggle Focus Mode" },
    { keys: ["⌘", "P"], description: "Start Pomodoro" },
    { keys: ["Space"], description: "Pause/Resume Timer" },
  ]},
  { category: "Views", shortcuts: [
    { keys: ["⌘", "1"], description: "Day View" },
    { keys: ["⌘", "2"], description: "Week View" },
    { keys: ["⌘", "3"], description: "Month View" },
    { keys: ["⌘", "/"], description: "Toggle Sidebar" },
  ]},
  { category: "General", shortcuts: [
    { keys: ["⌘", ","], description: "Open Settings" },
    { keys: ["⌘", "?"], description: "Keyboard Shortcuts" },
    { keys: ["Esc"], description: "Close Modal / Cancel" },
    { keys: ["⌘", "S"], description: "Save" },
  ]},
];

export default function KeyboardShortcutsPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/settings" className="p-2 hover:bg-zinc-800 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Keyboard className="w-7 h-7 text-cyan-400" />
              Keyboard Shortcuts
            </h1>
            <p className="text-zinc-400 text-sm">Master Pulse OS with your keyboard</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {SHORTCUTS.map((group) => (
            <div key={group.category} className="bg-zinc-900/80 rounded-xl border border-zinc-800 p-5">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Command className="w-4 h-4 text-cyan-400" />
                {group.category}
              </h2>
              <div className="space-y-3">
                {group.shortcuts.map((shortcut, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-zinc-400 text-sm">{shortcut.description}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, j) => (
                        <kbd key={j} className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs font-mono min-w-[28px] text-center">
                          {key}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 text-center">
          <p className="text-cyan-400 text-sm">
            💡 Press <kbd className="px-2 py-0.5 bg-zinc-800 rounded text-xs mx-1">⌘</kbd> + <kbd className="px-2 py-0.5 bg-zinc-800 rounded text-xs mx-1">K</kbd> anywhere to open the Command Palette
          </p>
        </div>
      </div>
    </main>
  );
}
