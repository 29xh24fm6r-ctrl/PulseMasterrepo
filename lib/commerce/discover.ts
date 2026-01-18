import { VendorCandidate } from "./executor";

/**
 * V1: simple web-based discovery (Google/Bing/DuckDuckGo via fetch or tool).
 * Antigravity may stub search results initially.
 */
export async function discoverVendors(args: {
    query: string;
    city?: string;
}): Promise<VendorCandidate[]> {
    // STUB IMPLEMENTATION (replace with real search later)
    return [
        {
            name: "Valencia Kitchen",
            rating: 4.7,
            phone: "+1-555-111-2222",
            estimated_amount_cents: 2280,
        },
        {
            name: "Mar y Sol",
            rating: 4.6,
            phone: "+1-555-333-4444",
            estimated_amount_cents: 2450,
        },
    ];
}
