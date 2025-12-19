import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCrmPerson } from "@/lib/crm/getCrmPerson";
import { resolveCanonicalContactId } from "@/lib/crm/canonical";
import { getEmailThreadsForContact } from "@/lib/email/person";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Contact Intelligence Cockpit - Aggregate endpoint
 * Returns all data needed for the contact intelligence cockpit in one call
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ personId: string }> | { personId: string } }
) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = params instanceof Promise ? await params : params;
  const personId = resolvedParams.personId;

  if (!personId) {
    return NextResponse.json({ error: "Missing personId" }, { status: 400 });
  }

  // Resolve user UUID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkUserId)
    .single();

  if (!userRow?.id) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const dbUserId = userRow.id;

  // Resolve to canonical contact ID
  let canonicalId = personId;
  try {
    const resolved = await resolveCanonicalContactId(personId, clerkUserId);
    canonicalId = resolved.canonicalId;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Contact not found" },
      { status: 404 }
    );
  }

  // Fetch contact
  const { contact, error: contactError } = await getCrmPerson({
    contactId: canonicalId,
    clerkUserId,
    dbUserId,
  });

  if (!contact || contact.status !== "active") {
    return NextResponse.json(
      { error: contactError || "Contact not found" },
      { status: 404 }
    );
  }

  // Fetch all data in parallel
  const [
    intelResult,
    eventsResult,
    tasksResult,
    notesResult,
    dealsResult,
    healthResult,
    factsResult,
  ] = await Promise.allSettled([
    // Intel snapshot
    supabaseAdmin
      .from("crm_contact_intel")
      .select("*")
      .eq("contact_id", canonicalId)
      .eq("owner_user_id", clerkUserId)
      .single(),
    
    // Events (timeline)
    supabaseAdmin
      .from("crm_contact_events")
      .select("*")
      .eq("contact_id", canonicalId)
      .eq("owner_user_id", clerkUserId)
      .order("occurred_at", { ascending: false })
      .limit(50),
    
    // Tasks
    supabaseAdmin
      .from("crm_tasks")
      .select("id, title, status, priority, due_at, created_at")
      .eq("owner_user_id", clerkUserId)
      .eq("contact_id", canonicalId)
      .in("status", ["pending", "in_progress", "open"])
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(20),
    
    // Notes (from interactions)
    supabaseAdmin
      .from("crm_interactions")
      .select("id, type, occurred_at, subject, summary")
      .eq("user_id", dbUserId)
      .eq("contact_id", canonicalId)
      .eq("type", "note")
      .order("occurred_at", { ascending: false })
      .limit(20),
    
    // Deals
    supabaseAdmin
      .from("crm_deals")
      .select("id, name, stage, amount, close_date, created_at")
      .eq("user_id", dbUserId)
      .eq("primary_contact_id", canonicalId)
      .order("updated_at", { ascending: false })
      .limit(10),
    
    // Relationship health
    supabaseAdmin
      .from("crm_relationship_health")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("contact_id", canonicalId)
      .single(),
    
    // Facts
    supabaseAdmin
      .from("crm_contact_facts")
      .select("*")
      .eq("owner_user_id", clerkUserId)
      .eq("contact_id", canonicalId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  // Extract data with safe fallbacks
  const intel = intelResult.status === "fulfilled" && intelResult.value.data
    ? intelResult.value.data
    : null;
  
  const events = eventsResult.status === "fulfilled" && eventsResult.value.data
    ? eventsResult.value.data
    : [];
  
  const tasks = tasksResult.status === "fulfilled" && tasksResult.value.data
    ? tasksResult.value.data
    : [];
  
  const notes = notesResult.status === "fulfilled" && notesResult.value.data
    ? notesResult.value.data
    : [];
  
  const deals = dealsResult.status === "fulfilled" && dealsResult.value.data
    ? dealsResult.value.data
    : [];
  
  const health = healthResult.status === "fulfilled" && healthResult.value.data
    ? healthResult.value.data
    : null;
  
  const facts = factsResult.status === "fulfilled" && factsResult.value.data
    ? factsResult.value.data
    : [];

  // Fetch emails if contact has email
  let emails: any[] = [];
  let hasNeedsResponse = false;
  if (contact.primary_email && dbUserId) {
    try {
      emails = await getEmailThreadsForContact({
        dbUserId,
        email: contact.primary_email,
        limit: 25,
      });
      
      // Check if any email thread has needs_response flag
      // Try with owner_user_id first
      {
        const { data: needsResponseThreads } = await supabaseAdmin
          .from("email_threads")
          .select("id")
          .eq("owner_user_id", clerkUserId)
          .eq("contact_email", contact.primary_email.toLowerCase())
          .eq("needs_response", true)
          .limit(1);
        
        if (needsResponseThreads && needsResponseThreads.length > 0) {
          hasNeedsResponse = true;
        }
      }
      
      // Fallback: check with user_id if owner_user_id doesn't exist
      if (!hasNeedsResponse && dbUserId) {
        const { data: needsResponseThreads } = await supabaseAdmin
          .from("email_threads")
          .select("id")
          .eq("user_id", dbUserId)
          .eq("contact_email", contact.primary_email.toLowerCase())
          .eq("needs_response", true)
          .limit(1);
        
        if (needsResponseThreads && needsResponseThreads.length > 0) {
          hasNeedsResponse = true;
        }
      }
      
      // Also check needs_followup as fallback
      if (!hasNeedsResponse && dbUserId) {
        const { data: followupThreads } = await supabaseAdmin
          .from("email_threads")
          .select("id")
          .eq("user_id", dbUserId)
          .eq("contact_email", contact.primary_email.toLowerCase())
          .eq("needs_followup", true)
          .limit(1);
        
        if (followupThreads && followupThreads.length > 0) {
          hasNeedsResponse = true;
        }
      }
    } catch (err) {
      console.error("[Cockpit] Email fetch error:", err);
    }
  }

  // Calculate stats (match v2 spec)
  const stats = {
    emails: emails.length,
    notes: notes.length,
    tasks: tasks.length,
    meetings: events.filter((e: any) => e.event_type === "meeting").length,
  };

  // Build relationship data (match v2 spec)
  const relationship = {
    score: intel?.relationship_score ?? health?.score ?? 50,
    trend30d: intel?.relationship_trend_30d ?? 0, // number, not text
    drivers: intel?.key_facts?.slice(0, 3).map((f: any) => f.fact || f) || [],
    flags: intel?.risk_flags || [],
  };

  // Calculate next actions (match v2 spec)
  const openLoops = tasks.filter((t: any) => {
    if (!t.due_at) return false;
    return new Date(t.due_at) < new Date();
  });

  const lastTouch = events.length > 0 ? events[0] : null;
  const lastTouchAt = lastTouch?.occurred_at || null;
  const lastTouchType = lastTouch?.event_type || null;
  
  const staleNoTouchDays = lastTouchAt
    ? Math.floor((Date.now() - new Date(lastTouchAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const next = {
    lastTouchAt,
    lastTouchType,
    nextTouchDueAt: intel?.next_touch_due_at || null,
    recommendedNextAction: intel?.suggested_next_actions?.[0] ? {
      type: intel.suggested_next_actions[0].type || intel.suggested_next_actions[0].action || "followup",
      label: intel.suggested_next_actions[0].label || intel.suggested_next_actions[0].action || "Follow up",
      reason: intel.suggested_next_actions[0].reason || "",
    } : null,
    openLoops: {
      overdueTasks: openLoops.length,
      unansweredInbound: emails.filter((e: any) => e.unread && (e.direction === "inbound" || !e.direction)).length,
      staleNoTouchDays: staleNoTouchDays && staleNoTouchDays > 21 ? staleNoTouchDays : 0,
    },
  };

  // Build highlights (match v2 spec)
  const highlights = {
    keyFacts: facts.filter((f: any) => f.pinned).slice(0, 5).map((f: any) => ({
      id: f.id,
      fact: f.fact,
      category: f.category,
      pinned: f.pinned,
      confidence: f.confidence,
    })),
    moments: events.slice(0, 5).map((e: any) => ({
      id: e.id,
      event_type: e.event_type,
      occurred_at: e.occurred_at,
      title: e.title,
      body: e.body,
    })),
    topics: intel?.top_topics || [],
  };

  // Build comms data (match v2 spec)
  const lastInbound = emails.find((e: any) => e.direction === "inbound" || (!e.direction && e.from !== contact.primary_email));
  const lastOutbound = emails.find((e: any) => e.direction === "outbound" || (!e.direction && e.from === contact.primary_email));
  
  // Calculate response latency in hours
  let responseLatencyHours: number | null = null;
  if (lastInbound && lastOutbound) {
    const inboundTime = new Date(lastInbound.sentAt || lastInbound.lastAt || 0).getTime();
    const outboundTime = new Date(lastOutbound.sentAt || lastOutbound.lastAt || 0).getTime();
    if (outboundTime > inboundTime) {
      responseLatencyHours = (outboundTime - inboundTime) / (1000 * 60 * 60);
    }
  }
  
  const comms = {
    threads: emails.slice(0, 10).map((e: any) => ({
      threadId: e.threadId || e.id,
      subject: e.subject || "No subject",
      lastAt: e.lastAt || e.sentAt || e.created_at,
      lastDirection: e.direction || (e.from === contact.primary_email ? "outbound" : "inbound"),
      messageCount: e.messageCount || 1,
    })),
    lastInbound,
    lastOutbound,
    responseLatencyHours,
  };

  // Fetch intel sources (top verified/probable)
  const { data: intelSources } = await supabaseAdmin
    .from("crm_contact_intel_sources")
    .select("*")
    .eq("contact_id", canonicalId)
    .eq("owner_user_id", clerkUserId)
    .gte("match_score", 60) // Only verified/probable
    .order("match_score", { ascending: false })
    .order("seen_at", { ascending: false })
    .limit(10);

  // AI summary (match v2 spec)
  const ai = {
    summary: intel?.ai_summary || null,
    suggestedActions: (intel?.suggested_next_actions || []).map((a: any) => ({
      label: a.label || a.action || "Action",
      type: a.type || a.action || "followup",
      payload: a.payload || null,
    })),
    messageDrafts: intel?.suggested_message_drafts || [], // TODO: Generate with LLM if available
  };

  // Intel data for UI
  const intelData = {
    sources: (intelSources || []).slice(0, 3).map((s: any) => ({
      id: s.id,
      title: s.title,
      source_url: s.source_url,
      source_type: s.source_type,
      match_score: s.match_score,
      match_evidence: s.match_evidence,
      published_at: s.published_at,
    })),
  };

  // Build unified timeline: merge events, emails, tasks, notes
  const timelineItems: Array<{
    id: string;
    type: "email" | "task" | "note" | "event";
    occurredAt: string;
    title: string;
    subtitle?: string;
    summary?: string;
  }> = [];

  // Add events (already in correct format)
  events.forEach((e: any) => {
    timelineItems.push({
      id: e.id,
      type: "event",
      occurredAt: e.occurred_at || new Date().toISOString(),
      title: e.title || "Event",
      subtitle: e.event_type?.replace("_", " "),
      summary: e.body || "",
    });
  });

  // Add emails
  emails.forEach((e: any) => {
    timelineItems.push({
      id: e.id || e.threadId,
      type: "email",
      occurredAt: e.lastMessageAt || new Date().toISOString(),
      title: e.subject || "(No subject)",
      subtitle: `From: ${e.from}`,
      summary: e.snippet || "",
    });
  });

  // Add tasks
  tasks.forEach((t: any) => {
    timelineItems.push({
      id: t.id,
      type: "task",
      occurredAt: t.created_at || new Date().toISOString(),
      title: t.title || "Task",
      subtitle: `Status: ${t.status || "open"}`,
      summary: t.description || "",
    });
  });

  // Add notes
  notes.forEach((n: any) => {
    timelineItems.push({
      id: n.id,
      type: "note",
      occurredAt: n.occurred_at || n.created_at || new Date().toISOString(),
      title: n.subject || n.summary || "Note",
      subtitle: "Note",
      summary: n.summary || n.subject || "",
    });
  });

  // Sort by occurredAt (newest first)
  timelineItems.sort((a, b) => {
    const timeA = new Date(a.occurredAt).getTime();
    const timeB = new Date(b.occurredAt).getTime();
    return timeB - timeA;
  });

  return NextResponse.json({
    profile: {
      ...contact,
      hasNeedsResponse,
    },
    stats,
    relationship,
    next,
    highlights,
    timeline: timelineItems,
    comms,
    tasks: tasks.map((t: any) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      due_date: t.due_at,
      priority: t.priority,
    })),
    notes: notes.map((n: any) => ({
      id: n.id,
      body: n.summary || n.subject || "",
      created_at: n.occurred_at,
      tags: n.tags || null,
    })),
    deals: deals.map((d: any) => ({
      id: d.id,
      name: d.name,
      stage: d.stage,
      amount: d.amount,
      closeDate: d.close_date,
    })),
    ai,
    intel: intelData,
  });
}

