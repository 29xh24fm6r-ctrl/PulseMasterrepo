/**
 * Delegated Drafts API
 * GET /api/delegation/drafts - List drafts
 * POST /api/delegation/drafts - Generate new draft
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  listDelegatedDrafts,
  generateDelegatedDraft,
  DelegatedDraftStatus,
  DelegatedDraftType,
} from "@/lib/delegation/service";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as DelegatedDraftStatus | null;
    const limit = parseInt(searchParams.get("limit") || "20");

    const drafts = await listDelegatedDrafts(
      userId,
      status || undefined,
      Math.min(limit, 50)
    );

    return NextResponse.json({
      drafts,
      count: drafts.length,
    });
  } catch (error: any) {
    console.error("[Delegation Drafts GET] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, target, purpose, extraContext, relatedInsightId } = body;

    if (!type || !purpose) {
      return NextResponse.json(
        { error: "type and purpose are required" },
        { status: 400 }
      );
    }

    const validTypes: DelegatedDraftType[] = ["email", "message", "note"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const draft = await generateDelegatedDraft({
      userId,
      type,
      target,
      purpose,
      extraContext,
      relatedInsightId,
    });

    return NextResponse.json({
      success: true,
      draft,
    });
  } catch (error: any) {
    console.error("[Delegation Drafts POST] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
