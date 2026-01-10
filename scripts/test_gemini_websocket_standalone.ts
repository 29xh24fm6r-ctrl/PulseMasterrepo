
import { GoogleAuth } from 'google-auth-library';
import WebSocket from 'ws';

async function testGeminiWebSocket() {
    const projectId = 'pulse-life-os-2a8c9';
    const location = 'us-central1';
    const model = 'gemini-1.5-flash-001';

    console.log("🚀 Starting Standalone WebSocket Test...");

    const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    try {
        const client = await auth.getClient();
        const token = await client.getAccessToken();
        const accessToken = token.token;

        if (!accessToken) throw new Error("No access token");

        const url = `wss://${location}-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`;
        console.log(`🔌 Connecting to: ${url}`);

        const ws = new WebSocket(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Host': `${location}-aiplatform.googleapis.com`
            }
        });

        ws.on('open', () => {
            console.log("✅ WebSocket Connected!");

            const setupMsg = {
                setup: {
                    model: `publishers/google/models/${model}`
                }
            };

            console.log("📤 Sending Setup...");
            ws.send(JSON.stringify(setupMsg));

            setTimeout(() => {
                console.log("📤 Sending Text Greeting...");
                const msg = {
                    clientContent: {
                        turns: [{
                            role: "user",
                            parts: [{ text: "Hello! Are you there?" }]
                        }],
                        turnComplete: true
                    }
                };
                ws.send(JSON.stringify(msg));
            }, 1000);
        });

        ws.on('message', (data) => {
            console.log("📥 Received Message (Length: " + data.length + ")");
            try {
                const parsed = JSON.parse(data.toString());
                console.log(JSON.stringify(parsed, null, 2));
            } catch (e) {
                console.log("Raw Data:", data.toString());
            }
        });

        ws.on('error', (err) => {
            console.error("🔥 WebSocket Error:", err.message);
            process.exit(1);
        });
        ws.on('close', (code, reason) => {
            console.log(`🔌 Closed: ${code} - ${reason}`);
            process.exit(0);
        });

    } catch (e) {
        console.error("Fatal Error:", e);
        process.exit(1);
    }
}

testGeminiWebSocket();
