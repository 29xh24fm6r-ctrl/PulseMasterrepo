
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local manually
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testEmailIntelligence() {
    const { classifyAndExtractActions } = await import('../lib/pulse/email-intelligence');
    const { generateAutoDraft } = await import('../lib/pulse/email-drafter');

    console.log("📧 Testing Email Intelligence...");

    const mockEmails = [
        {
            id: "mock_123",
            from: "John Doe <john@example.com>",
            fromName: "John Doe",
            fromEmail: "john@example.com",
            subject: "Project Update",
            body: "Hi there, can you please send me the Q4 report by Friday? Also, let's schedule a call for next Tuesday to discuss the marketing strategy. Thanks, John.",
            date: new Date().toISOString()
        },
        {
            id: "mock_456",
            from: "Amazon <orders@amazon.com>",
            fromName: "Amazon",
            fromEmail: "orders@amazon.com",
            subject: "Your order has shipped",
            body: "Your package is on the way. Track your package here.",
            date: new Date().toISOString()
        }
    ];

    console.log(`\n🔍 Analyzing ${mockEmails.length} mock emails...`);
    const { contacts, actions } = await classifyAndExtractActions(mockEmails);

    console.log(`✅ Found ${actions.length} actions.`);
    console.log(`✅ Found ${contacts.length} contacts.`);

    if (actions.length > 0) {
        console.log("\n📝 Detected Actions:");
        console.log(JSON.stringify(actions, null, 2));

        console.log("\n🤖 Generating Auto-Drafts...");

        // Mock User ID (use existing test ID or env)
        const userId = "user_36NzFTiYlRlzKxEfTw2FXrnVJNe";

        for (const action of actions) {
            const email = mockEmails.find(e => e.id === action.messageId);
            if (email) {
                const draft = await generateAutoDraft(userId, email, action, { name: "Test User" });
                if (draft) {
                    console.log(`\n✅ Draft Generated for Action: ${action.type}`);
                    console.log(`-----------------------------------`);
                    console.log(draft.content);
                    console.log(`-----------------------------------`);
                } else {
                    console.log(`❌ Failed to generate draft for action: ${action.type}`);
                }
            }
        }
    }
}

testEmailIntelligence().catch(console.error);
