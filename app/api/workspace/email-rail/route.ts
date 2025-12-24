import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { resolveEmailThread } from "@/lib/email/emailResolutionEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Email Rail API
 * 
 * Returns email triage items with resolution states.
 * V1: Mock data using resolution engine
 * V2+: Wire to real email_threads + email_resolution tables
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // V1: Mock payload using resolution engine logic
  // V2: Query email_resolution table joined with email_threads
  
  const mockThreads = [
    {
      id: "thread_1",
      from: "Client A",
      subject: "Confirm timeline for deliverable",
      snippet: "Can you confirm we're still on for Friday?",
      hasQuestion: true,
      hasDeadline: true,
      waitingOnOther: false,
    },
    {
      id: "thread_2",
      from: "Prospect B",
      subject: "Pricing + next steps",
      snippet: "We're deciding this week. Can you send terms?",
      hasQuestion: true,
      hasDeadline: false,
      waitingOnOther: false,
    },
    {
      id: "thread_3",
      from: "Internal",
      subject: "Need your input on doc",
      snippet: "Can you review and approve by EOD?",
      hasQuestion: false,
      hasDeadline: true,
      waitingOnOther: false,
      hasRequest: true,
    },
    {
      id: "thread_4",
      from: "Vendor",
      subject: "Invoice question",
      snippet: "We need confirmation of PO number.",
      hasQuestion: true,
      hasDeadline: false,
      waitingOnOther: false,
    },
  ];

  // Use resolution engine to determine states
  const triage = mockThreads
    .map((thread) => {
      const resolution = resolveEmailThread({
        hasQuestion: thread.hasQuestion,
        hasDeadline: thread.hasDeadline,
        waitingOnOther: thread.waitingOnOther,
        hasRequest: thread.hasRequest || false,
      });

      // Convert resolution state to UI urgency
      const urgency = 
        resolution.state === "needs_user_action" && resolution.confidence > 85
          ? "now" as const
          : resolution.state === "needs_user_action"
          ? "soon" as const
          : "later" as const;

      // Map resolution state to suggested action
      const suggestedAction =
        resolution.state === "needs_user_action"
          ? ("reply" as const)
          : resolution.state === "converted_to_task"
          ? ("convert_to_task" as const)
          : resolution.state === "scheduled_follow_up"
          ? ("schedule" as const)
          : ("archive" as const);

      return {
        id: thread.id,
        from: thread.from,
        subject: thread.subject,
        snippet: thread.snippet,
        urgency,
        suggestedAction,
        why: resolution.why,
        evidence: resolution.evidence,
        href: `/calls?tab=email&thread=${thread.id}`,
        state: resolution.state,
      };
    })
    .filter((item) => item.state !== "resolved" && item.state !== "waiting_on_other");

  // Calculate summary stats
  const needsReply = triage.filter((t) => t.state === "needs_user_action").length;
  const waitingOnOthers = mockThreads.filter((t) => 
    resolveEmailThread({ hasQuestion: t.hasQuestion, hasDeadline: t.hasDeadline, waitingOnOther: t.waitingOnOther }).state === "waiting_on_other"
  ).length;

  const summary = {
    inboxBacklog: triage.length + waitingOnOthers,
    needsReply,
    waitingOnOthers,
    scheduled: 0, // V2: Count from email_followups
    inboxZeroProgress: triage.length > 0 ? Math.round((needsReply / triage.length) * 100) : 100,
  };

  return NextResponse.json({ ok: true, summary, triage });
}

