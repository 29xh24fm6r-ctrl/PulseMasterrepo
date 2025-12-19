/**
 * Contact Merge Engine
 * Safely merges duplicate contacts and re-links all foreign keys
 */

import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeName, normalizeEmail, normalizePhone } from "./normalize";

export type MergeStrategy = "prefer_winner" | "prefer_new" | "fill_blanks";

export interface MergeOptions {
  userId: string;
  winnerContactId: string;
  loserContactId: string;
  strategy: MergeStrategy;
  mergeReason?: string;
}

export interface MergePlan {
  fieldMerges: Record<string, { from: any; to: any }>;
  fkUpdates: Array<{ table: string; column: string; count: number }>;
  arrayUpdates: Array<{ table: string; column: string; count: number }>;
  specialMerges: Array<{ table: string; action: string }>;
}

export interface MergeResult {
  ok: boolean;
  winnerContactId: string;
  mergeId: string;
  plan: MergePlan;
  errors: string[];
}

/**
 * Merge two contacts
 */
export async function mergeContacts(options: MergeOptions): Promise<MergeResult> {
  const { userId, winnerContactId, loserContactId, strategy, mergeReason } = options;
  const errors: string[] = [];
  const plan: MergePlan = {
    fieldMerges: {},
    fkUpdates: [],
    arrayUpdates: [],
    specialMerges: [],
  };

  try {
    // 1. Validate both contacts belong to same user
    const { data: contacts, error: fetchError } = await supabaseAdmin
      .from("crm_contacts")
      .select("id, full_name, primary_email, primary_phone, company_name, title, industry, keywords, type, tags")
      .in("id", [winnerContactId, loserContactId])
      .eq("user_id", userId)
      .eq("status", "active");

    if (fetchError || !contacts || contacts.length !== 2) {
      throw new Error("One or both contacts not found or do not belong to user");
    }

    const winner = contacts.find((c) => c.id === winnerContactId)!;
    const loser = contacts.find((c) => c.id === loserContactId)!;

    // 2. Build merge plan for contact fields
    const updatedFields: any = {};
    const fieldMerges: Record<string, { from: any; to: any }> = {};

    // Merge fields based on strategy
    for (const field of ["full_name", "primary_email", "primary_phone", "company_name", "title", "industry", "type"] as const) {
      const winnerValue = winner[field];
      const loserValue = loser[field];

      if (strategy === "fill_blanks") {
        // Keep winner, fill from loser if blank
        if (!winnerValue && loserValue) {
          updatedFields[field] = loserValue;
          fieldMerges[field] = { from: loserValue, to: winnerValue || loserValue };
        }
      } else if (strategy === "prefer_new") {
        // Prefer loser (newer) when present
        if (loserValue) {
          updatedFields[field] = loserValue;
          fieldMerges[field] = { from: loserValue, to: winnerValue };
        }
      } else {
        // prefer_winner: keep winner, only update if winner is null
        if (!winnerValue && loserValue) {
          updatedFields[field] = loserValue;
          fieldMerges[field] = { from: loserValue, to: winnerValue || loserValue };
        }
      }
    }

    // Merge arrays (tags, keywords)
    if (winner.tags && Array.isArray(winner.tags) || loser.tags && Array.isArray(loser.tags)) {
      const winnerTags = new Set(winner.tags || []);
      const loserTags = new Set(loser.tags || []);
      const mergedTags = Array.from(new Set([...winnerTags, ...loserTags]));
      if (mergedTags.length > 0) {
        updatedFields.tags = mergedTags;
        fieldMerges.tags = { from: loser.tags || [], to: mergedTags };
      }
    }

    if (winner.keywords && loser.keywords) {
      const winnerKeywords = new Set((winner.keywords as string[]) || []);
      const loserKeywords = new Set((loser.keywords as string[]) || []);
      const mergedKeywords = Array.from(new Set([...winnerKeywords, ...loserKeywords]));
      if (mergedKeywords.length > 0) {
        updatedFields.keywords = mergedKeywords;
        fieldMerges.keywords = { from: loser.keywords, to: mergedKeywords };
      }
    }

    plan.fieldMerges = fieldMerges;

    // Recompute normalized fields
    updatedFields.normalized_full_name = normalizeName(updatedFields.full_name || winner.full_name);
    updatedFields.normalized_email = normalizeEmail(updatedFields.primary_email || winner.primary_email);
    updatedFields.normalized_phone = normalizePhone(updatedFields.primary_phone || winner.primary_phone);

    // 3. Update winner with merged fields
    const { error: updateError } = await supabaseAdmin
      .from("crm_contacts")
      .update(updatedFields)
      .eq("id", winnerContactId);

    if (updateError) {
      errors.push(`Failed to update winner: ${updateError.message}`);
    }

    // 4. Re-link foreign keys (direct FK updates)
    const fkUpdates = [
      { table: "crm_interactions", column: "contact_id" },
      { table: "crm_deals", column: "primary_contact_id" },
      { table: "crm_contact_intel_sources", column: "contact_id" },
      { table: "crm_contact_intel_claims", column: "contact_id" },
      { table: "crm_intel_runs", column: "contact_id" },
      { table: "contact_tag_links", column: "contact_id" },
      { table: "crm_relationship_health", column: "contact_id" },
    ];

    // Add conditional FK updates for tables that may exist
    const conditionalFkUpdates = [
      { table: "contact_facts", column: "contact_id" },
      { table: "contact_dates", column: "contact_id" },
      { table: "gift_ideas", column: "contact_id" },
      { table: "interaction_events", column: "contact_id" },
      { table: "contact_news_preferences", column: "contact_id" },
      { table: "news_recommendations", column: "contact_id" },
      { table: "news_email_drafts", column: "contact_id" },
    ];

    for (const { table, column } of [...fkUpdates, ...conditionalFkUpdates]) {
      try {
        const { count, error } = await supabaseAdmin
          .from(table)
          .update({ [column]: winnerContactId })
          .eq(column, loserContactId)
          .eq("user_id", userId);

        if (error) {
          // Table might not exist, skip silently
          if (error.code !== "42P01" && error.code !== "PGRST205") {
            errors.push(`FK update ${table}.${column}: ${error.message}`);
          }
        } else if (count && count > 0) {
          plan.fkUpdates.push({ table, column, count });
        }
      } catch (err: any) {
        // Skip if table doesn't exist
        if (!err.message?.includes("does not exist")) {
          errors.push(`FK update ${table}.${column}: ${err.message}`);
        }
      }
    }

    // 5. Handle special cases

    // contact_relationships: update both from_contact_id and to_contact_id
    try {
      const { count: fromCount } = await supabaseAdmin
        .from("contact_relationships")
        .update({ from_contact_id: winnerContactId })
        .eq("from_contact_id", loserContactId)
        .eq("user_id", userId);

      const { count: toCount } = await supabaseAdmin
        .from("contact_relationships")
        .update({ to_contact_id: winnerContactId })
        .eq("to_contact_id", loserContactId)
        .eq("user_id", userId);

      // Delete self-loops (where from = to after merge)
      await supabaseAdmin
        .from("contact_relationships")
        .delete()
        .eq("from_contact_id", winnerContactId)
        .eq("to_contact_id", winnerContactId)
        .eq("user_id", userId);

      if ((fromCount || 0) + (toCount || 0) > 0) {
        plan.specialMerges.push({
          table: "contact_relationships",
          action: `Updated ${(fromCount || 0) + (toCount || 0)} relationship edges`,
        });
      }
    } catch (err: any) {
      if (!err.message?.includes("does not exist")) {
        errors.push(`contact_relationships update: ${err.message}`);
      }
    }

    // crm_contact_identity: merge JSONB fields if both exist
    try {
      const { data: winnerIdentity } = await supabaseAdmin
        .from("crm_contact_identity")
        .select("*")
        .eq("user_id", userId)
        .eq("contact_id", winnerContactId)
        .maybeSingle();

      const { data: loserIdentity } = await supabaseAdmin
        .from("crm_contact_identity")
        .select("*")
        .eq("user_id", userId)
        .eq("contact_id", loserContactId)
        .maybeSingle();

      if (loserIdentity) {
        if (winnerIdentity) {
          // Merge JSONB fields
          const mergedUrls = Array.from(
            new Set([
              ...((winnerIdentity.known_social_urls as string[]) || []),
              ...((loserIdentity.known_social_urls as string[]) || []),
            ])
          );
          const mergedHandles = Array.from(
            new Set([
              ...((winnerIdentity.known_handles as string[]) || []),
              ...((loserIdentity.known_handles as string[]) || []),
            ])
          );

          await supabaseAdmin
            .from("crm_contact_identity")
            .update({
              company_domain: winnerIdentity.company_domain || loserIdentity.company_domain,
              location: winnerIdentity.location || loserIdentity.location,
              known_social_urls: mergedUrls,
              known_handles: mergedHandles,
            })
            .eq("id", winnerIdentity.id);

          // Delete loser identity
          await supabaseAdmin
            .from("crm_contact_identity")
            .delete()
            .eq("id", loserIdentity.id);
        } else {
          // Move loser identity to winner
          await supabaseAdmin
            .from("crm_contact_identity")
            .update({ contact_id: winnerContactId })
            .eq("id", loserIdentity.id);
        }

        plan.specialMerges.push({ table: "crm_contact_identity", action: "Merged identity data" });
      }
    } catch (err: any) {
      if (!err.message?.includes("does not exist")) {
        errors.push(`crm_contact_identity merge: ${err.message}`);
      }
    }

    // quantum_tasks: update relationship_relevance arrays
    try {
      const { data: tasks, error: tasksError } = await supabaseAdmin
        .from("quantum_tasks")
        .select("id, relationship_relevance")
        .eq("user_id", userId)
        .contains("relationship_relevance", [loserContactId]);

      if (!tasksError && tasks && tasks.length > 0) {
        for (const task of tasks) {
          const relevance = (task.relationship_relevance as string[]) || [];
          const updatedRelevance = Array.from(
            new Set(
              relevance.map((id) => (id === loserContactId ? winnerContactId : id))
            )
          );

          await supabaseAdmin
            .from("quantum_tasks")
            .update({ relationship_relevance: updatedRelevance })
            .eq("id", task.id);
        }

        plan.arrayUpdates.push({ table: "quantum_tasks", column: "relationship_relevance", count: tasks.length });
      }
    } catch (err: any) {
      if (!err.message?.includes("does not exist")) {
        errors.push(`quantum_tasks update: ${err.message}`);
      }
    }

    // tb_nodes: update source_id and props.contact_id
    try {
      const { count: nodeSourceCount } = await supabaseAdmin
        .from("tb_nodes")
        .update({ source_id: winnerContactId })
        .eq("source_table", "crm_contacts")
        .eq("source_id", loserContactId)
        .eq("user_id", userId);

      // Update props.contact_id in JSONB (this requires a more complex query)
      // We'll do a best-effort update using a raw query approach
      // For now, log that this needs manual handling if critical
      
      if (nodeSourceCount && nodeSourceCount > 0) {
        plan.specialMerges.push({
          table: "tb_nodes",
          action: `Updated ${nodeSourceCount} node source references`,
        });
      }
    } catch (err: any) {
      if (!err.message?.includes("does not exist")) {
        errors.push(`tb_nodes update: ${err.message}`);
      }
    }

    // 6. Soft-delete loser
    const { error: softDeleteError } = await supabaseAdmin
      .from("crm_contacts")
      .update({
        status: "merged",
        merged_into_contact_id: winnerContactId,
      })
      .eq("id", loserContactId);

    if (softDeleteError) {
      errors.push(`Failed to soft-delete loser: ${softDeleteError.message}`);
    }

    // 7. Create audit log
    const { data: mergeRecord, error: mergeLogError } = await supabaseAdmin
      .from("crm_contact_merges")
      .insert({
        user_id: userId,
        winner_contact_id: winnerContactId,
        loser_contact_id: loserContactId,
        merge_reason: mergeReason || "Manual merge",
        merge_plan: plan,
      })
      .select()
      .single();

    if (mergeLogError) {
      errors.push(`Failed to create merge log: ${mergeLogError.message}`);
    }

    return {
      ok: errors.length === 0,
      winnerContactId,
      mergeId: mergeRecord?.id || "",
      plan,
      errors,
    };
  } catch (err: any) {
    console.error("[MergeContacts] Fatal error:", err);
    return {
      ok: false,
      winnerContactId,
      mergeId: "",
      plan,
      errors: [...errors, err.message || "Fatal merge error"],
    };
  }
}

