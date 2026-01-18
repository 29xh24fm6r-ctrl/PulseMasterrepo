import { checkEligibility } from "../lib/autonomy/checkEligibility";
import { getSupabaseAdmin } from "../lib/supabase/admin";

async function main() {
    console.log("Verifying Autonomy Gates...");

    const owner = "00000000-0000-0000-0000-000000000000";
    const intent = "test.autonomy";
    const supabase = getSupabaseAdmin();

    // Reset
    await supabase.from("autonomy_scores").delete().eq("owner_user_id", owner).eq("intent_type", intent);

    // 1. Default (L0)
    let decision = await checkEligibility({ owner_user_id: owner, intent_type: intent, confidence: 0.99 });
    console.log("Default (L0):", decision);
    if (decision.decision !== "PROPOSE") throw new Error("Default should be PROPOSE");

    // 2. Set to L1
    await supabase.from("autonomy_scores").insert({
        owner_user_id: owner,
        intent_type: intent,
        autonomy_level: "l1"
    });

    // 3. L1 with Low Confidence
    decision = await checkEligibility({ owner_user_id: owner, intent_type: intent, confidence: 0.5 });
    console.log("L1 Low Conf:", decision);
    if (decision.decision !== "PROPOSE") throw new Error("L1 Low Conf should be PROPOSE");

    // 4. L1 with High Confidence
    decision = await checkEligibility({ owner_user_id: owner, intent_type: intent, confidence: 0.95 });
    console.log("L1 High Conf:", decision);
    if (decision.decision !== "ALLOW") throw new Error("L1 High Conf should be ALLOW");

    console.log("Autonomy Gates OK.");
}

main().catch(console.error);
