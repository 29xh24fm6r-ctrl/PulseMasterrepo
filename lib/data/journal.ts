import { supabaseAdmin } from "@/lib/supabase";

// --- Journal Types & Access ---
export type JournalEntry = {
    id: string;
    user_id_uuid: string;
    title: string;
    content: string; // Mapped to 'transcript' in DB
    mood?: string;
    tags?: string[];
    xp_awarded?: number; // Mapped to 'xp_earned' in DB
    created_at: string;
};

// Helper to map DB row to JournalEntry
function mapJournalEntryFromDB(row: any): JournalEntry {
    return {
        id: row.id,
        user_id_uuid: row.user_id_uuid,
        title: row.title,
        content: row.transcript || "",
        mood: row.mood?.toString(), // DB might be number or string
        tags: row.tags || [],
        xp_awarded: row.xp_earned,
        created_at: row.created_at || new Date().toISOString()
    };
}

export async function createJournalEntry(userId: string, entry: Omit<JournalEntry, "id" | "user_id_uuid" | "created_at">) {
    const { data, error } = await (supabaseAdmin as any)
        .from("journal_entries")
        .insert({
            title: entry.title,
            transcript: entry.content,
            mood: entry.mood ? parseInt(entry.mood) : null, // Assuming mood is number in DB based on previous view
            xp_earned: entry.xp_awarded,
            tags: entry.tags,
            user_id_uuid: userId,
            owner_user_id_legacy: userId
        })
        .select()
        .single();

    if (error) throw error;
    return mapJournalEntryFromDB(data);
}

export async function getJournalEntries(userId: string, limit = 50) {
    const { data, error } = await (supabaseAdmin as any)
        .from("journal_entries")
        .select("*")
        .eq("user_id_uuid", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data.map(mapJournalEntryFromDB);
}


// --- Contact Types & Access ---

export type Contact = {
    id: string;
    user_id_uuid: string;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    title?: string; // Job title
    industry?: string;
    relationship?: string;
    notes?: string;
    linkedin_url?: string; // Mapped from 'source_url' or specific field if exists? Schema shows 'source_url' in crm_contact_intel, contact has 'photo_url'. Assuming generic for now or ignoring if no field.
    // Schema for crm_contacts doesn't have standard 'linkedin_url' or 'industry'. 
    // We will drop them or put them in 'intel_summary' or ignore for now if not in DB.
    // 'notes' is also not directly in crm_contacts, maybe 'intel_summary'?
    ai_insights?: string; // 'intel_summary'
    context?: Record<string, any>; // No direct jsonb context on crm_contacts, maybe ignore
};

// Helper to map DB row to Contact
function mapContactFromDB(row: any): Contact {
    return {
        id: row.id,
        user_id_uuid: row.user_id_uuid,
        name: row.full_name || row.display_name || "Unknown",
        email: row.primary_email,
        phone: row.primary_phone,
        company: row.company_name,
        title: row.job_title,
        industry: undefined, // Not in schema row
        relationship: undefined, // Not in schema row
        notes: undefined, // Not in schema row, maybe intel_summary?
        ai_insights: row.intel_summary,
        // context: ...
    };
}

export async function createContact(userId: string, contact: Omit<Contact, "id" | "user_id_uuid">) {
    const { data, error } = await (supabaseAdmin as any)
        .from("crm_contacts")
        .insert({
            full_name: contact.name,
            primary_email: contact.email,
            primary_phone: contact.phone,
            company_name: contact.company,
            job_title: contact.title,
            intel_summary: contact.ai_insights || contact.notes, // Best effort mapping
            user_id_uuid: userId,
            owner_user_id_legacy: userId
        })
        .select()
        .single();
    if (error) throw error;
    return mapContactFromDB(data);
}

export async function updateContact(userId: string, contactId: string, updates: Partial<Contact>) {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.full_name = updates.name;
    if (updates.email) dbUpdates.primary_email = updates.email;
    if (updates.phone) dbUpdates.primary_phone = updates.phone;
    if (updates.company) dbUpdates.company_name = updates.company;
    if (updates.title) dbUpdates.job_title = updates.title;
    if (updates.ai_insights || updates.notes) dbUpdates.intel_summary = updates.ai_insights || updates.notes;

    dbUpdates.updated_at = new Date().toISOString();

    const { data, error } = await (supabaseAdmin as any)
        .from("crm_contacts")
        .update(dbUpdates)
        .eq("id", contactId)
        .eq("user_id_uuid", userId)
        .select()
        .single();

    if (error) throw error;
    return mapContactFromDB(data);
}

export async function getContacts(userId: string, limit = 50) {
    const { data, error } = await (supabaseAdmin as any)
        .from("crm_contacts")
        .select("*")
        .eq("user_id_uuid", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data.map(mapContactFromDB);
}

export async function getContact(userId: string, contactId: string) {
    const { data, error } = await (supabaseAdmin as any)
        .from("crm_contacts")
        .select("*")
        .eq("id", contactId)
        .eq("user_id_uuid", userId)
        .single();

    if (error) throw error;
    return mapContactFromDB(data);
}

export async function getContactByEmail(userId: string, email: string) {
    const { data, error } = await (supabaseAdmin as any)
        .from("crm_contacts")
        .select("*")
        .eq("user_id_uuid", userId)
        .ilike("primary_email", email)
        .maybeSingle();

    if (error) throw error;
    return data ? mapContactFromDB(data) : null;
}
