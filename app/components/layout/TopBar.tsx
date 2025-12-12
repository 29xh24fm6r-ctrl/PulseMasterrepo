// Top Bar Component
// app/components/layout/TopBar.tsx

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare, Mic, HelpCircle } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { HelpButton } from "@/app/components/onboarding/HelpButton";

export function TopBar() {
  const { user } = useUser();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [strategyStatus, setStrategyStatus] = useState<string | null>(null);

  useEffect(() => {
    // Update date every minute
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);

    // Load strategy status
    fetch("/api/strategy/current")
      .then((res) => res.json())
      .then((data) => {
        if (data.strategy) {
          setStrategyStatus(`${data.strategy.selectedPath.name} · ${data.strategy.horizonDays} days remaining`);
        }
      })
      .catch(() => {});

    return () => clearInterval(interval);
  }, []);

  const firstName = user?.firstName || "there";
  const greeting = getGreeting();

  function getGreeting() {
    const hour = currentDate.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }

  return (
    <header className="bg-zinc-900/50 border-b border-zinc-800 backdrop-blur-sm sticky top-0 z-10">
      <div className="px-4 py-3 md:px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-sm font-medium text-white">
              {greeting}, {firstName}
            </div>
            <div className="text-xs text-zinc-400">
              {currentDate.toLocaleDateString("en-US", { 
                weekday: "long", 
                month: "long", 
                day: "numeric" 
              })}
            </div>
          </div>
          {strategyStatus && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <span className="text-xs text-zinc-400">Strategy:</span>
              <span className="text-xs text-zinc-300">{strategyStatus}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="hidden md:flex">
            <MessageSquare className="w-4 h-4 mr-2" />
            Talk to a Coach
          </Button>
          <HelpButton origin="global.help" variant="icon" />
          <Button size="sm" variant="ghost" className="hidden md:flex">
            <Mic className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

