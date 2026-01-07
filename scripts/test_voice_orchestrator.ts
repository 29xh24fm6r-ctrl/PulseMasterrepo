
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local manually
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testVoiceOrchestrator() {
    // Dynamically import to ensure env vars are loaded
    const { processVoiceCommand } = await import('../lib/voice/orchestrator');

    // Hardcoded known user ID (from previous context or env)
    // Using the admin user ID seen in admin/stats route: user_36NzFTiYlRlzKxEfTw2FXrnVJNe
    // Or referencing verify_journal.ts logic to fetch one.
    const userId = "user_36NzFTiYlRlzKxEfTw2FXrnVJNe";

    console.log("🎤 Testing Voice Orchestrator...");
    console.log(`User ID: ${userId}`);

    const testCases = [
        "What's on my plan for today?",
        "Add call mom to my task list",
        "I'm feeling a bit overwhelmed today",
        "What are my insights?"
    ];

    for (const transcript of testCases) {
        console.log(`\n-----------------------------------`);
        console.log(`🗣️  Input: "${transcript}"`);
        try {
            const result = await processVoiceCommand(userId, transcript);
            console.log(`🤖 Intent: ${result.intent} (Confidence: ${result.confidence})`);
            console.log(`💬 Response: "${result.response}"`);
            if (result.actions && result.actions.length > 0) {
                console.log(`⚡ Actions:`, JSON.stringify(result.actions));
            }
        } catch (error) {
            console.error("❌ Error processing command:", error);
        }
    }
}

testVoiceOrchestrator();
