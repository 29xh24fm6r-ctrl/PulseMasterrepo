/**
 * Pulse Canon Gate — Node/pg version (no psql dependency)
 *
 * Requires:
 *  - SUPABASE_DB_URL (postgres connection string)
 *
 * Runs:
 *  - select public.pulse_canon_gate();
 *
 * Exit codes:
 *  - 0: pass
 *  - 1: fail
 */

import pg from "pg";
import dotenv from "dotenv";

// Try loading .env.local first, then default .env
dotenv.config({ path: ".env.local" });
dotenv.config();

const { Client } = pg;

function requireEnv(name: string): string {
    // Check primary name, then fallback to DATABASE_URL if looking for DB URL
    const v = process.env[name] || (name === "SUPABASE_DB_URL" ? process.env["DATABASE_URL"] : undefined);
    if (!v || !v.trim()) {
        console.error(`❌ Missing required env var: ${name} (or DATABASE_URL)`);
        process.exit(1);
    }
    return v.trim();
}

async function main() {
    const url = requireEnv("SUPABASE_DB_URL");

    const client = new Client({
        connectionString: url,
        ssl: url.includes("sslmode=require") ? undefined : { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        console.log("✅ Connected");

        // Canon gate function must exist in public schema
        await client.query("select public.pulse_canon_gate();");

        console.log("✅ Canon gate PASS");
        process.exit(0);
    } catch (err: any) {
        console.error("❌ Canon gate FAIL");
        console.error(err?.message ?? err);
        process.exit(1);
    } finally {
        try {
            await client.end();
        } catch { }
    }
}

main();
