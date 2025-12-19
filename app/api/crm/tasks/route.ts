import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      contact_id,
      title,
      description = null,
      due_at = null,
      priority = 2,
      deal_id = null,
    } = body || {};

    if (!contact_id || !title) {
      return NextResponse.json(
        { ok: false, error: "Missing contact_id or title" },
        { status: 400 }
      );
    }

    // Validate that contact exists and belongs to this user (ownership check)
    // Check ownership via owner_user_id (Clerk ID) - primary scoping method
    const { data: contactRow } = await supabaseAdmin
      .from("crm_contacts")
      .select("id")
      .eq("id", contact_id)
      .eq("owner_user_id", clerkUserId)
      .maybeSingle();

    if (!contactRow?.id) {
      return NextResponse.json(
        { ok: false, error: "Contact not found or not accessible" },
        { status: 404 }
      );
    }

    // Normalize priority (accept numeric or string)
    let priorityValue = priority;
    if (typeof priority === "string") {
      const priorityMap: Record<string, number> = { low: 1, med: 2, high: 3 };
      priorityValue = priorityMap[priority.toLowerCase()] || 2;
    }

    // Convert due_at date string to timestamptz if provided
    let dueAtValue: string | null = null;
    if (due_at) {
      try {
        // If it's just a date (YYYY-MM-DD), convert to timestamptz
        const date = new Date(due_at);
        if (!isNaN(date.getTime())) {
          dueAtValue = date.toISOString();
        }
      } catch {
        // Invalid date, leave as null
      }
    }

    const { data, error } = await supabaseAdmin
      .from("crm_tasks")
      .insert({
        owner_user_id: clerkUserId,
        contact_id,
        title: title.trim(),
        description,
        status: "pending",
        priority: priorityValue,
        due_at: dueAtValue,
        deal_id,
      })
      .select("*")
      .single();

    if (error) {
      console.error("[CreateCRMTask] Error:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { ok: true, task: data },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[CreateCRMTask] Error:", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
