import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  fetchEmails,
  classifyAndExtractActions,
  dedupeAndEnrich,
  ContactInfo,
  DetectedAction
} from "@/lib/pulse/email-intelligence";
import { generateAutoDraft } from "@/lib/pulse/email-drafter";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

// Increase timeout for this route
export const maxDuration = 120; // 2 minutes
export const dynamic = 'force-dynamic';

async function getRecentActions(userId: string): Promise<Set<string>> {
  const recentActions = new Set<string>();

  // Get Tasks
  const { data: tasks } = await getSupabaseAdminRuntimeClient()
    .from("tasks")
    .select("title")
    .eq("user_id", userId)
    .not("status", "eq", "done")
    .limit(100);

  (tasks || []).forEach((t: any) => recentActions.add(t.title.toLowerCase().trim()));

  // Get Follow-Ups
  const { data: followUps } = await getSupabaseAdminRuntimeClient()
    .from("follow_ups")
    .select("name")
    .eq("user_id", userId)
    .not("status", "eq", "sent")
    .limit(100);

  (followUps || []).forEach((f: any) => recentActions.add(f.name.toLowerCase().trim()));

  return recentActions;
}

async function getAllExistingContacts(userId: string): Promise<any[]> {
  const { data, error } = await getSupabaseAdminRuntimeClient()
    .from("contacts")
    .select("id, name, email")
    .eq("user_id", userId)
    .limit(2000);

  if (error) {
    console.error("Error fetching contacts:", error);
    return [];
  }

  return (data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    email: c.email || null,
    emails: c.email ? [c.email.toLowerCase()] : []
  }));
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { accessToken, refreshToken, maxResults = 50, daysBack = 7 } = body;

    if (!accessToken) {
      return NextResponse.json({ ok: false, error: "Missing access token" }, { status: 401 });
    }

    // 1. Fetch Emails
    const { emails, blockedCount, newAccessToken } = await fetchEmails(accessToken, refreshToken, maxResults, daysBack);

    // 2. Get Supabase Context
    const [existingContacts, existingActionsSet] = await Promise.all([
      getAllExistingContacts(userId),
      getRecentActions(userId)
    ]);
    const existingEmailsSet = new Set(existingContacts.flatMap((c) => c.emails));

    // 3. AI Analysis
    const { contacts, actions } = await classifyAndExtractActions(emails);

    // 4. Dedupe & Enrich
    const { newActions, newContacts } = await dedupeAndEnrich(
      userId,
      actions,
      contacts,
      existingEmailsSet,
      existingActionsSet,
      existingContacts
    );

    // 5. TRIGGER AUTO-DRAFTER
    let draftsCreated = 0;
    for (const action of newActions) {
      // Find corresponding email
      const originalEmail = emails.find(e => e.id === action.messageId);

      if (originalEmail && action.inSecondBrain) {
        // Only draft for known contacts (higher trust) or high confidence
        // For now, let's draft for EVERYTHING that is actionable to impress the user, 
        // as per "Jarvis vs Moron" request.

        // Generate Draft
        const draft = await generateAutoDraft(userId, originalEmail, action, {
          name: action.personName || "User", // fall back
        });

        if (draft) {
          draftsCreated++;
          // Attach draft ID to action for frontend references if needed
          (action as any).draftId = draft.id;
        }
      }
    }

    return NextResponse.json({
      ok: true,
      totalScanned: emails.length + blockedCount, // approx
      emailsAnalyzed: emails.length,
      blockedCount,
      existingContactsCount: existingContacts.length,
      duplicateActionsFiltered: actions.length - newActions.length,
      draftsCreated,
      emails: emails.map(e => ({
        id: e.id,
        fromName: e.fromName,
        subject: e.subject,
        snippet: e.body.substring(0, 100),
        date: e.date,
        hasAction: newActions.some(a => a.messageId === e.id),
      })),
      contacts: {
        realPeople: newContacts.filter((c) => c.classification === "real_person"),
        marketing: [],
        automated: [],
        uncertain: [],
        possibleDuplicates: [],
      },
      actions: {
        tasks: newActions.filter(a => a.type === "task"),
        followUps: newActions.filter(a => a.type === "follow_up"),
        commitments: newActions.filter(a => a.type === "commitment"),
        waitingOn: newActions.filter(a => a.type === "waiting_on"),
      },
      ...(newAccessToken && { newAccessToken }),
    });

  } catch (err: any) {
    console.error("scan error", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}