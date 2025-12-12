// Pulse Live - Start Session
// POST /api/pulse-live/start
// app/api/pulse-live/start/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { supabaseServer } from "@/lib/supabase/server";
import { jsonOk, handleRouteError } from "@/lib/api/routeErrors";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireClerkUserId();
    const supabase = supabaseServer();

    const body = await request.json();
    const {
      source = "browser",
      calendar_event_id,
      linked_deal_id,
      participant_emails = [],
    } = body;

    // Validate source
    const validSources = ["browser", "upload", "platform", "transcript"];
    if (!validSources.includes(source)) {
      return jsonOk({ error: "Invalid source" }, { status: 400 });
    }

    // Create session
    const { data: session, error } = await supabase
      .from("call_sessions")
      .insert({
        owner_user_id: userId,
        source,
        calendar_event_id: calendar_event_id || null,
        linked_deal_id: linked_deal_id || null,
        participant_emails: participant_emails || [],
        status: "active",
      })
      .select()
      .single();

    if (error) {
      console.error("Session creation error:", error);
      return jsonOk({ error: "Failed to create session" }, { status: 500 });
    }

    return jsonOk({
      session_id: session.id,
      started_at: session.started_at,
    });
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}

