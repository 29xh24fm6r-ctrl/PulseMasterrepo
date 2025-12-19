import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import DealsList from "@/components/crm/deals-list";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CrmDealsPage() {
  const { userId } = await auth();
  if (!userId) {
    return <div className="p-8 text-red-400">Unauthorized</div>;
  }

  // Resolve user UUID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Get open deals
  const { data: deals } = await supabaseAdmin
    .from("crm_deals")
    .select("id, name, stage, amount, close_date, primary_contact_id, created_at")
    .eq("user_id", dbUserId)
    .not("stage", "in", "('won', 'lost')")
    .order("updated_at", { ascending: false })
    .limit(50);

  return <DealsList deals={deals || []} />;
}

