import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { sourceId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sourceId } = params;

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

    // Verify source belongs to user and update status
    const { data: source, error: updateError } = await supabaseAdmin
      .from("crm_contact_intel_sources")
      .update({
        match_status: "rejected",
        match_confidence: 0,
      })
      .eq("id", sourceId)
      .eq("user_id", dbUserId)
      .select()
      .single();

    if (updateError || !source) {
      return NextResponse.json({ error: "Source not found or update failed" }, { status: 404 });
    }

    return NextResponse.json(
      {
        ok: true,
        source,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.error("[IntelReject] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to reject source" },
      { status: 500 }
    );
  }
}

