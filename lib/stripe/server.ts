
import { getStripeRuntime } from "@/lib/runtime/stripe.runtime";

export function getStripeServer() {
    return getStripeRuntime();
}
