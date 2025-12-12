// Nightly Contact Behavior Recompute Job
// lib/jobs/nightly-contact-behavior-job.ts

import { supabaseAdmin } from "@/lib/supabase";
import { recomputeBehaviorProfileForContact, upsertBehaviorProfile } from "@/lib/contacts/behavior";

/**
 * Recompute behavior profiles for all contacts with recent interactions
 */
export async function runNightlyContactBehaviorJob(): Promise<void> {
  console.log("[NightlyContactBehavior] Starting contact behavior recompute...");

  // Get all users
  const { data: users } = await supabaseAdmin.from("users").select("id, clerk_id");

  if (!users || users.length === 0) {
    console.log("[NightlyContactBehavior] No users found");
    return;
  }

  for (const user of users) {
    try {
      const userId = user.clerk_id || user.id;

      // Get contacts with interactions in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: contacts } = await supabaseAdmin
        .from("contact_interaction_events")
        .select("contact_id")
        .eq("user_id", user.id)
        .gte("occurred_at", thirtyDaysAgo.toISOString())
        .order("occurred_at", { ascending: false });

      if (!contacts || contacts.length === 0) {
        continue;
      }

      // Get unique contact IDs
      const uniqueContactIds = Array.from(new Set(contacts.map((c) => c.contact_id)));

      console.log(
        `[NightlyContactBehavior] Recomputing ${uniqueContactIds.length} contacts for user ${userId}`
      );

      // Recompute each contact
      for (const contactId of uniqueContactIds) {
        try {
          const profile = await recomputeBehaviorProfileForContact(userId, contactId);
          await upsertBehaviorProfile(userId, contactId, profile);
        } catch (err) {
          console.error(
            `[NightlyContactBehavior] Failed to recompute profile for contact ${contactId}:`,
            err
          );
        }
      }
    } catch (err) {
      console.error(`[NightlyContactBehavior] Failed for user ${user.id}:`, err);
    }
  }

  console.log("[NightlyContactBehavior] Completed contact behavior recompute");
}

