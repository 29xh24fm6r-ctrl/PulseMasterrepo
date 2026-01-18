import { NextRequest } from "next/server";
import { requireOwnerUserId } from "@/lib/auth/requireOwnerUserId";
import { getStripeServer } from "@/lib/stripe/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const owner = requireOwnerUserId(req);
    const { setup_intent_id } = await req.json();

    const stripe = getStripeServer();
    const supabase = getSupabaseAdmin();

    const si = await stripe.setupIntents.retrieve(setup_intent_id);

    const pm = typeof si.payment_method === "string" ? si.payment_method : si.payment_method?.id;
    const customerId = typeof si.customer === "string" ? si.customer : si.customer?.id;

    if (!pm || !customerId) {
        return Response.json({ error: "setup_incomplete" }, { status: 400 });
    }

    // Fetch display label
    const paymentMethod = await stripe.paymentMethods.retrieve(pm);
    const last4 = (paymentMethod as any)?.card?.last4 ?? "????";
    const brand = (paymentMethod as any)?.card?.brand ?? "card";

    await supabase
        .from("payment_profiles")
        .update({
            stripe_customer_id: customerId,
            stripe_default_payment_method_id: pm,
            display_label: `${brand.toUpperCase()} •••• ${last4}`,
            updated_at: new Date().toISOString(),
        })
        .eq("owner_user_id", owner);

    return Response.json({ ok: true });
}
