/**
 * Third Brain Insights API
 * POST /api/third-brain/insights - Create a new insight
 * GET /api/third-brain/insights - Get insights
 * PATCH /api/third-brain/insights - Update insight status
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createInsight, getOpenInsights, updateInsightStatus } from "@/lib/third-brain/service";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { kind, title, description, relatedKey, severity, expiresAt } = body;

    if (!kind || !title || !description) {
      return NextResponse.json(
        { error: "kind, title, and description are required" },
        { status: 400 }
      );
    }

    const validKinds = ["risk", "opportunity", "suggestion", "reflection", "nudge"];
    if (!validKinds.includes(kind)) {
      return NextResponse.json(
        { error: `kind must be one of: ${validKinds.join(", ")}` },
        { status: 400 }
      );
    }

    const insightId = await createInsight({
      userId,
      kind,
      title,
      description,
      relatedKey,
      severity,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    if (!insightId) {
      return NextResponse.json(
        { error: "Failed to create insight" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: insightId });
  } catch (error) {
    console.error("[ThirdBrain Insights POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to create insight" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "open";
    const kind = searchParams.get("kind");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Use optimized function for open insights
    if (status === "open" && !kind) {
      const insights = await getOpenInsights(userId, limit);
      return NextResponse.json({
        insights,
        count: insights.length,
      });
    }

    // Custom query for other filters
    let query = supabaseAdmin
      .from("third_brain_insights")
      .select("*")
      .eq("user_id", userId)
      .order("severity", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status && status !== "all") {
      query = query.eq("status", status);
    }
    if (kind) {
      query = query.eq("kind", kind);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[ThirdBrain Insights GET] Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch insights" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      insights: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("[ThirdBrain Insights GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch insights" },
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

    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: "id and status are required" },
        { status: 400 }
      );
    }

    const validStatuses = ["accepted", "dismissed", "done", "snoozed"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: existing } = await supabaseAdmin
      .from("third_brain_insights")
      .select("user_id")
      .eq("id", id)
      .single();

    if (!existing || existing.user_id !== userId) {
      return NextResponse.json(
        { error: "Insight not found" },
        { status: 404 }
      );
    }

    const success = await updateInsightStatus(id, status);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update insight" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ThirdBrain Insights PATCH] Error:", error);
    return NextResponse.json(
      { error: "Failed to update insight" },
      { status: 500 }
    );
  }
}