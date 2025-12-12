// Email Overview API
// app/api/email/overview/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getOpenFollowupsForUser } from "@/lib/email/followups";
import { calculateEmailAttentionScore, getRiskLevel } from "@/lib/email/attention";

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
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. Urgent followups (due or overdue, top 5)
    const urgentFollowups = await getOpenFollowupsForUser(userId, {
      before: tomorrow,
    });

    const urgentFollowupsWithDetails = await Promise.all(
      urgentFollowups.slice(0, 5).map(async (f) => {
        const { data: thread } = await supabaseAdmin
          .from("email_threads")
          .select("*")
          .eq("id", f.threadId)
          .single();

        return {
          id: f.id,
          threadId: f.threadId,
          subject: thread?.subject || "No subject",
          from: thread?.last_from || thread?.last_message_from || "Unknown",
          responseDueAt: f.responseDueAt,
          isOverdue: new Date(f.responseDueAt) < now,
        };
      })
    );

    // 2. Open email tasks (top 10)
    const { data: openTasks } = await supabaseAdmin
      .from("email_tasks")
      .select("*, email_threads(subject, last_from)")
      .eq("user_id", dbUserId)
      .eq("status", "open")
      .order("due_at", { ascending: true, nullsLast: true })
      .order("priority", { ascending: false })
      .limit(10);

    // 3. Waiting on others (threads where last message from you and no reply in 3+ days)
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: threads } = await supabaseAdmin
      .from("email_threads")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("status", "open")
      .lte("last_message_at", threeDaysAgo.toISOString());

    // Check if last message was from user
    const waitingOnOthers: any[] = [];
    for (const thread of threads || []) {
      const { data: lastMessage } = await supabaseAdmin
        .from("email_messages")
        .select("is_incoming")
        .eq("thread_id", thread.id)
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastMessage && !lastMessage.is_incoming) {
        waitingOnOthers.push({
          id: thread.id,
          subject: thread.subject,
          to: thread.last_to,
          lastMessageAt: thread.last_message_at,
        });
      }
    }

    // 4. Low priority feed (newsletters/promos)
    const { data: lowPriorityThreads } = await supabaseAdmin
      .from("email_threads")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("importance", "low")
      .order("last_message_at", { ascending: false })
      .limit(20);

    // Get attention score
    const attentionScore = await calculateEmailAttentionScore(userId);

    // Get suggested tasks
    const { data: suggestedTasks } = await supabaseAdmin
      .from("email_tasks")
      .select("*, email_threads(subject, last_message_from)")
      .eq("user_id", dbUserId)
      .eq("status", "suggested")
      .order("confidence", { ascending: false })
      .limit(10);

    // Get broken/at-risk promises
    const { data: brokenPromises } = await supabaseAdmin
      .from("email_promises")
      .select("*, email_threads(subject)")
      .eq("user_id", dbUserId)
      .in("status", ["open", "broken"])
      .lt("promise_due_at", now.toISOString())
      .order("promise_due_at", { ascending: true })
      .limit(10);

    return NextResponse.json({
      todayDate: now.toISOString().split("T")[0],
      attentionScore: {
        score: attentionScore.score,
        riskLevel: getRiskLevel(attentionScore.score),
        breakdown: attentionScore.breakdown,
      },
      urgentFollowups: urgentFollowupsWithDetails,
      openEmailTasks: (openTasks || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        dueAt: t.due_at,
        priority: t.priority,
        threadSubject: t.email_threads?.subject,
        threadFrom: t.email_threads?.last_from,
      })),
      suggestedTasks: (suggestedTasks || []).map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        dueAt: t.due_at,
        priority: t.priority,
        confidence: t.confidence,
        threadSubject: t.email_threads?.subject,
        threadFrom: t.email_threads?.last_message_from,
      })),
      waitingOnOthers: waitingOnOthers.slice(0, 10),
      lowPriorityFeed: (lowPriorityThreads || []).map((t) => ({
        id: t.id,
        subject: t.subject,
        from: t.last_from,
        lastMessageAt: t.last_message_at,
      })),
      brokenPromises: (brokenPromises || []).map((p: any) => ({
        id: p.id,
        promiseText: p.promise_text,
        promiseDueAt: p.promise_due_at,
        status: p.status,
        threadSubject: p.email_threads?.subject,
      })),
    });
  } catch (err: any) {
    console.error("[EmailOverview] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get email overview" },
      { status: 500 }
    );
  }
}

