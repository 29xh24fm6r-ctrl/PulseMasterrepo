// Parallel Simulation API - POST /api/simulation/parallel
// app/api/simulation/parallel/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { runParallelLifeSimulation } from "@/lib/simulation/parallel";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { scenario, hypothesis } = body;

    if (!scenario) {
      return NextResponse.json({ error: "Scenario required" }, { status: 400 });
    }

    const result = await runParallelLifeSimulation({
      userId,
      scenario,
      hypothesis,
    });

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error("Failed to run simulation:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



