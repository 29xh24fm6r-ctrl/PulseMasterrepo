/**
 * Third Brain Events API
 * POST /api/third-brain/events - Log a new event
 * GET /api/third-brain/events - Get recent events
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { logThirdBrainEvent } from "@/lib/third-brain/service";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, source, title, summary, rawPayload, occurredAt } = body;

    if (!type || !source) {
      return NextResponse.json(
        { error: "type and source are required" },
        { status: 400 }
      );
    }

    const eventId = await logThirdBrainEvent({
      userId,
      type,
      source,
      title,
      summary,
      rawPayload,
      occurredAt: occurredAt ? new Date(occurredAt) : undefined,
    });

    if (!eventId) {
      return NextResponse.json(
        { error: "Failed to log event" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: eventId });
  } catch (error) {
    console.error("[ThirdBrain Events POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to log event" },
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
    const type = searchParams.get("type");
    const source = searchParams.get("source");
    const days = parseInt(searchParams.get("days") || "7");
    const limit = parseInt(searchParams.get("limit") || "50");

    const since = new Date();
    since.setDate(since.getDate() - days);

    let query = supabaseAdmin
      .from("third_brain_events")
      .select("*")
      .eq("user_id", userId)
      .gte("occurred_at", since.toISOString())
      .order("occurred_at", { ascending: false })
      .limit(limit);

    if (type) {
      query = query.eq("type", type);
    }
    if (source) {
      query = query.eq("source", source);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[ThirdBrain Events GET] Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch events" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      events: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("[ThirdBrain Events GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}