"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface Constraint {
  id: string;
  constraintType: string;
  constraintName: string;
  description: string;
  immutable: boolean;
  violationCount: number;
}

interface Violation {
  id: string;
  constraintName: string;
  violationReason: string;
  blocked: boolean;
  createdAt: string;
}

export function GuardianStatus() {
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/omega/constraints?violations=true");
        const data = await res.json();
        if (data.ok) {
          setConstraints(data.constraints);
          setViolations(data.violations);
        }
      } catch (err) {
        console.error("Failed to fetch guardian data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const hardLimits = constraints.filter((c) => c.constraintType === "hard_limit");
  const softLimits = constraints.filter((c) => c.constraintType === "soft_limit");
  const recentViolations = violations.slice(0, 5);

  const totalViolations = constraints.reduce((sum, c) => sum + c.violationCount, 0);

  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="w-2 h-2 bg-red-500 rounded-full" />
          Guardian
          {totalViolations > 0 && (
            <span className="ml-auto px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
              {totalViolations} blocked
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-zinc-500 py-4">Loading...</div>
        ) : (
          <div className="space-y-4">
            {/* Hard limits */}
            <div>
              <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
                Hard Limits (Immutable)
              </h4>
              <div className="space-y-1">
                {hardLimits.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 p-2 bg-zinc-800/30 rounded text-sm"
                  >
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    <span className="text-zinc-300 flex-1">{c.description}</span>
                    {c.violationCount > 0 && (
                      <span className="text-xs text-red-400">{c.violationCount}x</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Soft limits */}
            <div>
              <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
                Soft Limits (Adjustable)
              </h4>
              <div className="space-y-1">
                {softLimits.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 p-2 bg-zinc-800/30 rounded text-sm"
                  >
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                    <span className="text-zinc-300 flex-1">{c.description}</span>
                    {c.violationCount > 0 && (
                      <span className="text-xs text-amber-400">{c.violationCount}x</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Recent violations */}
            {recentViolations.length > 0 && (
              <div>
                <h4 className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
                  Recent Blocked Actions
                </h4>
                <div className="space-y-1">
                  {recentViolations.map((v) => (
                    <div
                      key={v.id}
                      className="p-2 bg-red-500/5 border border-red-500/20 rounded text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-red-400">Blocked</span>
                        <span className="text-zinc-500">-</span>
                        <span className="text-zinc-400 truncate">{v.constraintName}</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1 truncate">{v.violationReason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status summary */}
            <div className="flex items-center justify-center gap-2 pt-2 border-t border-zinc-800">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm text-zinc-400">Guardian Active</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
