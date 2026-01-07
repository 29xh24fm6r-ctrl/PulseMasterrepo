
import { createClient } from '@supabase/supabase-js';

// Load env vars (Assuming running with correct .env or hardcoded for test)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://your-project.supabase.co";
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "your-anon-key";

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Missing Supabase Env Vars");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function simulate() {
    console.log("🧠 Simulating God Mode Insights...");

    const scenarios = [
        {
            type: "truth_detection",
            content: "Micro-tremor detected. He is hesitant about the budget figure. Dig deeper.",
            confidence: 88,
            delay: 1000
        },
        {
            type: "negotiation_tactic",
            content: "Buying Signal: He mentioned 'timeline' twice. Pivot to closing now.",
            confidence: 94,
            delay: 4000
        },
        {
            type: "critical_alert",
            content: "⚠️ CAUTION: Do not commit to Q3. Your calendar is blocked.",
            confidence: 99,
            delay: 7000
        }
    ];

    for (const s of scenarios) {
        console.log(`Waiting ${s.delay}ms...`);
        await new Promise(r => setTimeout(r, s.delay));

        console.log(`⚡ Broadcasting: ${s.type}`);
        await supabase.channel('cyrano_whispers').send({
            type: 'broadcast',
            event: 'insight',
            payload: {
                id: Date.now().toString(),
                type: s.type,
                content: s.content,
                confidence: s.confidence,
                timestamp: new Date().toISOString()
            }
        });
    }

    console.log("✅ Simulation Complete.");
}

simulate();
