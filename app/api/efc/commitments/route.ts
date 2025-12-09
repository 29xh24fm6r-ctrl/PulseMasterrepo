// API Route: /api/efc/commitments
// Track and manage commitments

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { FollowThroughTracker } from "@/lib/efc/follow-through-tracker";

// GET /api/efc/commitments - Get active commitments
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || undefined;
    const limit = parseInt(searchParams.get("limit") || "20");

    const commitments = await FollowThroughTracker.getActiveCommitments(userId, {
      type,
      limit,
    });

    const score = await FollowThroughTracker.calculateFollowThroughScore(userId);

    return NextResponse.json({
      commitments,
      count: commitments.length,
      follow_through_score: score,
    });
  } catch (error: any) {
    console.error("[EFC Commitments GET] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/efc/commitments - Create a new commitment
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { commitment_type, title, description, made_to, due_at, related_entity_ids } = body;

    if (!commitment_type || !title) {
      return NextResponse.json(
        { error: "commitment_type and title required" },
        { status: 400 }
      );
    }

    const commitment = await FollowThroughTracker.createCommitment(userId, {
      commitment_type,
      title,
      description,
      made_to,
      due_at,
      related_entity_ids,
    });

    return NextResponse.json({
      success: true,
      commitment,
    });
  } catch (error: any) {
    console.error("[EFC Commitments POST] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/efc/commitments - Update commitment progress
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { commitment_id, progress, notes, blockers, action } = body;

    if (!commitment_id) {
      return NextResponse.json(
        { error: "commitment_id required" },
        { status: 400 }
      );
    }

    // Handle different actions
    if (action === "break") {
      await FollowThroughTracker.markCommitmentBroken(userId, commitment_id, notes);
      return NextResponse.json({ success: true, status: "broken" });
    }

    if (progress !== undefined) {
      const commitment = await FollowThroughTracker.updateCommitmentProgress(
        userId,
        commitment_id,
        progress,
        notes,
        blockers
      );
      return NextResponse.json({ success: true, commitment });
    }

    return NextResponse.json({ error: "No action specified" }, { status: 400 });
  } catch (error: any) {
    console.error("[EFC Commitments PATCH] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}