import { getStripeServer } from "@/lib/stripe/server";

export async function ensureCardholder(args: {
    owner_user_id: string;
    stripe_customer_id: string;
    existing_cardholder_id?: string | null;
}) {
    if (args.existing_cardholder_id) return args.existing_cardholder_id;

    const stripe = getStripeServer();

    // Minimal individual cardholder; Stripe may require more fields depending on settings.
    const cardholder = await stripe.issuing.cardholders.create({
        type: "individual",
        name: "Pulse User",
        email: undefined,
        phone_number: undefined,
        billing: {
            address: {
                line1: "N/A",
                city: "N/A",
                state: "NA",
                postal_code: "00000",
                country: "US",
            },
        },
        metadata: {
            owner_user_id: args.owner_user_id,
            stripe_customer_id: args.stripe_customer_id,
        },
    });

    return cardholder.id;
}

export async function createVirtualCard(args: {
    cardholder_id: string;
    merchant_lock?: string | null;     // optional: Stripe merchant data isn't always directly lockable
    spending_limit_cents: number;
    spending_limit_interval: "per_authorization";
}) {
    const stripe = getStripeServer();

    // Virtual card for online transactions
    const card = await stripe.issuing.cards.create({
        cardholder: args.cardholder_id,
        type: "virtual",
        currency: "usd",
        spending_controls: {
            spending_limits: [
                {
                    amount: args.spending_limit_cents,
                    interval: args.spending_limit_interval,
                },
            ],
        },
    });

    return card;
}
