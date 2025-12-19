"use client";

import { Sparkles, Calendar } from "lucide-react";

interface MomentsCardProps {
  moments: any[];
}

export function MomentsCard({ moments }: MomentsCardProps) {
  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="rounded-xl p-5 border bg-slate-800/50 border-slate-700">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-semibold text-gray-300">Moments that Matter</h3>
      </div>

      {moments.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm">
          No key moments yet
        </div>
      ) : (
        <div className="space-y-3">
          {moments.slice(0, 5).map((moment, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="mt-0.5">
                <div className={`w-2 h-2 rounded-full ${
                  moment.event_type === "note" ? "bg-blue-400" :
                  moment.event_type === "task_created" ? "bg-green-400" :
                  moment.event_type === "email_in" || moment.event_type === "email_out" ? "bg-purple-400" :
                  "bg-gray-400"
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">{moment.title || "Event"}</div>
                {moment.body && (
                  <div className="text-xs text-gray-400 truncate mt-1">{moment.body}</div>
                )}
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(moment.occurred_at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

