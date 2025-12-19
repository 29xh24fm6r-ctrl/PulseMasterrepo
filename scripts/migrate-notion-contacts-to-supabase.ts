/**
 * Migration Script: Notion Contacts → Supabase (crm_contacts)
 * 
 * This script migrates contacts from Notion Second Brain database to Supabase.
 * 
 * Usage:
 *   1. Set environment variables:
 *      - NOTION_API_KEY
 *      - NOTION_DATABASE_SECOND_BRAIN
 *      - SUPABASE_URL
 *      - SUPABASE_SERVICE_ROLE_KEY
 *      - CLERK_USER_ID (the user whose contacts to migrate)
 * 
 *   2. Run: npx tsx scripts/migrate-notion-contacts-to-supabase.ts
 * 
 * Note: This is a one-time migration script. Run it manually when needed.
 */

import { Client } from "@notionhq/client";
import { createClient } from "@supabase/supabase-js";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const NOTION_DB_ID = process.env.NOTION_DATABASE_SECOND_BRAIN?.replace(/-/g, "") || "";
const CLERK_USER_ID = process.env.CLERK_USER_ID || "";

interface NotionContact {
  id: string;
  properties: {
    Name?: { title: Array<{ plain_text: string }> };
    Email?: { email: string };
    Phone?: { phone_number: string };
    Company?: { rich_text: Array<{ plain_text: string }> };
    Title?: { rich_text: Array<{ plain_text: string }> };
    Role?: { rich_text: Array<{ plain_text: string }> };
    Notes?: { rich_text: Array<{ plain_text: string }> };
    Tags?: { multi_select: Array<{ name: string }> };
    [key: string]: any;
  };
}

async function resolvePulseUserUuid(clerkUserId: string): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .single();

  if (error || !data?.id) {
    throw new Error(`No profile found for clerk_user_id=${clerkUserId}`);
  }

  return data.id;
}

function normalizeEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  return email.trim().toLowerCase();
}

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length ? digits : null;
}

function normalizeFullName(first: string, last: string): string {
  return `${first} ${last}`.trim().toLowerCase();
}

function extractNotionValue(prop: any): string | null {
  if (!prop) return null;
  
  if (prop.title && Array.isArray(prop.title)) {
    return prop.title.map((t: any) => t.plain_text).join(" ") || null;
  }
  if (prop.rich_text && Array.isArray(prop.rich_text)) {
    return prop.rich_text.map((t: any) => t.plain_text).join(" ") || null;
  }
  if (prop.email) return prop.email;
  if (prop.phone_number) return prop.phone_number;
  if (prop.multi_select && Array.isArray(prop.multi_select)) {
    return prop.multi_select.map((s: any) => s.name).join(", ");
  }
  
  return null;
}

async function migrateContact(
  notionContact: NotionContact,
  pulseUserUuid: string,
  clerkUserId: string
): Promise<{ success: boolean; contactId?: string; error?: string }> {
  try {
    const name = extractNotionValue(notionContact.properties.Name) || "";
    if (!name) {
      return { success: false, error: "No name found" };
    }

    const nameParts = name.split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";
    const fullName = name.trim();

    const email = extractNotionValue(notionContact.properties.Email);
    const phone = extractNotionValue(notionContact.properties.Phone);
    const company = extractNotionValue(notionContact.properties.Company);
    const title = extractNotionValue(notionContact.properties.Title) || 
                  extractNotionValue(notionContact.properties.Role);
    const notes = extractNotionValue(notionContact.properties.Notes);
    
    const tags: string[] = [];
    if (notionContact.properties.Tags?.multi_select) {
      tags.push(...notionContact.properties.Tags.multi_select.map((s: any) => s.name));
    }

    const insertRow = {
      user_id: pulseUserUuid,
      owner_user_id: clerkUserId,
      first_name: firstName,
      last_name: lastName,
      full_name: fullName,
      display_name: fullName,
      company_name: company || null,
      job_title: title || null,
      title: title || null,
      primary_email: email || null,
      primary_phone: phone || null,
      type: "Business",
      tags: tags.length > 0 ? tags : [],
      timezone: null,
      normalized_email: normalizeEmail(email),
      normalized_phone: normalizePhone(phone),
      normalized_full_name: normalizeFullName(firstName, lastName),
      notes: notes || null,
    };

    const { data: contact, error } = await supabase
      .from("crm_contacts")
      .insert(insertRow)
      .select("*")
      .single();

    if (error) {
      // Skip duplicates (foundation-mode trigger will block)
      if (error.message?.includes("Duplicate contact blocked")) {
        console.log(`⏭️  Skipping duplicate: ${fullName}`);
        return { success: false, error: "Duplicate" };
      }
      throw error;
    }

    return { success: true, contactId: contact.id };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function main() {
  if (!NOTION_DB_ID) {
    console.error("❌ NOTION_DATABASE_SECOND_BRAIN not set");
    process.exit(1);
  }

  if (!CLERK_USER_ID) {
    console.error("❌ CLERK_USER_ID not set");
    process.exit(1);
  }

  console.log("🚀 Starting migration: Notion → Supabase");
  console.log(`   Notion DB: ${NOTION_DB_ID}`);
  console.log(`   Clerk User: ${CLERK_USER_ID}`);

  // Resolve Pulse UUID
  let pulseUserUuid: string;
  try {
    pulseUserUuid = await resolvePulseUserUuid(CLERK_USER_ID);
    console.log(`✅ Resolved Pulse UUID: ${pulseUserUuid}`);
  } catch (err: any) {
    console.error(`❌ Failed to resolve Pulse UUID: ${err.message}`);
    process.exit(1);
  }

  // Fetch all contacts from Notion
  console.log("\n📥 Fetching contacts from Notion...");
  let allContacts: NotionContact[] = [];
  let cursor: string | undefined = undefined;

  do {
    const response = await notion.databases.query({
      database_id: NOTION_DB_ID,
      start_cursor: cursor,
      page_size: 100,
    });

    allContacts.push(...(response.results as NotionContact[]));
    cursor = response.next_cursor || undefined;

    console.log(`   Fetched ${allContacts.length} contacts so far...`);
  } while (cursor);

  console.log(`✅ Found ${allContacts.length} contacts in Notion\n`);

  // Migrate each contact
  let successCount = 0;
  let errorCount = 0;
  let duplicateCount = 0;

  for (const contact of allContacts) {
    const name = extractNotionValue(contact.properties.Name) || "Unknown";
    const result = await migrateContact(contact, pulseUserUuid, CLERK_USER_ID);

    if (result.success) {
      successCount++;
      console.log(`✅ ${name} → ${result.contactId}`);
    } else if (result.error === "Duplicate") {
      duplicateCount++;
      console.log(`⏭️  ${name} (duplicate, skipped)`);
    } else {
      errorCount++;
      console.log(`❌ ${name}: ${result.error}`);
    }
  }

  console.log("\n📊 Migration Summary:");
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ⏭️  Duplicates (skipped): ${duplicateCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📦 Total: ${allContacts.length}`);
}

// Run migration
main().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});

