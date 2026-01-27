import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

/**
 * POST /api/approvals/:id/approve — Approve a pending proposal
 * Body: { note?: string }
 *
 * Flow:
 * 1. Load proposal (must be pending)
 * 2. Mark approved with decided_at/by
 * 3. Mark executed (Phase 1: no real execution, just status change)
 * 4. Return updated proposal
 */
export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const params = await props.params;
  const proposalId = params.id;

  try {
    const body = await req.json().catch(() => ({}));
    const note = body.note ?? null;

    const db = getSupabaseAdminRuntimeClient();

    // 1. Fetch proposal
    const { data: proposal, error: fetchError } = await db
      .from("pulse_proposals")
      .select("*")
      .eq("id", proposalId)
      .single();

    if (fetchError || !proposal) {
      return NextResponse.json({ ok: false, error: "Proposal not found" }, { status: 404 });
    }

    if (proposal.status !== "pending") {
      return NextResponse.json(
        { ok: false, error: `Proposal already ${proposal.status}` },
        { status: 400 }
      );
    }

    // 2. Mark approved → executed
    const now = new Date().toISOString();
    const { error: updateError } = await db
      .from("pulse_proposals")
      .update({
        status: "executed",
        decided_at: now,
        decided_by: userId,
        decision_note: note,
      })
      .eq("id", proposalId);

    if (updateError) {
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 });
    }

    // 3. Update effects ledger if effect_pre_ref exists
    if (proposal.effect_pre_ref) {
      await db
        .from("pulse_effects")
        .update({
          status: "executed",
          completed_at: now,
        })
        .eq("id", proposal.effect_pre_ref)
        .then(() => {});
    }

    console.log("[approvals] APPROVED", {
      proposal_id: proposalId,
      tool: proposal.tool,
      decided_by: userId,
    });

    return NextResponse.json({
      ok: true,
      id: proposalId,
      status: "executed",
      decided_by: userId,
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
