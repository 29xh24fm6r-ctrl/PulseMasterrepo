// Contact Detail Page with Behavior Profile & Playbook
// app/contacts/[contactId]/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { User, Mail, MessageSquare, Phone, Mic, TrendingUp, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import Link from "next/link";

export default function ContactDetailPage() {
  const params = useParams();
  const contactId = params.contactId as string;

  const [contact, setContact] = useState<any>(null);
  const [behavior, setBehavior] = useState<any>(null);
  const [playbook, setPlaybook] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (contactId) {
      loadContactData();
    }
  }, [contactId]);

  async function loadContactData() {
    try {
      const [contactRes, behaviorRes, playbookRes] = await Promise.all([
        fetch(`/api/contacts/${contactId}`),
        fetch(`/api/contacts/${contactId}/behavior`),
        fetch(`/api/contacts/${contactId}/playbook`),
      ]);

      if (contactRes.ok) {
        const contactData = await contactRes.json();
        setContact(contactData);
      }

      if (behaviorRes.ok) {
        const behaviorData = await behaviorRes.json();
        setBehavior(behaviorData);
      }

      if (playbookRes.ok) {
        const playbookData = await playbookRes.json();
        setPlaybook(playbookData);
      }
    } catch (err) {
      console.error("Failed to load contact data:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading contact...</div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-4xl mx-auto text-center text-zinc-400">
          Contact not found.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-violet-600 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{contact.name || "Unknown Contact"}</h1>
              <div className="text-sm text-zinc-400">
                {contact.email && <span>{contact.email}</span>}
                {contact.phone && <span className="ml-2">{contact.phone}</span>}
              </div>
            </div>
          </div>
          <Link
            href={`/contacts/${contactId}/cockpit`}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Open Relationship Cockpit
          </Link>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Behavior Profile */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              Behavior Profile
            </h2>

            {behavior ? (
              <div className="space-y-4">
                {/* Channel Stats */}
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 mb-2">Communication Channels</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-400" />
                      <span className="text-zinc-300">
                        {behavior.emailsSent + behavior.emailsReceived} emails
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-green-400" />
                      <span className="text-zinc-300">
                        {behavior.smsSent + behavior.smsReceived} SMS
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-purple-400" />
                      <span className="text-zinc-300">{behavior.callsCount} calls</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-violet-400" />
                      <span className="text-zinc-300">
                        {behavior.audioConversationsCount} audio
                      </span>
                    </div>
                  </div>
                </div>

                {/* Response Times */}
                {(behavior.avgResponseMinutes || behavior.theirAvgResponseMinutes) && (
                  <div>
                    <h3 className="text-sm font-medium text-zinc-400 mb-2">Response Times</h3>
                    <div className="text-sm text-zinc-300 space-y-1">
                      {behavior.avgResponseMinutes && (
                        <div>Your avg: {Math.round(behavior.avgResponseMinutes)} min</div>
                      )}
                      {behavior.theirAvgResponseMinutes && (
                        <div>Their avg: {Math.round(behavior.theirAvgResponseMinutes)} min</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Preferences */}
                <div>
                  <h3 className="text-sm font-medium text-zinc-400 mb-2">Preferences</h3>
                  <div className="text-sm text-zinc-300 space-y-1">
                    {behavior.prefersChannel && (
                      <div>
                        Preferred: <span className="text-white capitalize">{behavior.prefersChannel}</span>
                      </div>
                    )}
                    {behavior.escalationChannel && (
                      <div>
                        Escalation: <span className="text-white capitalize">{behavior.escalationChannel}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Scores */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-zinc-400">Reliability</span>
                      <span className="text-xs text-zinc-400">
                        {Math.round((behavior.reliabilityScore || 0.5) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${(behavior.reliabilityScore || 0.5) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-zinc-400">Risk</span>
                      <span className="text-xs text-zinc-400">
                        {Math.round((behavior.riskScore || 0.5) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500"
                        style={{ width: `${(behavior.riskScore || 0.5) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-zinc-400">Not enough interaction data yet.</div>
            )}
          </div>

          {/* Interaction Playbook */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              Interaction Playbook
            </h2>

            {playbook ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-zinc-300">{playbook.summary}</p>
                </div>

                <div className="grid gap-3">
                  <div>
                    <h3 className="text-xs font-semibold text-green-400 mb-2">DO</h3>
                    <ul className="space-y-1">
                      {playbook.doList.map((item: string, idx: number) => (
                        <li key={idx} className="text-xs text-zinc-300 flex items-start gap-2">
                          <span className="text-green-400 mt-0.5">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-red-400 mb-2">DON'T</h3>
                    <ul className="space-y-1">
                      {playbook.dontList.map((item: string, idx: number) => (
                        <li key={idx} className="text-xs text-zinc-300 flex items-start gap-2">
                          <span className="text-red-400 mt-0.5">✗</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-zinc-400 font-medium">Channel:</span>{" "}
                    <span className="text-zinc-300">{playbook.channelGuidelines}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 font-medium">Tone:</span>{" "}
                    <span className="text-zinc-300">{playbook.toneGuidelines}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 font-medium">Conflict:</span>{" "}
                    <span className="text-zinc-300">{playbook.conflictStrategy}</span>
                  </div>
                  <div>
                    <span className="text-zinc-400 font-medium">Motivators:</span>{" "}
                    <span className="text-zinc-300">{playbook.persuasionLevers}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-zinc-400">Generating playbook...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

