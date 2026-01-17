/**
 * Individual Draft API
 * GET /api/delegation/drafts/[id] - Get draft
 * PATCH /api/delegation/drafts/[id] - Update draft
 * DELETE /api/delegation/drafts/[id] - Delete draft
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import {
  getDelegatedDraft,
  updateDraftStatus,
  updateDraftContent,
  deleteDelegatedDraft,
  DelegatedDraftStatus,
} from "@/lib/delegation/service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const draft = await getDelegatedDraft(id);

    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    if (draft.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ draft });
  } catch (error: any) {
    console.error("[Delegation Draft GET] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, subject, body: draftBody } = body;

    // Verify ownership
    const { data: existing } = await getSupabaseAdminRuntimeClient()
      .from("delegated_drafts")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    if (existing.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Handle status update
    if (status) {
      const validStatuses: DelegatedDraftStatus[] = [
        "pending",
        "approved",
        "edited",
        "sent",
        "discarded",
      ];

      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `status must be one of: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }

      const success = await updateDraftStatus(id, status);
      if (!success) {
        return NextResponse.json(
          { error: "Failed to update status" },
          { status: 500 }
        );
      }
    }

    // Handle content update
    if (subject !== undefined || draftBody !== undefined) {
      const success = await updateDraftContent(id, {
        subject: subject,
        body: draftBody,
      });
      if (!success) {
        return NextResponse.json(
          { error: "Failed to update content" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    console.error("[Delegation Draft PATCH] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership
    const { data: existing } = await getSupabaseAdminRuntimeClient()
      .from("delegated_drafts")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    if (existing.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const success = await deleteDelegatedDraft(id);
    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete draft" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Delegation Draft DELETE] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}