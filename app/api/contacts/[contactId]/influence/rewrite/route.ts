// Message Rewrite API
// app/api/contacts/[contactId]/influence/rewrite/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { rewriteMessageForContact } from "@/lib/influence/rewrite";
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
    const { originalMessage, intent } = body;

    if (!originalMessage || !intent) {
      return NextResponse.json(
        { error: "originalMessage and intent are required" },
        { status: 400 }
      );
    }

    // Rewrite message
    const result = await rewriteMessageForContact({
      userId,
      contactId,
      originalMessage,
      intent: intent as "persuade" | "reassure" | "apologize" | "followup" | "update",
    });

    // Log influence event
    await supabaseAdmin.from("contact_influence_events").insert({
      user_id: dbUserId,
      contact_id: contactId,
      suggestion_type: "rewrite",
      context: `Intent: ${intent}`,
      suggested_message: result.rewritten_message,
      suggested_summary: result.rationale,
      rationale: result.rationale,
      model_metadata: {
        model: "gpt-4o-mini",
        original_message: originalMessage,
        intent: intent,
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[MessageRewrite] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to rewrite message" },
      { status: 500 }
    );
  }
}

