// Societal Cohort API - GET /api/society/cohort
// app/api/society/cohort/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserCohort } from "@/lib/societal/cohorts";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cohort = await getUserCohort(userId);

    return NextResponse.json({ cohort });
  } catch (error: any) {
    console.error("Failed to fetch cohort:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



