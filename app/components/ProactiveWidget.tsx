"use client";

import { useState, useEffect } from "react";
import { X, Bell, ChevronRight, Heart, Zap, AlertTriangle, Sparkles, Check } from "lucide-react";

interface Intervention {
  id: string;
  type: "nudge" | "coaching" | "alert" | "celebration" | "reflection";
  priority: "low" | "medium" | "high" | "urgent";
  title: string;
  message: string;
  action_type?: string;
}

const typeIcons: Record<string, any> = {
  nudge: Zap,
  coaching: Heart,
  alert: AlertTriangle,
  celebration: Sparkles,
  reflection: Bell,
};

const priorityColors: Record<string, string> = {
  low: "border-zinc-600",
  medium: "border-yellow-500/50",
  high: "border-orange-500/50",
  urgent: "border-red-500/50 animate-pulse",
};

export function ProactiveWidget() {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [visible, setVisible] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInterventions();
    // Refresh every 5 minutes
    const interval = setInterval(fetchInterventions, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  async function fetchInterventions() {
    try {
      const res = await fetch("/api/proactive/interventions?refresh=true");
      if (res.ok) {
        const data = await res.json();
        setInterventions(data.interventions || []);
      }
    } catch (error) {
      console.error("Failed to fetch interventions:", error);
    } finally {
      setLoading(false);
    }
  }

  async function dismissIntervention(id: string, action: "dismissed" | "completed") {
    try {
      await fetch("/api/proactive/interventions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intervention_id: id, action }),
      });
      setInterventions(prev => prev.filter(i => i.id !== id));
    } catch (error) {
      console.error("Failed to dismiss:", error);
    }
  }

  if (!visible || interventions.length === 0) {
    return null;
  }

  const current = interventions[0];
  const Icon = typeIcons[current.type] || Bell;

  return (
    <div className={`fixed bottom-4 right-4 max-w-sm bg-zinc-900 rounded-2xl border ${priorityColors[current.priority]} shadow-xl z-50`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${
            current.type === "celebration" ? "bg-yellow-500/20 text-yellow-400" :
            current.type === "alert" ? "bg-red-500/20 text-red-400" :
            current.type === "coaching" ? "bg-pink-500/20 text-pink-400" :
            "bg-violet-500/20 text-violet-400"
          }`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-sm font-medium text-zinc-300 capitalize">{current.type}</span>
        </div>
        <div className="flex items-center gap-1">
          {interventions.length > 1 && (
            <span className="text-xs text-zinc-500 mr-2">+{interventions.length - 1} more</span>
          )}
          <button
            onClick={() => setVisible(false)}
            className="p-1 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-white mb-1">{current.title}</h3>
        <p className="text-sm text-zinc-400">{current.message}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 p-3 border-t border-zinc-800">
        <button
          onClick={() => dismissIntervention(current.id, "dismissed")}
          className="flex-1 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
        >
          Dismiss
        </button>
        <button
          onClick={() => dismissIntervention(current.id, "completed")}
          className="flex-1 py-2 text-sm bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors flex items-center justify-center gap-1"
        >
          <Check className="w-4 h-4" />
          Got it
        </button>
      </div>
    </div>
  );
}