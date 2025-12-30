import { NextResponse } from "next/server";
import { updateFollowUp } from "@/lib/data/followups";
import { auth } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { followUpId, status } = body;

    if (!followUpId || !status) {
      return NextResponse.json(
        { ok: false, error: "Missing required data" },
        { status: 400 }
      );
    }

    console.log(`📝 Updating follow-up ${followUpId} to ${status}`);

    const updated = await updateFollowUp(userId, followUpId, { status });

    console.log("✅ Status updated!");

    return NextResponse.json({
      ok: true,
      status: updated.status,
    });
  } catch (err: any) {
    console.error("Update status error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to update status",
      },
      { status: 500 }
    );
  }
}