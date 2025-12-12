// Weekly Review API
// app/api/rhythm/weekly/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  generateWeeklyReviewData,
  renderWeeklyReviewText,
  upsertWeeklyReviewEntry,
  getWeekStart,
} from "@/lib/rhythm/weekly";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const weekStartParam = url.searchParams.get("weekStart");

    let weekStart: Date;
    if (weekStartParam) {
      weekStart = new Date(weekStartParam);
    } else {
      weekStart = getWeekStart(new Date());
    }

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    const weekStartStr = weekStart.toISOString().split("T")[0];

    // Check if review exists
    const { data: existing } = await supabaseAdmin
      .from("weekly_reviews")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("week_start", weekStartStr)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        review: {
          summary: existing.summary,
          data: existing.data,
        },
      });
    }

    // Generate new review
    const data = await generateWeeklyReviewData(userId, weekStart);
    const summary = await renderWeeklyReviewText(data);
    await upsertWeeklyReviewEntry(userId, weekStart, summary, data);

    return NextResponse.json({
      review: {
        summary,
        data,
      },
    });
  } catch (err: any) {
    console.error("[WeeklyReview] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get weekly review" },
      { status: 500 }
    );
  }
}

