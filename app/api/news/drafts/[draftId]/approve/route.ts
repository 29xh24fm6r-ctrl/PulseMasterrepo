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
    const body = await req.json();
    const { subject, body: emailBody } = body;

    // Resolve user UUID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Update draft to approved
    const updateData: any = {
      status: "approved",
      updated_at: new Date().toISOString(),
    };

    if (subject) updateData.subject = subject;
    if (emailBody) updateData.body = emailBody;

    const { data: draft, error } = await supabaseAdmin
      .from("news_email_drafts")
      .update(updateData)
      .eq("id", draftId)
      .eq("user_id", dbUserId)
      .select()
      .single();

    if (error || !draft) {
      console.error("[ApproveDraft] Error:", error);
      return NextResponse.json({ error: "Failed to approve draft" }, { status: 500 });
    }

    // Update recommendation status
    await supabaseAdmin
      .from("news_recommendations")
      .update({ status: "drafted" })
      .eq("user_id", dbUserId)
      .eq("article_url", draft.article_url)
      .eq("contact_id", draft.contact_id);

    return NextResponse.json(
      { ok: true, draft },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[ApproveDraft] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

