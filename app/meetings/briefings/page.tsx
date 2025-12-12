// Meeting Briefings Page
// app/meetings/briefings/page.tsx

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Users,
  Briefcase,
  Target,
  AlertTriangle,
  MessageSquare,
  Copy,
  Sparkles,
  ArrowRight,
  Clock,
} from "lucide-react";
import { MeetingBriefing } from "@/lib/meetings/briefing";

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time?: string | null;
  description?: string | null;
  attendees?: string[];
}

export default function MeetingBriefingsPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [briefings, setBriefings] = useState<Record<string, MeetingBriefing>>({});
  const [loadingBriefing, setLoadingBriefing] = useState<string | null>(null);

  useEffect(() => {
    loadUpcomingEvents();
  }, []);

  async function loadUpcomingEvents() {
    try {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 2); // Next 48 hours

      const res = await fetch(
        `/api/calendar/today?start=${now.toISOString()}&end=${tomorrow.toISOString()}`
      );
      const json = await res.json();
      if (res.ok) {
        setEvents(json.events || []);
      }
    } catch (err) {
      console.error("Failed to load events:", err);
    } finally {
      setLoading(false);
    }
  }

  async function generateBriefing(eventId: string) {
    setLoadingBriefing(eventId);
    try {
      const res = await fetch(`/api/meetings/${eventId}/briefing`);
      const json = await res.json();
      if (res.ok) {
        setBriefings((prev) => ({ ...prev, [eventId]: json }));
      }
    } catch (err) {
      console.error("Failed to generate briefing:", err);
    } finally {
      setLoadingBriefing(null);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading upcoming meetings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold text-white">Meeting Intelligence</h1>
              <p className="text-sm text-zinc-400">
                Pre-meeting briefings for the next 48 hours
              </p>
            </div>
          </div>
        </div>

        {/* Events List */}
        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 text-center text-zinc-400">
              No upcoming meetings in the next 48 hours.
            </div>
          ) : (
            events.map((event) => {
              const briefing = briefings[event.id];
              const isGenerating = loadingBriefing === event.id;

              return (
                <div
                  key={event.id}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4"
                >
                  {/* Event Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h2 className="text-xl font-semibold text-white">{event.title}</h2>
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                          <Clock className="w-4 h-4" />
                          <span>
                            {new Date(event.start_time).toLocaleString()}
                            {event.end_time &&
                              ` - ${new Date(event.end_time).toLocaleTimeString()}`}
                          </span>
                        </div>
                      </div>
                      {event.description && (
                        <p className="text-sm text-zinc-400 mb-3">{event.description}</p>
                      )}
                    </div>
                    {!briefing && (
                      <button
                        onClick={() => generateBriefing(event.id)}
                        disabled={isGenerating}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 text-white rounded text-sm transition-colors flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        {isGenerating ? "Generating..." : "Generate Briefing"}
                      </button>
                    )}
                  </div>

                  {/* Briefing Content */}
                  {briefing && (
                    <div className="space-y-4 pt-4 border-t border-zinc-800">
                      {/* One-liner */}
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                        <div className="text-xs text-blue-400 mb-1">One-Liner</div>
                        <p className="text-sm text-white">{briefing.oneLiner}</p>
                      </div>

                      {/* Participants */}
                      {briefing.contacts.length > 0 && (
                        <div>
                          <div className="text-xs text-zinc-400 mb-2 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Participants
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {briefing.contacts.map((contact) => (
                              <div
                                key={contact.contactId}
                                className="flex items-center gap-2 px-3 py-1 bg-zinc-800 rounded-lg"
                              >
                                <span className="text-sm text-white">{contact.name}</span>
                                <Link
                                  href={`/contacts/${contact.contactId}/cockpit`}
                                  className="text-xs text-violet-400 hover:text-violet-300"
                                >
                                  View
                                </Link>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Deals */}
                      {briefing.deals.length > 0 && (
                        <div>
                          <div className="text-xs text-zinc-400 mb-2 flex items-center gap-2">
                            <Briefcase className="w-4 h-4" />
                            Related Deals
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {briefing.deals.map((deal) => (
                              <Link
                                key={deal.dealId}
                                href={`/deals/${deal.dealId}/cockpit`}
                                className="px-3 py-1 bg-violet-500/20 border border-violet-500/30 rounded-lg text-sm text-violet-400 hover:bg-violet-500/30 transition-colors flex items-center gap-2"
                              >
                                {deal.name}
                                {deal.value && (
                                  <span className="text-xs">${deal.value.toLocaleString()}</span>
                                )}
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Key Objectives */}
                      {briefing.keyObjectives.length > 0 && (
                        <div>
                          <div className="text-xs text-zinc-400 mb-2 flex items-center gap-2">
                            <Target className="w-4 h-4" />
                            Key Objectives
                          </div>
                          <ul className="space-y-1">
                            {briefing.keyObjectives.map((obj, idx) => (
                              <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2">
                                <span className="text-violet-400 mt-0.5">•</span>
                                <span>{obj}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Relationship Notes */}
                      {briefing.relationshipNotes.length > 0 && (
                        <div>
                          <div className="text-xs text-zinc-400 mb-2 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Relationship Notes
                          </div>
                          <ul className="space-y-1">
                            {briefing.relationshipNotes.map((note, idx) => (
                              <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2">
                                <span className="text-blue-400 mt-0.5">•</span>
                                <span>{note}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Landmines */}
                      {briefing.landmines.length > 0 && (
                        <div>
                          <div className="text-xs text-amber-400 mb-2 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Landmines (Things to Avoid)
                          </div>
                          <ul className="space-y-1">
                            {briefing.landmines.map((landmine, idx) => (
                              <li key={idx} className="text-sm text-amber-300 flex items-start gap-2">
                                <span className="text-amber-400 mt-0.5">⚠</span>
                                <span>{landmine}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recommended Tone */}
                      <div>
                        <div className="text-xs text-zinc-400 mb-1">Recommended Tone</div>
                        <div className="text-sm text-white px-3 py-1 bg-zinc-800 rounded-lg inline-block">
                          {briefing.recommendedTone}
                        </div>
                      </div>

                      {/* Suggested Opening Line */}
                      <div>
                        <div className="text-xs text-zinc-400 mb-2 flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Suggested Opening Line
                          </span>
                          <button
                            onClick={() => copyToClipboard(briefing.suggestedOpeningLine)}
                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            Copy
                          </button>
                        </div>
                        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-300">
                          {briefing.suggestedOpeningLine}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}




