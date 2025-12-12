// Deal Next Best Action API (Schema-Aligned)
// app/api/deals/[dealId]/next-action/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateDealNextAction } from "@/lib/deals/next-action";

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
    const body = await req.json();
    const { situation } = body;

    const action = await generateDealNextAction(userId, dealId, { situation });

    return NextResponse.json(action);
  } catch (err: any) {
    console.error("[DealNextAction] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate next best action" },
      { status: 500 }
    );
  }
}

