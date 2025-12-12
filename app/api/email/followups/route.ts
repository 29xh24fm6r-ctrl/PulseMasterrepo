// Email Followups API
// app/api/email/followups/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getOpenFollowupsForUser } from "@/lib/email/followups";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const before = url.searchParams.get("before");

    const followups = await getOpenFollowupsForUser(userId, {
      before: before ? new Date(before) : undefined,
    });

    // Enrich with thread details
    const enriched = await Promise.all(
      followups.map(async (f) => {
        const { data: thread } = await supabaseAdmin
          .from("email_threads")
          .select("*")
          .eq("id", f.threadId)
          .single();

        return {
          id: f.id,
          threadId: f.threadId,
          subject: thread?.subject || "No subject",
          from: thread?.last_from || "Unknown",
          responseDueAt: f.responseDueAt,
          lastFromYou: f.lastFromYou,
          isOverdue: new Date(f.responseDueAt) < new Date(),
        };
      })
    );

    return NextResponse.json({ followups: enriched });
  } catch (err: any) {
    console.error("[EmailFollowups] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get followups" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
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

    const body = await req.json();
    const { followupId, status } = body;

    if (!followupId || !status) {
      return NextResponse.json(
        { error: "followupId and status are required" },
        { status: 400 }
      );
    }

    const { data: followup } = await supabaseAdmin
      .from("email_followups")
      .update({
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", followupId)
      .eq("user_id", dbUserId)
      .select()
      .single();

    if (!followup) {
      return NextResponse.json({ error: "Followup not found" }, { status: 404 });
    }

    return NextResponse.json({ followup });
  } catch (err: any) {
    console.error("[EmailFollowups] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update followup" },
      { status: 500 }
    );
  }
}

