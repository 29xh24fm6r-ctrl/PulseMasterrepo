import { supabase } from "../src/lib/supabase.js";

async function main() {
    console.log("Checking identity_users...");
    const { data, error } = await supabase
        .from("identity_users")
        .select("id")
        .limit(1);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Users:", data);
    }
}

main();
