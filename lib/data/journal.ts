import { supabaseAdmin } from "@/lib/supabase";

// --- Journal Types & Access ---
export type JournalEntry = {
    id: string;
    user_id: string;
    title: string;
    content: string;
    mood?: string;
    tags?: string[];
    xp_awarded?: number;
    created_at: string;
};

export async function createJournalEntry(userId: string, entry: Omit<JournalEntry, "id" | "user_id" | "created_at">) {
    const { data, error } = await supabaseAdmin
        .from("journal_entries")
        .insert({ ...entry, user_id: userId })
        .select()
        .single();

    if (error) throw error;
    return data as JournalEntry;
}

export async function getJournalEntries(userId: string, limit = 50) {
    const { data, error } = await supabaseAdmin
        .from("journal_entries")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data as JournalEntry[];
}


// --- Contact Types & Access ---

export type Contact = {
    id: string;
    user_id: string;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    title?: string;
    industry?: string;
    relationship?: string;
    notes?: string;
    linkedin_url?: string;
    ai_insights?: string;
    context?: Record<string, any>; // JSONB for Second Brain data
};

export async function createContact(userId: string, contact: Omit<Contact, "id" | "user_id">) {
    const { data, error } = await supabaseAdmin
        .from("contacts")
        .insert({ ...contact, user_id: userId })
        .select()
        .single();
    if (error) throw error;
    return data as Contact;
}

export async function updateContact(userId: string, contactId: string, updates: Partial<Contact>) {
    const { data, error } = await supabaseAdmin
        .from("contacts")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", contactId)
        .eq("user_id", userId)
        .select()
        .single();

    if (error) throw error;
    return data as Contact;
}

export async function getContacts(userId: string, limit = 50) {
    const { data, error } = await supabaseAdmin
        .from("contacts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) throw error;
    return data as Contact[];
}

export async function getContact(userId: string, contactId: string) {
    const { data, error } = await supabaseAdmin
        .from("contacts")
        .select("*")
        .eq("id", contactId)
        .eq("user_id", userId)
        .single();

    if (error) throw error;
    return data as Contact;
}

export async function getContactByEmail(userId: string, email: string) {
    const { data, error } = await supabaseAdmin
        .from("contacts")
        .select("*")
        .eq("user_id", userId)
        .ilike("email", email)
        .maybeSingle();

    if (error) throw error;
    return data as Contact | null;
}
