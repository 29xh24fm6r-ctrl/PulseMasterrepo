"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Goal {
  id: string;
  goalType: string;
  title: string;
  description?: string;
  timeHorizon?: string;
  priority: number;
  progress: number;
  status: string;
  parentGoalId?: string;
}

const TYPE_COLORS: Record<string, string> = {
  career: "bg-blue-500",
  financial: "bg-emerald-500",
  health: "bg-red-500",
  relationship: "bg-pink-500",
  skill: "bg-purple-500",
  legacy: "bg-amber-500",
};

export function GoalsPanel() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedType, setExpandedType] = useState<string | null>(null);

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const res = await fetch("/api/omega/goals?status=active");
        const data = await res.json();
        if (data.ok) {
          setGoals(data.goals);
        }
      } catch (err) {
        console.error("Failed to fetch goals:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, []);

  // Group goals by type
  const groupedGoals = goals.reduce((acc, goal) => {
    if (!acc[goal.goalType]) acc[goal.goalType] = [];
    acc[goal.goalType].push(goal);
    return acc;
  }, {} as Record<string, Goal[]>);

  const goalTypes = Object.keys(groupedGoals);

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="w-2 h-2 bg-purple-500 rounded-full" />
          Life Goals
          <span className="ml-auto text-sm font-normal text-zinc-500">
            {goals.length} active
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-zinc-500 py-4">Loading...</div>
        ) : goals.length === 0 ? (
          <div className="text-center text-zinc-500 py-6">
            <p className="mb-2">No goals set</p>
            <button className="text-sm text-purple-400 hover:text-purple-300">
              + Add your first goal
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {goalTypes.map((type) => {
              const typeGoals = groupedGoals[type];
              const avgProgress =
                typeGoals.reduce((sum, g) => sum + g.progress, 0) / typeGoals.length;
              const isExpanded = expandedType === type;

              return (
                <div key={type} className="border border-zinc-800 rounded-lg overflow-hidden">
                  {/* Type header */}
                  <button
                    onClick={() => setExpandedType(isExpanded ? null : type)}
                    className="w-full p-3 flex items-center gap-3 hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className={`w-3 h-3 rounded-full ${TYPE_COLORS[type] || "bg-zinc-500"}`} />
                    <span className="font-medium text-zinc-200 capitalize">{type}</span>
                    <span className="text-sm text-zinc-500">{typeGoals.length}</span>
                    <div className="flex-1" />
                    <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${TYPE_COLORS[type] || "bg-zinc-500"}`}
                        style={{ width: `${avgProgress * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-500 w-8 text-right">
                      {Math.round(avgProgress * 100)}%
                    </span>
                  </button>

                  {/* Expanded goals */}
                  {isExpanded && (
                    <div className="border-t border-zinc-800 p-2 space-y-2 bg-zinc-800/20">
                      {typeGoals
                        .sort((a, b) => b.priority - a.priority)
                        .map((goal) => (
                          <div
                            key={goal.id}
                            className="p-2 rounded bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm text-zinc-200">{goal.title}</span>
                              {goal.timeHorizon && (
                                <span className="text-xs text-zinc-600">
                                  {goal.timeHorizon.replace("_", " ")}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1 bg-zinc-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${TYPE_COLORS[type] || "bg-zinc-500"}`}
                                  style={{ width: `${goal.progress * 100}%` }}
                                />
                              </div>
                              <span className="text-xs text-zinc-500">
                                {Math.round(goal.progress * 100)}%
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
