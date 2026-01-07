
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

console.log("Checking Env Vars:");
console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "Defined" : "MISSING");
console.log("KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "Defined" : "MISSING");

async function run() {
    try {
        console.log("Importing Supabase...");
        const { supabaseAdmin } = await import("../lib/supabase");
        console.log("Supabase Admin Import Success:", !!supabaseAdmin);
    } catch (e) {
        console.error("Supabase Import Failed:", e);
    }
}

run();
