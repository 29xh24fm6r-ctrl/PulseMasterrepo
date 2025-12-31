import { supabaseAdmin } from "@/lib/supabase";

export type Deal = {
    id: string;
    user_id: string;
    title: string;
    company: string;
    value: number;
    stage: string;
    close_date: string | null;
    source?: string;
    notes?: string;
    industry?: string;
    company_size?: string;
    contact_name?: string;
    contact_email?: string;
    ai_insights?: string;
    created_at: string;
    updated_at: string;
};

export type CreateDealInput = Omit<Deal, "id" | "user_id" | "created_at" | "updated_at">;

export async function createDeal(userId: string, input: CreateDealInput) {
    const { data, error } = await supabaseAdmin
        .from("deals")
        .insert({ ...input, user_id: userId })
        .select()
        .single();

    if (error) throw error;
    return data as Deal;
}

export async function updateDealStatus(userId: string, dealId: string, stage: string) {
    const { data, error } = await supabaseAdmin
        .from("deals")
        .update({ stage, updated_at: new Date().toISOString() })
        .eq("id", dealId)
        .eq("user_id", userId)
        .select()
        .single();

    if (error) throw error;
    return data as Deal;
}

export async function updateDeal(userId: string, dealId: string, updates: Partial<Deal>) {
    const { data, error } = await supabaseAdmin
        .from("deals")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", dealId)
        .eq("user_id", userId)
        .select()
        .single();

    if (error) throw error;
    return data as Deal;
}

export async function getDeals(userId: string) {
    const { data, error } = await supabaseAdmin
        .from("deals")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data as Deal[];
}
