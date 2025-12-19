import "server-only";
import type { JobRow } from "@/lib/jobs/handlers";
import { supabaseAdmin } from "@/lib/supabase/admin";

function dayKey(d = new Date()) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function runAutopilotScan(job: JobRow) {
  const { data: contacts, error } = await supabaseAdmin
    .from("crm_contacts")
    .select("id, created_at")
    .eq("user_id", job.user_id)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    throw new Error(`autopilot.scan failed reading crm_contacts: ${error.message}`);
  }

  const contactsList = contacts ?? [];
  const today = dayKey();

  let enqueued = 0;
  let skipped = 0;

  for (const c of contactsList) {
    const idem = `intel.rebuild_contact:${c.id}:${today}`;

    const { error: insErr } = await supabaseAdmin.from("job_queue").insert({
      user_id: job.user_id,
      job_type: "intel.rebuild_contact",
      status: "queued",
      run_at: new Date().toISOString(),
      lane: "default", // Background fanout
      priority: 200,
      payload: { contact_id: c.id },
      idempotency_key: idem,
      correlation_id: job.correlation_id ?? null,
    });

    if (!insErr) {
      enqueued++;
      continue;
    }

    // If idempotency unique index is in place, duplicates will land here.
    // We treat any insert error as "skipped" unless you want strict failures.
    skipped++;
  }

  return {
    ok: true,
    note: "autopilot.scan executed (fanout)",
    scanned_contacts: contactsList.length,
    enqueued,
    skipped,
  };
}
