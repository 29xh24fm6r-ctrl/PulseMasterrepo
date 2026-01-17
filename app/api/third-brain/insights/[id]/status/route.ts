/**
 * Third Brain Insight Status Update
 * PATCH /api/third-brain/insights/[id]/status
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    const validStatuses = ["open", "accepted", "dismissed", "done"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // Verify ownership
    const { data: existing } = await getSupabaseAdminRuntimeClient()
      .from("third_brain_insights")
      .select("id, user_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Insight not found" }, { status: 404 });
    }

    if (existing.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update status
    const updateData: any = { status };
    if (status !== "open") {
      updateData.acted_at = new Date().toISOString();
    }

    const { error } = await getSupabaseAdminRuntimeClient()
      .from("third_brain_insights")
      .update(updateData)
      .eq("id", id);

    if (error) {
      console.error("[Insight Status] Update error:", error);
      return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id, status });
  } catch (error: any) {
    console.error("[Insight Status] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}