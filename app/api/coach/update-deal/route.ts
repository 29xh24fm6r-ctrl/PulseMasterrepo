import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { updateDeal } from "@/lib/data/deals";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { dealId, properties } = body;

    if (!dealId || !properties) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing dealId or properties",
        },
        { status: 400 }
      );
    }

    // Map properties from potential Notion-style keys if frontend sends them, or just accept partial Deal object
    // Assuming frontend might send 'Stage' or 'Value' capitalized, but updateDeal expects lowercase 'stage', 'value'
    // Let's normalize some common ones or expect standard keys.
    const updates: any = {};
    if (properties.Stage) updates.stage = properties.Stage;
    if (properties.Value) updates.value = properties.Value;
    if (properties.stage) updates.stage = properties.stage;
    if (properties.value) updates.value = properties.value;
    // Add more mappings as needed, or assume clean input.

    await updateDeal(userId, dealId, updates);

    return NextResponse.json({
      ok: true,
      message: "Deal updated successfully",
    });
  } catch (err: any) {
    console.error("Coach update-deal error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to update deal",
      },
      { status: 500 }
    );
  }
}
