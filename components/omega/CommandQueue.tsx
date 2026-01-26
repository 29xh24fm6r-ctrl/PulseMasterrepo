"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DraftCard } from "./DraftCard";

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

export function CommandQueue() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDrafts = async () => {
    try {
      const res = await fetch("/api/omega/drafts?status=pending_review");
      const data = await res.json();
      if (data.ok) {
        setDrafts(data.drafts);
      } else {
        setError(data.error || "Failed to fetch drafts");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const handleAction = async (draftId: string, action: "approve" | "reject", feedback?: string) => {
    try {
      const res = await fetch("/api/omega/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, action, feedback }),
      });
      const data = await res.json();
      if (data.ok) {
        setDrafts((prev) => prev.filter((d) => d.id !== draftId));
      }
    } catch (err) {
      console.error("Action failed:", err);
    }
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          Command Queue
          {drafts.length > 0 && (
            <span className="ml-auto text-sm font-normal text-zinc-500">
              {drafts.length} pending
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && (
          <div className="text-center text-zinc-500 py-8">Loading...</div>
        )}

        {error && (
          <div className="text-center text-red-400 py-4">{error}</div>
        )}

        {!loading && !error && drafts.length === 0 && (
          <div className="text-center text-zinc-500 py-8">
            <p className="text-2xl mb-2">All clear</p>
            <p className="text-sm">No pending actions</p>
          </div>
        )}

        {drafts.map((draft) => (
          <DraftCard
            key={draft.id}
            draft={draft}
            onApprove={(id) => handleAction(id, "approve")}
            onReject={(id, feedback) => handleAction(id, "reject", feedback)}
          />
        ))}
      </CardContent>
    </Card>
  );
}
