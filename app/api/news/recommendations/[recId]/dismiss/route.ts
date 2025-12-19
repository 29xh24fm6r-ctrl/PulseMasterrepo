import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ recId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { recId } = await params;

    // Resolve user UUID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Update recommendation to dismissed
    const { data: rec, error } = await supabaseAdmin
      .from("news_recommendations")
      .update({
        status: "dismissed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", recId)
      .eq("user_id", dbUserId)
      .select()
      .single();

    if (error || !rec) {
      console.error("[DismissRecommendation] Error:", error);
      return NextResponse.json({ error: "Failed to dismiss recommendation" }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, recommendation: rec },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[DismissRecommendation] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

