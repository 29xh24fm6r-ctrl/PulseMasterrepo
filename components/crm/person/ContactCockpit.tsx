"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { routes } from "@/lib/routes";
import { PersonHero } from "./PersonHero";
import { RelationshipHealthCard } from "./RelationshipHealthCard";
import { OpenLoopsCard } from "./OpenLoopsCard";
import { MomentsCard } from "./MomentsCard";
import { UnifiedTimeline } from "./UnifiedTimeline";
import { ContactIntelPanel } from "./ContactIntelPanel";
import { ContactIntelTab } from "./ContactIntelTab";
import { IntelTabContent } from "./IntelTabContent";
import AddTaskModal from "@/components/people/add-task-modal";
import LogNoteModal from "@/components/people/log-note-modal";
import FollowupModal from "@/components/people/followup-modal";
import { RunIntelButton } from "@/components/crm/RunIntelButton";
import { Loader2, ArrowLeft, Mail, FileText, CheckSquare, Brain } from "lucide-react";
import Link from "next/link";

interface CockpitData {
  profile: any;
  stats: any;
  relationship: any;
  next: any;
  highlights: any;
  timeline: any[];
  comms: any;
  tasks: any[];
  notes: any[];
  deals: any[];
  ai: any;
}

export default function ContactCockpit({ personId }: { personId: string }) {
  const router = useRouter();
  const [data, setData] = useState<CockpitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<"task" | "note" | "followup" | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "comms" | "notes" | "tasks" | "intel">("overview");

  const refreshData = async () => {
    try {
      const res = await fetch(`/api/crm/people/${personId}/cockpit`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to refresh cockpit data:", err);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/crm/people/${personId}/cockpit`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load");

        const json = await res.json();
        if (!cancelled) {
          setData(json);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load cockpit:", err);
          // Set minimal default data to prevent crash
          setData({
            profile: { id: personId, full_name: "Unknown Contact", type: "business" },
            stats: { emails: 0, notes: 0, tasks: 0, meetings: 0, lastTouchAt: null },
            relationship: { score: 50, trend30d: 0, drivers: [], flags: [] },
            next: {
              lastTouchAt: null,
              lastTouchType: null,
              nextTouchDueAt: null,
              recommendedNextAction: null,
              openLoops: { overdueTasks: 0, unansweredInbound: 0, staleNoTouchDays: null },
            },
            highlights: { keyFacts: [], moments: [], topics: [] },
            timeline: [],
            comms: { threads: [], lastInbound: null, lastOutbound: null, responseLatencyHours: null },
            tasks: [],
            notes: [],
            deals: [],
            ai: { summary: "Data unavailable. Please try again later.", suggestedActions: [], messageDrafts: [] },
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [personId]);

  const handleModalClose = () => {
    setActiveModal(null);
    refreshData();
  };

  // Optimistic update handlers - refresh data after modal success
  const handleNoteCreated = async () => {
    // Refresh to get updated data including the new note
    await refreshData();
  };

  const handleTaskCreated = async () => {
    // Refresh to get updated data including the new task
    await refreshData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-zinc-900 to-slate-950 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!data || !data.profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-zinc-900 to-slate-950 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-red-400">Contact not found</div>
          <Link href={routes.crm.people.list()} className="text-purple-400 hover:text-purple-300 mt-4 inline-block">
            ← Back to People
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-zinc-900 to-slate-950 text-white">
      {/* Hero Header */}
      <PersonHero
        contact={data.profile}
        stats={data.stats}
        relationship={data.relationship}
        next={data.next}
        intel={data.intel}
        onFollowUp={() => setActiveModal("followup")}
        onLogNote={() => setActiveModal("note")}
        onCreateTask={() => setActiveModal("task")}
        onCallPrep={() => {
          // TODO: Implement call prep
          alert("Call prep coming soon!");
        }}
        onAskPulse={() => {
          // TODO: Implement Ask Pulse panel
          alert("Ask Pulse coming soon!");
        }}
        onSwitchToIntel={() => {
          setActiveTab("intel");
          refreshData();
        }}
      />

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Intelligence Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <RelationshipHealthCard
            score={data.relationship.score}
            trend={data.relationship.trend30d}
            drivers={data.relationship.drivers}
            flags={data.relationship.flags}
          />
          <OpenLoopsCard openLoops={data.next.openLoops} />
          <MomentsCard moments={data.highlights.moments} />
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-zinc-700">
          <div className="flex gap-1 -mb-px">
            {[
              { id: "overview", label: "Overview", icon: Brain },
              { id: "timeline", label: "Timeline", icon: FileText },
              { id: "comms", label: "Comms", icon: Mail },
              { id: "notes", label: "Notes", icon: FileText },
              { id: "tasks", label: "Tasks", icon: CheckSquare },
              { id: "intel", label: "Intel", icon: Brain },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
                    activeTab === tab.id
                      ? "border-purple-500 text-purple-400"
                      : "border-transparent text-gray-400 hover:text-white hover:border-gray-600"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Quick Stats</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Emails</span>
                      <span className="text-white">{data.stats.emails}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Notes</span>
                      <span className="text-white">{data.stats.notes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tasks</span>
                      <span className="text-white">{data.stats.tasks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Meetings</span>
                      <span className="text-white">{data.stats.meetings}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Key Topics</h3>
                  {data.highlights.topics.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {data.highlights.topics.map((topic: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                          {topic}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">No topics yet</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "timeline" && (
            <UnifiedTimeline events={data.timeline} />
          )}

          {activeTab === "comms" && (
            <div className="space-y-4">
              {data.comms.threads.length > 0 ? (
                data.comms.threads.map((thread: any, i: number) => (
                  <div key={i} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <div className="text-sm font-medium text-white">{thread.subject || "No subject"}</div>
                    <div className="text-xs text-gray-400 mt-1">{thread.snippet || ""}</div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Mail className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No communications yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "notes" && (
            <div className="space-y-4">
              {data.notes.length > 0 ? (
                data.notes.map((note: any) => (
                  <div key={note.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <div className="text-sm font-medium text-white">{note.subject}</div>
                    <div className="text-sm text-gray-400 mt-2">{note.summary}</div>
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(note.occurredAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No notes yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "tasks" && (
            <div className="space-y-4">
              {data.tasks.length > 0 ? (
                data.tasks.map((task: any) => (
                  <div key={task.id} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                    <div className="text-sm font-medium text-white">{task.title}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {task.status} • {task.priority}
                      {task.dueAt && ` • Due: ${new Date(task.dueAt).toLocaleDateString()}`}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No tasks yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "intel" && (
            <IntelTabContent
              personId={personId}
              onRunComplete={() => {
                // Trigger refresh via key change
                setData((prev) => prev ? { ...prev } : prev);
              }}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {activeModal === "task" && (
        <AddTaskModal
          personId={personId}
          onClose={handleModalClose}
          onSuccess={handleTaskCreated}
        />
      )}
      {activeModal === "note" && (
        <LogNoteModal
          personId={personId}
          onClose={handleModalClose}
          onSuccess={handleNoteCreated}
        />
      )}
      {activeModal === "followup" && (
        <FollowupModal
          personId={personId}
          onClose={handleModalClose}
          onSuccess={() => refreshData()}
        />
      )}
    </div>
  );
}

