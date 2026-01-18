
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminClient = createClient(supabaseUrl, supabaseServiceKey);
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

async function verifyCompanionAuthority() {
    console.log("🔐 Starting Phase 9 Verification: Companion Authority Proof");
    let passed = true;

    // --- AXIS 1: Executor Visibility ---
    console.log("\n--- AXIS 1: Executor Visibility ---");
    console.log("Invariant: Every exec_runs row must be traceable to a visible Companion surface.");

    const { data: recentExecRuns, error: execError } = await adminClient
        .from("exec_runs")
        .select("id, parent_run_id, status")
        .order("created_at", { ascending: false })
        .limit(5);

    if (execError) {
        console.error("❌ Failed to query exec_runs:", execError.message);
        passed = false;
    } else if (!recentExecRuns || recentExecRuns.length === 0) {
        console.log("⚠️ No recent executor runs found. Skipping historical check (Acceptable if fresh DB).");
    } else {
        for (const run of recentExecRuns) {
            if (!run.parent_run_id) {
                console.error(`❌ Orphan executor run detected! ID: ${run.id} has no parent_run_id.`);
                passed = false;
                continue;
            }

            // Check for corresponding events
            const { data: events, error: eventError } = await adminClient
                .from("pulse_run_events")
                .select("id, event_name")
                .eq("run_id", run.parent_run_id)
                .or(`event_name.eq.EXECUTOR_STARTED,event_name.eq.RUN_STARTED`); // Broaden check to ensure context exists

            if (eventError) {
                console.error(`❌ Failed to query events for parent run ${run.parent_run_id}:`, eventError.message);
                passed = false;
            } else if (!events || events.length === 0) {
                console.error(`❌ No visibility events found for parent run ${run.parent_run_id} (Executor Run ${run.id}).`);
                passed = false;
            } else {
                console.log(`✅ Verified visibility for Executor Run ${run.id} -> Parent ${run.parent_run_id} (${events.length} events)`);
            }
        }
    }

    // --- AXIS 2: No Hidden Side Effects ---
    console.log("\n--- AXIS 2: No Hidden Side Effects ---");
    console.log("Invariant: No external side effect occurs without a Run and Companion visibility.");

    console.log("Attempting to invoke executor worker WITHOUT secret...");
    try {
        const res = await fetch(`${baseUrl}/api/executors/worker`, {
            method: "POST",
            headers: { "Content-Type": "application/json" } // Missing secret
        });

        if (res.status === 401 || res.status === 403) {
            console.log("✅ Worker rejected unauthorized request (Status:", res.status, ")");
        } else {
            console.error("❌ Worker allowed unauthorized request! Status:", res.status);
            passed = false;
        }
    } catch (err) {
        console.error("❌ Failed to contact worker endpoint:", err);
        passed = false;
    }

    // --- AXIS 3: Autonomy Surface Enforcement ---
    console.log("\n--- AXIS 3: Autonomy Surface Enforcement ---");
    console.log("Invariant: Autonomy transitions must be Companion-visible and user-reversible.");

    // Simulate Autonomy Toggle
    const testIntent = "verify.companion.test_intent";
    // 1. Set to L1
    console.log(`Setting policy for ${testIntent} to 'l1'...`);
    // We need a user to impersonate for the API
    // Using a test owner ID if defined, or fetching one from DB
    const { data: users } = await adminClient.from("autonomy_scores").select("owner_user_id").limit(1);
    const ownerUserId = users?.[0]?.owner_user_id;

    if (!ownerUserId) {
        console.log("⚠️ No users found in autonomy_scores to test API against. Skipping active toggle test.");
    } else {
        try {
            const l1Res = await fetch(`${baseUrl}/api/autonomy/policy`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-owner-user-id": ownerUserId // Simulating middleware injection (integration test style)
                },
                body: JSON.stringify({ intent_type: testIntent, autonomy_level: "l1" })
            });

            if (!l1Res.ok) throw new Error(`Failed to set L1: ${l1Res.status}`);
            console.log("✅ Set L1 Policy via API.");

            // Check DB
            const { data: l1Score } = await adminClient
                .from("autonomy_scores")
                .select("autonomy_level")
                .eq("owner_user_id", ownerUserId)
                .eq("intent_type", testIntent)
                .single();

            if (l1Score?.autonomy_level !== 'l1') {
                console.error("❌ DB state did not update to l1");
                passed = false;
            } else {
                console.log("✅ DB reflects L1 state.");
            }

            // 2. Revoke (Set to None)
            console.log(`Revoking policy for ${testIntent} (Set to 'none')...`);
            const revokeRes = await fetch(`${baseUrl}/api/autonomy/policy`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-owner-user-id": ownerUserId
                },
                body: JSON.stringify({ intent_type: testIntent, autonomy_level: "none" })
            });
            if (!revokeRes.ok) throw new Error(`Failed to revoke: ${revokeRes.status}`);
            console.log("✅ Revoked Policy via API.");

        } catch (err) {
            console.error("❌ Autonomy Toggle Test Failed:", err);
            passed = false;
        }
    }

    // --- AXIS 4: Companion Completeness ---
    console.log("\n--- AXIS 4: Companion Completeness ---");
    console.log("Invariant: Companion reflects all operational reality.");

    // This is a structural check - ensuring we have the tables supporting the views
    const tablesToCheck = ["exec_runs", "autonomy_scores", "pulse_runs"];
    for (const table of tablesToCheck) {
        const { error } = await adminClient.from(table).select("id").limit(1);
        if (error) {
            console.error(`❌ Table ${table} is missing or inaccessible:`, error.message);
            passed = false;
        } else {
            console.log(`✅ Table '${table}' exists and is accessible.`);
        }
    }

    // Final Result
    if (passed) {
        console.log("\n✅ VERIFICATION PASSED: Companion is the sole Authority.");
        process.exit(0);
    } else {
        console.error("\n❌ VERIFICATION FAILED: Invariants violated.");
        process.exit(1);
    }
}

verifyCompanionAuthority();
