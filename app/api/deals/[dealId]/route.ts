// Deal Detail API
// app/api/deals/[dealId]/route.ts
// Sprint 3B: Uses canonical resolveSupabaseUser()
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// GET - Get deal by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ dealId: string }> | { dealId: string } }
) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
    const resolvedParams = params instanceof Promise ? await params : params;
    const dealId = resolvedParams.dealId;

    const { data: deal, error } = await supabaseAdmin
      .from("deals")
      .select("*, deal_participants(*, contacts(*))")
      .eq("id", dealId)
      .eq("user_id", supabaseUserId)
      .single();

    if (error || !deal) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    return NextResponse.json(deal);
  } catch (err: any) {
    console.error("[DealDetail] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get deal" },
      { status: 500 }
    );
  }
}

// PATCH - Update deal
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ dealId: string }> | { dealId: string } }
) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
    const resolvedParams = params instanceof Promise ? await params : params;
    const dealId = resolvedParams.dealId;

    const body = await req.json();
    const { name, company, amount, stage, close_date, notes } = body;

    // Ignore user_id if provided (server sets it)
    if (body.user_id) {
      delete body.user_id;
    }

    // Verify ownership
    const { data: existing, error: checkError } = await supabaseAdmin
      .from("deals")
      .select("id")
      .eq("id", dealId)
      .eq("user_id", supabaseUserId)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // Build update payload
    const updatePayload: any = {};
    if (name !== undefined) updatePayload.name = name?.trim() || null;
    if (company !== undefined) updatePayload.company = company?.trim() || null;
    if (amount !== undefined) updatePayload.amount = amount ? parseFloat(amount) : null;
    if (stage !== undefined) updatePayload.stage = stage;
    if (close_date !== undefined) updatePayload.close_date = close_date || null;
    if (notes !== undefined) updatePayload.notes = notes?.trim() || null;

    const { data: deal, error } = await supabaseAdmin
      .from("deals")
      .update(updatePayload)
      .eq("id", dealId)
      .eq("user_id", supabaseUserId)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ item: deal });
  } catch (err: any) {
    console.error("Deals PATCH error:", err);
    return NextResponse.json({ error: err.message || "Failed to update deal" }, { status: 500 });
  }
}

// DELETE - Delete deal
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ dealId: string }> | { dealId: string } }
) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
    const resolvedParams = params instanceof Promise ? await params : params;
    const dealId = resolvedParams.dealId;

    // Verify ownership
    const { data: existing, error: checkError } = await supabaseAdmin
      .from("deals")
      .select("id")
      .eq("id", dealId)
      .eq("user_id", supabaseUserId)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from("deals")
      .delete()
      .eq("id", dealId)
      .eq("user_id", supabaseUserId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Deals DELETE error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete deal" }, { status: 500 });
  }
}
