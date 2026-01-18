import Stripe from "stripe";

function reqEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env: ${name}`);
    return v;
}

export function getStripeServer() {
    const key = reqEnv("STRIPE_SECRET_KEY");
    return new Stripe(key, { apiVersion: "2024-06-20" as any });
}
