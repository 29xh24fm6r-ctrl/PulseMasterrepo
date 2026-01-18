
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
const WORKER_SECRET = process.env.PULSE_EXECUTOR_SECRET || "dev-secret"; // Fallback for dev

async function verifyWorkflow() {
    console.log("🛠️ Starting Phase 10 Verification: Workflow Canon");
    let passed = true;

    // 0. Setup User
    const { data: users } = await adminClient.auth.admin.listUsers();
    let userId = users.users[0]?.id;

    if (!userId) {
        console.log("⚠️ No users found. Creating test user...");
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
            email: "verify_canon@example.com",
            password: "password123",
            email_confirm: true
        });
        if (createError) {
            console.error("❌ Failed to create test user:", createError.message);
            process.exit(1);
        }
        userId = newUser.user.id;
        console.log(`✅ Created test user: ${userId}`);
    }

    try {
        // 1. Create Parent Pulse Run
        const { data: parentRun, error: prErr } = await adminClient
            .from("pulse_runs")
            .insert({
                owner_user_id: userId,
                kind: 'system',
                key: 'verify_workflow_test',
                status: 'running'
            })
            .select()
            .single();

        if (prErr) throw new Error(`Parent Run creation failed: ${prErr.message}`);
        console.log(`✅ Created Parent Run: ${parentRun.id}`);

        // 2. Create Workflow Run (Queued) with 2 Steps
        const plan = {
            workflow_id: "verify_canon_v1",
            risk_class: "bounded",
            steps: [
                { step_id: "step_1", executor_kind: "web.playwright", risk: "read", mobile_allowed: true },
                { step_id: "step_2", executor_kind: "delivery.track", risk: "read", mobile_allowed: true }
            ]
        };

        const { data: wfRun, error: wfErr } = await adminClient
            .from("workflow_runs")
            .insert({
                owner_user_id: userId,
                parent_run_id: parentRun.id,
                status: 'queued',
                plan_json: plan
            })
            .select()
            .single();

        if (wfErr) throw new Error(`Workflow Run creation failed: ${wfErr.message}`);
        console.log(`✅ Created Workflow Run: ${wfRun.id}`);

        // --- TICK 1: START STEP 1 ---
        console.log("\n[TICK 1] Triggering Worker...");
        const t1 = await tick();
        if (!t1.worked || t1.action !== 'started_step' || t1.step !== 'step_1') {
            console.error("❌ Tick 1 Failed:", t1);
            passed = false;
        } else {
            console.log("✅ Tick 1: Started Step 1");
        }

        // 3. Simulate Step 1 Success (Direct DB Update)
        // Find the exec_run for step 1
        const { data: exec1 } = await adminClient.from("exec_runs")
            .select("id")
            .eq("run_kind", "web.playwright")
            .eq("owner_user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (!exec1) throw new Error("Could not find Exec Run 1");

        await adminClient.from("exec_runs").update({ status: "succeeded", result_json: { foo: "bar" } }).eq("id", exec1.id);
        console.log(`✅ Simulated Step 1 Success (Exec ${exec1.id})`);

        // --- TICK 2: ADVANCE TO STEP 2 ---
        console.log("\n[TICK 2] Triggering Worker...");
        const t2 = await tick();
        // Expect: advanced_step
        if (!t2.worked || t2.action !== 'advanced_step' || t2.to !== 1) {
            console.error("❌ Tick 2 Failed:", t2);
            passed = false;
        } else {
            console.log("✅ Tick 2: Advanced to Step Index 1");
        }

        // --- TICK 3: START STEP 2 ---
        console.log("\n[TICK 3] Triggering Worker...");
        const t3 = await tick();
        if (!t3.worked || t3.action !== 'started_step' || t3.step !== 'step_2') {
            console.error("❌ Tick 3 Failed:", t3);
            passed = false;
        } else {
            console.log("✅ Tick 3: Started Step 2");
        }

        // 4. Simulate Step 2 Success
        const { data: exec2 } = await adminClient.from("exec_runs")
            .select("id")
            .eq("run_kind", "delivery.track")
            .eq("owner_user_id", userId)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

        if (!exec2) throw new Error("Could not find Exec Run 2");
        await adminClient.from("exec_runs").update({ status: "succeeded" }).eq("id", exec2.id);
        console.log(`✅ Simulated Step 2 Success (Exec ${exec2.id})`);

        // --- TICK 4: FINISH WORKFLOW ---
        console.log("\n[TICK 4] Triggering Worker...");
        const t4 = await tick();
        // Expect: advanced_step -> completed in same tick logic? 
        // Actually my worker logic does: 1. check current step exec. 2. if succeed -> advance index. 
        // Next tick will see index >= length -> complete.
        // So Tick 4 advances index to 2.
        if (!t4.worked || t4.action !== 'advanced_step' || t4.to !== 2) {
            console.error("❌ Tick 4 Failed (Advance):", t4);
            passed = false;
        } else {
            console.log("✅ Tick 4: Advanced to Step Index 2 (End of Plan)");
        }

        // --- TICK 5: REMOVED (Eager completion in Tick 4) ---
        // The worker automatically marks 'succeeded' when advancing past the last step.

        // 5. Verify Workflow Status
        const { data: finalWf } = await adminClient.from("workflow_runs").select("status").eq("id", wfRun.id).single();
        if (finalWf.status !== 'succeeded') {
            console.error(`❌ Workflow status is ${finalWf.status}, expected 'succeeded'`);
            passed = false;
        } else {
            console.log("✅ Workflow Run marked 'succeeded'");
        }

        // 6. Verify Events
        const { data: events } = await adminClient.from("pulse_run_events").select("*").eq("run_id", parentRun.id);
        console.log(`✅ Found ${events?.length} run events.`);

        const eventTypes = events?.map(e => e.event_type);
        if (!eventTypes?.includes("WORKFLOW_STEP_STARTED") || !eventTypes.includes("WORKFLOW_STEP_COMPLETED")) {
            console.error("❌ Missing required workflow events. Got:", eventTypes);
            passed = false;
        }

    } catch (err: any) {
        console.error("❌ Exception during verification:", err.message);
        passed = false;
    }

    if (passed) {
        console.log("\n✅ VERIFICATION PASSED: Multi-step execution verified.");
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

verifyWorkflow();
