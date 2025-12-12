// Guilds Page
// app/guilds/page.tsx

"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Trophy,
  TrendingUp,
  CheckCircle2,
  X,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function GuildsPage() {
  const [myGuilds, setMyGuilds] = useState<any[]>([]);
  const [eligibleGuilds, setEligibleGuilds] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [myRes, eligibleRes, leaderboardRes] = await Promise.all([
        fetch("/api/guilds/my"),
        fetch("/api/guilds/eligible"),
        fetch("/api/guilds/leaderboard"),
      ]);

      if (myRes.ok) {
        const myJson = await myRes.json();
        setMyGuilds(myJson.memberships || []);
      }

      if (eligibleRes.ok) {
        const eligibleJson = await eligibleRes.json();
        setEligibleGuilds(eligibleJson.guilds || []);
      }

      if (leaderboardRes.ok) {
        const leaderboardJson = await leaderboardRes.json();
        setLeaderboard(leaderboardJson);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function joinGuild(guildId: string) {
    try {
      const res = await fetch("/api/guilds/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guildId }),
      });
      const json = await res.json();
      if (res.ok) {
        alert(`Successfully joined!`);
        await loadData();
      } else {
        alert(`Failed: ${json.error}`);
      }
    } catch (err) {
      console.error("Failed to join guild:", err);
      alert("Failed to join guild");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading guilds...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-400" />
          <div>
            <h1 className="text-3xl font-bold text-white">Guilds</h1>
            <p className="text-sm text-zinc-400">
              Join communities of top performers in your field
            </p>
          </div>
        </div>

        {/* My Guilds */}
        {myGuilds.length > 0 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              My Guilds
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {myGuilds.map((membership) => {
                const guild = membership.guild || {};
                return (
                  <div
                    key={membership.id}
                    className="border border-zinc-700 rounded-lg p-4 space-y-2"
                  >
                    <div className="font-semibold text-white">{guild.name}</div>
                    <div className="text-sm text-zinc-400">{guild.description}</div>
                    <div className="text-xs text-zinc-500">
                      Joined {new Date(membership.joinedAt).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Eligible Guilds */}
        {eligibleGuilds.length > 0 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Available Guilds</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {eligibleGuilds.map((guild) => (
                <div
                  key={guild.id}
                  className="border border-zinc-700 rounded-lg p-4 space-y-3"
                >
                  <div>
                    <div className="font-semibold text-white mb-1">{guild.name}</div>
                    <div className="text-sm text-zinc-400">{guild.description}</div>
                  </div>
                  <div className="space-y-1 text-xs text-zinc-400">
                    {guild.min_level_index !== null && (
                      <div>Requires Level: {guild.min_level_index + 1}</div>
                    )}
                    {guild.min_score !== null && (
                      <div>
                        Requires Score: {Math.round(guild.min_score * 100)}%
                      </div>
                    )}
                  </div>
                  <div
                    className={`text-xs ${
                      guild.isEligible ? "text-green-400" : "text-amber-400"
                    }`}
                  >
                    {guild.eligibilityReason}
                  </div>
                  {guild.isEligible && (
                    <button
                      onClick={() => joinGuild(guild.id)}
                      className="w-full px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      Join Guild
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Leaderboard */}
        {leaderboard && leaderboard.guilds && leaderboard.guilds.length > 0 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Guild Leaderboard
            </h2>
            <div className="text-sm text-zinc-400 mb-4">
              {leaderboard.job?.label || "Job"} • {leaderboard.dateRange?.from} to{" "}
              {leaderboard.dateRange?.to}
            </div>
            <div className="space-y-2">
              {leaderboard.guilds.map((guild: any) => (
                <div
                  key={guild.guildId}
                  className="flex items-center justify-between border border-zinc-700 rounded-lg p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-white">
                      {guild.rank}
                    </div>
                    <div>
                      <div className="font-semibold text-white">{guild.name}</div>
                      <div className="text-xs text-zinc-400">
                        {guild.memberCount} members
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-zinc-400">Avg Score</div>
                    <div className="text-lg font-bold text-green-400">
                      {Math.round((guild.avgScore || 0) * 100)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}




