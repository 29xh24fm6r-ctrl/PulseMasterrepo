import { pulseVertex } from "../lib/pulse/vertex-ai";

async function testVertex() {
    console.log("🧠 Testing Vertex AI Connection (Gemini 1.5 Pro)...");
    try {
        const text = await pulseVertex.generateText("Hello! Are you online? Reply with 'Pulse Online'.");
        console.log("✅ Response:", text);

        if (text.includes("Pulse Online")) {
            console.log("SUCCESS: Vertex AI is active.");
        } else {
            console.log("WARNING: Unexpected response.");
        }
    } catch (error) {
        console.error("❌ Vertex AI Test Failed:", JSON.stringify(error, null, 2));
        if (error instanceof Error) console.error(error.message);
    }
}

testVertex();
