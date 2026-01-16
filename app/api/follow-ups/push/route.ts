import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, personName, company, email, phone, type, status, priority, dueDate, subject, notes, lastAction, dealId } = body;

    if (id) {
      const updateData: any = {
        person_name: personName,
        company,
        email,
        phone,
        type,
        status,
        priority,
        due_date: dueDate,
        subject,
        notes,
        deal_id: dealId,
        updated_at: new Date().toISOString(),
      };

      if (lastAction) {
        updateData.last_action = lastAction;
        updateData.last_action_date = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("follow_ups")
        .update(updateData)
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ ok: true, followUp: data });
    } else {
      const { data, error } = await supabase
        .from("follow_ups")
        .insert({
          user_id: userId,
          person_name: personName,
          company,
          email,
          phone,
          type: type || 'email',
          status: status || 'pending',
          priority: priority || 'medium',
          due_date: dueDate,
          subject,
          notes,
          deal_id: dealId,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ ok: true, followUp: data });
    }
  } catch (err: any) {
    console.error("Follow-ups push error:", err?.message ?? err);
    return NextResponse.json({ ok: false, error: "Failed to save follow-up" }, { status: 500 });
  }
}
