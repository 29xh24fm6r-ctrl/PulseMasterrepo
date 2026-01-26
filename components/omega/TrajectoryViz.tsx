"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Milestone {
  date: string;
  state: string;
  probability: number;
}

interface Trajectory {
  id: string;
  trajectoryType: string;
  timeHorizon: string;
  projectedMilestones: Milestone[];
  projectedEndState: { description?: string };
  confidence: number;
  risks?: Record<string, unknown>;
  opportunities?: Record<string, unknown>;
  createdAt: string;
}

const TYPE_STYLES: Record<string, { color: string; label: string }> = {
  current_path: { color: "text-zinc-400", label: "Current Path" },
  optimized: { color: "text-emerald-400", label: "Optimized" },
  alternative: { color: "text-blue-400", label: "Alternative" },
};

export function TrajectoryViz() {
  const [trajectories, setTrajectories] = useState<Trajectory[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  useEffect(() => {
    fetchTrajectories();
  }, []);

  const fetchTrajectories = async () => {
    try {
      const res = await fetch("/api/omega/trajectories?limit=5");
      const data = await res.json();
      if (data.ok) {
        setTrajectories(data.trajectories);
      }
    } catch (err) {
      console.error("Failed to fetch trajectories:", err);
    } finally {
      setLoading(false);
    }
  };

  const generateTrajectories = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/omega/trajectories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeHorizon: "1_year" }),
      });
      const data = await res.json();
      if (data.ok) {
        await fetchTrajectories();
      }
    } catch (err) {
      console.error("Failed to generate trajectories:", err);
    } finally {
      setGenerating(false);
    }
  };

  const selectedTrajectory = selectedType
    ? trajectories.find((t) => t.trajectoryType === selectedType)
    : trajectories[0];

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="w-2 h-2 bg-blue-500 rounded-full" />
          Life Trajectory
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-zinc-500 py-4">Loading...</div>
        ) : trajectories.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-zinc-500 mb-3">No trajectory projections yet</p>
            <button
              onClick={generateTrajectories}
              disabled={generating}
              className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate Trajectories"}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Trajectory type selector */}
            <div className="flex gap-2">
              {trajectories.map((t) => {
                const style = TYPE_STYLES[t.trajectoryType] || {
                  color: "text-zinc-400",
                  label: t.trajectoryType,
                };
                const isSelected =
                  selectedType === t.trajectoryType ||
                  (!selectedType && t.id === trajectories[0]?.id);

                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedType(t.trajectoryType)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                      isSelected
                        ? `${style.color} border-current bg-current/10`
                        : "text-zinc-500 border-zinc-700 hover:border-zinc-600"
                    }`}
                  >
                    {style.label}
                  </button>
                );
              })}
            </div>

            {/* Selected trajectory visualization */}
            {selectedTrajectory && (
              <div className="space-y-3">
                {/* Confidence */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Confidence:</span>
                  <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${selectedTrajectory.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-400">
                    {Math.round(selectedTrajectory.confidence * 100)}%
                  </span>
                </div>

                {/* Milestones timeline */}
                <div className="space-y-2">
                  {selectedTrajectory.projectedMilestones?.slice(0, 4).map((milestone, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-2 bg-zinc-800/30 rounded-lg"
                    >
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        {i < (selectedTrajectory.projectedMilestones?.length || 0) - 1 && (
                          <div className="w-0.5 h-full bg-zinc-700 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs text-zinc-500">
                            {new Date(milestone.date).toLocaleDateString("en-US", {
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                          <span className="text-xs text-zinc-600">
                            ({Math.round(milestone.probability * 100)}% likely)
                          </span>
                        </div>
                        <p className="text-sm text-zinc-300 line-clamp-2">{milestone.state}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* End state */}
                {selectedTrajectory.projectedEndState?.description && (
                  <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                    <p className="text-xs text-zinc-500 mb-1">Projected Outcome</p>
                    <p className="text-sm text-zinc-200">
                      {selectedTrajectory.projectedEndState.description}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
