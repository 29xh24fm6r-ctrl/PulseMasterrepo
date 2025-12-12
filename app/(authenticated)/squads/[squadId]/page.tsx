// Squad World - Experience v5
// app/(authenticated)/squads/[squadId]/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { Button } from "@/components/ui/button";
import { SquadWorldState } from "@/lib/experience/squad-world";
import { Users, Target, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SquadWorldPage() {
  const params = useParams();
  const squadId = params.squadId as string;

  const [state, setState] = useState<SquadWorldState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (squadId) {
      loadSquadWorld();
    }
  }, [squadId]);

  async function loadSquadWorld() {
    setLoading(true);
    try {
      const res = await fetch(`/api/squads/${squadId}`);
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
      }
    } catch (err) {
      console.error("Failed to load squad world:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingState message="Loading squad world..." />;
  }

  if (!state) {
    return (
      <div className="text-center py-8 text-sm text-zinc-400">
        Failed to load squad world
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary mb-2">{state.name}</h1>
        <p className="text-sm text-text-secondary">Shared Pulse World</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Mission List */}
        <div className="lg:col-span-1">
          <AppCard title="Active Missions" description="Team goals in progress">
            <div className="space-y-3">
              {state.missions.map((mission) => {
                const avgProgress =
                  mission.memberProgress.reduce((sum, mp) => sum + mp.progressPercent, 0) /
                  Math.max(1, mission.memberProgress.length);

                return (
                  <div
                    key={mission.id}
                    className="p-3 bg-surface3 rounded-lg border border-border-default"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-text-primary">
                        {mission.title}
                      </span>
                      <span className="text-xs text-text-secondary">{mission.status}</span>
                    </div>
                    <div className="h-2 bg-surface2 rounded-full overflow-hidden mb-2">
                      <motion.div
                        className="h-full bg-accent-blue transition-all"
                        initial={{ width: 0 }}
                        animate={{ width: `${avgProgress}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <div className="text-xs text-text-secondary">
                      {Math.round(avgProgress)}% complete
                    </div>
                  </div>
                );
              })}
            </div>
          </AppCard>
        </div>

        {/* Center: Mini Pulse City */}
        <div className="lg:col-span-1">
          <AppCard title="Squad World" description="Visual representation">
            <div className="grid grid-cols-4 gap-2 p-4">
              {state.tiles.map((tile) => (
                <motion.div
                  key={tile.id}
                  className={cn(
                    "p-2 rounded border text-xs text-center",
                    tile.type === "mission" && "bg-accent-blue/10 border-accent-blue/30",
                    tile.type === "streak" && "bg-green-500/10 border-green-500/30",
                    tile.type === "member" && "bg-surface3 border-border-default"
                  )}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  title={tile.label}
                >
                  <div className="truncate">{tile.label}</div>
                  {tile.progressPercent !== undefined && (
                    <div className="mt-1 text-xs text-text-secondary">
                      {Math.round(tile.progressPercent)}%
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </AppCard>
        </div>

        {/* Right: Presence */}
        <div className="lg:col-span-1">
          <AppCard title="Presence" description="Who's active">
            <div className="space-y-2">
              {state.members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center gap-3 p-2 bg-surface3 rounded-lg border border-border-default"
                >
                  <Circle
                    className={cn(
                      "w-3 h-3",
                      member.status === "online" && "text-green-400 fill-green-400",
                      member.status === "focus" && "text-yellow-400 fill-yellow-400",
                      member.status === "away" && "text-zinc-500 fill-zinc-500"
                    )}
                  />
                  <span className="text-sm text-text-primary">{member.displayName}</span>
                  <span className="text-xs text-text-secondary ml-auto capitalize">
                    {member.status}
                  </span>
                </div>
              ))}
            </div>
          </AppCard>
        </div>
      </div>

      {/* Butler Bar */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => {}}>
          Ask Butler for Squad Status
        </Button>
        <Button variant="outline" onClick={() => {}}>
          Plan Next Squad Mission
        </Button>
        <Button variant="outline" onClick={() => {}}>
          Who needs support?
        </Button>
      </div>
    </div>
  );
}



