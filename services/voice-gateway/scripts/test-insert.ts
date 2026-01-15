import "../src/lib/env.js";
import { supabase } from "../src/lib/supabase.js";
import { randomUUID } from "crypto";

async function main() {
    const userIdUuid = "9a8ceb85-3bbc-4be7-b18e-b486578c4f1a";
    console.log(`Attempting insert into tasks for user_id_uuid: ${userIdUuid}`);

    // Mimic app/api/tasks/create/route.ts payload
    const payload = {
        user_id_uuid: userIdUuid,
        title: "Verification Task",
        name: "Verification Task", // Required legacy
        status: "in_progress",
        priority: 2,
        owner_user_id_legacy: "verification_script" // Required legacy
    };

    const { data, error } = await supabase.from("tasks").insert(payload).select().single();

    if (error) {
        console.error("Insert Failed:", error);
    } else {
        console.log("Insert Success:", data);
    }
}

main();
