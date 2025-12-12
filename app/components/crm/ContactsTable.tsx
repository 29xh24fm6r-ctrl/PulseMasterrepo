// Contacts Table Component
// app/components/crm/ContactsTable.tsx

"use client";

import { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MessageSquare } from "lucide-react";
import { CoachLauncher } from "@/app/components/coaching/CoachLauncher";

interface CrmContact {
  id: string;
  fullName: string;
  type?: string;
  tags?: string[];
  lastInteractionAt?: string;
  health?: {
    score: number;
    momentum: string;
  };
}

export function ContactsTable() {
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    loadContacts();
  }, [search, typeFilter]);

  async function loadContacts() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter !== "all") params.set("type", typeFilter);

      const res = await fetch(`/api/crm/contacts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch (err) {
      console.error("Failed to load contacts:", err);
    } finally {
      setLoading(false);
    }
  }

  function getHealthColor(score?: number): string {
    if (!score) return "bg-zinc-800";
    if (score >= 70) return "bg-green-600/20 text-green-400 border-green-600/30";
    if (score >= 40) return "bg-yellow-600/20 text-yellow-400 border-yellow-600/30";
    return "bg-red-600/20 text-red-400 border-red-600/30";
  }

  function formatTimeAgo(dateStr?: string): string {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  }

  return (
    <AppCard
      title="Contacts"
      description="All your contacts and relationships"
      actions={
        <Button size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          New Contact
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm"
          >
            <option value="all">All Types</option>
            <option value="personal">Personal</option>
            <option value="business">Business</option>
            <option value="prospect">Prospect</option>
            <option value="client">Client</option>
          </select>
        </div>

        {loading ? (
          <LoadingState message="Loading contacts…" />
        ) : contacts.length === 0 ? (
          <EmptyState
            title="No contacts yet"
            description="Add your first contact to start building your relationship graph."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Type</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Tags</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Last Interaction</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Health</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr
                    key={contact.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-medium text-white">{contact.fullName}</div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="bg-zinc-800 text-zinc-300">
                        {contact.type || "Unknown"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(contact.tags || []).slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="outline" className="bg-zinc-800 text-zinc-400 text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-zinc-400">
                      {formatTimeAgo(contact.lastInteractionAt)}
                    </td>
                    <td className="py-3 px-4">
                      {contact.health && (
                        <Badge variant="outline" className={getHealthColor(contact.health.score)}>
                          {contact.health.score}/100
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <CoachLauncher
                        coachKey="sales"
                        origin="crm.contact_detail"
                        variant="icon"
                        initialUserMessage={`Help me with my relationship with ${contact.fullName}.`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppCard>
  );
}




