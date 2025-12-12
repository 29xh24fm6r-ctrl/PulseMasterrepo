// Contact Relationship Cockpit
// app/contacts/[contactId]/cockpit/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  User,
  Mail,
  MessageSquare,
  Phone,
  Mic,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Send,
  X,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

interface ContactCockpitData {
  contact: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    title?: string | null;
    primary_channel?: string | null;
    vip_level?: string | null;
    notes_short?: string | null;
  };
  relationshipScores?: {
    familiarity_score: number | null;
    trust_score: number | null;
    warmth_score: number | null;
    influence_score: number | null;
    power_balance_score: number | null;
  };
  behaviorProfile?: any;
  identityIntel?: any;
  playbook?: any;
  recentInteractions: Array<{
    id: string;
    channel: "email" | "sms" | "call" | "audio";
    direction: "incoming" | "outgoing";
    occurred_at: string;
    snippet: string;
    sentiment?: number | null;
    emotion_label?: string | null;
    has_responsibilities: boolean;
    has_promises: boolean;
  }>;
  openItems: {
    tasks: Array<{
      id: string;
      title: string;
      due_at?: string | null;
      status: string;
      source_channel: string;
    }>;
    promises: Array<{
      id: string;
      description: string;
      promise_due_at?: string | null;
      status: string;
      source_channel: string;
    }>;
  };
  nextBestAction?: {
    suggested_channel: string;
    suggested_summary: string;
    suggested_message: string;
    rationale: string;
    confidence: number;
  } | null;
}

export default function ContactCockpitPage() {
  const params = useParams();
  const contactId = params.contactId as string;

  const [data, setData] = useState<ContactCockpitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionEventId, setActionEventId] = useState<string | null>(null);

  useEffect(() => {
    if (contactId) {
      loadCockpit();
    }
  }, [contactId]);

  async function loadCockpit() {
    try {
      const res = await fetch(`/api/contacts/${contactId}/cockpit`);
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

  async function generateNextAction() {
    try {
      const res = await fetch(`/api/contacts/${contactId}/influence/next-action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (res.ok) {
        setData((prev) => (prev ? { ...prev, nextBestAction: json } : null));
        // Store event ID for feedback (would need to be returned from API)
      }
    } catch (err) {
      console.error("Failed to generate next action:", err);
    }
  }

  async function copyMessage(text: string) {
    await navigator.clipboard.writeText(text);
    alert("Message copied to clipboard!");
  }

  async function markAsSent() {
    if (actionEventId) {
      await fetch(`/api/influence/events/${actionEventId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_action: "sent_as_is",
        }),
      });
    }
    alert("Marked as sent!");
  }

  function getChannelIcon(channel: string) {
    switch (channel) {
      case "email":
        return <Mail className="w-4 h-4" />;
      case "sms":
        return <MessageSquare className="w-4 h-4" />;
      case "call":
        return <Phone className="w-4 h-4" />;
      case "audio":
        return <Mic className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  }

  function getSentimentEmoji(sentiment?: number | null) {
    if (!sentiment) return "😐";
    if (sentiment > 0.3) return "🙂";
    if (sentiment < -0.3) return "☹️";
    return "😐";
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading cockpit...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-7xl mx-auto text-center text-zinc-400">
          Failed to load contact cockpit.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-violet-600 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{data.contact.name}</h1>
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                {data.contact.title && <span>{data.contact.title}</span>}
                {data.contact.company && <span>at {data.contact.company}</span>}
                {data.contact.vip_level && (
                  <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">
                    VIP
                  </span>
                )}
              </div>
            </div>
          </div>
          <Link
            href={`/contacts/${contactId}`}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
          >
            Back to Contact
          </Link>
        </div>

        {/* Primary Channel Chips */}
        {data.contact.primary_channel && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Primary Channel:</span>
            <span className="px-3 py-1 bg-violet-600/20 text-violet-400 rounded text-sm capitalize">
              {data.contact.primary_channel}
            </span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Relationship & Intelligence */}
          <div className="lg:col-span-1 space-y-6">
            {/* Relationship Health */}
            {data.relationshipScores && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  Relationship Health
                </h2>
                <div className="space-y-3">
                  {data.relationshipScores.familiarity_score !== null && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-zinc-400">Familiarity</span>
                        <span className="text-xs text-zinc-400">
                          {Math.round((data.relationshipScores.familiarity_score || 0) * 100)}%
                        </span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{
                            width: `${(data.relationshipScores.familiarity_score || 0) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {data.relationshipScores.trust_score !== null && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-zinc-400">Trust</span>
                        <span className="text-xs text-zinc-400">
                          {Math.round((data.relationshipScores.trust_score || 0) * 100)}%
                        </span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500"
                          style={{
                            width: `${(data.relationshipScores.trust_score || 0) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {data.relationshipScores.warmth_score !== null && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-zinc-400">Warmth</span>
                        <span className="text-xs text-zinc-400">
                          {Math.round((data.relationshipScores.warmth_score || 0) * 100)}%
                        </span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-pink-500"
                          style={{
                            width: `${(data.relationshipScores.warmth_score || 0) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {data.relationshipScores.influence_score !== null && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-zinc-400">Influence</span>
                        <span className="text-xs text-zinc-400">
                          {Math.round((data.relationshipScores.influence_score || 0) * 100)}%
                        </span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500"
                          style={{
                            width: `${(data.relationshipScores.influence_score || 0) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Behavior Profile */}
            {data.behaviorProfile && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  Behavior Profile
                </h2>
                <div className="space-y-2 text-sm">
                  {data.behaviorProfile.prefers_channel && (
                    <div>
                      <span className="text-zinc-400">Preferred:</span>{" "}
                      <span className="text-white capitalize">{data.behaviorProfile.prefers_channel}</span>
                    </div>
                  )}
                  {data.behaviorProfile.escalation_channel && (
                    <div>
                      <span className="text-zinc-400">Escalation:</span>{" "}
                      <span className="text-white capitalize">
                        {data.behaviorProfile.escalation_channel}
                      </span>
                    </div>
                  )}
                  {data.behaviorProfile.avg_response_minutes && (
                    <div>
                      <span className="text-zinc-400">Your Response:</span>{" "}
                      <span className="text-white">
                        {Math.round(data.behaviorProfile.avg_response_minutes)} min avg
                      </span>
                    </div>
                  )}
                  {data.behaviorProfile.their_avg_response_minutes && (
                    <div>
                      <span className="text-zinc-400">Their Response:</span>{" "}
                      <span className="text-white">
                        {Math.round(data.behaviorProfile.their_avg_response_minutes)} min avg
                      </span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div>
                      <div className="text-xs text-zinc-400 mb-1">Reliability</div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500"
                          style={{
                            width: `${((data.behaviorProfile.reliability_score || 0.5) * 100).toFixed(0)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-400 mb-1">Risk</div>
                      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500"
                          style={{
                            width: `${((data.behaviorProfile.risk_score || 0.5) * 100).toFixed(0)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Identity Intel */}
            {data.identityIntel && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  Identity Intel
                </h2>
                {data.identityIntel.summarised_identity && (
                  <p className="text-sm text-zinc-300">{data.identityIntel.summarised_identity}</p>
                )}
                {data.identityIntel.inferred_communication_style && (
                  <div>
                    <div className="text-xs text-zinc-400 mb-2">Communication Style</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(data.identityIntel.inferred_communication_style).map(
                        ([key, value]) => (
                          <span
                            key={key}
                            className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs"
                          >
                            {key}: {String(value)}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Action & Timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Next Best Action */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-400" />
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
                    <div className="text-xs text-zinc-400 mb-1">Channel</div>
                    <span className="px-2 py-1 bg-violet-600/20 text-violet-400 rounded text-sm capitalize">
                      {data.nextBestAction.suggested_channel}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400 mb-1">Summary</div>
                    <p className="text-sm text-white">{data.nextBestAction.suggested_summary}</p>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400 mb-1">Suggested Message</div>
                    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-300 whitespace-pre-wrap">
                      {data.nextBestAction.suggested_message}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyMessage(data.nextBestAction!.suggested_message)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy
                    </button>
                    <button
                      onClick={markAsSent}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm transition-colors flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      Mark as Sent
                    </button>
                    <button
                      onClick={() => setData((prev) => (prev ? { ...prev, nextBestAction: null } : null))}
                      className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 text-white rounded text-sm transition-colors flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Ignore
                    </button>
                  </div>
                  <div className="text-xs text-zinc-500">{data.nextBestAction.rationale}</div>
                </div>
              ) : (
                <div className="text-sm text-zinc-400">Click "Generate" to get AI-suggested next action.</div>
              )}
            </div>

            {/* Open Items */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Open Items
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Tasks */}
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 mb-2">Tasks ({data.openItems.tasks.length})</h3>
                  {data.openItems.tasks.length === 0 ? (
                    <div className="text-xs text-zinc-500">No open tasks</div>
                  ) : (
                    <div className="space-y-2">
                      {data.openItems.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="border border-zinc-700 rounded-lg p-2 text-xs space-y-1"
                        >
                          <div className="text-white">{task.title}</div>
                          {task.due_at && (
                            <div className="text-zinc-500">
                              Due: {new Date(task.due_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Promises */}
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 mb-2">
                    Promises ({data.openItems.promises.length})
                  </h3>
                  {data.openItems.promises.length === 0 ? (
                    <div className="text-xs text-zinc-500">No open promises</div>
                  ) : (
                    <div className="space-y-2">
                      {data.openItems.promises.map((promise) => (
                        <div
                          key={promise.id}
                          className="border border-zinc-700 rounded-lg p-2 text-xs space-y-1"
                        >
                          <div className="text-white">{promise.description}</div>
                          {promise.promise_due_at && (
                            <div className="text-zinc-500">
                              Due: {new Date(promise.promise_due_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Interactions Timeline */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Recent Interactions</h2>
              {data.recentInteractions.length === 0 ? (
                <div className="text-sm text-zinc-400">No recent interactions</div>
              ) : (
                <div className="space-y-3">
                  {data.recentInteractions.slice(0, 20).map((interaction) => (
                    <div
                      key={interaction.id}
                      className="flex items-start gap-3 border-l-2 border-zinc-700 pl-3 py-2"
                    >
                      <div className="mt-0.5">
                        {getChannelIcon(interaction.channel)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-zinc-400 capitalize">{interaction.channel}</span>
                          <span
                            className={`text-xs ${
                              interaction.direction === "incoming" ? "text-blue-400" : "text-green-400"
                            }`}
                          >
                            {interaction.direction === "incoming" ? "←" : "→"}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {new Date(interaction.occurred_at).toLocaleString()}
                          </span>
                          <span className="text-lg">{getSentimentEmoji(interaction.sentiment)}</span>
                        </div>
                        <div className="text-sm text-zinc-300 truncate">{interaction.snippet}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

