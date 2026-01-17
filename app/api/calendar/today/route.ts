// Calendar Today API
// GET /api/calendar/today - Get today's calendar events

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getRuntimePhase } from "@/lib/env/runtime-phase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Build-time safety: Next can import/evaluate route modules during build.
  if (getRuntimePhase() === "build") {
    return NextResponse.json({ ok: true, buildPhase: true }, { status: 200 });
  }

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { getSupabaseAdminRuntimeClient } = await import(
      "@/lib/runtime/supabase.runtime"
    );

    // Note: The original code accessed SUPABASE_SERVICE_ROLE_KEY, so we use the admin client
    // If user-scoped access is preferred, we should switch to getSupabaseRuntimeClient()
    // However, the original code used process.env.SUPABASE_SERVICE_ROLE_KEY directly.
    const supabase = getSupabaseAdminRuntimeClient();

    // Get today's date range
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    // Try to fetch from calendar_events table
    const { data: events, error } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", userId)
      .gte("start_time", startOfDay)
      .lte("start_time", endOfDay)
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Calendar fetch error:", error);
      // Return empty if table doesn't exist or other error
      return NextResponse.json({ events: [], source: "none" });
    }

    // Transform to standard format
    const formattedEvents = (events || []).map(e => ({
      id: e.id,
      title: e.title || e.summary || "Untitled Event",
      start: e.start_time || e.start,
      end: e.end_time || e.end,
      type: e.event_type || e.type || "default",
      location: e.location,
      description: e.description,
      allDay: e.all_day || false,
    }));

    return NextResponse.json({
      events: formattedEvents,
      count: formattedEvents.length,
      date: new Date().toISOString().split("T")[0],
      source: "supabase",
    });

  } catch (err: any) {
    console.error("Calendar today error:", err);
    return NextResponse.json({ events: [], error: err.message });
  }
}