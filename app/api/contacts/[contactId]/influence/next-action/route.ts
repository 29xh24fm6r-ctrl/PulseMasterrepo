// Next Best Action API
// app/api/contacts/[contactId]/influence/next-action/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateNextBestAction } from "@/lib/influence/engine";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(
  req: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    const contactId = params.contactId;
    const body = await req.json();
    const { situation } = body;

    // Generate next best action
    const result = await generateNextBestAction({
      userId,
      contactId,
      situation,
    });

    // Log influence event
    await supabaseAdmin.from("contact_influence_events").insert({
      user_id: dbUserId,
      contact_id: contactId,
      suggestion_type: "next_best_action",
      context: situation || null,
      suggested_channel: result.suggested_channel,
      suggested_message: result.suggested_message,
      suggested_summary: result.suggested_summary,
      rationale: result.rationale,
      confidence: result.confidence,
      model_metadata: {
        model: "gpt-4o-mini",
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[NextBestAction] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate next best action" },
      { status: 500 }
    );
  }
}

