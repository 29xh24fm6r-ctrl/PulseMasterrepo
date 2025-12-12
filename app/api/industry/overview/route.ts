// Industry Overview API
// app/api/industry/overview/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getIndustryContextForUser, enrichIndustryIntel } from "@/lib/industry/context";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { industryName, intel } = await getIndustryContextForUser(userId);

    // If no intel exists, trigger enrichment
    if (!intel) {
      try {
        await enrichIndustryIntel(industryName);
        // Reload
        const { intel: newIntel } = await getIndustryContextForUser(userId);
        return NextResponse.json({
          industryName,
          intel: newIntel,
        });
      } catch (err) {
        console.error("[Industry] Enrichment failed:", err);
      }
    }

    return NextResponse.json({
      industryName,
      intel,
    });
  } catch (err: any) {
    console.error("[Industry] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get industry overview" },
      { status: 500 }
    );
  }
}




