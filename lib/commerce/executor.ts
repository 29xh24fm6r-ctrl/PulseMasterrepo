export type CommerceContext = {
    owner_user_id: string;
    request_text: string;
    location?: {
        city?: string;
        lat?: number;
        lng?: number;
    };
    constraints?: {
        budget_cents?: number;
        time?: string;
    };
};

export type VendorCandidate = {
    name: string;
    rating?: number;
    url?: string;
    phone?: string;
    distance_miles?: number;
    estimated_amount_cents?: number;
};

export interface CommerceExecutor {
    discover(ctx: CommerceContext): Promise<VendorCandidate[]>;
    execute(ctx: CommerceContext, vendor: VendorCandidate, issuingCardId: string): Promise<{
        final_amount_cents: number;
        receipt_summary: string;
    }>;
}
