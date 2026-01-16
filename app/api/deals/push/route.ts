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
    const { id, name, company, contactName, contactEmail, contactPhone, stage, value, loanType, notes, lastContact, nextAction, nextActionDate, probability } = body;

    const dbStage = stage?.toLowerCase().replace(/ /g, '_') || 'lead';

    if (id) {
      const { data, error } = await supabase
        .from("deals")
        .update({
          name,
          company,
          contact_name: contactName,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          stage: dbStage,
          value,
          loan_type: loanType,
          notes,
          last_contact: lastContact,
          next_action: nextAction,
          next_action_date: nextActionDate,
          probability,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ ok: true, deal: data });
    } else {
      const { data, error } = await supabase
        .from("deals")
        .insert({
          user_id: userId,
          name,
          company,
          contact_name: contactName,
          contact_email: contactEmail,
          contact_phone: contactPhone,
          stage: dbStage,
          value,
          loan_type: loanType,
          notes,
          last_contact: lastContact || new Date().toISOString(),
          next_action: nextAction,
          next_action_date: nextActionDate,
          probability: probability || 50,
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ ok: true, deal: data });
    }
  } catch (err: any) {
    console.error("Deals push error:", err?.message ?? err);
    return NextResponse.json({ ok: false, error: "Failed to save deal" }, { status: 500 });
  }
}
