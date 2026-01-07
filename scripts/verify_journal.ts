
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local manually
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyJournalQueries() {
    // Dynamically import supabase to ensure env vars are loaded first
    const { supabaseAdmin } = await import('../lib/supabase');

    console.log('🔍 Starting Journal Query Verification...');

    // 1. Get a User
    console.log('Fetching a user...');
    const { data: users, error: userError } = await (supabaseAdmin as any)
        .from('user_profiles')
        .select('id, email')
        .limit(1);

    if (userError || !users || users.length === 0) {
        console.error('❌ Failed to fetch user:', userError);
        return;
    }

    const user = users[0];
    console.log(`✅ Found user: ${user.email} (${user.id})`);

    const userId = user.id;

    // 2. Journal Entries
    console.log('\n--- Journal Entries ---');
    // Introspection: journal_entries uses user_id_uuid (uuid) or owner_user_id (text)
    // We use user_id_uuid to match the UUID we have.
    const { data: entries, error: journalError } = await (supabaseAdmin as any)
        .from('journal_entries')
        .select('created_at, date, primary_theme')
        .eq('user_id_uuid', userId)
        .order('created_at', { ascending: false })
        .limit(5);

    if (journalError) {
        console.error('❌ Journal Query Failed:', journalError);
    } else {
        console.log(`✅ Fetched ${entries?.length} entries.`);
        if (entries && entries.length > 0) {
            console.log('Sample entry:', entries[0]);
        }
    }

    // 3. CRM Interactions
    // Introspection: uses owner_user_id (text) or owner_user_uuid (uuid)
    // We try owner_user_id first as it's legacy standard, but if userId is UUID, it might mismatch if column has Clerk ID text.
    // We will try BOTH for verification to see which one works.
    console.log('\n--- CRM Interactions ---');

    // Try UUID match on owner_user_id (if it stores UUIDs as text) OR owner_user_uuid
    const { data: interactions, error: intError } = await (supabaseAdmin as any)
        .from('crm_interactions')
        .select('type, subject, summary, occurred_at')
        .or(`owner_user_id.eq.${userId},owner_user_uuid.eq.${userId}`)
        .limit(5);

    if (intError) {
        console.error('❌ CRM Interactions Query Failed:', intError);
    } else {
        console.log(`✅ Fetched ${interactions?.length} interactions.`);
    }

    // 4. CRM Contacts
    // Uses updated_at
    console.log('\n--- CRM Contacts ---');
    const { data: contacts, error: contactError } = await (supabaseAdmin as any)
        .from('crm_contacts')
        .select('first_name, last_name, updated_at')
        .or(`owner_user_id.eq.${userId},owner_user_id.eq.${userId}`) // Just use owner_user_id for now
        .limit(5);

    if (contactError) {
        console.error('❌ CRM Contacts Query Failed:', contactError);
    } else {
        console.log(`✅ Fetched ${contacts?.length} contacts.`);
    }

    console.log('\nVerification Complete.');
}

verifyJournalQueries();
