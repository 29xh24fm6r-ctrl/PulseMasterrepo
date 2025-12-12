// Comms Channel API
// app/api/comms/channel/[channelId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: { channelId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    const channelId = params.channelId;

    // Get channel
    const { data: channel } = await supabaseAdmin
      .from("comm_channels")
      .select("*")
      .eq("id", channelId)
      .eq("user_id", dbUserId)
      .single();

    if (!channel) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Get messages
    const { data: messages } = await supabaseAdmin
      .from("comm_messages")
      .select("*")
      .eq("channel_id", channelId)
      .order("occurred_at", { ascending: true });

    // Get responsibilities
    const messageIds = (messages || []).map((m) => m.id);
    const { data: responsibilities } =
      messageIds.length > 0
        ? await supabaseAdmin
            .from("email_responsibilities")
            .select("*")
            .eq("user_id", dbUserId)
            .in("comm_message_id", messageIds)
            .order("created_at", { ascending: false })
        : { data: [] };

    // Get promises
    const { data: promises } =
      messageIds.length > 0
        ? await supabaseAdmin
            .from("email_promises")
            .select("*")
            .eq("user_id", dbUserId)
            .in("comm_message_id", messageIds)
            .order("created_at", { ascending: false })
        : { data: [] };

    // Get tasks (linked via responsibilities or directly)
    const respIds = (responsibilities || []).map((r) => r.id);
    const { data: tasks } =
      respIds.length > 0
        ? await supabaseAdmin
            .from("email_tasks")
            .select("*")
            .eq("user_id", dbUserId)
            .is("thread_id", null) // Comms tasks don't have email threads
            .order("due_at", { ascending: true, nullsLast: true })
        : { data: [] };

    return NextResponse.json({
      channel,
      messages: messages || [],
      responsibilities: responsibilities || [],
      promises: promises || [],
      tasks: tasks || [],
    });
  } catch (err: any) {
    console.error("[CommsChannel] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get channel" },
      { status: 500 }
    );
  }
}

