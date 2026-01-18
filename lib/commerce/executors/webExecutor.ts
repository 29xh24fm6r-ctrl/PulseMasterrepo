import { CommerceExecutor, CommerceContext, VendorCandidate } from "../executor";

/**
 * V1: Stub.
 * Phase 10 will wire Playwright in a sandboxed runner.
 */
export const webExecutor: CommerceExecutor = {
    async discover(ctx) {
        throw new Error("Use discoverVendors()");
    },

    async execute(ctx, vendor, issuingCardId) {
        // Placeholder for browser automation
        return {
            final_amount_cents: vendor.estimated_amount_cents ?? 2500,
            receipt_summary: `Ordered via website from ${vendor.name}`,
        };
    },
};
