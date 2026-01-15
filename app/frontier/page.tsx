"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { NextActionCard } from "./components/NextActionCard";
import { IdentityMomentumPanel } from "./components/IdentityMomentumPanel";
import { EmotionPulse } from "./components/EmotionPulse";
import { YesterdaySummary } from "./components/YesterdaySummary";
import { SimulationTeaser } from "./components/SimulationTeaser";
import { Loader2 } from "lucide-react";

export default function FrontierPage() {
  const { userId, isLoaded } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !userId) return;

    async function fetchData() {
      try {
        const res = await fetch("/api/frontier/dashboard");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error("Failed to load frontier data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [userId, isLoaded]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p>Please sign in to access Frontier</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            Frontier
          </h1>
          <p className="text-zinc-400 mt-2">Your AI-powered life intelligence environment</p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            <NextActionCard action={data?.nextAction || null} />
            <YesterdaySummary summary={data?.summary || null} />
            <IdentityMomentumPanel momentum={data?.momentum || []} />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <EmotionPulse
              recentStates={data?.emotionData?.recentStates || []}
              profile={data?.emotionData?.profile || null}
            />
            <SimulationTeaser />
          </div>
        </div>
      </div>
    </div>
  );
}