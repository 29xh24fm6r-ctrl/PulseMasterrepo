// app/autopilot/command-center/page.tsx
// Sprint 4: Admin Command Center UI
"use client";

import { useState, useEffect } from "react";
import { getJson } from "@/lib/http/getJson";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";

interface JobRun {
  id: string;
  job_id: string;
  job_type: string;
  status: "running" | "succeeded" | "failed";
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  error_message: string | null;
}

interface AutomationRun {
  id: string;
  run_type: string;
  status: "running" | "succeeded" | "failed";
  sources_scanned: number;
  suggestions_count: number;
  actions_executed_count: number;
  started_at: string;
  finished_at: string | null;
  error_message: string | null;
}

interface AutomationAction {
  id: string;
  action_type: string;
  status: "suggested" | "approved" | "executed" | "rejected" | "failed";
  created_at: string;
  approved_at: string | null;
  executed_at: string | null;
}

interface AgentReport {
  id: string;
  agent_id: string;
  findings_count: number;
  suggested_actions_count: number;
  risk_flags: string[];
  created_at: string;
}

export default function CommandCenterPage() {
  const [activeTab, setActiveTab] = useState<"jobs" | "automation" | "agents" | "actions">("jobs");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [jobRuns, setJobRuns] = useState<JobRun[]>([]);
  const [automationRuns, setAutomationRuns] = useState<AutomationRun[]>([]);
  const [automationActions, setAutomationActions] = useState<AutomationAction[]>([]);
  const [agentReports, setAgentReports] = useState<AgentReport[]>([]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  async function loadData() {
    setLoading(true);
    try {
      if (activeTab === "jobs") {
        const { ok, data } = await getJson("/api/autopilot/job-runs?limit=50");
        if (ok) {
          setJobRuns(data.items || []);
        }
      } else if (activeTab === "automation") {
        const { ok, data } = await getJson("/api/autopilot/automation-runs?limit=50");
        if (ok) {
          setAutomationRuns(data.items || []);
        }
      } else if (activeTab === "actions") {
        const { ok, data } = await getJson("/api/autopilot/actions?limit=50");
        if (ok) {
          setAutomationActions(data.items || []);
        }
      } else if (activeTab === "agents") {
        const { ok, data } = await getJson("/api/autopilot/agent-reports?limit=50");
        if (ok) {
          setAgentReports(data.items || []);
        }
      }
    } catch (err: any) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function formatDuration(ms: number | null): string {
    if (!ms) return "—";
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  function formatTimeAgo(date: string): string {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Command Center</h1>
            <p className="text-slate-400">Monitor jobs, automation, and agents</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-800">
          {[
            { id: "jobs", label: "Job Runs" },
            { id: "automation", label: "Automation Runs" },
            { id: "actions", label: "Actions" },
            { id: "agents", label: "Agent Reports" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === tab.id
                  ? "text-indigo-400 border-b-2 border-indigo-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            {activeTab === "jobs" && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white mb-4">Recent Job Runs</h2>
                {jobRuns.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No job runs yet</p>
                ) : (
                  <div className="space-y-2">
                    {jobRuns.map((run) => (
                      <div
                        key={run.id}
                        className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg border border-slate-700"
                      >
                        <div className="flex items-center gap-4">
                          {run.status === "succeeded" && (
                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                          )}
                          {run.status === "failed" && (
                            <XCircle className="w-5 h-5 text-red-400" />
                          )}
                          {run.status === "running" && (
                            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                          )}
                          <div>
                            <div className="text-white font-medium">{run.job_type}</div>
                            <div className="text-sm text-slate-400">
                              {formatTimeAgo(run.started_at)} • {formatDuration(run.duration_ms)}
                            </div>
                          </div>
                        </div>
                        {run.error_message && (
                          <div className="text-sm text-red-400 max-w-md truncate">
                            {run.error_message}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "automation" && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white mb-4">Automation Runs</h2>
                {automationRuns.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No automation runs yet</p>
                ) : (
                  <div className="space-y-2">
                    {automationRuns.map((run) => (
                      <div
                        key={run.id}
                        className="p-4 bg-slate-800/50 rounded-lg border border-slate-700"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {run.status === "succeeded" && (
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                            )}
                            {run.status === "failed" && (
                              <XCircle className="w-4 h-4 text-red-400" />
                            )}
                            <span className="text-white font-medium">{run.run_type}</span>
                          </div>
                          <span className="text-sm text-slate-400">
                            {formatTimeAgo(run.started_at)}
                          </span>
                        </div>
                        <div className="flex gap-4 text-sm text-slate-400">
                          <span>Scanned: {run.sources_scanned || 0}</span>
                          <span>Suggestions: {run.suggestions_count || 0}</span>
                          <span>Executed: {run.actions_executed_count || 0}</span>
                        </div>
                        {run.error_message && (
                          <div className="mt-2 text-sm text-red-400">{run.error_message}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "actions" && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white mb-4">Automation Actions</h2>
                {automationActions.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No actions yet</p>
                ) : (
                  <div className="space-y-2">
                    {automationActions.map((action) => (
                      <div
                        key={action.id}
                        className="p-4 bg-slate-800/50 rounded-lg border border-slate-700"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white font-medium">{action.action_type}</div>
                            <div className="text-sm text-slate-400">
                              Status: {action.status} • {formatTimeAgo(action.created_at)}
                            </div>
                          </div>
                          {action.status === "suggested" && (
                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">
                              Needs Approval
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "agents" && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-white mb-4">Agent Reports</h2>
                {agentReports.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No agent reports yet</p>
                ) : (
                  <div className="space-y-2">
                    {agentReports.map((report) => (
                      <div
                        key={report.id}
                        className="p-4 bg-slate-800/50 rounded-lg border border-slate-700"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-white font-medium">Agent Report</div>
                          <span className="text-sm text-slate-400">
                            {formatTimeAgo(report.created_at)}
                          </span>
                        </div>
                        <div className="flex gap-4 text-sm text-slate-400">
                          <span>Findings: {report.findings_count}</span>
                          <span>Suggestions: {report.suggested_actions_count}</span>
                          {report.risk_flags.length > 0 && (
                            <span className="text-yellow-400">
                              Risks: {report.risk_flags.length}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
