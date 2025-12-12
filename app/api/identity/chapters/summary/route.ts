// Chapter Summary API
// app/api/identity/chapters/summary/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
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

    // Get current chapter
    const { data: currentChapter } = await supabaseAdmin
      .from("life_chapters")
      .select("*")
      .eq("user_id", dbUserId)
      .is("end_date", null)
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get recent chapters
    const { data: recentChapters } = await supabaseAdmin
      .from("life_chapters")
      .select("*")
      .eq("user_id", dbUserId)
      .not("end_date", "is", null)
      .order("start_date", { ascending: false })
      .limit(5);

    return NextResponse.json({
      currentChapter: currentChapter
        ? {
            id: currentChapter.id,
            title: currentChapter.title,
            description: currentChapter.description,
            start_date: currentChapter.start_date,
            primary_identity_name: currentChapter.primary_identity_name,
            emotion_theme: currentChapter.emotion_theme,
          }
        : null,
      recentChapters: (recentChapters || []).map((c) => ({
        id: c.id,
        title: c.title,
        start_date: c.start_date,
        end_date: c.end_date,
      })),
    });
  } catch (err: any) {
    console.error("[ChaptersSummary] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get chapter summary" },
      { status: 500 }
    );
  }
}

