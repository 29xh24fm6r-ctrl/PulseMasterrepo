import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { mergeContacts, MergeStrategy } from "@/lib/contacts/merge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { winner_contact_id, loser_contact_id, strategy = "fill_blanks", merge_reason } = body;

    if (!winner_contact_id || !loser_contact_id) {
      return NextResponse.json(
        { error: "winner_contact_id and loser_contact_id are required" },
        { status: 400 }
      );
    }

    if (winner_contact_id === loser_contact_id) {
      return NextResponse.json(
        { error: "Cannot merge a contact with itself" },
        { status: 400 }
      );
    }

    // Resolve user UUID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id;
    if (!dbUserId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Perform merge
    const result = await mergeContacts({
      userId: dbUserId,
      winnerContactId: winner_contact_id,
      loserContactId: loser_contact_id,
      strategy: strategy as MergeStrategy,
      mergeReason: merge_reason || "Manual merge",
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "Merge completed with errors",
          errors: result.errors,
          plan: result.plan,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        winner_contact_id: result.winnerContactId,
        merge_id: result.mergeId,
        plan: result.plan,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.error("[Merge] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to merge contacts" },
      { status: 500 }
    );
  }
}

