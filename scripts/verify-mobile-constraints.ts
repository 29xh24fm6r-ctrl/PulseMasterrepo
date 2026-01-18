
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import fetch from "node-fetch";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminClient = createClient(supabaseUrl, supabaseServiceKey);
const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

const WORKER_URL = `${baseUrl}/api/workflows/worker`;
const WORKER_SECRET = process.env.PULSE_EXECUTOR_SECRET || "dev-secret";

async function verifyMobileConstraints() {
    console.log("📱 Starting Phase 10A Verification: Mobile Constraints");
    let passed = true;

    // 0. Setup User
    const { data: users } = await adminClient.auth.admin.listUsers();
    let userId = users.users[0]?.id;

    if (!userId) {
        // User creation fallback same as previous script...
        console.log("⚠️ No users found. Creating test user...");
        const { data: newUser } = await adminClient.auth.admin.createUser({
            email: "mobile_verify@test.com", password: "password123", email_confirm: true
        });
        userId = newUser?.user?.id;
    }
    if (!userId) { console.error("❌ Failed to get user"); process.exit(1); }

    try {
        // 1. Create Parent Run
        const { data: parentRun } = await adminClient.from("pulse_runs").insert({
            owner_user_id: userId, kind: 'system', key: 'mobile_verify', status: 'running'
        }).select().single();

        // 2. Create Workflow Run (Queued) for iOS Context
        // Step 1: OK on Mobile
        // Step 2: NOT OK on Mobile
        const plan = {
            workflow_id: "mobile_test_v1",
            risk_class: "bounded",
            steps: [
                { step_id: "step_mobile_ok", executor_kind: "web.playwright", risk: "read", mobile_allowed: true },
                { step_id: "step_mobile_block", executor_kind: "phone.twilio", risk: "write", mobile_allowed: false }
            ]
        };

        const { data: wfRun } = await adminClient.from("workflow_runs").insert({
            owner_user_id: userId,
            parent_run_id: parentRun.id,
            status: 'queued',
            plan_json: plan,
            context_json: { client_platform: 'ios' } // THE TRIGGER
        }).select().single();

        console.log(`✅ Created iOS Context Workflow: ${wfRun.id}`);

        // --- TICK 1: START STEP 1 (Should work) ---
        console.log("\n[TICK 1] Step 1 (Allowed)...");
        const t1 = await tick();
        if (!t1.worked || t1.action !== 'started_step') {
            console.error("❌ Tick 1 Failed (Should be allowed):", t1);
            passed = false;
        } else {
            console.log("✅ Tick 1: Started allowed step.");
        }

        // Simulate success for Step 1
        const { data: exec1 } = await adminClient.from("exec_runs").select("id").eq("idempotency_key", `wf_${wfRun.id}_step_0`).single();
        await adminClient.from("exec_runs").update({ status: "succeeded" }).eq("id", exec1.id);

        // --- TICK 2: ADVANCE ---
        console.log("\n[TICK 2] Advancing...");
        await tick();
        console.log("✅ Tick 2: Advanced.");

        // --- TICK 3: START STEP 2 (Should SUSPEND) ---
        console.log("\n[TICK 3] Step 2 (Restricted)...");
        const t3 = await tick();

        if (t3.action !== 'suspended_mobile') {
            console.error("❌ Tick 3 Failed: Expected 'suspended_mobile', got:", t3);
            passed = false;
        } else {
            console.log(`✅ Tick 3 correctly suspended: ${t3.reason}`);
        }

        // Verify DB State
        const { data: pausedWf } = await adminClient.from("workflow_runs").select("*").eq("id", wfRun.id).single();
        if (pausedWf.status !== 'paused') {
            console.error(`❌ DB Status is ${pausedWf.status}, expected 'paused'`);
            passed = false;
        }
        if (pausedWf.error_json?.code !== 'MOBILE_SUSPENDED') {
            console.error(`❌ Error code mismatch:`, pausedWf.error_json);
            passed = false;
        }

        // Verify Event
        const { data: events } = await adminClient.from("pulse_run_events")
            .select("*")
            .eq("run_id", parentRun.id)
            .eq("event_type", "WORKFLOW_PAUSED_MOBILE");

        if (!events || events.length === 0) {
            console.error("❌ Missing WORKFLOW_PAUSED_MOBILE event");
            passed = false;
        } else {
            console.log("✅ Found WORKFLOW_PAUSED_MOBILE event");
        }

    } catch (err: any) {
        console.error("❌ Exception:", err.message);
        passed = false;
    }

    if (passed) {
        console.log("\n✅ VERIFICATION PASSED: Mobile Constraints Enforced.");
        process.exit(0);
    } else {
        console.error("\n❌ VERIFICATION FAILED.");
        process.exit(1);
    }
}

async function tick() {
    const res = await fetch(WORKER_URL, {
        method: "POST",
        headers: { "x-pulse-executor-secret": WORKER_SECRET }
    });
    if (!res.ok) throw new Error(`Worker returned ${res.status}`);
    return await res.json();
}

verifyMobileConstraints();
