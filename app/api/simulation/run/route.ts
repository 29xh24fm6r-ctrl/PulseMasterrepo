// Simulation Run API
// app/api/simulation/run/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { runSimulationScenario } from "@/lib/simulation/run";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { scenarioName, input } = body;

    if (!scenarioName || !input) {
      return NextResponse.json({ error: "Missing scenarioName or input" }, { status: 400 });
    }

    const result = await runSimulationScenario(userId, scenarioName, input);

    return NextResponse.json({ result });
  } catch (err: any) {
    console.error("[SimulationRun] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to run simulation" },
      { status: 500 }
    );
  }
}
