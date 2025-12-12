// Squads Hub - Experience v5
// app/(authenticated)/squads/page.tsx

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/button";
import { Plus, Users, Target, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Squad {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  activeMissionsCount: number;
  createdAt: string;
}

export default function SquadsPage() {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSquadName, setNewSquadName] = useState("");
  const [newSquadDescription, setNewSquadDescription] = useState("");

  useEffect(() => {
    loadSquads();
  }, []);

  async function loadSquads() {
    setLoading(true);
    try {
      const res = await fetch("/api/squads");
      if (res.ok) {
        const data = await res.json();
        setSquads(data.squads || []);
      }
    } catch (err) {
      console.error("Failed to load squads:", err);
    } finally {
      setLoading(false);
    }
  }

  async function createSquad() {
    if (!newSquadName.trim()) return;

    try {
      const res = await fetch("/api/squads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSquadName,
          description: newSquadDescription,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewSquadName("");
        setNewSquadDescription("");
        await loadSquads();
      }
    } catch (err) {
      console.error("Failed to create squad:", err);
    }
  }

  if (loading) {
    return <LoadingState message="Loading your squads..." />;
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Squads</h1>
          <p className="text-sm text-text-secondary">
            Small groups working together in shared Pulse worlds
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Squad
        </Button>
      </div>

      {squads.length === 0 ? (
        <AppCard title="No Squads Yet" description="Create your first squad to get started">
          <Button onClick={() => setShowCreateModal(true)} className="mt-4">
            Create Your First Squad
          </Button>
        </AppCard>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {squads.map((squad) => (
            <motion.div
              key={squad.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AppCard title={squad.name} description={squad.description}>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-text-secondary" />
                      <span className="text-text-secondary">{squad.memberCount} members</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4 text-text-secondary" />
                      <span className="text-text-secondary">
                        {squad.activeMissionsCount} active missions
                      </span>
                    </div>
                  </div>
                  <Link href={`/squads/${squad.id}`}>
                    <Button className="w-full" variant="outline">
                      Enter World <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </AppCard>
            </motion.div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface2 p-6 rounded-lg border border-border-default max-w-md w-full">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Create Squad</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-text-secondary mb-1 block">Name</label>
                <input
                  type="text"
                  value={newSquadName}
                  onChange={(e) => setNewSquadName(e.target.value)}
                  className="w-full p-2 bg-surface3 rounded border border-border-default text-text-primary"
                  placeholder="My Squad"
                />
              </div>
              <div>
                <label className="text-sm text-text-secondary mb-1 block">Description</label>
                <textarea
                  value={newSquadDescription}
                  onChange={(e) => setNewSquadDescription(e.target.value)}
                  className="w-full p-2 bg-surface3 rounded border border-border-default text-text-primary"
                  placeholder="What's this squad about?"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={createSquad} className="flex-1">
                  Create
                </Button>
                <Button
                  onClick={() => setShowCreateModal(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



