"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Improvement {
  id: string;
  improvementType: string;
  targetComponent: string;
  currentState: Record<string, unknown>;
  proposedChange: Record<string, unknown>;
  expectedImpact: string;
  status: string;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  prompt_adjustment: "Prompt",
  strategy_update: "Strategy",
  threshold_change: "Threshold",
  new_pattern: "New Pattern",
};

export function ImprovementQueue() {
  const [improvements, setImprovements] = useState<Improvement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchImprovements = async () => {
    try {
      const res = await fetch("/api/omega/improvements?status=proposed");
      const data = await res.json();
      if (data.ok) {
        setImprovements(data.improvements);
      }
    } catch (err) {
      console.error("Failed to fetch improvements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImprovements();
  }, []);

  const handleAction = async (id: string, action: "approve" | "reject" | "test") => {
    try {
      const res = await fetch("/api/omega/improvements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ improvementId: id, action }),
      });
      const data = await res.json();
      if (data.ok) {
        setImprovements((prev) => prev.filter((i) => i.id !== id));
      }
    } catch (err) {
      console.error("Action failed:", err);
    }
  };

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="w-2 h-2 bg-pink-500 rounded-full" />
          Self-Improvement
          {improvements.length > 0 && (
            <span className="ml-auto text-sm font-normal text-zinc-500">
              {improvements.length} proposed
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-zinc-500 py-4">Loading...</div>
        ) : improvements.length === 0 ? (
          <div className="text-center text-zinc-500 py-6">
            <p className="text-xl mb-1">System optimal</p>
            <p className="text-sm">No improvements proposed</p>
          </div>
        ) : (
          <div className="space-y-3">
            {improvements.map((imp) => (
              <div
                key={imp.id}
                className="p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg"
              >
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 text-xs bg-pink-500/20 text-pink-400 rounded">
                    {TYPE_LABELS[imp.improvementType] || imp.improvementType}
                  </span>
                  <span className="text-sm text-zinc-300">{imp.targetComponent}</span>
                </div>

                {/* Expected impact */}
                <p className="text-sm text-zinc-400 mb-3">{imp.expectedImpact}</p>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAction(imp.id, "reject")}
                    className="px-3 py-1 text-xs bg-zinc-700 text-zinc-300 rounded hover:bg-zinc-600 transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleAction(imp.id, "test")}
                    className="px-3 py-1 text-xs bg-amber-500/20 text-amber-400 rounded hover:bg-amber-500/30 transition-colors"
                  >
                    Test First
                  </button>
                  <button
                    onClick={() => handleAction(imp.id, "approve")}
                    className="px-3 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-colors"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
