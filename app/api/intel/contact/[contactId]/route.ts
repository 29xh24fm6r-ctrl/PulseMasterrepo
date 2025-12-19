import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contactId } = params;

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

    // Get sources (verified/likely)
    const { data: verifiedSources } = await supabaseAdmin
      .from("crm_contact_intel_sources")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("contact_id", contactId)
      .in("match_status", ["verified", "likely"])
      .order("match_confidence", { ascending: false })
      .order("created_at", { ascending: false });

    // Get uncertain sources (needs review)
    const { data: uncertainSources } = await supabaseAdmin
      .from("crm_contact_intel_sources")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("contact_id", contactId)
      .eq("match_status", "uncertain")
      .order("match_confidence", { ascending: false })
      .order("created_at", { ascending: false });

    // Get claims
    const { data: claims } = await supabaseAdmin
      .from("crm_contact_intel_claims")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("contact_id", contactId)
      .eq("status", "active")
      .order("confidence", { ascending: false })
      .order("created_at", { ascending: false });

    // Get recent runs
    const { data: runs } = await supabaseAdmin
      .from("crm_intel_runs")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("contact_id", contactId)
      .order("started_at", { ascending: false })
      .limit(10);

    return NextResponse.json(
      {
        ok: true,
        contactId,
        sources: {
          verified: verifiedSources || [],
          uncertain: uncertainSources || [],
        },
        claims: claims || [],
        runs: runs || [],
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.error("[IntelGet] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch intel" },
      { status: 500 }
    );
  }
}

