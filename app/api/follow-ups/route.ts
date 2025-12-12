import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const status = url.searchParams.get('status') ?? 'pending';
    const limit = Number(url.searchParams.get('limit') ?? '10');

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    // Build query
    let query = supabaseAdmin
      .from("follow_ups")
      .select("*")
      .eq("user_id", dbUserId)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    // Filter by status
    if (status === 'pending') {
      query = query.in("status", ["pending", "scheduled"]);
    } else if (status === 'completed' || status === 'sent') {
      query = query.in("status", ["sent", "responded", "completed"]);
    } else if (status !== 'all') {
      query = query.eq("status", status);
    }

    const { data: followUps, error } = await query;

    if (error) {
      console.error("[FollowUps] Query error:", error);
      return NextResponse.json({ error: "Failed to fetch follow-ups" }, { status: 500 });
    }

    return NextResponse.json({
      status,
      limit,
      followUps: (followUps || []).map(f => ({
        id: f.id,
        personName: f.person_name,
        person_name: f.person_name,
        company: f.company,
        email: f.email,
        phone: f.phone,
        type: f.type,
        status: f.status,
        priority: f.priority,
        dueDate: f.due_date,
        due_date: f.due_date,
        subject: f.subject,
        notes: f.notes,
        lastAction: f.last_action,
        lastActionDate: f.last_action_date,
        dealId: f.deal_id,
        createdAt: f.created_at,
      })),
    });
  } catch (err: any) {
    console.error("[FollowUps] Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

