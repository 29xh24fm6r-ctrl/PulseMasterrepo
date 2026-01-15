import { IntentRouter } from "../src/agency/router.js";
import { tools } from "../src/agency/tools.js";

async function main() {
    console.log("--- Testing Agency Layer ---");

    // 1. Test Router
    const router = new IntentRouter();

    const testCases = [
        "Read my tasks",
        "Add a task to buy groceries",
        "What is my next meeting?",
        "Take a note that the project is running late",
        "Hello there, how are you?"
    ];

    for (const text of testCases) {
        console.log(`\nInput: "${text}"`);
        const intent = await router.classify(text);
        console.log("Intent:", JSON.stringify(intent, null, 2));

        if (intent.type !== "UNKNOWN") {
            const result = await executeTool(intent);
            console.log("Tool Output:", result.voiceSummary);
        }
    }
}

async function executeTool(intent: any) {
    switch (intent.type) {
        case "READ_TASKS": return await tools.readTasks();
        case "ADD_TASK": return await tools.addTask(intent.params.description, intent.params.priority);
        case "NEXT_MEETING": return await tools.nextMeeting();
        case "CAPTURE_NOTE": return await tools.captureNote(intent.params.content);
        default: return { success: false, data: null, voiceSummary: "Error" };
    }
}

main().catch(console.error);
