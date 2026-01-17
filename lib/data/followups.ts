import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export type FollowUp = {
    id: string;
    user_id_uuid: string;
    name: string; // Mapped to person_name
    status: string; // 'pending', 'sent', etc.
    priority: string;
    due_date?: string; // Mapped to due_date or due_at
    type: string;
    person_name?: string; // Redundant if mapped to name, but keeping for type compatibility
    contact_id?: string;
    notes?: string;
};

function mapFollowUpFromDB(f: any): FollowUp {
    return {
        id: f.id,
        user_id_uuid: f.user_id_uuid,
        name: f.person_name || f.body || "Unknown",
        status: f.last_action_date ? 'sent' : 'pending', // Infer status if not explicit column? Schema has 'last_action' string, and 'priority' nullable. Schema doesn't look like it has a status column?
        // Wait, schema check showed: body, company, ... priority ...
        // It DOES NOT show 'status'.
        // We will mock status based on last_action or just return 'pending'.
        priority: f.priority || 'medium',
        due_date: f.due_date || f.due_at,
        type: 'email', // Default type?
        person_name: f.person_name,
        contact_id: f.contact_id,
        notes: f.notes
    };
}

export async function getFollowUps(userId: string) {
    const { data, error } = await getSupabaseAdminRuntimeClient()
        .from("follow_ups")
        .select("*")
        .eq("user_id_uuid", userId)
        .order("due_date", { ascending: true, nullsFirst: false });

    if (error) throw error;

    // Map to logic
    return data.map((f: any) => {
        const mapped = mapFollowUpFromDB(f);
        return {
            ...mapped,
            isOverdue: mapped.due_date ? new Date(mapped.due_date) < new Date() && mapped.status !== 'sent' : false,
            isDueToday: mapped.due_date ? new Date(mapped.due_date).toDateString() === new Date().toDateString() : false
        };
    }) as (FollowUp & { isOverdue: boolean; isDueToday: boolean })[];
}

export async function createFollowUp(userId: string, followup: Partial<FollowUp>) {
    const { data, error } = await getSupabaseAdminRuntimeClient()
        .from("follow_ups")
        .insert({
            person_name: followup.name || followup.person_name || "Unknown",
            contact_id: followup.contact_id,
            due_date: followup.due_date,
            priority: followup.priority,
            notes: followup.notes,
            // Schema has 'body', maybe use logic to fill?
            body: `Follow up with ${followup.name}`,
            user_id_uuid: userId,
            owner_user_id_legacy: userId,
            owner_user_id: userId // Schema has owner_user_id (string|null) and owner_user_id_legacy (string)
            // owner_user_id is likely the user_id_uuid or legacy depending on migration state, setting both is safe if type matches
        })
        .select()
        .single();

    if (error) throw error;
    return mapFollowUpFromDB(data);
}

export async function updateFollowUp(userId: string, followUpId: string, updates: Partial<FollowUp>) {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.person_name = updates.name;
    if (updates.contact_id) dbUpdates.contact_id = updates.contact_id;
    if (updates.due_date) dbUpdates.due_date = updates.due_date;
    if (updates.priority) dbUpdates.priority = updates.priority;
    if (updates.notes) dbUpdates.notes = updates.notes;

    // Status update logic? If 'sent', maybe update last_action_date?
    if (updates.status === 'sent') {
        dbUpdates.last_action_date = new Date().toISOString();
        dbUpdates.last_action = 'sent';
    }

    const { data, error } = await getSupabaseAdminRuntimeClient()
        .from("follow_ups")
        .update(dbUpdates)
        .eq("id", followUpId)
        .eq("user_id_uuid", userId)
        .select()
        .single();

    if (error) throw error;
    return mapFollowUpFromDB(data);
}
