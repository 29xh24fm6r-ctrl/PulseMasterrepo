// Simulation Engine v2 API
// app/api/simulation/v2/run/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { runMultiTimelineSimulationForUser } from "@/lib/simulation/v2/engine";
import { SimulationInput } from "@/lib/simulation/v2/types";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { horizonDays = 90, scenarios = [] } = body as Partial<SimulationInput>;

    // Default scenarios if none provided
    const defaultScenarios: SimulationInput["scenarios"] = [
      {
        id: "baseline",
        title: "Baseline (Current Trajectory)",
        description: "Project current state forward",
        parameterAdjustments: {},
      },
      {
        id: "high_energy",
        title: "High Energy Scenario",
        description: "What if energy levels increase?",
        parameterAdjustments: {
          energyLevel: 0.9,
        },
      },
      {
        id: "reduced_workload",
        title: "Reduced Workload Scenario",
        description: "What if workload decreases?",
        parameterAdjustments: {
          workload: 0.7,
        },
      },
    ];

    const output = await runMultiTimelineSimulationForUser(
      userId,
      horizonDays || 90,
      scenarios.length > 0 ? scenarios : defaultScenarios
    );

    return NextResponse.json(output);
  } catch (err: unknown) {
    console.error("[Simulation v2] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Failed to run simulation";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}



