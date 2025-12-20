"use client";

/**
 * Pulse Sacred Surfaces - Main Shell
 * app/(pulse)/layout.tsx
 */

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { CommandBar } from "@/components/command/CommandBar";
import { FloatingActions } from "@/components/shell/FloatingActions";
import { LayoutTrace } from "@/app/components/dev/LayoutTrace";
import { FocusLockGate } from "@/components/focus/FocusLockGate";
import {
  Home,
  Briefcase,
  Users,
  Clock,
  Brain,
  CheckCircle2,
  CircleDot,
  Sparkles,
  Menu,
  X,
} from "lucide-react";

const navigation = [
  { name: "Home", href: "/home", icon: Home, description: "State of My Life" },
  { name: "Workspace", href: "/workspace", icon: Briefcase, description: "Active Self" },
  { name: "People", href: "/people", icon: Users, description: "Human Graph" },
  { name: "Time", href: "/time", icon: Clock, description: "Capacity OS" },
  { name: "Brain", href: "/brain", icon: Brain, description: "Memory & Intel" },
  { name: "Decisions", href: "/decisions", icon: CheckCircle2, description: "Resolution Engine" },
  { name: "Loops", href: "/loops", icon: CircleDot, description: "Stress Removal" },
  { name: "Coaches", href: "/coaches", icon: Sparkles, description: "Specialized Lenses" },
];

export default function PulseLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex">
      <LayoutTrace name="PULSE_SHELL_LAYOUT" />
      {/* Left Navigation */}
      <aside
        className={`${
          navCollapsed ? "w-16" : "w-64"
        } bg-slate-800/50 backdrop-blur-xl border-r border-purple-500/20 transition-all duration-300 flex flex-col`}
      >
        <div className="p-4 flex items-center justify-between">
          {!navCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold text-lg">Pulse</span>
            </div>
          )}
          <button
            onClick={() => setNavCollapsed(!navCollapsed)}
            className="p-2 hover:bg-purple-500/20 rounded-lg text-purple-300 transition-colors"
          >
            {navCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-purple-500/20 text-purple-300 border-l-2 border-purple-500"
                    : "text-gray-300 hover:bg-purple-500/10 hover:text-purple-300"
                }`}
                title={navCollapsed ? item.name : undefined}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-purple-400" : ""}`} />
                {!navCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-400 truncate">{item.description}</div>
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {!navCollapsed && (
          <div className="p-4 border-t border-purple-500/20">
            <div className="text-xs text-gray-400 text-center">Pulse OS</div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar - Sacred + Readable */}
        <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
          <div className="px-4 py-2 lg:px-6">
            <div className="flex items-center gap-3">
              {/* Left: Command */}
              <div className="flex-1 min-w-0 max-w-3xl">
                <CommandBar onOpen={() => setCommandOpen(true)} />
              </div>

              {/* Right: Status */}
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 text-xs text-gray-200">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span>Pulse Active</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-6 py-6">
          <FocusLockGate />
          {children}
        </main>

        {/* Command Palette Modal */}
        {commandOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20"
            onClick={() => setCommandOpen(false)}
          >
            <div
              className="bg-slate-800 rounded-2xl border border-purple-500/30 w-full max-w-2xl mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <CommandBar onOpen={() => {}} expanded={true} onClose={() => setCommandOpen(false)} />
            </div>
          </div>
        )}
      </div>

      {/* Global Floating Action Buttons - Single Owner (outside content wrapper for clean layering) */}
      <FloatingActions />
    </div>
  );
}

