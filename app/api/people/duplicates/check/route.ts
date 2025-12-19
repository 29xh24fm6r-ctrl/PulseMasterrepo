import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { findDuplicateCandidates } from "@/lib/contacts/dedup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { full_name, primary_email, primary_phone, company_name, job_title } = body;

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

    // Find duplicate candidates
    const matches = await findDuplicateCandidates(dbUserId, {
      full_name,
      primary_email,
      primary_phone,
      company_name,
      job_title,
    });

    return NextResponse.json(
      {
        ok: true,
        matches: matches.map((m) => ({
          contact: m.contact,
          score: m.score,
          reasons: m.reasons,
          confidence: m.confidence,
        })),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.error("[DuplicateCheck] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to check for duplicates" },
      { status: 500 }
    );
  }
}

