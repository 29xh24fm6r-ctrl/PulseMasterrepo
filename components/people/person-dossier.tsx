"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  FileText,
  CheckSquare,
  DollarSign,
  Calendar,
  Heart,
  TrendingUp,
  AlertCircle,
  Mail,
  Phone,
  Building,
} from "lucide-react";
import type { PersonDossier } from "@/lib/people/dossier-types";
import AddNoteModal from "./modals/add-note-modal";
import AddTaskModal from "./modals/add-task-modal";
import AddDealModal from "./modals/add-deal-modal";
import FollowupModal from "./modals/followup-modal";

export default function PersonDossier({ data }: { data: PersonDossier }) {
  const router = useRouter();
  const [activeModal, setActiveModal] = useState<"note" | "task" | "deal" | "followup" | null>(null);
  const [timelineFilter, setTimelineFilter] = useState<"all" | "note" | "email" | "meeting" | "task" | "deal">("all");

  if (!data.ok) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-red-400">Failed to load person dossier</div>
          <Link href="/people" className="text-purple-400 hover:text-purple-300 mt-4 inline-block">
            ← Back to People
          </Link>
        </div>
      </div>
    );
  }

  const { person, intelligence, timeline, crm } = data;

  const getHealthColor = () => {
    switch (intelligence.healthLabel) {
      case "healthy":
        return "text-green-400 border-green-500/30 bg-green-500/10";
      case "cooling":
        return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
      case "at_risk":
        return "text-red-400 border-red-500/30 bg-red-500/10";
      default:
        return "text-gray-400 border-gray-500/30 bg-gray-500/10";
    }
  };

  const filteredTimeline = timelineFilter === "all" 
    ? timeline 
    : timeline.filter((t) => t.type === timelineFilter);

  const handleAction = (action: string) => {
    if (action === "note") setActiveModal("note");
    else if (action === "task") setActiveModal("task");
    else if (action === "deal") setActiveModal("deal");
    else if (action === "followup") setActiveModal("followup");
    else if (action === "email") {
      // TODO: Open email composer
      window.location.href = `mailto:${person.email}`;
    }
  };

  const handleSuccess = () => {
    setActiveModal(null);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      {/* Top Bar */}
      <div className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/people"
                className="p-2 hover:bg-zinc-800 rounded transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold">{person.name}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                  {person.email && (
                    <a href={`mailto:${person.email}`} className="flex items-center gap-1 hover:text-white">
                      <Mail className="w-4 h-4" />
                      {person.email}
                    </a>
                  )}
                  {person.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {person.phone}
                    </span>
                  )}
                  {person.company && (
                    <span className="flex items-center gap-1">
                      <Building className="w-4 h-4" />
                      {person.company}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {intelligence.nextBestActions.map((action) => (
                <button
                  key={action.action}
                  onClick={() => handleAction(action.action)}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors"
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1920px] mx-auto px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr_350px] gap-6">
          {/* Left: Intelligence */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Relationship Intelligence
            </h2>

            {/* Health Score */}
            <div className={`p-4 rounded-lg border ${getHealthColor()}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Health Score</span>
                <span className="text-2xl font-bold">{intelligence.healthScore}</span>
              </div>
              <div className="text-xs text-gray-400 capitalize">{intelligence.healthLabel}</div>
              {intelligence.cadenceLabel && (
                <div className="text-xs text-gray-400 mt-1">Cadence: {intelligence.cadenceLabel}</div>
              )}
            </div>

            {/* Pulse Summary */}
            <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Pulse Summary
              </h3>
              <p className="text-sm text-gray-300">{intelligence.pulseSummary}</p>
              {intelligence.needsTouchReason && (
                <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-400 flex items-center gap-2">
                  <AlertCircle className="w-3 h-3" />
                  {intelligence.needsTouchReason}
                </div>
              )}
            </div>

            {/* Stats */}
            {intelligence.lastInteractionAt && (
              <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <div className="text-sm text-gray-400 mb-1">Last Interaction</div>
                <div className="text-sm font-medium">
                  {new Date(intelligence.lastInteractionAt).toLocaleDateString()}
                  {intelligence.daysSinceLastTouch !== null && (
                    <span className="text-gray-400 ml-2">
                      ({intelligence.daysSinceLastTouch} days ago)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Center: Timeline */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Timeline</h2>
              <div className="flex gap-2">
                {(["all", "note", "task", "deal"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTimelineFilter(filter)}
                    className={`px-3 py-1 rounded text-xs transition-colors ${
                      timelineFilter === filter
                        ? "bg-purple-600 text-white"
                        : "bg-zinc-800 text-gray-400 hover:bg-zinc-700"
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredTimeline.length > 0 ? (
                filteredTimeline.map((item) => (
                  <TimelineItem key={item.id} item={item} />
                ))
              ) : (
                <div className="p-8 text-center text-gray-400">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No timeline items yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: CRM Panels */}
          <div className="space-y-4">
            {/* Deals */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Deals ({crm.deals.length})
                </h3>
                <button
                  onClick={() => setActiveModal("deal")}
                  className="p-1 hover:bg-zinc-800 rounded"
                  title="Create Deal"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {crm.deals.length > 0 ? (
                  crm.deals.map((deal) => (
                    <Link
                      key={deal.id}
                      href={`/crm/deals/${deal.id}`}
                      className="block p-3 bg-zinc-800/50 rounded border border-zinc-700 hover:border-purple-500/50 transition-colors"
                    >
                      <div className="font-medium text-sm">{deal.title}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        {deal.stage} {deal.amount && `• $${deal.amount.toLocaleString()}`}
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-400 text-xs border border-zinc-700 rounded">
                    No deals yet
                  </div>
                )}
              </div>
            </div>

            {/* Tasks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" />
                  Tasks ({crm.tasks.length})
                </h3>
                <button
                  onClick={() => setActiveModal("task")}
                  className="p-1 hover:bg-zinc-800 rounded"
                  title="Add Task"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {crm.tasks.length > 0 ? (
                  crm.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 bg-zinc-800/50 rounded border border-zinc-700"
                    >
                      <div className="font-medium text-sm">{task.title}</div>
                      {task.dueAt && (
                        <div className="text-xs text-gray-400 mt-1">
                          Due: {new Date(task.dueAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-400 text-xs border border-zinc-700 rounded">
                    No tasks yet
                  </div>
                )}
              </div>
            </div>

            {/* Followups */}
            {crm.followups.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4" />
                  Follow-ups ({crm.followups.length})
                </h3>
                <div className="space-y-2">
                  {crm.followups.map((followup) => (
                    <div
                      key={followup.id}
                      className="p-3 bg-zinc-800/50 rounded border border-zinc-700"
                    >
                      <div className="font-medium text-sm">{followup.title}</div>
                      {followup.dueAt && (
                        <div className="text-xs text-gray-400 mt-1">
                          Due: {new Date(followup.dueAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {activeModal === "note" && (
        <AddNoteModal
          personId={person.id}
          personName={person.name}
          onClose={() => setActiveModal(null)}
          onSuccess={handleSuccess}
        />
      )}
      {activeModal === "task" && (
        <AddTaskModal
          personId={person.id}
          personName={person.name}
          onClose={() => setActiveModal(null)}
          onSuccess={handleSuccess}
        />
      )}
      {activeModal === "deal" && (
        <AddDealModal
          personId={person.id}
          personName={person.name}
          onClose={() => setActiveModal(null)}
          onSuccess={handleSuccess}
        />
      )}
      {activeModal === "followup" && (
        <FollowupModal
          personId={person.id}
          personName={person.name}
          onClose={() => setActiveModal(null)}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}

function TimelineItem({ item }: { item: PersonDossier["timeline"][0] }) {
  const getIcon = () => {
    switch (item.type) {
      case "note":
        return <FileText className="w-4 h-4 text-blue-400" />;
      case "email":
        return <Mail className="w-4 h-4 text-purple-400" />;
      case "meeting":
        return <Calendar className="w-4 h-4 text-orange-400" />;
      case "task":
        return <CheckSquare className="w-4 h-4 text-green-400" />;
      case "deal":
        return <DollarSign className="w-4 h-4 text-yellow-400" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const content = item.href ? (
    <Link
      href={item.href}
      className="block p-3 bg-zinc-800/50 rounded border border-zinc-700 hover:border-purple-500/50 transition-colors"
    >
      <div className="flex gap-3">
        <div className="mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{item.title}</div>
          {item.body && <div className="text-xs text-gray-400 mt-1">{item.body}</div>}
          <div className="text-xs text-gray-500 mt-1">{new Date(item.at).toLocaleDateString()}</div>
        </div>
      </div>
    </Link>
  ) : (
    <div className="p-3 bg-zinc-800/50 rounded border border-zinc-700">
      <div className="flex gap-3">
        <div className="mt-0.5">{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm">{item.title}</div>
          {item.body && <div className="text-xs text-gray-400 mt-1">{item.body}</div>}
          <div className="text-xs text-gray-500 mt-1">{new Date(item.at).toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  );

  return content;
}

