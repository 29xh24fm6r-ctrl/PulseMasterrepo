
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { checkDelegation, recordDelegationUsage } from "../lib/autonomy/checkDelegation";

// Load env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

async function verifyDelegation() {
    console.log("📜 Starting Phase 11 Verification: Delegation Bounds");
    let passed = true;

    // 0. Setup User
    const { data: users } = await adminClient.auth.admin.listUsers();
    let userId = users.users[0]?.id;
    if (!userId) {
        console.log("⚠️ No users found. Creating test user...");
        const { data: newUser } = await adminClient.auth.admin.createUser({
            email: "delegation_verify@test.com", password: "password123", email_confirm: true
        });
        userId = newUser?.user?.id;
    }
    if (!userId) { console.error("❌ Failed to get user"); process.exit(1); }

    const intent = "grocery_shopping";
    const tmpl = "instacart_v1";

    try {
        // 1. Check Default Deny
        const res1 = await checkDelegation({
            owner_user_id: userId, intent_type: intent, workflow_template_id: tmpl, context: {}
        });
        if (res1.decision !== 'DENY') {
            console.error("❌ Expected DENY (No contract), got:", res1);
            passed = false;
        } else {
            console.log("✅ Passed Default Deny");
        }

        // 2. Create Contract
        const { data: contract, error: cErr } = await adminClient.from("delegation_contracts").insert({
            owner_user_id: userId,
            intent_type: intent,
            workflow_template_id: tmpl,
            max_executions: 2
        }).select().single();

        if (cErr) throw new Error(cErr.message);
        console.log(`✅ Created Contract: ${contract.id}`);

        // 3. Check Allow
        const res2 = await checkDelegation({
            owner_user_id: userId, intent_type: intent, workflow_template_id: tmpl, context: {}
        });
        if (res2.decision !== 'ALLOW') {
            console.error("❌ Expected ALLOW, got:", res2);
            passed = false;
        } else {
            console.log("✅ Passed Contract Allow");
        }

        // 4. Revoke
        await adminClient.from("delegation_contracts").update({ revoked_at: new Date().toISOString() }).eq("id", contract.id);

        // 5. Check Deny (Revoked)
        const res3 = await checkDelegation({
            owner_user_id: userId, intent_type: intent, workflow_template_id: tmpl, context: {}
        });
        if (res3.decision !== 'DENY') {
            console.error("❌ Expected DENY (Revoked), got:", res3);
            passed = false;
        } else {
            console.log("✅ Passed Revocation Check");
        }

        // 6. Create Limited Contract (Max 1)
        const { data: contractLimit } = await adminClient.from("delegation_contracts").insert({
            owner_user_id: userId,
            intent_type: intent,
            workflow_template_id: "limit_test",
            max_executions: 1
        }).select().single();

        // 7. Check Allow
        const res4 = await checkDelegation({
            owner_user_id: userId, intent_type: intent, workflow_template_id: "limit_test", context: {}
        });
        if (res4.decision !== 'ALLOW') {
            console.error("❌ Expected ALLOW (Fresh Limit), got:", res4);
            passed = false;
        }

        // 8. Record Usage
        await recordDelegationUsage(contractLimit.id);
        console.log("✅ Recorded Usage (1/1)");

        // 9. Check Escalate (Limit Reached)
        const res5 = await checkDelegation({
            owner_user_id: userId, intent_type: intent, workflow_template_id: "limit_test", context: {}
        });
        if (res5.decision !== 'ESCALATE') {
            console.error("❌ Expected ESCALATE (Limit Reached), got:", res5);
            passed = false;
        } else {
            console.log("✅ Passed Limit Enforcement (Escalate)");
        }

    } catch (err: any) {
        console.error("❌ Exception:", err.message);
        passed = false;
    }

    if (passed) {
        console.log("\n✅ VERIFICATION PASSED: Delegation Logic.");
        process.exit(0);
    } else {
        console.error("\n❌ VERIFICATION FAILED.");
        process.exit(1);
    }
}

verifyDelegation();
