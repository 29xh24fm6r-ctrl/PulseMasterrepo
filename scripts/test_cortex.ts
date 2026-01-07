
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

// Mock Data
const MOCK_USER_ID = "user_123";
const MOCK_EMAIL_SIGNAL = {
    id: "sig_001",
    type: "email_action",
    sourceId: "msg_abc123",
    priority: "high",
    timestamp: new Date().toISOString(),
    payload: {
        email: {
            id: "msg_abc123",
            fromName: "Important Client",
            fromEmail: "client@example.com",
            subject: "Project Deadline?",
            body: "Hi, when can we expect the final delivery? We need it by Friday.",
            receivedAt: new Date(),
            threadId: "th_123"
        },
        detectedAction: {
            type: "reply_required",
            description: "Client asking for deadline confirmation",
            priority: "high",
            confidence: 0.95
        }
    }
};

async function test() {
    console.log("🧠 Testing Cortex Engine...");

    // Dynamic import ensures dotenv loads first
    const { CortexEngine } = await import("../lib/cortex/engine");

    const engine = new CortexEngine(MOCK_USER_ID);

    // Inject Mock Signal
    // @ts-ignore
    const actions = await engine.process([MOCK_EMAIL_SIGNAL]);

    console.log("\n👇 PROPOSED ACTIONS:");
    console.log(JSON.stringify(actions, null, 2));

    if (actions.length > 0 && actions[0].type === "draft_reply") {
        console.log("\n✅ SUCCESS: Cortex generated a reply draft.");
    } else {
        console.log("\n❌ FAILURE: No action generated.");
    }
}

test();
