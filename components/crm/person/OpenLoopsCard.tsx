"use client";

import { AlertCircle, Mail, CheckSquare } from "lucide-react";

interface OpenLoopsCardProps {
  openLoops: {
    overdueTasks?: number;
    unrespondedEmails?: number;
    unansweredInbound?: number;
  };
}

const safeNum = (n: unknown, fallback = 0) =>
  typeof n === "number" && Number.isFinite(n) ? n : fallback;

export function OpenLoopsCard({ openLoops }: OpenLoopsCardProps) {
  const overdueTasks = safeNum(openLoops?.overdueTasks);
  const unrespondedEmails = safeNum(openLoops?.unrespondedEmails ?? openLoops?.unansweredInbound);
  const total = overdueTasks + unrespondedEmails;
  const hasLoops = total > 0;

  return (
    <div className={`rounded-xl p-5 border ${
      hasLoops ? "bg-red-500/10 border-red-500/30" : "bg-green-500/10 border-green-500/30"
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-300">Open Loops</h3>
        <AlertCircle className={`w-4 h-4 ${hasLoops ? "text-red-400" : "text-green-400"}`} />
      </div>

      <div className="mb-4">
        <div className={`text-4xl font-bold ${hasLoops ? "text-red-400" : "text-green-400"} mb-1`}>
          {total}
        </div>
        <div className="text-xs text-gray-400">items need attention</div>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-300">
            <CheckSquare className="w-3 h-3" />
            <span>Overdue Tasks</span>
          </div>
          <span className={overdueTasks > 0 ? "text-red-400 font-semibold" : "text-gray-500"}>
            {overdueTasks}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-300">
            <Mail className="w-3 h-3" />
            <span>Unresponded Emails</span>
          </div>
          <span className={unrespondedEmails > 0 ? "text-red-400 font-semibold" : "text-gray-500"}>
            {unrespondedEmails}
          </span>
        </div>
      </div>
    </div>
  );
}

