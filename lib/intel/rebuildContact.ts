import "server-only";
import type { JobRow } from "@/lib/jobs/handlers";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function rebuildContactIntel(job: JobRow) {
  const contactId = job.payload?.contact_id;
  if (!contactId) {
    throw new Error("intel.rebuild_contact missing payload.contact_id");
  }

  // Minimal v1: write an event row or mark a "needs rebuild" record.
  // If you already have a contact intel rebuild endpoint, we can wire it next.
  const { data, error } = await supabaseAdmin
    .from("crm_contacts")
    .select("id, full_name")
    .eq("id", contactId)
    .eq("user_id", job.user_id)
    .maybeSingle();

  if (error) throw new Error(`Failed reading contact: ${error.message}`);
  if (!data?.id) throw new Error(`Contact not found or not owned by user: ${contactId}`);

  return { ok: true, contact_id: contactId, name: data.full_name ?? null };
}

