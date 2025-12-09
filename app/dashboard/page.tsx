"use client";

import { useEffect, useState } from "react";
import TodaySummary from "@/components/dashboard/TodaySummary";
import CalendarPreview from "@/components/dashboard/CalendarPreview";
import XPOverview from "@/components/dashboard/XPOverview";
import IdentityInsights from "@/components/dashboard/IdentityInsights";
import MemoryHighlights from "@/components/dashboard/MemoryHighlights";
import ButlerRecommendations from "@/components/dashboard/ButlerRecommendations";
import PhilosophyProgress from "@/components/dashboard/PhilosophyProgress";
import RelationshipHealth from "@/components/dashboard/RelationshipHealth";

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [xpData, setXpData] = useState(null);
  const [identityData, setIdentityData] = useState(null);
  const [memoryData, setMemoryData] = useState(null);
  const [butlerData, setButlerData] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    setLoading(true);
    try {
      const [xpRes, identityRes, memoryRes, butlerRes] = await Promise.all([
        fetch("/api/xp/overview"),
        fetch("/api/identity/insights"),
        fetch("/api/memory/highlights"),
        fetch("/api/butler/recommendations"),
      ]);

      if (xpRes.ok) {
        const xp = await xpRes.json();
        setXpData(xp);
      }
      if (identityRes.ok) {
        const identity = await identityRes.json();
        setIdentityData(identity);
      }
      if (memoryRes.ok) {
        const memory = await memoryRes.json();
        setMemoryData(memory);
      }
      if (butlerRes.ok) {
        const butler = await butlerRes.json();
        setButlerData(butler);
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Life Dashboard
          </h1>
          <p className="text-zinc-500 mt-1">
            {getGreeting()} — Your complete life overview
          </p>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Top Row - Full Width */}
          <div className="md:col-span-2 lg:col-span-3">
            <TodaySummary 
              greeting={getGreeting()}
              focusItems={["Complete project proposal", "Follow up with client", "Review weekly goals"]}
              stats={{
                tasksCompleted: 3,
                tasksTotal: 8,
                habitsCompleted: 5,
                habitsTotal: 7
              }}
            />
          </div>

          {/* Left Column */}
          <div className="space-y-4 lg:space-y-6">
            <CalendarPreview 
              events={[
                {
                  id: "1",
                  title: "Team Standup",
                  start: new Date().toISOString(),
                  end: new Date(Date.now() + 30 * 60000).toISOString(),
                  location: "Zoom"
                },
                {
                  id: "2",
                  title: "Client Meeting",
                  start: new Date(Date.now() + 2 * 3600000).toISOString(),
                  end: new Date(Date.now() + 3 * 3600000).toISOString(),
                }
              ]}
            />
            <XPOverview 
              {...xpData}
              loading={loading}
            />
          </div>

          {/* Middle Column */}
          <div className="space-y-4 lg:space-y-6">
            <IdentityInsights 
              {...identityData}
              loading={loading}
            />
            <MemoryHighlights 
              {...memoryData}
              loading={loading}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-4 lg:space-y-6">
            <ButlerRecommendations 
              recommendations={butlerData?.recommendations}
              loading={loading}
            />
            <PhilosophyProgress 
              activePath="Stoic"
              currentBelt="Green"
              practicesCompleted={4}
              practicesTotal={7}
            />
            <RelationshipHealth 
              relationships={[
                {
                  id: "1",
                  name: "John Doe",
                  health: 0.8,
                  lastContact: new Date(Date.now() - 2 * 24 * 3600000).toISOString()
                },
                {
                  id: "2",
                  name: "Jane Smith",
                  health: 0.6,
                  lastContact: new Date(Date.now() - 5 * 24 * 3600000).toISOString()
                }
              ]}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

