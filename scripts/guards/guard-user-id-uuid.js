/* eslint-disable no-console */
// scripts/guards/guard-user-id-uuid.js
// Sprint 4.1B: Guard to enforce UUID user_id on core tables
const { createClient } = require("@supabase/supabase-js");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("❌ guard-user-id-uuid: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const TABLES = [
  "crm_contacts",
  "tasks",
  "deals",
  "habits",
  "habit_logs",
  "journal_entries",
];

async function tryRpc() {
  const { data, error } = await supabase.rpc("guard_user_id_types");
  if (error) return { ok: false, error };
  return { ok: true, data: data || [] };
}

async function fallbackInfoSchema() {
  const { data, error } = await supabase
    .from("information_schema.columns")
    .select("table_name, column_name, data_type")
    .eq("table_schema", "public")
    .in("table_name", TABLES)
    .eq("column_name", "user_id");

  if (error) return { ok: false, error };
  return { ok: true, data: data || [] };
}

async function main() {
  // 1) Prefer RPC (most reliable)
  let res = await tryRpc();

  // 2) Fallback to information_schema if RPC missing / blocked
  if (!res.ok) {
    res = await fallbackInfoSchema();
    if (!res.ok) {
      console.error("❌ guard-user-id-uuid FAILED: cannot query schema via RPC or information_schema.");
      console.error("RPC error:", res.error?.message || res.error);
      process.exit(1);
    }

    // Normalize fallback results to match RPC output shape
    const normalized = (res.data || []).map((r) => ({
      table_name: r.table_name,
      user_id_data_type: r.data_type,
      ok: r.data_type === "uuid",
    }));
    res = { ok: true, data: normalized };
  }

  const rows = res.data || [];
  const byTable = {};
  for (const r of rows) byTable[r.table_name] = r;

  const failures = [];
  for (const t of TABLES) {
    const row = byTable[t];
    if (!row) failures.push(`${t}: missing user_id column`);
    else if (row.user_id_data_type !== "uuid") failures.push(`${t}: user_id is ${row.user_id_data_type} (expected uuid)`);
  }

  if (failures.length) {
    console.error("❌ guard-user-id-uuid FAILED:");
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }

  console.log("✅ guard-user-id-uuid OK");
}

main().catch((e) => {
  console.error("❌ guard-user-id-uuid crashed:", e?.message || e);
  process.exit(1);
});
