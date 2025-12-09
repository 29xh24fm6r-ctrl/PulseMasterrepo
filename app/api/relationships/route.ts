/**
 * Relationships API
 * GET /api/relationships - List relationships
 * POST /api/relationships - Create/update relationship
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getRelationships,
  upsertRelationship,
  getRelationshipInsights,
  recalculateHealthScores,
} from "@/lib/relationships/engine";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const mode = searchParams.get("mode");

    if (mode === "insights") {
      const insights = await getRelationshipInsights(userId);
      return NextResponse.json({ insights });
    }

    if (mode === "recalculate") {
      const updated = await recalculateHealthScores(userId);
      return NextResponse.json({ success: true, updated });
    }

    const importance = searchParams.get("importance")?.split(",") as any;
    const relationship = searchParams.get("relationship")?.split(",") as any;
    const needsAttention = searchParams.get("needsAttention") === "true";

    const relationships = await getRelationships(userId, {
      importance,
      relationship,
      needsAttention,
    });

    return NextResponse.json({ relationships });
  } catch (error: any) {
    console.error("[Relationships GET] Error:", error);
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
    const relationship = await upsertRelationship(userId, body);

    if (!relationship) {
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    return NextResponse.json({ relationship });
  } catch (error: any) {
    console.error("[Relationships POST] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}