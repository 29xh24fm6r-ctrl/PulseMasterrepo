import WebSocket from 'ws';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    console.error("❌ No GEMINI_API_KEY found in .env.local");
    process.exit(1);
}

const HOST = "generativelanguage.googleapis.com";
const PATH = "/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";
const URL = `wss://${HOST}${PATH}?key=${API_KEY}`;

console.log(`🔌 Connecting to: ${URL.replace(API_KEY, "HIDDEN_KEY")}`);

const ws = new WebSocket(URL);

ws.on('open', () => {
    console.log("✅ WebSocket Open!");

    // Minimal Setup Payload
    const setupMsg = {
        setup: {
            model: "models/gemini-2.0-flash-exp",
            generationConfig: {
                responseModalities: ["AUDIO"]
            }
        }
    };

    console.log("📤 Sending Setup:", JSON.stringify(setupMsg, null, 2));
    ws.send(JSON.stringify(setupMsg));

    // Send a text message after a short delay
    setTimeout(() => {
        const textMsg = {
            clientContent: {
                turns: [{
                    role: "user",
                    parts: [{ text: "Hello, can you hear me?" }]
                }],
                turnComplete: true
            }
        };
        console.log("📤 Sending Text Probe...");
        ws.send(JSON.stringify(textMsg));
    }, 1000);
});

ws.on('message', (data) => {
    console.log("📥 Received:", data.toString());
});

ws.on('close', (code, reason) => {
    console.log(`🔌 Closed: ${code} - ${reason}`);
});

ws.on('error', (err) => {
    console.error("🔥 Error:", err);
});
