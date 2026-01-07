import { supabaseAdmin } from "@/lib/supabase";

export type Deal = {
    id: string;
    user_id_uuid: string;
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

export type CreateDealInput = Omit<Deal, "id" | "user_id_uuid" | "created_at" | "updated_at">;

function mapDealFromDB(d: any): Deal {
    return {
        ...d,
        title: d.name || d.title || "Untitled",
    };
}

export async function createDeal(userId: string, input: CreateDealInput) {
    // Destructure title to map to name, and keep rest
    const { title, ...rest } = input;

    const { data, error } = await supabaseAdmin
        .from("deals")
        .insert({
            ...rest,
            name: title,
            user_id_uuid: userId,
            owner_user_id_legacy: userId
        })
        .select()
        .single();

    if (error) throw error;
    return mapDealFromDB(data);
}

export async function updateDealStatus(userId: string, dealId: string, stage: string) {
    const { data, error } = await supabaseAdmin
        .from("deals")
        .update({ stage, updated_at: new Date().toISOString() })
        .eq("id", dealId)
        .eq("user_id_uuid", userId)
        .select()
        .single();

    if (error) throw error;
    return mapDealFromDB(data);
}

export async function updateDeal(userId: string, dealId: string, updates: Partial<Deal>) {
    // Map title to name for updates
    const { title, ...rest } = updates;
    const dbUpdates = {
        ...rest,
        ...(title !== undefined && { name: title }),
        updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
        .from("deals")
        .update(dbUpdates)
        .eq("id", dealId)
        .eq("user_id_uuid", userId)
        .select()
        .single();

    if (error) throw error;
    return mapDealFromDB(data);
}

export async function getDeals(userId: string) {
    const { data, error } = await supabaseAdmin
        .from("deals")
        .select("*")
        .eq("user_id_uuid", userId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data.map(mapDealFromDB);
}
