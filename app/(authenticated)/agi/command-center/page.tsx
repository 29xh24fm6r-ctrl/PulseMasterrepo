// AGI Command Center - Visualize AGI runs and actions
// app/(authenticated)/agi/command-center/page.tsx

"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { AppCard } from "@/components/ui/AppCard";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, Zap, CheckCircle, XCircle, AlertCircle, TestTube } from "lucide-react";

interface AGIRun {
  id: string;
  started_at: string;
  finished_at: string;
  trigger: any;
  world_snapshot: any;
  agent_results: any[];
  final_plan: any[];
  weekly_review_summary?: any;
  weekly_review_summary_narrative?: string;
}

export default function AGICommandCenterPage() {
  const { user } = useUser();
  const [runs, setRuns] = useState<AGIRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<AGIRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchRuns();
  }, []);

  async function fetchRuns() {
    try {
      const res = await fetch("/api/agi/runs");
      if (res.ok) {
        const data = await res.json();
        setRuns(data);
      }
    } catch (err) {
      console.error("Failed to fetch runs:", err);
    }
  }

  async function runAGINow() {
    setRunning(true);
    try {
      const res = await fetch("/api/agi/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trigger: { type: "manual", source: "command_center" },
        }),
      });

      if (res.ok) {
        const newRun = await res.json();
        setRuns([newRun, ...runs]);
        setSelectedRun(newRun);
        await fetchRuns(); // Refresh list
      }
    } catch (err) {
      console.error("Failed to run AGI:", err);
    } finally {
      setRunning(false);
    }
  }

  async function runTestScenarios() {
    setTesting(true);
    try {
      const res = await fetch("/api/agi/test-scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runAll: true }),
      });

      if (res.ok) {
        const results = await res.json();
        console.log("Test results:", results);
        alert(`Tests completed. ${results.allPassed ? "All passed ✅" : "Some failed ❌"}\nCheck console for details.`);
      }
    } catch (err) {
      console.error("Failed to run tests:", err);
    } finally {
      setTesting(false);
    }
  }

  const formatDuration = (started: string, finished: string) => {
    const ms = new Date(finished).getTime() - new Date(started).getTime();
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getTriggerBadge = (trigger: any) => {
    const type = trigger?.type || "unknown";
    const source = trigger?.source || "";
    
    // Check if it's a ritual
    if (source.startsWith("ritual/")) {
      const ritualType = source.split("/")[1];
      const ritualColors: Record<string, string> = {
        morning: "bg-yellow-500",
        midday: "bg-orange-500",
        evening: "bg-purple-500",
        weekly: "bg-indigo-500",
      };
      return (
        <Badge className={ritualColors[ritualType] || "bg-gray-500"}>
          Ritual: {ritualType}
        </Badge>
      );
    }
    
    const colors: Record<string, string> = {
      manual: "bg-blue-500",
      schedule_tick: "bg-green-500",
      email_ingested: "bg-purple-500",
      task_overdue: "bg-orange-500",
      calendar_change: "bg-pink-500",
    };
    return (
      <Badge className={colors[type] || "bg-gray-500"}>{type.replace("_", " ")}</Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">AGI Command Center</h1>
          <p className="text-white/70 mt-1">Monitor Pulse's autonomous reasoning and actions</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={runTestScenarios}
            disabled={testing}
            variant="outline"
            className="border-purple-500 text-purple-400 hover:bg-purple-500/20"
          >
            <TestTube className="w-4 h-4 mr-2" />
            {testing ? "Testing..." : "Run Tests"}
          </Button>
          <Button onClick={runAGINow} disabled={running} className="bg-purple-600 hover:bg-purple-700">
            <Play className="w-4 h-4 mr-2" />
            {running ? "Running..." : "Run AGI Now"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Runs List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-xl font-semibold text-white">Recent Runs</h2>
          {runs.length === 0 ? (
            <AppCard className="p-6 text-center text-white/70">
              <p>No runs yet. Click "Run AGI Now" to start.</p>
            </AppCard>
          ) : (
            <div className="space-y-2">
              {runs.map((run) => (
                <AppCard
                  key={run.id}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedRun?.id === run.id ? "bg-purple-600/20 border-purple-500" : ""
                  }`}
                  onClick={() => setSelectedRun(run)}
                >
                  <div className="flex items-center justify-between mb-2">
                    {getTriggerBadge(run.trigger)}
                    <span className="text-xs text-white/60">
                      {formatDuration(run.started_at, run.finished_at)}
                    </span>
                  </div>
                  <div className="text-sm text-white/80">
                    {run.final_plan?.length || 0} action(s) planned
                  </div>
                  <div className="text-xs text-white/60 mt-1">
                    {new Date(run.started_at).toLocaleString()}
                  </div>
                </AppCard>
              ))}
            </div>
          )}
        </div>

        {/* Run Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedRun ? (
            <>
              {/* Summary */}
              <AppCard className="p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Run Summary</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-white/60">Started</div>
                    <div className="text-white">{new Date(selectedRun.started_at).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-sm text-white/60">Duration</div>
                    <div className="text-white">
                      {formatDuration(selectedRun.started_at, selectedRun.finished_at)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-white/60">Agents</div>
                    <div className="text-white">{selectedRun.agent_results?.length || 0}</div>
                  </div>
                  <div>
                    <div className="text-sm text-white/60">Actions Planned</div>
                    <div className="text-white">{selectedRun.final_plan?.length || 0}</div>
                  </div>
                  {selectedRun.trigger?.source?.startsWith("ritual/") && selectedRun.trigger?.payload?.focus && (
                    <div className="col-span-2">
                      <div className="text-sm text-white/60">Ritual Focus</div>
                      <div className="text-white">
                        {(selectedRun.trigger.payload.focus as string[]).join(", ") || "N/A"}
                      </div>
                    </div>
                  )}
                </div>
              </AppCard>

              {/* Agent Results */}
              <AppCard className="p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Agent Reasoning</h2>
                <div className="space-y-4">
                  {selectedRun.agent_results?.map((result, idx) => (
                    <div key={idx} className="border-l-2 border-purple-500 pl-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-white">{result.agentName}</h3>
                        <Badge className="bg-purple-500">
                          {(result.confidence * 100).toFixed(0)}%
                        </Badge>
                      </div>
                      <p className="text-sm text-white/80 mb-2">{result.reasoningSummary}</p>
                      <div className="text-xs text-white/60">
                        {result.proposedActions?.length || 0} action(s) proposed
                      </div>
                    </div>
                  ))}
                </div>
              </AppCard>

              {/* Final Plan */}
              <AppCard className="p-6">
                <h2 className="text-xl font-semibold text-white mb-4">Final Plan</h2>
                <div className="space-y-3">
                  {selectedRun.final_plan?.length === 0 ? (
                    <p className="text-white/70">No actions planned for this run.</p>
                  ) : (
                    selectedRun.final_plan?.map((action, idx) => {
                      const isRitual = selectedRun.trigger?.source?.startsWith("ritual/");
                      const isExecuted = action.details?.metadata?.runId !== undefined;
                      return (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10"
                        >
                          <div className="mt-1">
                            {action.requiresConfirmation ? (
                              <AlertCircle className="w-5 h-5 text-yellow-500" />
                            ) : action.riskLevel === "high" ? (
                              <XCircle className="w-5 h-5 text-red-500" />
                            ) : (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-white">{action.label}</span>
                              {action.riskLevel && (
                                <Badge
                                  className={
                                    action.riskLevel === "high"
                                      ? "bg-red-500"
                                      : action.riskLevel === "medium"
                                      ? "bg-yellow-500"
                                      : "bg-green-500"
                                  }
                                >
                                  {action.riskLevel}
                                </Badge>
                              )}
                              {action.requiresConfirmation && (
                                <Badge className="bg-orange-500">Requires Confirmation</Badge>
                              )}
                            </div>
                            <div className="text-xs text-white/60">
                              Type: {action.type.replace("_", " ")}
                              {isExecuted && (
                                <span className="ml-2 text-green-400">✓ Executed</span>
                              )}
                              {isRitual && action.details?.subdomain === "pipeline" && (
                                <span className="ml-2 text-orange-400">Pipeline</span>
                              )}
                              {action.details?.subsource && (
                                <span className="ml-2 text-blue-400">
                                  {action.details.subsource}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </AppCard>

              {/* Weekly Review (for weekly rituals) */}
              {selectedRun.trigger?.source === "ritual/weekly" && selectedRun.weekly_review_summary && (
                <AppCard className="p-6">
                  <h2 className="text-xl font-semibold text-white mb-4">Weekly Review</h2>
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-white/60 mb-2">
                        Period: {new Date(selectedRun.weekly_review_summary.periodStart).toLocaleDateString()} - {new Date(selectedRun.weekly_review_summary.periodEnd).toLocaleDateString()}
                      </div>
                    </div>

                    {selectedRun.weekly_review_summary.highlights && selectedRun.weekly_review_summary.highlights.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-green-400 mb-2">Highlights</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm text-white/80">
                          {selectedRun.weekly_review_summary.highlights.map((h, idx) => (
                            <li key={idx}>{h}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedRun.weekly_review_summary.lowlights && selectedRun.weekly_review_summary.lowlights.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-orange-400 mb-2">Areas Needing Attention</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm text-white/80">
                          {selectedRun.weekly_review_summary.lowlights.map((l, idx) => (
                            <li key={idx}>{l}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedRun.weekly_review_summary.goalUpdates && selectedRun.weekly_review_summary.goalUpdates.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-blue-400 mb-2">Goal Progress</h3>
                        <div className="space-y-2">
                          {selectedRun.weekly_review_summary.goalUpdates.map((goal, idx) => (
                            <div key={idx} className="bg-white/5 p-3 rounded-lg">
                              <div className="font-medium text-white">{goal.title}</div>
                              <div className="text-sm text-white/60 mt-1">{goal.progressNote}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedRun.weekly_review_summary.upcomingRisks && selectedRun.weekly_review_summary.upcomingRisks.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-red-400 mb-2">Upcoming Risks</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm text-white/80">
                          {selectedRun.weekly_review_summary.upcomingRisks.map((r, idx) => (
                            <li key={idx}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedRun.weekly_review_summary.upcomingOpportunities && selectedRun.weekly_review_summary.upcomingOpportunities.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-green-400 mb-2">Upcoming Opportunities</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm text-white/80">
                          {selectedRun.weekly_review_summary.upcomingOpportunities.map((o, idx) => (
                            <li key={idx}>{o}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedRun.weekly_review_summary.focusRecommendations && selectedRun.weekly_review_summary.focusRecommendations.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-purple-400 mb-2">Focus Recommendations</h3>
                        <ul className="list-disc list-inside space-y-1 text-sm text-white/80">
                          {selectedRun.weekly_review_summary.focusRecommendations.map((f, idx) => (
                            <li key={idx}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedRun.weekly_review_summary_narrative && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <h3 className="font-semibold text-white mb-2">Strategic Narrative</h3>
                        <div className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">
                          {selectedRun.weekly_review_summary_narrative}
                        </div>
                      </div>
                    )}
                  </div>
                </AppCard>
              )}

              {/* World Snapshot (Enhanced) */}
              <AppCard className="p-6">
                <details>
                  <summary className="text-xl font-semibold text-white cursor-pointer">
                    World Snapshot
                  </summary>
                  <div className="mt-4 space-y-4">
                    {/* Identity */}
                    {selectedRun.world_snapshot?.identity && (
                      <div className="bg-white/5 p-4 rounded-lg">
                        <h3 className="font-semibold text-white mb-2">Identity</h3>
                        <div className="text-sm text-white/80 space-y-1">
                          {selectedRun.world_snapshot.identity.roles?.length > 0 && (
                            <div>
                              <span className="text-white/60">Roles: </span>
                              {selectedRun.world_snapshot.identity.roles.join(", ")}
                            </div>
                          )}
                          {selectedRun.world_snapshot.identity.priorities?.length > 0 && (
                            <div>
                              <span className="text-white/60">Priorities: </span>
                              {selectedRun.world_snapshot.identity.priorities.join(", ")}
                            </div>
                          )}
                          {selectedRun.world_snapshot.identity.archetype && (
                            <div>
                              <span className="text-white/60">Archetype: </span>
                              {selectedRun.world_snapshot.identity.archetype}
                            </div>
                          )}
                          {selectedRun.world_snapshot.identity.strengths?.length > 0 && (
                            <div>
                              <span className="text-white/60">Strengths: </span>
                              {selectedRun.world_snapshot.identity.strengths.join(", ")}
                            </div>
                          )}
                          {selectedRun.world_snapshot.identity.blindspots?.length > 0 && (
                            <div>
                              <span className="text-white/60">Blindspots: </span>
                              {selectedRun.world_snapshot.identity.blindspots.join(", ")}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Emotion */}
                    {selectedRun.world_snapshot?.emotion && (
                      <div className="bg-white/5 p-4 rounded-lg">
                        <h3 className="font-semibold text-white mb-2">Emotion</h3>
                        <div className="text-sm text-white/80 space-y-1">
                          {selectedRun.world_snapshot.emotion.currentState && (
                            <div>
                              <span className="text-white/60">State: </span>
                              {selectedRun.world_snapshot.emotion.currentState}
                            </div>
                          )}
                          {selectedRun.world_snapshot.emotion.recentTrend && (
                            <div>
                              <span className="text-white/60">Trend: </span>
                              {selectedRun.world_snapshot.emotion.recentTrend}
                            </div>
                          )}
                          {selectedRun.world_snapshot.emotion.intensity !== undefined && (
                            <div>
                              <span className="text-white/60">Intensity: </span>
                              {Math.round(selectedRun.world_snapshot.emotion.intensity * 100)}%
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Calendar Features */}
                    {selectedRun.world_snapshot?.time?.dayFeatures && (
                      <div className="bg-white/5 p-4 rounded-lg">
                        <h3 className="font-semibold text-white mb-2">Day Features</h3>
                        <div className="text-sm text-white/80 space-y-1">
                          {selectedRun.world_snapshot.time.dayFeatures.overloadScore !== undefined && (
                            <div>
                              <span className="text-white/60">Overload Score: </span>
                              {Math.round(selectedRun.world_snapshot.time.dayFeatures.overloadScore * 100)}%
                            </div>
                          )}
                          {selectedRun.world_snapshot.time.dayFeatures.fragmentationScore !== undefined && (
                            <div>
                              <span className="text-white/60">Fragmentation: </span>
                              {Math.round(selectedRun.world_snapshot.time.dayFeatures.fragmentationScore * 100)}%
                            </div>
                          )}
                          {selectedRun.world_snapshot.time.dayFeatures.opportunityBlocks?.length > 0 && (
                            <div>
                              <span className="text-white/60">Opportunity Blocks: </span>
                              {selectedRun.world_snapshot.time.dayFeatures.opportunityBlocks.length}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Routines */}
                    {selectedRun.world_snapshot?.meta?.routineProfile && (
                      <div className="bg-white/5 p-4 rounded-lg">
                        <h3 className="font-semibold text-white mb-2">Routines</h3>
                        <div className="text-sm text-white/80 space-y-1">
                          {selectedRun.world_snapshot.meta.routineProfile.bestFocusWindow && (
                            <div>
                              <span className="text-white/60">Best Focus: </span>
                              {selectedRun.world_snapshot.meta.routineProfile.bestFocusWindow.startHour}:00 -{" "}
                              {selectedRun.world_snapshot.meta.routineProfile.bestFocusWindow.endHour}:00
                              {selectedRun.world_snapshot.meta.routineProfile.bestFocusWindow.confidence && (
                                <span className="text-white/50">
                                  {" "}
                                  ({Math.round(selectedRun.world_snapshot.meta.routineProfile.bestFocusWindow.confidence * 100)}% confidence)
                                </span>
                              )}
                            </div>
                          )}
                          {selectedRun.world_snapshot.meta.routineProfile.avoidanceWindow && (
                            <div>
                              <span className="text-white/60">Avoidance Window: </span>
                              {selectedRun.world_snapshot.meta.routineProfile.avoidanceWindow.startHour}:00 -{" "}
                              {selectedRun.world_snapshot.meta.routineProfile.avoidanceWindow.endHour}:00
                              {selectedRun.world_snapshot.meta.routineProfile.avoidanceWindow.pattern && (
                                <span className="text-white/50"> ({selectedRun.world_snapshot.meta.routineProfile.avoidanceWindow.pattern})</span>
                              )}
                            </div>
                          )}
                          {selectedRun.world_snapshot.meta.routineProfile.highPerformanceDays?.length > 0 && (
                            <div>
                              <span className="text-white/60">High-Performance Days: </span>
                              {selectedRun.world_snapshot.meta.routineProfile.highPerformanceDays
                                .map((d: number) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d])
                                .join(", ")}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Predictions */}
                    {selectedRun.world_snapshot?.predictions && (
                      <div className="bg-white/5 p-4 rounded-lg">
                        <h3 className="font-semibold text-white mb-2">Predictions</h3>
                        <div className="text-sm text-white/80 space-y-1">
                          {selectedRun.world_snapshot.predictions.likelyAfternoonStress && (
                            <div>
                              <span className="text-white/60">Afternoon Stress: </span>
                              <Badge
                                className={
                                  selectedRun.world_snapshot.predictions.likelyAfternoonStress === "high"
                                    ? "bg-red-500"
                                    : selectedRun.world_snapshot.predictions.likelyAfternoonStress === "medium"
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                                }
                              >
                                {selectedRun.world_snapshot.predictions.likelyAfternoonStress}
                              </Badge>
                            </div>
                          )}
                          {selectedRun.world_snapshot.predictions.likelyTaskSpilloverToday !== undefined && (
                            <div>
                              <span className="text-white/60">Task Spillover: </span>
                              {selectedRun.world_snapshot.predictions.likelyTaskSpilloverToday ? (
                                <Badge className="bg-orange-500">Likely</Badge>
                              ) : (
                                <Badge className="bg-green-500">Unlikely</Badge>
                              )}
                            </div>
                          )}
                          {selectedRun.world_snapshot.predictions.likelyInboxOverloadToday !== undefined && (
                            <div>
                              <span className="text-white/60">Inbox Overload: </span>
                              {selectedRun.world_snapshot.predictions.likelyInboxOverloadToday ? (
                                <Badge className="bg-orange-500">Likely</Badge>
                              ) : (
                                <Badge className="bg-green-500">Unlikely</Badge>
                              )}
                            </div>
                          )}
                          {selectedRun.world_snapshot.predictions.riskOfProcrastinationOnKeyTasks !== undefined && (
                            <div>
                              <span className="text-white/60">Procrastination Risk: </span>
                              {selectedRun.world_snapshot.predictions.riskOfProcrastinationOnKeyTasks ? (
                                <Badge className="bg-red-500">High</Badge>
                              ) : (
                                <Badge className="bg-green-500">Low</Badge>
                              )}
                            </div>
                          )}
                          {selectedRun.world_snapshot.predictions.focusWindowsToday?.length > 0 && (
                            <div>
                              <span className="text-white/60">Focus Windows: </span>
                              {selectedRun.world_snapshot.predictions.focusWindowsToday.map((fw: any, idx: number) => (
                                <div key={idx} className="ml-4 mt-1">
                                  {new Date(fw.start).toLocaleTimeString()} - {new Date(fw.end).toLocaleTimeString()}
                                  {fw.quality && (
                                    <span className="text-white/50"> ({fw.quality})</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Full JSON (Collapsible) */}
                    <details className="mt-4">
                      <summary className="text-sm text-white/60 cursor-pointer">View Full JSON</summary>
                      <pre className="mt-2 text-xs text-white/70 bg-black/30 p-4 rounded overflow-auto max-h-96">
                        {JSON.stringify(selectedRun.world_snapshot, null, 2)}
                      </pre>
                    </details>
                  </div>
                </details>
              </AppCard>
            </>
          ) : (
            <AppCard className="p-12 text-center">
              <Zap className="w-16 h-16 text-white/30 mx-auto mb-4" />
              <p className="text-white/70">Select a run to view details</p>
            </AppCard>
          )}
        </div>
      </div>
    </div>
  );
}

