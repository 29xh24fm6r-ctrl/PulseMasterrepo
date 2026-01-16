import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: followUps, error } = await supabase
      .from("follow_ups")
      .select("*")
      .eq("user_id", userId)
      .order("due_date", { ascending: true, nullsFirst: false });

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      followUps: followUps.map(f => ({
        id: f.id,
        personName: f.person_name,
        company: f.company,
        email: f.email,
        phone: f.phone,
        type: f.type,
        status: f.status,
        priority: f.priority,
        dueDate: f.due_date,
        subject: f.subject,
        notes: f.notes,
        lastAction: f.last_action,
        lastActionDate: f.last_action_date,
        dealId: f.deal_id,
      })),
    });
  } catch (err: any) {
    console.error("Follow-ups pull error:", err?.message ?? err);
    return NextResponse.json({ ok: false, error: "Failed to pull follow-ups" }, { status: 500 });
  }
}

