import { CommerceExecutor } from "../executor";

/**
 * V1: Stub.
 * Phase 10 will wire Twilio + structured call scripts.
 */
export const phoneExecutor: CommerceExecutor = {
    async discover() {
        throw new Error("Use discoverVendors()");
    },

    async execute(ctx, vendor, issuingCardId) {
        return {
            final_amount_cents: vendor.estimated_amount_cents ?? 2500,
            receipt_summary: `Ordered by phone from ${vendor.name}`,
        };
    },
};
