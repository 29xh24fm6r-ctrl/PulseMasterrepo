import type { SupabaseClient } from "@supabase/supabase-js";

export type CrmContactContext = {
    contact_id?: string | null;
    full_name?: string | null;
    first_name?: string | null;
    company?: string | null;
    title?: string | null;
    last_interaction_at?: string | null;
    relationship_notes?: string | null;
    account_stage?: string | null;
};

function firstNonEmpty(row: any, keys: string[]) {
    for (const k of keys) {
        const v = row?.[k];
        if (v != null && String(v).trim() !== "") return v;
    }
    return null;
}

function deriveFirstName(fullName: string | null) {
    if (!fullName) return null;
    const parts = fullName.trim().split(/\s+/);
    return parts[0] || null;
}

/**
 * Attempts to find a CRM contact by email.
 * Adjust table/columns ONCE if yours differ. This is written to be forgiving.
 */
export async function crmLookupByEmail(opts: {
    supabaseAdmin: SupabaseClient;
    user_id_uuid: string;
    email: string;
}): Promise<CrmContactContext | null> {
    const { supabaseAdmin, user_id_uuid, email } = opts;

    // ⚙️ CONFIG: set to your actual tables/cols (best guess defaults)
    const CONTACTS_TABLE = "crm_contacts";
    const USER_COL = "user_id_uuid";
    const EMAIL_COL_CANDIDATES = ["email", "email_address", "primary_email"];
    const NAME_COL_CANDIDATES = ["full_name", "name", "contact_name"];
    const FIRST_COL_CANDIDATES = ["first_name", "firstname", "given_name"];
    const COMPANY_COL_CANDIDATES = ["company", "company_name", "organization", "org_name"];
    const TITLE_COL_CANDIDATES = ["title", "job_title", "role"];
    const NOTES_COL_CANDIDATES = ["notes", "relationship_notes", "context_notes"];
    const STAGE_COL_CANDIDATES = ["stage", "account_stage", "relationship_stage"];
    const LAST_TOUCH_COL_CANDIDATES = ["last_interaction_at", "last_contacted_at", "last_touch_at"];

    // We don’t know which email column exists; pull a candidate set by scanning filters one-by-one.
    for (const emailCol of EMAIL_COL_CANDIDATES) {
        const { data, error } = await supabaseAdmin
            .from(CONTACTS_TABLE)
            .select("*")
            .eq(USER_COL, user_id_uuid)
            .ilike(emailCol, email)
            .limit(1);

        if (error) {
            // If the column doesn't exist, Supabase may error. Just continue.
            continue;
        }
        if (data && data.length > 0) {
            const row: any = data[0];

            const full_name = firstNonEmpty(row, NAME_COL_CANDIDATES);
            const first_name = firstNonEmpty(row, FIRST_COL_CANDIDATES) ?? deriveFirstName(full_name);

            return {
                contact_id: row?.id ?? null,
                full_name: full_name ? String(full_name) : null,
                first_name: first_name ? String(first_name) : null,
                company: firstNonEmpty(row, COMPANY_COL_CANDIDATES) ? String(firstNonEmpty(row, COMPANY_COL_CANDIDATES)) : null,
                title: firstNonEmpty(row, TITLE_COL_CANDIDATES) ? String(firstNonEmpty(row, TITLE_COL_CANDIDATES)) : null,
                relationship_notes: firstNonEmpty(row, NOTES_COL_CANDIDATES)
                    ? String(firstNonEmpty(row, NOTES_COL_CANDIDATES))
                    : null,
                account_stage: firstNonEmpty(row, STAGE_COL_CANDIDATES) ? String(firstNonEmpty(row, STAGE_COL_CANDIDATES)) : null,
                last_interaction_at: firstNonEmpty(row, LAST_TOUCH_COL_CANDIDATES)
                    ? String(firstNonEmpty(row, LAST_TOUCH_COL_CANDIDATES))
                    : null,
            };
        }
    }

    return null;
}
