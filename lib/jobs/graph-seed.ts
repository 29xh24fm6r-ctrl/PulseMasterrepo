// Job Graph Seeder
// lib/jobs/graph-seed.ts

import { supabaseAdmin } from "@/lib/supabase";

/**
 * Seed initial job graph nodes
 */
export async function seedJobGraph(): Promise<void> {
  // Check if already seeded
  const { count } = await supabaseAdmin
    .from("job_graph_nodes")
    .select("*", { count: "exact", head: true });

  if ((count || 0) > 0) {
    console.log("[JobGraph] Already seeded, skipping");
    return;
  }

  const nodes = [
    // Level 0: Industries
    { level: 0, path: "Finance", name: "Finance", parent_id: null },
    { level: 0, path: "Healthcare", name: "Healthcare", parent_id: null },
    { level: 0, path: "Tech", name: "Technology", parent_id: null },
    { level: 0, path: "Real Estate", name: "Real Estate", parent_id: null },

    // Level 1: Sectors (Finance)
    { level: 1, path: "Finance > Banking", name: "Banking", parent_path: "Finance" },
    { level: 1, path: "Finance > Insurance", name: "Insurance", parent_path: "Finance" },
    { level: 1, path: "Finance > Investment", name: "Investment", parent_path: "Finance" },

    // Level 2: Domains (Banking)
    {
      level: 2,
      path: "Finance > Banking > Commercial Lending",
      name: "Commercial Lending",
      parent_path: "Finance > Banking",
    },
    {
      level: 2,
      path: "Finance > Banking > Retail Banking",
      name: "Retail Banking",
      parent_path: "Finance > Banking",
    },

    // Level 3: Specializations (Commercial Lending)
    {
      level: 3,
      path: "Finance > Banking > Commercial Lending > SBA",
      name: "SBA Lending",
      parent_path: "Finance > Banking > Commercial Lending",
    },
    {
      level: 3,
      path: "Finance > Banking > Commercial Lending > CRE",
      name: "Commercial Real Estate",
      parent_path: "Finance > Banking > Commercial Lending",
    },

    // Level 4: Specific Roles
    {
      level: 4,
      path: "Finance > Banking > Commercial Lending > SBA > Rural CRE",
      name: "Commercial Loan Officer – SBA / Rural CRE",
      parent_path: "Finance > Banking > Commercial Lending > SBA",
    },
    {
      level: 4,
      path: "Finance > Banking > Commercial Lending > SBA > Underwriter",
      name: "SBA Underwriter",
      parent_path: "Finance > Banking > Commercial Lending > SBA",
    },
  ];

  // Insert nodes (need to resolve parent_ids)
  const insertedNodes: Record<string, string> = {};

  for (const node of nodes) {
    let parentId: string | null = null;
    if (node.parent_path) {
      parentId = insertedNodes[node.parent_path] || null;
    }

    const { data: inserted } = await supabaseAdmin
      .from("job_graph_nodes")
      .insert({
        parent_id: parentId,
        level: node.level,
        path: node.path,
        name: node.name,
      })
      .select("id")
      .single();

    if (inserted) {
      insertedNodes[node.path] = inserted.id;
    }
  }

  console.log("[JobGraph] Seeded", nodes.length, "nodes");
}




