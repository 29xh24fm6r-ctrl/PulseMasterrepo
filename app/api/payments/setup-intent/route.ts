import { NextRequest } from "next/server";
import { requireOwnerUserId } from "@/lib/auth/requireOwnerUserId";
import { getStripeServer } from "@/lib/stripe/server";
import { getOrCreatePaymentProfile } from "@/lib/payments/db";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const owner = requireOwnerUserId(req);
    const stripe = getStripeServer();
    const supabase = getSupabaseAdmin();

    const profile = await getOrCreatePaymentProfile(owner);

    let customerId = profile.stripe_customer_id as string | null;

    if (!customerId) {
        const customer = await stripe.customers.create({
            metadata: { owner_user_id: owner },
        });
        customerId = customer.id;

        await supabase
            .from("payment_profiles")
            .update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() })
            .eq("owner_user_id", owner);
    }

    const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ["card"],
        usage: "off_session",
        metadata: { owner_user_id: owner },
    });

    return Response.json({
        client_secret: setupIntent.client_secret,
        customer_id: customerId,
    });
}
