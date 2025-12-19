import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(_req: Request, { params }: { params: { taskId: string } }) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const taskId = params.taskId;

    const { data, error } = await supabaseAdmin
      .from("crm_tasks")
      .update({ status: "done" })
      .eq("id", taskId)
      .eq("owner_user_id", clerkUserId)
      .select("*")
      .single();

    if (error) {
      console.error("[CompleteCRMTask] Error:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ ok: false, error: "Task not found" }, { status: 404 });
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
    console.error("[CompleteCRMTask] Error:", err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
