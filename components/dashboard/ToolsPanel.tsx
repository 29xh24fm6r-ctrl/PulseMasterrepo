"use client";

import { useState } from "react";
import { LayoutJson } from "@/types/dashboard";
import { createWidgetTracker } from "@/lib/dashboard/telemetryClient";
import {
  CheckSquare, Calendar, Brain, MessageSquare, Phone, Users,
  Radar, Clock, MoreHorizontal, Pin, EyeOff, Sparkles,
} from "lucide-react";

const WIDGET_REGISTRY: Record<string, { label: string; icon: any; color: string; href?: string }> = {
  tasks_quickview: { label: "Tasks", icon: CheckSquare, color: "from-blue-500/20 to-blue-600/20 border-blue-500/30", href: "/tasks" },
  calendar_mini: { label: "Calendar", icon: Calendar, color: "from-purple-500/20 to-purple-600/20 border-purple-500/30", href: "/calendar" },
  second_brain_shortcuts: { label: "Second Brain", icon: Brain, color: "from-pink-500/20 to-pink-600/20 border-pink-500/30", href: "/second-brain" },
  coaches_entry: { label: "AI Coaches", icon: MessageSquare, color: "from-violet-500/20 to-violet-600/20 border-violet-500/30", href: "/coaches" },
  call_notes_recent: { label: "Call Notes", icon: Phone, color: "from-green-500/20 to-green-600/20 border-green-500/30", href: "/calls" },
  oracle_shortcuts: { label: "Oracle CRM", icon: Users, color: "from-orange-500/20 to-orange-600/20 border-orange-500/30", href: "/oracle" },
  followup_radar: { label: "Follow-ups", icon: Radar, color: "from-red-500/20 to-red-600/20 border-red-500/30", href: "/tasks?filter=followup" },
  focus_timer: { label: "Focus Timer", icon: Clock, color: "from-slate-500/20 to-slate-600/20 border-slate-500/30", href: "/focus" },
  tomorrow_preview: { label: "Tomorrow", icon: Sparkles, color: "from-teal-500/20 to-teal-600/20 border-teal-500/30" },
};

export function ToolsPanel({ userId, layout }: { userId: string; layout: LayoutJson }) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const widgets = layout.panels.TOOLS.widgets;

  const gridCols = layout.density === "LOW" ? "grid-cols-2" : layout.density === "HIGH" ? "grid-cols-4" : "grid-cols-3";

  const handleAction = async (widgetKey: string, action: "PIN" | "HIDE") => {
    await fetch("/api/dashboard/layout/override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ widgetKey, action }),
    });
    setMenuOpen(null);
    if (action === "HIDE") window.location.reload();
  };

  return (
    <div className="flex flex-col h-full">
      <h2 className="text-lg font-semibold text-zinc-100 mb-4">Tools</h2>
      <div className={`grid ${gridCols} gap-3`}>
        {widgets.map((key) => {
          const widget = WIDGET_REGISTRY[key];
          if (!widget) return null;
          const Icon = widget.icon;
          const tracker = createWidgetTracker(key);

          return (
            <div key={key} className="relative group">
              <button
                onClick={() => {
                  tracker.click();
                  if (widget.href) window.location.href = widget.href;
                }}
                className={`w-full aspect-square rounded-xl p-4 bg-gradient-to-br ${widget.color} border border-zinc-700/50 flex flex-col items-center justify-center gap-2 transition-all hover:scale-[1.02] hover:border-zinc-600`}
              >
                <Icon className="w-8 h-8 text-zinc-100" />
                <span className="text-sm font-medium text-zinc-200">{widget.label}</span>
              </button>

              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === key ? null : key); }}
                className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 bg-zinc-800/80 hover:bg-zinc-700 transition-opacity"
              >
                <MoreHorizontal className="w-4 h-4 text-zinc-400" />
              </button>

              {menuOpen === key && (
                <div className="absolute top-10 right-2 z-10 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[120px]">
                  <button onClick={() => handleAction(key, "PIN")} className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2">
                    <Pin className="w-4 h-4" /> Pin
                  </button>
                  <button onClick={() => handleAction(key, "HIDE")} className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-700 flex items-center gap-2">
                    <EyeOff className="w-4 h-4" /> Hide
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
