// Deal Intelligence API (Schema-Aligned)
// app/api/deals/[dealId]/intel/regenerate/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateDealIntelligence } from "@/lib/deals/intel";

export async function POST(
  req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dealId = params.dealId;

    const intelligence = await generateDealIntelligence(userId, dealId);

    return NextResponse.json(intelligence);
  } catch (err: any) {
    console.error("[DealIntelligence] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate deal intelligence" },
      { status: 500 }
    );
  }
}

