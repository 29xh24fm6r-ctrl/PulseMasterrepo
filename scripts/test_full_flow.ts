
import dotenv from "dotenv";

// Load env vars BEFORE importing modules that use them
dotenv.config({ path: ".env.local" });

const MOCK_USER_ID = "00000000-0000-0000-0000-000000000000";

async function verifyCortexFlow() {
    console.log("🧠 Verifying Cortex Logic & Persistence...");

    // Dynamic Imports to ensure env vars are loaded first
    const { CortexEngine } = await import("@/lib/cortex/engine");
    const { supabaseAdmin } = await import("@/lib/supabase/admin");

    // 1. Simulate Engine Process
    const engine = new CortexEngine(MOCK_USER_ID);

    // Create a mock signal that SHOULD trigger a low-confidence action (pending)
    // We use 'any' for type compliance in this script since Signal interface isn't available at runtime
    const mockSignal: any = {
        id: "test-signal-db-1",
        type: "email_action",
        sourceId: "mock-email-123",
        priority: "medium",
        timestamp: new Date().toISOString(),
        payload: {
            email: {
                id: "msg_123",
                threadId: "t123",
                subject: "Ambiguous Request",
                snippet: "I might need help with X, let's discuss maybe?",
                fromName: "Stranger",
                fromAddress: "stranger@example.com",
                body: "Full body text...",
                receivedAt: new Date()
            },
            detectedAction: {
                type: "reply_required",
                description: "User is asking for help",
                confidence: 0.8
            }
        }
    };

    const actions = await engine.process([mockSignal]);
    const action = actions[0];

    if (!action) {
        console.error("❌ No action generated!");
        return;
    }

    console.log(`✅ Action Generated: ${action.title} (Confidence: ${action.confidence})`);

    // 2. Simulate Persistence (like the sync route does)
    console.log("💾 Persisting to DB...");
    const { error } = await supabaseAdmin.from('proposed_actions').insert({
        id: action.id,
        user_id: MOCK_USER_ID, // Ensure this user exists or validation will fail if FK is strict
        title: action.title,
        reasoning: action.reasoning,
        type: action.type,
        payload: action.payload,
        confidence: action.confidence,
        status: 'pending'
    });

    if (error) {
        // If error is FK constraint, we know it tried to insert.
        if (error.code === '23503') {
            console.log("⚠️ FK Constraint Error (User missing), but DB Connection works!");
        } else {
            console.error("❌ DB Insert Failed:", error);
            return;
        }
    } else {
        console.log("✅ DB Insert Success");
    }

    // 3. Verify Fetch
    const { data } = await supabaseAdmin
        .from('proposed_actions')
        .select('*')
        .eq('id', action.id)
        .single();

    if (data) {
        console.log("✅ Retrieved Action from DB:", data.title);
    } else {
        console.log("⚠️ Could not retrieve action (might be due to previous insert failure)");
    }
}

verifyCortexFlow();
