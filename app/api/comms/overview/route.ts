// Unified Communications Overview API
// app/api/comms/overview/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { calculateUnifiedAttentionScore } from "@/lib/email/attention";
import { getOpenFollowupsForUser } from "@/lib/email/followups";

export async function GET(req: NextRequest) {
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

    const now = new Date();

    // 1. Get unified attention score
    const attentionScore = await calculateUnifiedAttentionScore(userId);

    // 2. Build urgent items list (across all channels)
    const urgentItems: Array<{
      source: "email" | "sms" | "call" | "audio";
      type: "followup" | "promise" | "task";
      label: string;
      due_at?: string | null;
      link?: string | null;
    }> = [];

    // Email followups
    const followups = await getOpenFollowupsForUser(userId, {
      before: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    });

    for (const followup of followups.slice(0, 5)) {
      const thread = followup.thread || {};
      // Try to get contact ID from thread
      let contactId: string | null = null;
      if (thread.last_from) {
        const emailMatch = thread.last_from.match(/<(.+)>/);
        const email = emailMatch ? emailMatch[1] : thread.last_from;
        const { data: contact } = await supabaseAdmin
          .from("contacts")
          .select("id")
          .eq("user_id", dbUserId)
          .ilike("email", `%${email}%`)
          .maybeSingle();
        contactId = contact?.id || null;
      }
      urgentItems.push({
        source: "email",
        type: "followup",
        label: `${thread.last_from || "Unknown"}: ${thread.subject || "No subject"}`,
        due_at: followup.responseDueAt,
        link: `/email/command-center`,
        contactId: contactId,
      });
    }

    // Email promises
    const { data: emailPromises } = await supabaseAdmin
      .from("email_promises")
      .select("promise_text, promise_due_at, email_threads(subject)")
      .eq("user_id", dbUserId)
      .eq("status", "open")
      .is("comm_message_id", null)
      .lt("promise_due_at", new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString())
      .order("promise_due_at", { ascending: true })
      .limit(5);

    for (const promise of emailPromises || []) {
      // Try to get contact ID from thread
      let contactId: string | null = null;
      if (promise.email_threads) {
        const thread = promise.email_threads as any;
        if (thread.last_from) {
          const emailMatch = thread.last_from.match(/<(.+)>/);
          const email = emailMatch ? emailMatch[1] : thread.last_from;
          const { data: contact } = await supabaseAdmin
            .from("contacts")
            .select("id")
            .eq("user_id", dbUserId)
            .ilike("email", `%${email}%`)
            .maybeSingle();
          contactId = contact?.id || null;
        }
      }
      urgentItems.push({
        source: "email",
        type: "promise",
        label: promise.promise_text,
        due_at: promise.promise_due_at,
        link: `/email/command-center`,
        contactId: contactId,
      });
    }

    // Comms promises (SMS + calls + audio)
    const { data: commsPromises } = await supabaseAdmin
      .from("email_promises")
      .select("promise_text, promise_due_at, comm_message_id, comm_messages(from_identity, source_type, id)")
      .eq("user_id", dbUserId)
      .eq("status", "open")
      .not("comm_message_id", "is", null)
      .lt("promise_due_at", new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString())
      .order("promise_due_at", { ascending: true })
      .limit(10);

    for (const promise of commsPromises || []) {
      const msg = promise.comm_messages || {};
      let source: "sms" | "call" | "audio" = "call";
      let link = "/comms/command-center";
      if (msg.source_type === "sms") {
        source = "sms";
      } else if (msg.source_type === "audio") {
        source = "audio";
        link = `/comms/audio/${promise.comm_message_id}`;
      }
      // Try to get contact ID from comm message
      let contactId: string | null = null;
      if (promise.comm_message_id) {
        const { data: speaker } = await supabaseAdmin
          .from("comm_message_speakers")
          .select("speaker_profile_id, voice_profiles(contact_id)")
          .eq("comm_message_id", promise.comm_message_id)
          .not("speaker_profile_id", "is", null)
          .maybeSingle();
        contactId = speaker?.voice_profiles
          ? (speaker.voice_profiles as any).contact_id
          : null;
      }

      urgentItems.push({
        source,
        type: "promise",
        label: `${msg.from_identity || "Unknown"}: ${promise.promise_text}`,
        due_at: promise.promise_due_at,
        link,
        contactId: contactId,
      });
    }

    // Overdue tasks (email + comms + audio)
    const { data: overdueTasks } = await supabaseAdmin
      .from("email_tasks")
      .select("title, due_at, email_threads(subject), comm_messages(source_type, from_identity, id)")
      .eq("user_id", dbUserId)
      .eq("status", "open")
      .not("due_at", "is", null)
      .lt("due_at", now.toISOString())
      .order("due_at", { ascending: true })
      .limit(10);

    for (const task of overdueTasks || []) {
      let source: "email" | "sms" | "call" | "audio" = "email";
      let link = "/email/command-center";
      if (task.comm_messages) {
        if (task.comm_messages.source_type === "sms") {
          source = "sms";
          link = "/comms/command-center";
        } else if (task.comm_messages.source_type === "call") {
          source = "call";
          link = "/comms/command-center";
        } else if (task.comm_messages.source_type === "audio") {
          source = "audio";
          link = `/comms/audio/${task.comm_messages.id}`;
        }
      }
      // Try to get contact ID from comm message
      let contactId: string | null = null;
      if (task.comm_messages?.id) {
        const { data: speaker } = await supabaseAdmin
          .from("comm_message_speakers")
          .select("speaker_profile_id, voice_profiles(contact_id)")
          .eq("comm_message_id", task.comm_messages.id)
          .not("speaker_profile_id", "is", null)
          .maybeSingle();
        contactId = speaker?.voice_profiles
          ? (speaker.voice_profiles as any).contact_id
          : null;
      }

      urgentItems.push({
        source,
        type: "task",
        label: task.title,
        due_at: task.due_at,
        link,
        contactId: contactId,
      });
    }

    // 3. SMS feed
    const { data: smsMessages } = await supabaseAdmin
      .from("comm_messages")
      .select("*, comm_channels(label)")
      .eq("user_id", dbUserId)
      .eq("source_type", "sms")
      .order("occurred_at", { ascending: false })
      .limit(20);

    // Group by channel and get latest per channel
    const smsByChannel = new Map();
    for (const msg of smsMessages || []) {
      const channelId = msg.channel_id;
      if (!smsByChannel.has(channelId)) {
        smsByChannel.set(channelId, msg);
      }
    }

    const smsFeed = Array.from(smsByChannel.values()).map((msg: any) => {
      // Check if has open responsibilities
      return {
        contact: msg.from_identity || msg.to_identity || "Unknown",
        lastMessageSnippet: msg.body?.substring(0, 100) || "",
        occurred_at: msg.occurred_at,
        channelId: msg.channel_id,
        hasOpenResponsibilities: false, // Will be populated below
      };
    });

    // Check responsibilities for SMS messages
    const smsMessageIds = (smsMessages || []).map((m: any) => m.id);
    if (smsMessageIds.length > 0) {
      const { data: smsResps } = await supabaseAdmin
        .from("email_responsibilities")
        .select("comm_message_id")
        .eq("user_id", dbUserId)
        .eq("status", "open")
        .in("comm_message_id", smsMessageIds);

      const respMessageIds = new Set((smsResps || []).map((r: any) => r.comm_message_id));
      for (const feedItem of smsFeed) {
        const msg = smsMessages?.find((m: any) => m.channel_id === feedItem.channelId);
        if (msg && respMessageIds.has(msg.id)) {
          feedItem.hasOpenResponsibilities = true;
        }
      }
    }

    // 4. Call feed
    const { data: callMessages } = await supabaseAdmin
      .from("comm_messages")
      .select("*, comm_channels(label)")
      .eq("user_id", dbUserId)
      .eq("source_type", "call")
      .order("occurred_at", { ascending: false })
      .limit(20);

    const callByChannel = new Map();
    for (const msg of callMessages || []) {
      const channelId = msg.channel_id;
      if (!callByChannel.has(channelId)) {
        callByChannel.set(channelId, msg);
      }
    }

    const callFeed = Array.from(callByChannel.values()).map((msg: any) => {
      return {
        contact: msg.from_identity || msg.to_identity || "Unknown",
        summarySnippet: msg.body?.substring(0, 150) || msg.subject || "",
        occurred_at: msg.occurred_at,
        channelId: msg.channel_id,
        hasOpenResponsibilities: false,
      };
    });

    // Check responsibilities for call messages
    const callMessageIds = (callMessages || []).map((m: any) => m.id);
    if (callMessageIds.length > 0) {
      const { data: callResps } = await supabaseAdmin
        .from("email_responsibilities")
        .select("comm_message_id")
        .eq("user_id", dbUserId)
        .eq("status", "open")
        .in("comm_message_id", callMessageIds);

      const respMessageIds = new Set((callResps || []).map((r: any) => r.comm_message_id));
      for (const feedItem of callFeed) {
        const msg = callMessages?.find((m: any) => m.channel_id === feedItem.channelId);
        if (msg && respMessageIds.has(msg.id)) {
          feedItem.hasOpenResponsibilities = true;
        }
      }
    }

    return NextResponse.json({
      attentionScore: {
        score: attentionScore.score,
        riskLevel: attentionScore.score >= 60 ? "High" : attentionScore.score >= 30 ? "Moderate" : "Low",
        breakdown: attentionScore.breakdown,
        comms: attentionScore.comms,
      },
      urgentItems: urgentItems.slice(0, 15),
      smsFeed: smsFeed.slice(0, 10),
      callFeed: callFeed.slice(0, 10),
      audioFeed: audioFeed.slice(0, 10),
    });
  } catch (err: any) {
    console.error("[CommsOverview] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get comms overview" },
      { status: 500 }
    );
  }
}

