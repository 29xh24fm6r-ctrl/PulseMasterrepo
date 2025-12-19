"use client";

import { useState } from "react";
import { X, AlertTriangle, ExternalLink, Merge, Plus } from "lucide-react";
import Link from "next/link";

interface DuplicateMatch {
  contact: {
    id: string;
    full_name: string | null;
    primary_email: string | null;
    primary_phone: string | null;
    company_name: string | null;
  };
  score: number;
  reasons: string[];
  confidence: "high" | "medium" | "low";
}

interface DuplicateWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inputPayload: {
    full_name?: string;
    primary_email?: string;
    primary_phone?: string;
    company_name?: string;
  };
  matches: DuplicateMatch[];
  onCreateAnyway: () => void;
  onMerge: (winnerContactId: string) => void;
  onCancel: () => void;
}

export default function DuplicateWarningDialog({
  open,
  onOpenChange,
  inputPayload,
  matches,
  onCreateAnyway,
  onMerge,
  onCancel,
}: DuplicateWarningDialogProps) {
  const [processing, setProcessing] = useState(false);

  if (!open) return null;

  const topMatches = matches.slice(0, 5); // Show top 5

  const getScoreColor = (score: number) => {
    if (score >= 85) return "bg-red-500/20 text-red-400 border-red-500/30";
    if (score >= 70) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  };

  const getConfidenceLabel = (confidence: string) => {
    if (confidence === "high") return "High confidence";
    if (confidence === "medium") return "Possible match";
    return "Low confidence";
  };

  const reasonLabels: Record<string, string> = {
    email_match: "Same email",
    phone_match: "Same phone",
    name_match: "Same name",
    company_match: "Same company",
    title_overlap: "Similar title",
    name_conflict: "Name conflict",
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-zinc-800 rounded-lg border border-yellow-500/30 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold">Possible Duplicate Found</h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-zinc-700 rounded transition-colors"
            disabled={processing}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="text-sm text-gray-400">
            We found {matches.length} existing contact{matches.length !== 1 ? "s" : ""} that might be the same person.
            Consider merging to avoid duplicates.
          </div>

          {/* Input summary */}
          <div className="p-3 bg-zinc-900/50 rounded border border-zinc-700">
            <div className="text-xs text-gray-500 mb-1">You're trying to create:</div>
            <div className="font-medium">{inputPayload.full_name || "Unnamed contact"}</div>
            {inputPayload.primary_email && (
              <div className="text-sm text-gray-400">{inputPayload.primary_email}</div>
            )}
            {inputPayload.company_name && (
              <div className="text-sm text-gray-400">{inputPayload.company_name}</div>
            )}
          </div>

          {/* Matches list */}
          <div className="space-y-3">
            {topMatches.map((match, idx) => (
              <div
                key={match.contact.id}
                className="p-4 bg-zinc-900/50 rounded border border-zinc-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="font-medium">{match.contact.full_name || "Unnamed"}</div>
                    {match.contact.primary_email && (
                      <div className="text-sm text-gray-400">{match.contact.primary_email}</div>
                    )}
                    {match.contact.company_name && (
                      <div className="text-sm text-gray-400">{match.contact.company_name}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium border ${getScoreColor(
                        match.score
                      )}`}
                    >
                      {match.score}% match
                    </span>
                    <span className="text-xs text-gray-500">
                      {getConfidenceLabel(match.confidence)}
                    </span>
                  </div>
                </div>

                {/* Reasons */}
                {match.reasons.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {match.reasons.map((reason) => (
                      <span
                        key={reason}
                        className="px-2 py-0.5 bg-purple-600/20 text-purple-300 rounded text-xs"
                      >
                        {reasonLabels[reason] || reason}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setProcessing(true);
                      onMerge(match.contact.id);
                    }}
                    disabled={processing}
                    className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <Merge className="w-4 h-4" />
                    Merge into this contact
                  </button>
                  <Link
                    href={`/crm/people/${match.contact.id}`}
                    className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 rounded text-sm flex items-center gap-2 transition-colors"
                    onClick={() => onCancel()}
                  >
                    <ExternalLink className="w-4 h-4" />
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Footer actions */}
          <div className="flex gap-2 pt-2 border-t border-zinc-700">
            <button
              onClick={onCancel}
              disabled={processing}
              className="flex-1 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setProcessing(true);
                onCreateAnyway();
              }}
              disabled={processing}
              className="flex-1 px-4 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 border border-yellow-500/30 text-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

