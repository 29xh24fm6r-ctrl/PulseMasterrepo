/**
 * Production Smoke Test
 *
 * Requires:
 *  - SUPABASE_DB_URL
 * Optional:
 *  - PROD_BASE_URL (e.g. https://pulse-life-os.vercel.app)
 *
 * Checks:
 *  1) public.pulse_canon_gate() passes
 *  2) All public tables with a user_id column have RLS enabled
 *  3) (Optional) health endpoint responds 200
 */

import pg from "pg";

const { Client } = pg;

function env(name: string): string | undefined {
    const v = process.env[name];
    return v && v.trim() ? v.trim() : undefined;
}

function requireEnv(name: string): string {
    const v = env(name);
    if (!v) {
        console.error(`❌ Missing required env vars: ${name}`);
        process.exit(1);
    }
    return v;
}

async function checkHttp(baseUrl: string) {
    const url = baseUrl.replace(/\/$/, "") + "/api/health";
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP health failed: ${res.status} ${res.statusText} ${text}`);
    }
    console.log(`✅ HTTP health OK: ${url}`);
}

async function main() {
    const dbUrl = requireEnv("SUPABASE_DB_URL");
    const baseUrl = env("PROD_BASE_URL");

    const client = new Client({
        connectionString: dbUrl,
        ssl: dbUrl.includes("sslmode=require") ? undefined : { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        console.log("✅ Connected");

        // 1) Canon gate
        await client.query("select public.pulse_canon_gate();");
        console.log("✅ Canon gate PASS");

        // 2) RLS enabled on all public tables that contain user_id
        // Canon rule: every table with user_id must have RLS enabled.
        const rls = await client.query<{
            table_schema: string;
            table_name: string;
            rls_enabled: boolean;
        }>(
            `
      with user_id_tables as (
        select c.table_schema, c.table_name
        from information_schema.columns c
        where c.table_schema = 'public'
          and c.column_name = 'user_id'
      )
      select
        t.table_schema,
        t.table_name,
        cls.relrowsecurity as rls_enabled
      from user_id_tables t
      join pg_class cls on cls.relname = t.table_name
      join pg_namespace ns on ns.oid = cls.relnamespace and ns.nspname = t.table_schema
      where cls.relkind = 'r'
      order by t.table_name;
      `
        );

        const missingRls = rls.rows.filter((r) => !r.rls_enabled);
        if (missingRls.length) {
            console.error("❌ RLS missing on tables with user_id:");
            for (const r of missingRls) console.error(` - ${r.table_schema}.${r.table_name}`);
            process.exit(1);
        }
        console.log("✅ RLS coverage OK");

        // 3) Optional HTTP check
        if (baseUrl) {
            await checkHttp(baseUrl);
        } else {
            console.log("ℹ️ PROD_BASE_URL not set — skipping HTTP health check");
        }

        console.log("✅ PROD SMOKE PASS");
        process.exit(0);
    } catch (err: any) {
        console.error("❌ PROD SMOKE FAIL");
        console.error(err?.message ?? err);
        process.exit(1);
    } finally {
        try {
            await client.end();
        } catch { }
    }
}

main();
