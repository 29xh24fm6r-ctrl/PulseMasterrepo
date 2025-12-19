import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";
import { ArrowLeft, DollarSign } from "lucide-react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CrmDealDetailPage({
  params,
}: {
  params: Promise<{ dealId: string }>;
}) {
  const { userId } = await auth();
  if (!userId) {
    return <div className="p-8 text-red-400">Unauthorized</div>;
  }

  const { dealId } = await params;

  // Resolve user UUID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Get deal
  const { data: deal } = await supabaseAdmin
    .from("crm_deals")
    .select("*")
    .eq("user_id", dbUserId)
    .eq("id", dealId)
    .single();

  if (!deal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-red-400">Deal not found</div>
          <Link href="/crm/deals" className="text-purple-400 hover:text-purple-300 mt-4 inline-block">
            ← Back to Deals
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <Link
          href="/crm/deals"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Deals
        </Link>

        <div className="bg-zinc-800/50 rounded-lg border border-zinc-700 p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{deal.name}</h1>
              <div className="flex items-center gap-4 text-gray-400">
                <span className="px-2 py-1 bg-zinc-700 rounded text-sm">{deal.stage}</span>
                {deal.amount && (
                  <span className="text-lg font-semibold">${deal.amount.toLocaleString()}</span>
                )}
              </div>
            </div>
          </div>

          {deal.close_date && (
            <div className="mb-4">
              <div className="text-sm text-gray-400">Expected Close Date</div>
              <div>{new Date(deal.close_date).toLocaleDateString()}</div>
            </div>
          )}

          <div className="text-sm text-gray-400">Record view coming soon. Basic fields shown above.</div>
        </div>
      </div>
    </div>
  );
}

