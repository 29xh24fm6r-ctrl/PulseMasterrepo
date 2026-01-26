"use client";

import React from "react";
import { CommandQueue } from "./CommandQueue";
import { DraftCard } from "./DraftCard";
import { SignalFeed } from "./SignalFeed";
import { GoalsPanel } from "./GoalsPanel";
import { TrajectoryViz } from "./TrajectoryViz";
import { GuardianStatus } from "./GuardianStatus";
import { ReasoningTrace } from "./ReasoningTrace";
import { ImprovementQueue } from "./ImprovementQueue";

export function OmegaDashboard() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <span className="w-3 h-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-pulse" />
          Omega Prime
        </h1>
        <p className="text-zinc-500 mt-1">
          Signal monitoring • Intent prediction • Proactive drafting • Recursive self-improvement
        </p>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left column - Action required */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <CommandQueue />
          <ImprovementQueue />
        </div>

        {/* Center column - Current state */}
        <div className="col-span-12 lg:col-span-5 space-y-4">
          <SignalFeed />
          <ReasoningTrace />
        </div>

        {/* Right column - Strategic view */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <GoalsPanel />
          <TrajectoryViz />
          <GuardianStatus />
        </div>
      </div>
    </div>
  );
}

// Also export individual components for flexible usage
export {
  CommandQueue,
  DraftCard,
  SignalFeed,
  GoalsPanel,
  TrajectoryViz,
  GuardianStatus,
  ReasoningTrace,
  ImprovementQueue,
};
