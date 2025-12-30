
import pg from "pg";
import dotenv from "dotenv";

// Try loading .env.local first, then default .env
dotenv.config({ path: ".env.local" });
dotenv.config();

const { Client } = pg;

function requireEnv(name: string): string {
    const v = process.env[name] || (name === "SUPABASE_DB_URL" ? process.env["DATABASE_URL"] : undefined);
    if (!v || !v.trim()) {
        console.error(`❌ Missing required env var: ${name}`);
        process.exit(1);
    }
    return v.trim();
}

async function main() {
    const url = requireEnv("SUPABASE_DB_URL");
    console.log("Connecting to DB...");
    const client = new Client({
        connectionString: url,
        ssl: url.includes("sslmode=require") ? undefined : { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        console.log("✅ Connected");

        const sql = `
CREATE OR REPLACE FUNCTION "public"."assert_schema_identity"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_mode text;
  v_count int;
begin
  select mode into v_mode
  from public.canon_mode
  where id = true;

  if v_mode = 'v1_text' then
    -- Canon V1: user_id MUST be TEXT
    select count(*) into v_count
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'user_id'
      and data_type <> 'text';

    if v_count > 0 then
      raise exception
        'CANONICAL VIOLATION (V1): Found % user_id columns not TEXT',
        v_count;
    end if;

  elsif v_mode = 'v2_uuid' or v_mode = 'v2_uuid_hard' then
    -- Canon V2: user_id MUST be UUID
    select count(*) into v_count
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'user_id'
      and data_type <> 'uuid';

    if v_count > 0 then
      raise exception
        'CANONICAL VIOLATION (V2): Found % user_id columns not UUID',
        v_count;
    end if;

  else
    raise exception 'Unknown canon_mode: %', v_mode;
  end if;
end;
$$;
ALTER FUNCTION "public"."assert_schema_identity"() OWNER TO "postgres";
`;

        console.log("Applying fix...");
        await client.query(sql);
        console.log("✅ Fix applied successfully.");

        // Verify
        console.log("Verifying canon gate...");
        await client.query("select public.pulse_canon_gate();");
        console.log("✅ Canon gate passed!");

    } catch (err: any) {
        console.error("❌ Failed:", err?.message ?? err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

main();
