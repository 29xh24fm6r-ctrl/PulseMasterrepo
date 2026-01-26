"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface Draft {
  id: string;
  title: string;
  draftType: string;
  content: { body: string };
  confidence: number;
  status: string;
  createdAt: string;
  intent?: {
    predictedNeed: string;
    confidence: number;
    urgency: string;
    signal?: {
      source: string;
      signalType: string;
    };
  };
}

interface DraftCardProps {
  draft: Draft;
  onApprove: (id: string) => void;
  onReject: (id: string, feedback?: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  email: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  meeting_prep: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  task: "bg-green-500/20 text-green-400 border-green-500/30",
  report: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  summary: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  action_plan: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

const URGENCY_COLORS: Record<string, string> = {
  immediate: "text-red-400",
  soon: "text-amber-400",
  when_convenient: "text-zinc-400",
};

export function DraftCard({ draft, onApprove, onReject }: DraftCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [feedback, setFeedback] = useState("");

  const confidencePercent = Math.round(draft.confidence * 100);
  const typeColor = TYPE_COLORS[draft.draftType] || "bg-zinc-500/20 text-zinc-400";

  const handleReject = () => {
    if (showRejectInput) {
      onReject(draft.id, feedback);
      setShowRejectInput(false);
      setFeedback("");
    } else {
      setShowRejectInput(true);
    }
  };

  return (
    <Card className="bg-zinc-800/50 border-zinc-700 hover:border-zinc-600 transition-colors">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 text-xs rounded border ${typeColor}`}>
                {draft.draftType.replace("_", " ")}
              </span>
              {draft.intent?.urgency && (
                <span className={`text-xs ${URGENCY_COLORS[draft.intent.urgency]}`}>
                  {draft.intent.urgency.replace("_", " ")}
                </span>
              )}
            </div>
            <h3 className="font-medium text-zinc-100 truncate">{draft.title}</h3>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-zinc-100">{confidencePercent}%</div>
            <div className="text-xs text-zinc-500">confidence</div>
          </div>
        </div>

        {/* Signal source */}
        {draft.intent?.signal && (
          <div className="text-xs text-zinc-500 mb-2">
            From: {draft.intent.signal.source} / {draft.intent.signal.signalType}
          </div>
        )}

        {/* Intent preview */}
        {draft.intent?.predictedNeed && (
          <p className="text-sm text-zinc-400 mb-3 line-clamp-2">
            {draft.intent.predictedNeed}
          </p>
        )}

        {/* Expandable content */}
        {expanded && (
          <div className="mb-3 p-3 bg-zinc-900/50 rounded-lg">
            <p className="text-sm text-zinc-300 whitespace-pre-wrap">
              {draft.content.body}
            </p>
          </div>
        )}

        {/* Reject feedback input */}
        {showRejectInput && (
          <div className="mb-3">
            <input
              type="text"
              placeholder="Why are you rejecting this? (helps Omega learn)"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {expanded ? "Collapse" : "Preview"}
          </button>
          <div className="flex-1" />
          {showRejectInput ? (
            <>
              <button
                onClick={() => setShowRejectInput(false)}
                className="px-3 py-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-4 py-1.5 text-sm bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                Submit
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleReject}
                className="px-4 py-1.5 text-sm bg-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-600 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={() => onApprove(draft.id)}
                className="px-4 py-1.5 text-sm bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors border border-emerald-500/30"
              >
                Approve
              </button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
