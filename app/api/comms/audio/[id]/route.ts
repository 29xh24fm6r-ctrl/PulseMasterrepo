// Audio Message API (Updated with speakers)
// app/api/comms/audio/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
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

    const messageId = params.id;

    // Get message
    const { data: message } = await supabaseAdmin
      .from("comm_messages")
      .select("*")
      .eq("id", messageId)
      .eq("user_id", dbUserId)
      .eq("source_type", "audio")
      .single();

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Get speakers
    const { data: speakers } = await supabaseAdmin
      .from("comm_message_speakers")
      .select("*, voice_profiles(contact_name, contact_id), voice_unknown_speakers(label)")
      .eq("comm_message_id", messageId)
      .order("start_time", { ascending: true });

    // Get responsibilities
    const { data: responsibilities } = await supabaseAdmin
      .from("email_responsibilities")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("comm_message_id", messageId)
      .order("created_at", { ascending: false });

    // Get promises
    const { data: promises } = await supabaseAdmin
      .from("email_promises")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("comm_message_id", messageId)
      .order("created_at", { ascending: false });

    // Get tasks (linked via responsibilities)
    const respIds = (responsibilities || []).map((r) => r.id);
    const { data: tasks } =
      respIds.length > 0
        ? await supabaseAdmin
            .from("email_tasks")
            .select("*")
            .eq("user_id", dbUserId)
            .is("thread_id", null)
            .order("due_at", { ascending: true, nullsLast: true })
        : { data: [] };

    // Get contacts for identification dropdown
    const { data: contacts } = await supabaseAdmin
      .from("contacts")
      .select("id, name")
      .eq("user_id", dbUserId)
      .order("name", { ascending: true })
      .limit(50);

    return NextResponse.json({
      message,
      speakers: speakers || [],
      responsibilities: responsibilities || [],
      promises: promises || [],
      tasks: tasks || [],
      contacts: contacts || [],
    });
  } catch (err: any) {
    console.error("[AudioMessage] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get audio message" },
      { status: 500 }
    );
  }
}
