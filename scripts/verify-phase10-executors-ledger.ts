import { createExecution, enqueueJob } from "../services/executors/ledger";
import { getSupabaseAdmin } from "../lib/supabase/admin";

async function main() {
    console.log("Verifying Ledger...");

    // Mock user
    const owner = "00000000-0000-0000-0000-000000000000"; // Should be real if RLS active, but this runs as admin so it's fine for insertion
    const kind = "test.run";
    const key = "test_verify_" + Date.now();

    const r1 = await createExecution({ owner_user_id: owner, run_kind: kind, request: { foo: "bar" }, idempotency_key: key });
    console.log("Run 1:", r1);

    const r2 = await createExecution({ owner_user_id: owner, run_kind: kind, request: { foo: "bar" }, idempotency_key: key });
    console.log("Run 2 (Duplicate):", r2);

    if (r1.run_id !== r2.run_id) throw new Error("Idempotency failed: IDs differ");
    if (r1.is_new !== true) throw new Error("First run not marked new");
    if (r2.is_new !== false) throw new Error("Second run marked new");

    console.log("Ledger OK.");
}

main().catch(console.error);
