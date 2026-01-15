import "../src/lib/env.js"; // Load .env.local
import { IntentRouter } from "../src/agency/router.js";
import { tools } from "../src/agency/tools.js";

async function main() {
    const userId = "9a8ceb85-3bbc-4be7-b18e-b486578c4f1a";
    const router = new IntentRouter();

    console.log("=== 1. ROUTER VERIFICATION ===");

    const cases = [
        "Read my tasks",
        "Remind me to call Mom",
        "Add a task to... um... buy... something",
        "Yes, do it",
        "Cancel that"
    ];

    for (const text of cases) {
        console.log(`\nInput: "${text}"`);
        const result = await router.classify(text);
        console.log("Result:", JSON.stringify(result, null, 2));
    }

    console.log("\n=== 2. TOOL VERIFICATION ===");

    try {
        console.log("\n[Tool] Adding Task...");
        const addResult = await tools.addTask(userId, "Buy Verification Milk", "HIGH");
        console.log("Add Result:", addResult.voiceSummary);

        console.log("\n[Tool] Reading Tasks...");
        const readResult = await tools.readTasks(userId);
        console.log("Read Result:", readResult.voiceSummary);
        console.log("Data:", readResult.data.length > 0 ? "Found Tasks" : "No Tasks");

        console.log("\n[Tool] Capturing Note...");
        const noteResult = await tools.captureNote(userId, "Agency verification successful.");
        console.log("Note Result:", noteResult.voiceSummary);

    } catch (err) {
        console.error("Tool Verification Failed:", err);
    }
}

main();
