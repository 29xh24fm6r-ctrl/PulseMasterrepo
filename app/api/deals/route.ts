// Deals API - List and Create
// app/api/deals/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

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

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const stage = searchParams.get("stage");

    let query = supabaseAdmin
      .from("deals")
      .select("*")
      .eq("user_id", dbUserId)
      .order("updated_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }
    if (stage) {
      query = query.eq("stage", stage);
    }

    const { data: deals } = await query;

    return NextResponse.json(deals || []);
  } catch (err: any) {
    console.error("[Deals] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get deals" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { name, description, value, status, stage, priority, due_date, participants } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    // Create deal
    const { data: deal } = await supabaseAdmin
      .from("deals")
      .insert({
        user_id: dbUserId,
        name,
        description: description || null,
        value: value || null,
        status: status || "active",
        stage: stage || null,
        priority: priority || "medium",
        due_date: due_date || null,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (!deal) {
      return NextResponse.json({ error: "Failed to create deal" }, { status: 500 });
    }

    // Add participants if provided
    if (participants && Array.isArray(participants)) {
      for (const participant of participants) {
        await supabaseAdmin.from("deal_participants").insert({
          deal_id: deal.id,
          contact_id: participant.contact_id || null,
          role: participant.role || null,
          importance: participant.importance || 0.5,
        });
      }
    }

    return NextResponse.json({ id: deal.id, success: true });
  } catch (err: any) {
    console.error("[Deals] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create deal" },
      { status: 500 }
    );
  }
}
