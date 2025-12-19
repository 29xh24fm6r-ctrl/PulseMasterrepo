import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ draftId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { draftId } = await params;

    // Resolve user UUID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Get draft
    const { data: draft } = await supabaseAdmin
      .from("news_email_drafts")
      .select("contact_id, article_url")
      .eq("id", draftId)
      .eq("user_id", dbUserId)
      .single();

    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    // Update draft to sent
    const { data: updatedDraft, error: draftError } = await supabaseAdmin
      .from("news_email_drafts")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", draftId)
      .select()
      .single();

    if (draftError) {
      console.error("[MarkSent] Error:", draftError);
      return NextResponse.json({ error: "Failed to mark as sent" }, { status: 500 });
    }

    // Update recommendation status
    await supabaseAdmin
      .from("news_recommendations")
      .update({ status: "sent" })
      .eq("user_id", dbUserId)
      .eq("article_url", draft.article_url)
      .eq("contact_id", draft.contact_id);

    // Update contact preferences last_sent_at
    await supabaseAdmin
      .from("contact_news_preferences")
      .update({
        last_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", dbUserId)
      .eq("contact_id", draft.contact_id);

    return NextResponse.json(
      { ok: true, draft: updatedDraft },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[MarkSent] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

