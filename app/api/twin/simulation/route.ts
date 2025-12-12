// Twin Simulation API - POST /api/twin/simulation
// app/api/twin/simulation/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { runTwinSimulation } from "@/lib/twin/simulation";

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

    const result = await runTwinSimulation({
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



