import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: deals, error } = await supabase
      .from("deals")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      deals: deals.map(d => ({
        id: d.id,
        name: d.name,
        company: d.company,
        contactName: d.contact_name,
        contactEmail: d.contact_email,
        contactPhone: d.contact_phone,
        stage: d.stage ? d.stage.charAt(0).toUpperCase() + d.stage.slice(1).replace(/_/g, ' ') : 'Lead',
        value: d.value,
        loanType: d.loan_type,
        notes: d.notes,
        lastContact: d.last_contact,
        nextAction: d.next_action,
        nextActionDate: d.next_action_date,
        probability: d.probability,
      })),
    });
  } catch (err: any) {
    console.error("Deals pull error:", err?.message ?? err);
    return NextResponse.json({ ok: false, error: "Failed to pull deals" }, { status: 500 });
  }
}