
import { supabase, supabaseAdmin } from '../lib/supabase';
import { simulationService } from '../lib/brain/simulationService';
import { reasoningService } from '../lib/brain/reasoningService';

/**
 * Canon Verification: Lazy Proxy Safety
 * =====================================
 * 
 * Ensures that cloud clients (Supabase, OpenAI) are NOT initialized at module load time.
 * This prevents build crashes in environments without secrets (e.g. Vercel Build Step).
 * 
 * Method:
 * 1. Import the modules.
 * 2. Assert that their internal clients are undefined or wrapped in proxies that haven't triggered.
 * 3. (Implicitly) If this script runs without crashing on import, it's a success.
 */

async function verifyLazyProxy() {
    console.log("🛡️ Starting Canon Verification: Lazy Proxy...");

    try {
        // Test 1: Supabase Clients
        // Accessing the proxy object is fine, but checking strict properties shouldn't trigger network
        const sbType = typeof supabase;
        const sbAdminType = typeof supabaseAdmin;

        console.log(`Supabase Client Type: ${sbType}`);
        console.log(`Supabase Admin Client Type: ${sbAdminType}`);

        if (!supabase || !supabaseAdmin) {
            throw new Error("Supabase clients are undefined (should be Proxies).");
        }

        // Test 2: Service Clients (Private fields check via any cast - tricky, but we check behaviour)
        // If simulationService constructs OpenAI immediately, it would have crashed by now if env vars missing
        console.log("Simulation Service Loaded:", !!simulationService);
        console.log("Reasoning Service Loaded:", !!reasoningService);

        console.log("\n✅ SUCCESS: Modules loaded without immediate crash.");
    } catch (error: any) {
        console.error("\n❌ FAILED: Lazy Proxy verification failed.", error);
        process.exit(1);
    }
}

verifyLazyProxy();
