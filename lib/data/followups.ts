import { supabaseAdmin } from "@/lib/supabase";

export type FollowUp = {
    id: string;
    user_id: string;
    name: string;
    status: string;
    priority: string;
    due_date?: string;
    type: string;
    person_name?: string;
    contact_id?: string;
};

export async function getFollowUps(userId: string) {
    const { data, error } = await supabaseAdmin
        .from("follow_ups")
        .select("*")
        .eq("user_id", userId)
        .order("due_date", { ascending: true, nullsFirst: false });

    if (error) throw error;

    // Map to logic
    return data.map((f: any) => ({
        ...f,
        isOverdue: f.due_date ? new Date(f.due_date) < new Date() && f.status !== 'sent' : false,
        isDueToday: f.due_date ? new Date(f.due_date).toDateString() === new Date().toDateString() : false
    })) as (FollowUp & { isOverdue: boolean; isDueToday: boolean })[];
}

export async function createFollowUp(userId: string, followup: Partial<FollowUp>) {
    const { data, error } = await supabaseAdmin
        .from("follow_ups")
        .insert({ ...followup, user_id: userId })
        .select()
        .single();

    if (error) throw error;
    return data as FollowUp;
}

export async function updateFollowUp(userId: string, followUpId: string, updates: Partial<FollowUp>) {
    const { data, error } = await supabaseAdmin
        .from("follow_ups")
        .update({ ...updates }) // No updated_at column in type, check schema if needed, assuming implicit or trigger
        .eq("id", followUpId)
        .eq("user_id", userId)
        .select()
        .single();

    if (error) throw error;
    return data as FollowUp;
}
