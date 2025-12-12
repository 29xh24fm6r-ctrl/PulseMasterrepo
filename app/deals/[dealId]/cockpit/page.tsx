// Deal Cockpit Page
// app/deals/[dealId]/cockpit/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Briefcase,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Copy,
  Send,
  X,
  Sparkles,
  MessageSquare,
  Mail,
  Phone,
  ArrowRight,
  Target,
} from "lucide-react";
import Link from "next/link";

interface DealCockpitData {
  context: {
    deal: {
      id: string;
      name: string;
      description?: string | null;
      value?: number | null;
      status?: string | null;
      stage?: string | null;
      priority?: string | null;
      dueDate?: string | null;
      createdAt: string;
      updatedAt: string;
    };
    participants: Array<{
      contactId: string;
      name: string;
      email?: string | null;
      phone?: string | null;
      role?: string | null;
      importance?: number | null;
      relationshipScores?: any;
      behaviorProfile?: any;
      identityIntelSummary?: string | null;
      playbook?: any;
    }>;
    comms: Array<{
      id: string;
      channel: "email" | "sms" | "call" | "voicemail";
      occurredAt: string;
      direction: "incoming" | "outgoing" | "unknown";
      subjectOrSnippet: string;
    }>;
    tasks: Array<{
      id: string;
      title: string;
      status: string;
      dueAt?: string | null;
    }>;
  };
  intel: {
    riskSummary?: string | null;
    blockers?: Array<{ label: string; description: string }>;
    nextSteps?: Array<{ label: string; description: string }>;
    stallIndicators?: string[];
    momentumScore?: number | null;
    confidence?: number | null;
    generatedAt?: string | null;
  } | null;
  nextBestAction?: {
    actionSummary: string;
    targetContactId: string | null;
    targetContactName?: string | null;
    suggestedChannel: "email" | "sms" | "call";
    suggestedMessage: string;
    rationale: string;
    confidence: number;
  } | null;
}

export default function DealCockpitPage() {
  const params = useParams();
  const dealId = params.dealId as string;

  const [data, setData] = useState<DealCockpitData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (dealId) {
      loadCockpit();
    }
  }, [dealId]);

  async function loadCockpit() {
    try {
      const res = await fetch(`/api/deals/${dealId}/cockpit`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load cockpit:", err);
    } finally {
      setLoading(false);
    }
  }

  async function regenerateIntelligence() {
    try {
      const res = await fetch(`/api/deals/${dealId}/intel/regenerate`, {
        method: "POST",
      });
      if (res.ok) {
        await loadCockpit();
      }
    } catch (err) {
      console.error("Failed to regenerate intelligence:", err);
    }
  }

  async function generateNextAction() {
    try {
      const res = await fetch(`/api/deals/${dealId}/next-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (res.ok) {
        setData((prev) => (prev ? { ...prev, nextBestAction: json } : null));
      }
    } catch (err) {
      console.error("Failed to generate next action:", err);
    }
  }

  async function copyMessage(text: string) {
    await navigator.clipboard.writeText(text);
    alert("Message copied to clipboard!");
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-400";
      case "stalled":
        return "bg-amber-500/20 text-amber-400";
      case "won":
        return "bg-blue-500/20 text-blue-400";
      case "lost":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-zinc-500/20 text-zinc-400";
    }
  }

  function getPriorityColor(priority?: string | null) {
    switch (priority) {
      case "critical":
        return "bg-red-500/20 text-red-400";
      case "high":
        return "bg-orange-500/20 text-orange-400";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400";
      case "low":
        return "bg-blue-500/20 text-blue-400";
      default:
        return "bg-zinc-500/20 text-zinc-400";
    }
  }

  function getChannelIcon(channel: string) {
    switch (channel) {
      case "email":
        return <Mail className="w-4 h-4 text-blue-400" />;
      case "sms":
        return <MessageSquare className="w-4 h-4 text-green-400" />;
      case "call":
        return <Phone className="w-4 h-4 text-purple-400" />;
      case "voicemail":
        return <Phone className="w-4 h-4 text-amber-400" />;
      default:
        return <MessageSquare className="w-4 h-4 text-zinc-400" />;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading deal cockpit...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-7xl mx-auto text-center text-zinc-400">
          Failed to load deal cockpit.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Deal Header */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Briefcase className="w-6 h-6 text-violet-400" />
                <h1 className="text-2xl font-bold text-white">{data.context.deal.name}</h1>
                {data.context.deal.status && (
                  <span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(data.context.deal.status)}`}>
                    {data.context.deal.status}
                  </span>
                )}
                {data.context.deal.priority && (
                  <span className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(data.context.deal.priority)}`}>
                    {data.context.deal.priority}
                  </span>
                )}
              </div>
              {data.context.deal.description && (
                <p className="text-sm text-zinc-400 mb-4">{data.context.deal.description}</p>
              )}
              <div className="flex items-center gap-6 text-sm">
                {data.context.deal.stage && (
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-zinc-400" />
                    <span className="text-zinc-300">Stage: {data.context.deal.stage}</span>
                  </div>
                )}
                {data.context.deal.value && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-zinc-400" />
                    <span className="text-zinc-300">${data.context.deal.value.toLocaleString()}</span>
                  </div>
                )}
                {data.context.deal.dueDate && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-zinc-400" />
                    <span className="text-zinc-300">
                      Due: {new Date(data.context.deal.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-zinc-400" />
                  <span className="text-zinc-300">
                    Updated: {new Date(data.context.deal.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Participants & Intelligence */}
          <div className="lg:col-span-1 space-y-6">
            {/* Participants */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                Participants ({data.context.participants.length})
              </h2>
              {data.context.participants.length === 0 ? (
                <div className="text-sm text-zinc-400">No participants added yet.</div>
              ) : (
                <div className="space-y-4">
                  {data.context.participants.map((participant) => {
                    return (
                      <div
                        key={participant.contactId}
                        className="border border-zinc-700 rounded-lg p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="font-medium text-white">{participant.name}</div>
                          <span className="text-xs text-zinc-400 capitalize">
                            {participant.role || "unknown"}
                          </span>
                        </div>
                        {participant.importance && (
                          <div>
                            <div className="text-xs text-zinc-400 mb-1">Importance</div>
                            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500"
                                style={{ width: `${participant.importance * 100}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {participant.behaviorProfile?.prefers_channel && (
                          <div className="text-xs text-zinc-400">
                            Prefers: {participant.behaviorProfile.prefers_channel}
                          </div>
                        )}
                        {participant.relationshipScores?.trust_score && (
                          <div className="text-xs text-zinc-400">
                            Trust:{" "}
                            {Math.round((participant.relationshipScores.trust_score || 0.5) * 100)}%
                          </div>
                        )}
                        {participant.identityIntelSummary && (
                          <div className="text-xs text-zinc-500 italic">
                            {participant.identityIntelSummary.substring(0, 80)}...
                          </div>
                        )}
                        {participant.contactId && (
                          <Link
                            href={`/contacts/${participant.contactId}/cockpit`}
                            className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                          >
                            Open Contact Cockpit
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Deal Intelligence */}
            {data.intel && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    Deal Intelligence
                  </h2>
                  <button
                    onClick={regenerateIntelligence}
                    className="text-xs text-violet-400 hover:text-violet-300"
                  >
                    Regenerate
                  </button>
                </div>

                {data.intel.momentumScore !== null && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-zinc-400">Momentum</span>
                      <span className="text-xs text-zinc-400">
                        {Math.round((data.intel.momentumScore || 0) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{
                          width: `${(data.intel.momentumScore || 0) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {data.intel.confidence !== null && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-zinc-400">Confidence</span>
                      <span className="text-xs text-zinc-400">
                        {Math.round((data.intel.confidence || 0) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{
                          width: `${(data.intel.confidence || 0) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {data.intel.riskSummary && (
                  <div>
                    <div className="text-xs font-medium text-zinc-400 mb-1">Risk Summary</div>
                    <p className="text-sm text-zinc-300">{data.intel.riskSummary}</p>
                  </div>
                )}

                {data.intel.blockers && Array.isArray(data.intel.blockers) && data.intel.blockers.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-red-400 mb-2">Blockers</div>
                    <div className="space-y-1">
                      {data.intel.blockers.map((blocker: any, idx: number) => (
                        <div key={idx} className="text-xs text-zinc-300">
                          • {blocker.description || blocker.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data.intel.nextSteps && Array.isArray(data.intel.nextSteps) && data.intel.nextSteps.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-green-400 mb-2">Next Steps</div>
                    <div className="space-y-1">
                      {data.intel.nextSteps.map((step: any, idx: number) => (
                        <div key={idx} className="text-xs text-zinc-300">
                          • {step.description || step.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {data.intel.stallIndicators && Array.isArray(data.intel.stallIndicators) && data.intel.stallIndicators.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-amber-400 mb-2">Stall Indicators</div>
                    <div className="space-y-1">
                      {data.intel.stallIndicators.map((indicator: string, idx: number) => (
                        <div key={idx} className="text-xs text-zinc-300">
                          • {indicator}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Actions & Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Next Best Action */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-violet-400" />
                  Next Best Action
                </h2>
                {!data.nextBestAction && (
                  <button
                    onClick={generateNextAction}
                    className="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded text-sm transition-colors"
                  >
                    Generate
                  </button>
                )}
              </div>
              {data.nextBestAction ? (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-zinc-400 mb-1">Target</div>
                    <div className="text-sm text-white">{data.nextBestAction.targetContactName || "Unknown"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400 mb-1">Channel</div>
                    <span className="px-2 py-1 bg-violet-600/20 text-violet-400 rounded text-sm capitalize flex items-center gap-1 w-fit">
                      {getChannelIcon(data.nextBestAction.suggestedChannel)}
                      {data.nextBestAction.suggestedChannel}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400 mb-1">Summary</div>
                    <p className="text-sm text-white">{data.nextBestAction.actionSummary}</p>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400 mb-1">Suggested Message</div>
                    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-300 whitespace-pre-wrap">
                      {data.nextBestAction.suggestedMessage}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyMessage(data.nextBestAction!.suggestedMessage)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                    {data.nextBestAction.targetContactId && (
                      <Link
                        href={`/contacts/${data.nextBestAction.targetContactId}/cockpit`}
                        className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm transition-colors flex items-center gap-1"
                      >
                        View Contact
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                    <Link
                      href={`/coaches/sales?context=deal:${dealId}`}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors flex items-center gap-1"
                    >
                      Ask Sales Coach
                    </Link>
                  </div>
                  <div className="text-xs text-zinc-500">{data.nextBestAction.rationale}</div>
                </div>
              ) : (
                <div className="text-sm text-zinc-400">Click "Generate" to get AI-suggested next action.</div>
              )}
            </div>

            {/* Timeline */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Deal Timeline</h2>

              {/* Tasks */}
              {data.context.tasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 mb-2">Tasks</h3>
                  <div className="space-y-2">
                    {data.context.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="border border-zinc-700 rounded-lg p-2 text-xs space-y-1"
                      >
                        <div className="text-white">{task.title}</div>
                        {task.dueAt && (
                          <div className="text-zinc-500">
                            Due: {new Date(task.dueAt).toLocaleDateString()}
                          </div>
                        )}
                        <div className="text-xs text-zinc-500 capitalize">Status: {task.status}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Communications */}
              {data.context.comms.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 mb-2">Communications</h3>
                  <div className="space-y-2">
                    {data.context.comms.slice(0, 20).map((comm) => (
                      <div
                        key={comm.id}
                        className="flex items-start gap-3 border-l-2 border-zinc-700 pl-3 py-2"
                      >
                        <div className="mt-0.5">{getChannelIcon(comm.channel)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-zinc-400 capitalize">{comm.channel}</span>
                            <span
                              className={`text-xs ${
                                comm.direction === "incoming" ? "text-blue-400" : "text-green-400"
                              }`}
                            >
                              {comm.direction === "incoming" ? "←" : "→"}
                            </span>
                            <span className="text-xs text-zinc-500">
                              {new Date(comm.occurredAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-sm text-zinc-300 truncate">
                            {comm.subjectOrSnippet || "No content"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.context.tasks.length === 0 && data.context.comms.length === 0 && (
                <div className="text-sm text-zinc-400">No timeline activity yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

