// Unified Communications Command Center
// app/comms/command-center/page.tsx

"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Phone, Mail, AlertCircle, CheckCircle2, ArrowRight, Mic, BookOpen, X } from "lucide-react";
import Link from "next/link";

interface CommsOverviewData {
  attentionScore: {
    score: number;
    riskLevel: string;
    breakdown: any;
    comms: {
      smsResponsibilitiesOpen: number;
      smsPromisesOpen: number;
      callResponsibilitiesOpen: number;
      callPromisesOpen: number;
    };
  };
  urgentItems: Array<{
    source: "email" | "sms" | "call" | "audio";
    type: "followup" | "promise" | "task";
    label: string;
    due_at?: string | null;
    link?: string | null;
    contactId?: string | null;
  }>;
  smsFeed: Array<{
    contact: string;
    lastMessageSnippet: string;
    occurred_at: string;
    channelId: string;
    hasOpenResponsibilities: boolean;
  }>;
  callFeed: Array<{
    contact: string;
    summarySnippet: string;
    occurred_at: string;
    channelId: string;
    hasOpenResponsibilities: boolean;
  }>;
  audioFeed: Array<{
    title: string;
    transcriptSnippet: string;
    occurred_at: string;
    messageId: string;
    hasOpenResponsibilities: boolean;
    hasPromises: boolean;
  }>;
}

const SOURCE_ICONS: Record<string, any> = {
  email: Mail,
  sms: MessageSquare,
  call: Phone,
  audio: Mic,
};

const SOURCE_COLORS: Record<string, string> = {
  email: "text-blue-400",
  sms: "text-green-400",
  call: "text-purple-400",
  audio: "text-violet-400",
};

export default function UnifiedCommsCommandCenterPage() {
  const [overview, setOverview] = useState<CommsOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [playbookContactId, setPlaybookContactId] = useState<string | null>(null);
  const [playbook, setPlaybook] = useState<any>(null);
  const [loadingPlaybook, setLoadingPlaybook] = useState(false);

  useEffect(() => {
    loadOverview();
  }, []);

  async function loadOverview() {
    try {
      const res = await fetch("/api/comms/overview");
      const data = await res.json();
      if (res.ok) {
        setOverview(data);
      }
    } catch (err) {
      console.error("Failed to load overview:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadPlaybook(contactId: string) {
    setLoadingPlaybook(true);
    setPlaybookContactId(contactId);
    try {
      const res = await fetch(`/api/contacts/${contactId}/playbook`);
      const data = await res.json();
      if (res.ok) {
        setPlaybook(data);
      }
    } catch (err) {
      console.error("Failed to load playbook:", err);
    } finally {
      setLoadingPlaybook(false);
    }
  }

  function closePlaybook() {
    setPlaybookContactId(null);
    setPlaybook(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading communications command center...</div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-6xl mx-auto text-center text-zinc-400">
          No communications data available.
        </div>
      </div>
    );
  }

  const totalObligations =
    overview.attentionScore.breakdown.urgentFollowups +
    overview.attentionScore.breakdown.overdueTasks +
    overview.attentionScore.comms.smsResponsibilitiesOpen +
    overview.attentionScore.comms.callResponsibilitiesOpen;

  const totalPromises =
    overview.attentionScore.breakdown.overduePromises +
    overview.attentionScore.comms.smsPromisesOpen +
    overview.attentionScore.comms.callPromisesOpen;

  const riskColor =
    overview.attentionScore.riskLevel === "High"
      ? "text-red-400"
      : overview.attentionScore.riskLevel === "Moderate"
      ? "text-amber-400"
      : "text-green-400";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-violet-400" />
              Unified Communications Command Center
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Center of your life — monitoring everything
            </p>
          </div>
        </div>

        {/* Global Comms Attention */}
        <div className="bg-gradient-to-br from-violet-900/20 to-zinc-900/50 border border-violet-800/50 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-zinc-400">Global Communications Attention</div>
              <div className="text-5xl font-bold text-white mt-2">
                {overview.attentionScore.score}
                <span className="text-lg text-zinc-400">/100</span>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-xl font-semibold ${riskColor}`}>
                Risk Level: {overview.attentionScore.riskLevel}
              </div>
              <div className="text-sm text-zinc-400 mt-2">
                You have {totalObligations} open obligations and {totalPromises} open promises
                <br />
                across email, SMS and calls.
              </div>
            </div>
          </div>
        </div>

        {/* Urgent Items */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Urgent Items</h2>
          </div>

          {overview.urgentItems.length === 0 ? (
            <div className="text-sm text-zinc-400">No urgent items. You're all caught up!</div>
          ) : (
            <div className="space-y-2">
              {overview.urgentItems.map((item, idx) => {
                const Icon = SOURCE_ICONS[item.source] || MessageSquare;
                const colorClass = SOURCE_COLORS[item.source] || "text-zinc-400";
                const isOverdue = item.due_at && new Date(item.due_at) < new Date();

                return (
                  <div
                    key={idx}
                    className={`border rounded-lg p-3 flex items-center justify-between ${
                      isOverdue
                        ? "border-red-500/50 bg-red-500/10"
                        : "border-amber-500/50 bg-amber-500/10"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Icon className={`w-4 h-4 ${colorClass}`} />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{item.label}</div>
                        <div className="text-xs text-zinc-400 mt-1">
                          {item.type} · {item.source}
                          {item.due_at && (
                            <>
                              {" · "}
                              Due: {new Date(item.due_at).toLocaleString()}
                              {isOverdue && (
                                <span className="ml-2 text-red-400 font-medium">OVERDUE</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.contactId && (
                        <>
                          <button
                            onClick={() => loadPlaybook(item.contactId!)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors flex items-center gap-1"
                          >
                            <BookOpen className="w-3 h-3" />
                            Playbook
                          </button>
                          <Link
                            href={`/contacts/${item.contactId}/cockpit`}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs transition-colors flex items-center gap-1"
                          >
                            Cockpit
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </>
                      )}
                      {item.link && (
                        <Link
                          href={item.link}
                          className="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded text-xs transition-colors flex items-center gap-1"
                        >
                          Open
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Audio Highlights */}
        {overview.audioFeed && overview.audioFeed.length > 0 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Mic className="w-5 h-5 text-violet-400" />
              <h2 className="text-lg font-semibold text-white">Audio Highlights</h2>
            </div>

            <div className="space-y-2">
              {overview.audioFeed.map((audio, idx) => (
                <Link
                  key={idx}
                  href={`/comms/audio/${audio.messageId}`}
                  className="block border border-zinc-700 rounded-lg p-3 hover:bg-zinc-800/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">{audio.title}</div>
                      <div className="text-xs text-zinc-400 mt-1">{audio.transcriptSnippet}</div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {new Date(audio.occurred_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {audio.hasOpenResponsibilities && (
                        <div className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
                          Tasks
                        </div>
                      )}
                      {audio.hasPromises && (
                        <div className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                          Promises
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* SMS & Calls Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* SMS Panel */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-400" />
              <h2 className="text-lg font-semibold text-white">SMS</h2>
            </div>

            {overview.smsFeed.length === 0 ? (
              <div className="text-sm text-zinc-400">No recent SMS messages.</div>
            ) : (
              <div className="space-y-2">
                {overview.smsFeed.map((sms, idx) => (
                  <Link
                    key={idx}
                    href={`/comms/thread/${sms.channelId}`}
                    className="block border border-zinc-700 rounded-lg p-3 hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{sms.contact}</div>
                        <div className="text-xs text-zinc-400 mt-1">{sms.lastMessageSnippet}</div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {new Date(sms.occurred_at).toLocaleString()}
                        </div>
                      </div>
                      {sms.hasOpenResponsibilities && (
                        <div className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
                          Tasks
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Calls Panel */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">Calls</h2>
            </div>

            {overview.callFeed.length === 0 ? (
              <div className="text-sm text-zinc-400">No recent calls.</div>
            ) : (
              <div className="space-y-2">
                {overview.callFeed.map((call, idx) => (
                  <Link
                    key={idx}
                    href={`/comms/thread/${call.channelId}`}
                    className="block border border-zinc-700 rounded-lg p-3 hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">{call.contact}</div>
                        <div className="text-xs text-zinc-400 mt-1">{call.summarySnippet}</div>
                        <div className="text-xs text-zinc-500 mt-1">
                          {new Date(call.occurred_at).toLocaleString()}
                        </div>
                      </div>
                      {call.hasOpenResponsibilities && (
                        <div className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
                          Tasks
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Playbook Side Panel */}
      {playbookContactId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-400" />
                Interaction Playbook
              </h2>
              <button
                onClick={closePlaybook}
                className="p-2 hover:bg-zinc-800 rounded transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {loadingPlaybook ? (
                <div className="text-zinc-400">Loading playbook...</div>
              ) : playbook ? (
                <>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-400 mb-2">Summary</h3>
                    <p className="text-white">{playbook.summary}</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h3 className="text-sm font-semibold text-green-400 mb-2">DO</h3>
                      <ul className="space-y-1">
                        {playbook.doList.map((item: string, idx: number) => (
                          <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2">
                            <span className="text-green-400 mt-1">✓</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-red-400 mb-2">DON'T</h3>
                      <ul className="space-y-1">
                        {playbook.dontList.map((item: string, idx: number) => (
                          <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2">
                            <span className="text-red-400 mt-1">✗</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-zinc-400 mb-2">Channel Guidelines</h3>
                    <p className="text-sm text-zinc-300">{playbook.channelGuidelines}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-zinc-400 mb-2">Tone Guidelines</h3>
                    <p className="text-sm text-zinc-300">{playbook.toneGuidelines}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-zinc-400 mb-2">Conflict Strategy</h3>
                    <p className="text-sm text-zinc-300">{playbook.conflictStrategy}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-zinc-400 mb-2">Persuasion Levers</h3>
                    <p className="text-sm text-zinc-300">{playbook.persuasionLevers}</p>
                  </div>
                </>
              ) : (
                <div className="text-zinc-400">No playbook available yet.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

