import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runContactIntel } from "@/lib/intel/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { contactId, runType = "manual" } = body;

    if (!contactId) {
      return NextResponse.json({ error: "contactId is required" }, { status: 400 });
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

    // Verify contact belongs to user
    const { data: contact } = await supabaseAdmin
      .from("crm_contacts")
      .select("id")
      .eq("id", contactId)
      .eq("user_id", dbUserId)
      .single();

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Run intel collection
    const result = await runContactIntel({
      userId: dbUserId,
      contactId,
      runType: runType || "manual",
    });

    return NextResponse.json(
      {
        ok: true,
        ...result,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.error("[IntelRun] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to run intel collection" },
      { status: 500 }
    );
  }
}

