"use client";

import React from "react";
import { Zap, Clock, AlertCircle } from "lucide-react";

interface Props {
  action: {
    id: string;
    title: string;
    priority: string;
    due_date?: string;
    status: string;
  } | null;
}

export function NextActionCard({ action }: Props) {
  const priorityColors: Record<string, string> = {
    high: "from-red-500/20 to-orange-500/20 border-red-500/30",
    medium: "from-yellow-500/20 to-amber-500/20 border-yellow-500/30",
    low: "from-green-500/20 to-emerald-500/20 border-green-500/30",
  };

  const priorityIcons: Record<string, React.ReactNode> = {
    high: <AlertCircle className="w-5 h-5 text-red-400" />,
    medium: <Clock className="w-5 h-5 text-yellow-400" />,
    low: <Zap className="w-5 h-5 text-green-400" />,
  };

  if (!action) {
    return (
      <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-violet-500/20 rounded-lg">
            <Zap className="w-5 h-5 text-violet-400" />
          </div>
          <h3 className="font-semibold text-lg">Next Action</h3>
        </div>
        <p className="text-zinc-500">No pending tasks. You're all caught up! 🎉</p>
      </div>
    );
  }

  const bgClass = priorityColors[action.priority] || priorityColors.medium;

  return (
    <div className={`bg-gradient-to-br ${bgClass} rounded-2xl p-6 border`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-zinc-900/50 rounded-lg">
          {priorityIcons[action.priority] || priorityIcons.medium}
        </div>
        <div>
          <p className="text-xs text-zinc-400 uppercase tracking-wide">Next Action</p>
          <p className="text-xs text-zinc-500">{action.priority} priority</p>
        </div>
      </div>
      <h3 className="text-xl font-bold mb-2">{action.title}</h3>
      {action.due_date && (
        <p className="text-sm text-zinc-400 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Due: {new Date(action.due_date).toLocaleDateString()}
        </p>
      )}
      <button className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors">
        Start Task →
      </button>
    </div>
  );
}