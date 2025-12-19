import { supabaseAdmin } from "@/lib/supabase/admin";

async function run() {
  console.log("🔍 Discovering database schema...\n");

  // STEP 1: List all tables
  console.log("=".repeat(60));
  console.log("STEP 1: All Tables");
  console.log("=".repeat(60));
  
  const { data: tables, error: tablesError } = await supabaseAdmin
    .from("information_schema.tables")
    .select("table_schema, table_name")
    .not("table_schema", "in", ["(information_schema, pg_catalog)"])
    .order("table_schema")
    .order("table_name");

  if (tablesError) {
    // Try alternative approach - query pg_catalog directly
    console.log("Attempting alternative query method...");
    
    const { data: altTables, error: altError } = await supabaseAdmin.rpc("exec_sql", {
      sql: `
        SELECT
          schemaname as table_schema,
          tablename as table_name
        FROM pg_tables
        WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
        ORDER BY schemaname, tablename;
      `,
    });

    if (altError) {
      console.error("❌ Schema introspection failed:", altError);
      console.log("\n📝 Trying direct SQL query via raw client...");
      
      // Last resort: try to query via raw SQL if available
      // This will depend on your Supabase setup
      process.exit(1);
    } else {
      console.table(altTables);
      console.log(`\n✅ Found ${altTables?.length || 0} tables\n`);
    }
  } else {
    console.table(tables);
    console.log(`\n✅ Found ${tables?.length || 0} tables\n`);
  }

  // STEP 2: Find foreign keys to contacts/people tables
  console.log("=".repeat(60));
  console.log("STEP 2: Foreign Keys to Contact/Person Tables");
  console.log("=".repeat(60));

  // We'll do this via a simpler approach - search for tables with contact/person columns
  const { data: contactColumns, error: contactError } = await supabaseAdmin
    .from("information_schema.columns")
    .select("table_name, column_name")
    .ilike("column_name", "%contact%")
    .or("column_name.ilike.%person%,column_name.ilike.%relationship_relevance%");

  if (!contactError && contactColumns) {
    console.table(contactColumns);
    console.log(`\n✅ Found ${contactColumns.length} columns referencing contacts/people\n`);
  }

  // STEP 3: Find tables with task/deal/note/interaction columns
  console.log("=".repeat(60));
  console.log("STEP 3: Tables with Task/Deal/Note/Interaction Columns");
  console.log("=".repeat(60));

  const keywords = ["task", "deal", "note", "interaction", "activity"];
  const allTables: Record<string, string[]> = {};

  for (const keyword of keywords) {
    const { data: cols } = await supabaseAdmin
      .from("information_schema.columns")
      .select("table_name, column_name")
      .ilike("column_name", `%${keyword}%`);

    if (cols) {
      cols.forEach((col: any) => {
        if (!allTables[col.table_name]) {
          allTables[col.table_name] = [];
        }
        allTables[col.table_name].push(col.column_name);
      });
    }
  }

  console.log("\nTables by keyword:");
  Object.entries(allTables).forEach(([table, columns]) => {
    console.log(`\n📋 ${table}:`);
    columns.forEach((col) => console.log(`   - ${col}`));
  });

  // STEP 4: Check what tables are referenced in code
  console.log("\n" + "=".repeat(60));
  console.log("STEP 4: Manual Code Search Required");
  console.log("=".repeat(60));
  console.log("\n🔍 Please search your codebase for:");
  console.log('   - supabaseAdmin.from("...")');
  console.log('   - .from("crm_');
  console.log('   - .from("quantum_');
  console.log('   - .from("contact_');
  console.log("\n📝 Or run: grep -r '\\.from(\"' --include='*.ts' --include='*.tsx'");
}

run().catch(console.error);

