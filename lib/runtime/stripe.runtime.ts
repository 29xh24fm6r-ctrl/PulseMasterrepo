import Stripe from "stripe";
import { assertRuntimeOnly } from "@/lib/env/runtime-phase";

let _client: Stripe | null = null;

export function getStripeRuntime() {
    assertRuntimeOnly("Stripe");

    if (_client) return _client;

    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("Missing env var: STRIPE_SECRET_KEY");

    _client = new Stripe(key, {
        apiVersion: "2025-11-17.clover" as any, // Preserve existing config
        typescript: true,
    });

    return _client;
}
