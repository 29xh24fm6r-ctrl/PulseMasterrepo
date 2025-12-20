import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/relationships/summary
 * Returns a compact "home tile" view of relationships:
 * - counts (active, overdue, needing attention)
 * - top 3 attention targets
 * - recent interaction summary
 *
 * Bulletproof rules:
 * - never throws raw errors to client
 * - never returns sensitive content (only metadata)
 */
export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 200 });
    }

    // Resolve Clerk ID to DB user_id
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", clerkUserId)
      .maybeSingle();

    const dbUserId = userRow?.id ?? null;

    if (!dbUserId) {
      return NextResponse.json(
        { ok: false, error: "user_not_found" },
        { status: 200 }
      );
    }

    // Get contacts (left join with health so we get all contacts, even without health records)
    const { data: contacts, error } = await supabaseAdmin
      .from("crm_contacts")
      .select(
        `
        id,
        full_name,
        status,
        crm_relationship_health(
          last_interaction_at,
          next_suggested_checkin_at,
          score,
          momentum
        )
      `
      )
      .eq("user_id", dbUserId)
      .eq("status", "active")
      .limit(250);

    if (error) {
      console.error("[relationships/summary] Query error:", error);
      return NextResponse.json(
        { ok: false, error: "contacts_query_failed" },
        { status: 200 }
      );
    }

    const now = Date.now();

    const safeContacts =
      (contacts || [])
        .map((c: any) => {
          const health = Array.isArray(c.crm_relationship_health)
            ? c.crm_relationship_health[0]
            : c.crm_relationship_health || null;

          return {
            id: String(c.id),
            name: String(c.full_name || "Unknown"),
            last_contacted_at: health?.last_interaction_at ? String(health.last_interaction_at) : null,
            follow_up_due_at: health?.next_suggested_checkin_at ? String(health.next_suggested_checkin_at) : null,
            relationship_health: typeof health?.score === "number" ? health.score : null,
            momentum: health?.momentum || null,
          };
        })
        .filter((c) => c.id && c.name !== "Unknown") ?? [];

    const activeCount = safeContacts.length;

    const overdue = safeContacts.filter((c) => {
      if (!c.follow_up_due_at) return false;
      return new Date(c.follow_up_due_at).getTime() < now;
    }).length;

    // "Needs attention" heuristic: overdue follow-up OR stale last_contacted_at (> 30 days)
    const needsAttention = safeContacts.filter((c) => {
      const stale =
        c.last_contacted_at
          ? now - new Date(c.last_contacted_at).getTime() > 1000 * 60 * 60 * 24 * 30
          : true;
      const due =
        c.follow_up_due_at ? new Date(c.follow_up_due_at).getTime() < now : false;
      return stale || due;
    }).length;

    // Top 3 targets = most overdue / stalest
    const ranked = [...safeContacts].sort((a, b) => {
      const aDue = a.follow_up_due_at ? new Date(a.follow_up_due_at).getTime() : Infinity;
      const bDue = b.follow_up_due_at ? new Date(b.follow_up_due_at).getTime() : Infinity;

      if (aDue !== bDue) return aDue - bDue;

      const aLast = a.last_contacted_at ? new Date(a.last_contacted_at).getTime() : 0;
      const bLast = b.last_contacted_at ? new Date(b.last_contacted_at).getTime() : 0;
      return aLast - bLast; // oldest first
    });

    const top = ranked.slice(0, 3).map((c) => ({
      id: c.id,
      name: c.name,
      last_contacted_at: c.last_contacted_at,
      follow_up_due_at: c.follow_up_due_at,
      relationship_health: c.relationship_health,
      momentum: c.momentum,
    }));

    return NextResponse.json({
      ok: true,
      summary: {
        activeCount,
        overdue,
        needsAttention,
        top,
      },
    });
  } catch (err: any) {
    console.error("[relationships/summary] Error:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 200 });
  }
}

