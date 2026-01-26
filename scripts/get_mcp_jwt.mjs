import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.MCP_VIEWER_EMAIL;
const password = process.env.MCP_VIEWER_PASSWORD;

if (!supabaseUrl || !anonKey || !email || !password) {
  console.error("Missing required environment variables.");
  console.error("Required:");
  console.error(" - NEXT_PUBLIC_SUPABASE_URL");
  console.error(" - NEXT_PUBLIC_SUPABASE_ANON_KEY");
  console.error(" - MCP_VIEWER_EMAIL");
  console.error(" - MCP_VIEWER_PASSWORD");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (error) {
  console.error("Auth failed:", error.message);
  process.exit(1);
}

console.log("\nMCP_VIEWER_JWT=\n");
console.log(data.session.access_token);
