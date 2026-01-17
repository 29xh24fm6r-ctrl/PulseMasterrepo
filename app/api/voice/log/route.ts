import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminRuntimeClient, getSupabaseRuntimeClient } from "@/lib/runtime/supabase.runtime";

import { createAdminClient } from "../_lib/env";

// POST /api/voice/log - Log voice interaction or session
export async function POST(req: NextRequest) {
  const supabase = createAdminSupabase();
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, sessionId, messages, message, duration } = body;

    if (type === "session" && messages) {
      // Log complete session
      const userMessages = messages.filter((m: any) => m.role === "user");
      const summary = `Voice session: ${userMessages
        .map((m: any) => m.content?.substring(0, 50))
        .filter(Boolean)
        .join("; ")}`;

      await supabase.from("third_brain_events").insert({
        user_id: userId,
        type: "voice_session",
        source: "realtime_voice",
        title: `Voice Session (${messages.length} messages)`,
        summary: summary.substring(0, 500),
        raw_payload: {
          session_id: sessionId,
          message_count: messages.length,
          duration_ms: duration,
          transcript: messages,
        },
        occurred_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, logged: "session" });
    } else if (type === "message" && message) {
      // Log individual message
      await supabase.from("third_brain_events").insert({
        user_id: userId,
        type: "voice_interaction",
        source: "realtime_voice",
        title: message.role === "user" ? "Voice Command" : "Pulse Response",
        summary: message.content?.substring(0, 500),
        raw_payload: {
          session_id: sessionId,
          role: message.role,
          content: message.content,
        },
        occurred_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });

      // Save user commands as searchable memories
      if (message.role === "user" && message.content?.length > 10) {
        await supabase.from("third_brain_memories").insert({
          user_id: userId,
          category: "voice",
          content: `Voice command: "${message.content}"`,
          importance: 3,
          created_at: new Date().toISOString(),
        });
      }

      return NextResponse.json({ success: true, logged: "message" });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error: any) {
    console.error("[Voice Log] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/voice/log - Get voice history
export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");

    const { data: sessions } = await supabase
      .from("third_brain_events")
      .select("*")
      .eq("user_id", userId)
      .in("type", ["voice_session", "voice_interaction"])
      .order("occurred_at", { ascending: false })
      .limit(limit);

    return NextResponse.json({ sessions: sessions || [] });
  } catch (error: any) {
    console.error("[Voice Log] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
