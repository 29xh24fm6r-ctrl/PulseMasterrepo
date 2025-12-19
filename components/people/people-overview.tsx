"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText, Calendar, ExternalLink, RefreshCw, DollarSign } from "lucide-react";
import { routes } from "@/lib/routes";
import AddTaskModal from "./add-task-modal";
import LogNoteModal from "./log-note-modal";
import FollowupModal from "./followup-modal";
import CreatePersonModal from "./create-person-modal";
import AddDealModal from "./add-deal-modal";

interface Card {
  title: string;
  value?: string | number;
  subtitle?: string;
  cta?: { label: string; href: string; action?: string };
  state?: "good" | "warn" | "bad" | "empty";
}

interface Person {
  id: string;
  full_name?: string;
  name?: string;
  primary_email?: string;
  tags?: string[];
  type?: string;
  openDealsCount?: number;
  openTasksCount?: number;
  lastInteraction?: any;
}

interface PeopleOverviewData {
  ok: boolean;
  module: string;
  summary: string;
  cards: Card[];
  items?: Person[];
  meta?: Record<string, any>;
}

export default function PeopleOverview({ data }: { data: PeopleOverviewData }) {
  const router = useRouter();
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [activeModal, setActiveModal] = useState<"task" | "note" | "followup" | "add-person" | "add-deal" | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleCardAction = (action?: string) => {
    if (action === "add-person") {
      setActiveModal("add-person");
    } else if (action === "add-deal") {
      // If there's at least one contact, use the first one for deal creation
      if (data.items && data.items.length > 0) {
        setSelectedPerson(data.items[0]);
        setActiveModal("add-deal");
      }
    } else if (action === "add-task") {
      if (data.items && data.items.length > 0) {
        setSelectedPerson(data.items[0]);
        setActiveModal("task");
      }
    }
  };

  if (!data.ok) {
    return (
      <div className="p-8">
        <div className="text-red-400">Failed to load people overview</div>
      </div>
    );
  }

  const getStateColor = (state?: string) => {
    switch (state) {
      case "good":
        return "border-green-500/30 bg-green-500/10";
      case "warn":
        return "border-yellow-500/30 bg-yellow-500/10";
      case "bad":
        return "border-red-500/30 bg-red-500/10";
      default:
        return "border-gray-500/30 bg-gray-500/10";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">People - Human Graph</h1>
            <p className="text-gray-400">{data.summary}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveModal("add-person")}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Person
            </button>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg border border-zinc-700 flex items-center gap-2 transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Debug Meta (opt-in via NEXT_PUBLIC_DEBUG_PULSE=1) */}
        {process.env.NEXT_PUBLIC_DEBUG_PULSE === "1" && data.meta && (
          <div className="mb-4 p-3 bg-zinc-900/50 rounded border border-yellow-500/30 text-xs text-gray-400">
            <div className="font-mono space-y-1">
              <div className="text-yellow-400/70 font-semibold mb-2">Debug Info (NEXT_PUBLIC_DEBUG_PULSE=1)</div>
              <div>userId: {data.meta.userIdUsed || "N/A"}</div>
              <div>clerkUserId: {data.meta.clerkUserId || "N/A"}</div>
              <div>Counts: contacts={data.meta.counts?.contacts || 0}, interactions={data.meta.counts?.interactions || 0}</div>
              {data.meta.queryInfo && (
                <div className="mt-2 pt-2 border-t border-zinc-700">
                  <div>Query: {data.meta.queryInfo.queriedBy}</div>
                  <div>Total in DB: {data.meta.queryInfo.totalContactsInDb || 0}</div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mb-8"></div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {data.cards && Array.isArray(data.cards) ? (
            data.cards.map((card, idx) => (
              <div
                key={idx}
                className={`p-6 rounded-lg border ${getStateColor(card?.state)}`}
              >
                <h3 className="text-lg font-semibold mb-2">{card?.title || "Untitled"}</h3>
                {card?.value !== undefined && (
                  <div className="text-2xl font-bold mb-1">{card.value}</div>
                )}
                {card?.subtitle && (
                  <p className="text-sm text-gray-400 mb-4">{card.subtitle}</p>
                )}
                {card?.cta && (
                  card.cta.href === "#" ? (
                    <button
                      onClick={() => handleCardAction((card.cta as any)?.action)}
                      className="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors"
                    >
                      {card.cta.label}
                    </button>
                  ) : (
                    <Link
                      href={card.cta.href}
                      className="inline-block px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors"
                    >
                      {card.cta.label}
                    </Link>
                  )
                )}
              </div>
            ))
          ) : (
            <div className="col-span-4 p-4 text-yellow-400 border border-yellow-500/30 rounded">
              Cards data is missing or invalid. Check server logs for details.
            </div>
          )}
        </div>

        {data.items && data.items.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Recent Contacts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.items.slice(0, 12).map((person: Person) => (
                <div key={person.id} className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700 hover:border-purple-500/50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <Link href={routes.crm.people.detail(person.id)} className="font-medium text-white hover:text-purple-400 transition-colors">
                        {person.full_name || person.name || person.primary_email || "Unknown"}
                      </Link>
                      {person.type && (
                        <div className="text-xs text-gray-400 mt-1">{person.type}</div>
                      )}
                    </div>
                    <Link
                      href={routes.crm.people.detail(person.id)}
                      className="p-1 hover:bg-zinc-700 rounded"
                      title="Open CRM"
                    >
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </Link>
                  </div>

                  <div className="flex gap-2 mb-3 text-xs">
                    {person.openDealsCount !== undefined && person.openDealsCount > 0 && (
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                        {person.openDealsCount} deal{person.openDealsCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    {person.openTasksCount !== undefined && person.openTasksCount > 0 && (
                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">
                        {person.openTasksCount} task{person.openTasksCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {person.tags && person.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {person.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="px-2 py-0.5 bg-zinc-700/50 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-zinc-700">
                    <button
                      onClick={() => {
                        setSelectedPerson(person);
                        setActiveModal("task");
                      }}
                      className="flex-1 px-2 py-1.5 text-xs bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded transition-colors flex items-center justify-center gap-1"
                      title="Add Task"
                    >
                      <Plus className="w-3 h-3" />
                      Task
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPerson(person);
                        setActiveModal("note");
                      }}
                      className="flex-1 px-2 py-1.5 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded transition-colors flex items-center justify-center gap-1"
                      title="Log Note"
                    >
                      <FileText className="w-3 h-3" />
                      Note
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPerson(person);
                        setActiveModal("followup");
                      }}
                      className="flex-1 px-2 py-1.5 text-xs bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded transition-colors flex items-center justify-center gap-1"
                      title="Follow-up"
                    >
                      <Calendar className="w-3 h-3" />
                      Follow-up
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modals */}
        {activeModal === "add-person" && (
          <CreatePersonModal
            onClose={() => setActiveModal(null)}
            onSuccess={async () => {
              console.log("[PeopleOverview] Contact created, refreshing...");
              setActiveModal(null);
              // Force a hard refresh to ensure data is reloaded
              router.refresh();
              // Also wait a moment and refresh again to catch any race conditions
              setTimeout(() => {
                console.log("[PeopleOverview] Second refresh after contact creation");
                router.refresh();
              }, 1000);
            }}
          />
        )}

        {selectedPerson && activeModal === "add-deal" && (
          <AddDealModal
            personId={selectedPerson.id}
            personName={selectedPerson.full_name || selectedPerson.name || "Contact"}
            onClose={() => {
              setActiveModal(null);
              setSelectedPerson(null);
            }}
            onSuccess={() => {
              setActiveModal(null);
              setSelectedPerson(null);
              router.refresh();
            }}
          />
        )}

        {selectedPerson && activeModal === "task" && (
          <AddTaskModal
            personId={selectedPerson.id}
            personName={selectedPerson.full_name || selectedPerson.name || "Contact"}
            onClose={() => {
              setActiveModal(null);
              setSelectedPerson(null);
            }}
            onSuccess={() => {
              setActiveModal(null);
              setSelectedPerson(null);
              router.refresh();
            }}
          />
        )}

        {selectedPerson && activeModal === "note" && (
          <LogNoteModal
            personId={selectedPerson.id}
            personName={selectedPerson.full_name || selectedPerson.name || "Contact"}
            onClose={() => {
              setActiveModal(null);
              setSelectedPerson(null);
            }}
            onSuccess={() => {
              setActiveModal(null);
              setSelectedPerson(null);
            }}
          />
        )}

        {selectedPerson && activeModal === "followup" && (
          <FollowupModal
            personId={selectedPerson.id}
            personName={selectedPerson.full_name || selectedPerson.name || "Contact"}
            onClose={() => {
              setActiveModal(null);
              setSelectedPerson(null);
            }}
            onSuccess={() => {
              setActiveModal(null);
              setSelectedPerson(null);
              window.location.reload(); // Refresh to show updated counts
            }}
          />
        )}
      </div>
    </div>
  );
}

