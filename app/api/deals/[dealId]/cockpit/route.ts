// Deal Cockpit API
// app/api/deals/[dealId]/cockpit/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { loadDealContext } from "@/lib/deals/context";
import { generateDealIntelligence } from "@/lib/deals/intel";
import { generateDealNextBestAction } from "@/lib/deals/next-action";

export async function GET(
  req: NextRequest,
  { params }: { params: { dealId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dealId = params.dealId;

    // Load deal context
    const context = await loadDealContext(dealId, userId);

    // Load or generate intelligence
    const { data: existingIntel } = await supabaseAdmin
      .from("deal_intelligence")
      .select("*")
      .eq("deal_id", dealId)
      .maybeSingle();

    let intel = null;
    if (existingIntel) {
      intel = {
        riskSummary: existingIntel.risk_summary || null,
        blockers: existingIntel.blockers || [],
        nextSteps: existingIntel.next_steps || [],
        stallIndicators: existingIntel.stall_indicators || [],
        momentumScore: existingIntel.momentum_score || null,
        confidence: existingIntel.confidence || null,
        generatedAt: existingIntel.generated_at || null,
      };
    } else {
      // Generate if missing
      try {
        const generated = await generateDealIntelligence(userId, dealId);
        intel = {
          riskSummary: generated.riskSummary,
          blockers: generated.blockers,
          nextSteps: generated.nextSteps,
          stallIndicators: generated.stallIndicators,
          momentumScore: generated.momentumScore,
          confidence: generated.confidence,
          generatedAt: new Date().toISOString(),
        };
      } catch (err) {
        console.warn("[DealCockpit] Failed to generate intelligence:", err);
      }
    }

    // Generate next best action (optional, can be lazy-loaded)
    let nextBestAction = null;
    try {
      nextBestAction = await generateDealNextAction(userId, dealId);
    } catch (err) {
      console.warn("[DealCockpit] Failed to generate next best action:", err);
    }

    return NextResponse.json({
      context: {
        deal: context.deal,
        participants: context.participants,
        comms: context.comms,
        tasks: context.tasks,
        lastIntel: context.lastIntel,
      },
      intel,
      nextBestAction,
    });
  } catch (err: any) {
    console.error("[DealCockpit] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load deal cockpit" },
      { status: 500 }
    );
  }
}

