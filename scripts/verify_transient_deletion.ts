import fetch from "node-fetch";

const BASE_URL = "http://localhost:3000";

async function verifyDeletion() {
    console.log("🔒 Verifying Transient Analysis Privacy Protocol...");

    // Mock payload mimicking a Twilio webhook/request
    const payload = {
        sessionId: "mock-session-id-" + Date.now(),
        recordingUrl: "https://api.twilio.com/2010-04-01/Accounts/AC_MOCK/Recordings/RE_MOCK.mp3"
    };

    try {
        console.log("👉 Sending request to /api/comm/call/transcribe...");

        // Note: This requires the Next.js server to be running.
        // If not running, this will fail connection refused.
        const response = await fetch(`${BASE_URL}/api/comm/call/transcribe`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        console.log("Response:", data);

        if (data.privacy === "recording_deleted") {
            console.log("✅ SUCCESS: System attempted to delete the recording.");
        } else {
            console.log("❌ FAILURE: Privacy protocol did not trigger.");
        }

    } catch (error) {
        console.error("Test Error:", (error as any).message);
        console.log("NOTE: Ensure localhost:3000 is running for this integration test.");
    }
}

verifyDeletion();
