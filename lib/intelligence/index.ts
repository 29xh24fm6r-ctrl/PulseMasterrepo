/**
 * Intelligence Layer - Web Search & Enrichment
 * Writes ONLY to Second Brain + derived summaries
 * lib/intelligence/index.ts
 */

import { supabaseServer } from "@/lib/supabase/server";
import { ensureTBNodeForEntity } from "@/lib/organism/identity";
import { searchBrave, processBraveResults } from "./brave";
import { IntelFinding } from "@/lib/organism/types";

/**
 * Run intelligence gathering for an entity
 * Stores results in Second Brain only, updates derived summary on CRM
 */
export async function runIntelForEntity(
  userId: string,
  entityType: "person" | "organization",
  entityId: string,
  queries?: string[]
): Promise<{
  findings: IntelFinding[];
  memory_fragments_created: number;
  summary: string;
}> {
  const supabase = supabaseServer();

  // Step 1: Resolve entity and ensure TB node exists
  const nodeResult = await ensureTBNodeForEntity(userId, entityType, entityId);
  const tbNodeId = nodeResult.tb_node_id;

  // Step 2: Get entity details for search queries
  let entityName = "";
  let entityDetails: any = null;

  if (entityType === "person") {
    const { data } = await supabase
      .from("crm_contacts")
      .select("full_name, primary_email, company_name, organization:crm_organizations(name)")
      .eq("owner_user_id", userId)
      .eq("id", entityId)
      .single();
    entityDetails = data;
    entityName = data?.full_name || "";
  } else {
    const { data } = await supabase
      .from("crm_organizations")
      .select("name, domain")
      .eq("owner_user_id", userId)
      .eq("id", entityId)
      .single();
    entityDetails = data;
    entityName = data?.name || "";
  }

  if (!entityDetails) {
    throw new Error(`Entity not found: ${entityType} ${entityId}`);
  }

  // Step 3: Generate search queries if not provided
  const searchQueries = queries || generateQueries(entityType, entityName, entityDetails);

  // Step 4: Execute Brave searches
  const allFindings: IntelFinding[] = [];

  for (const query of searchQueries) {
    try {
      const results = await searchBrave(query);
      const findings = processBraveResults(query, results);
      allFindings.push(...findings);
    } catch (error) {
      console.error(`Brave search failed for query "${query}":`, error);
      // Continue with other queries
    }
  }

  // Step 5: Store findings in Second Brain
  let memoryFragmentsCreated = 0;

  for (const finding of allFindings) {
    // Create or get source node
    let sourceNodeId: string | null = null;

    const { data: existingSource } = await supabase
      .from("tb_nodes")
      .select("id")
      .eq("owner_user_id", userId)
      .eq("node_type", "source")
      .eq("node_id", `url_${finding.source_url}`)
      .maybeSingle();

    if (existingSource) {
      sourceNodeId = existingSource.id;
    } else {
      const { data: sourceNode } = await supabase
        .from("tb_nodes")
        .insert({
          owner_user_id: userId,
          node_type: "source",
          node_id: `url_${finding.source_url}`,
          title: finding.source_title,
          metadata: {
            url: finding.source_url,
            source_type: "web",
          },
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (sourceNode) {
        sourceNodeId = sourceNode.id;
      }
    }

    // Create memory fragment
    const content = [
      finding.snippet,
      finding.extracted_facts.length > 0
        ? `Extracted facts: ${JSON.stringify(finding.extracted_facts, null, 2)}`
        : "",
      finding.entities.length > 0
        ? `Entities: ${finding.entities.map((e) => `${e.type}: ${e.value}`).join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const { data: fragment } = await supabase
      .from("tb_memory_fragments")
      .insert({
        owner_user_id: userId,
        entity_tb_node_id: tbNodeId,
        source_type: "intelligence",
        source_id: finding.source_url,
        content,
        provenance: {
          query: finding.query,
          retrieved_at: finding.retrieved_at,
          source_url: finding.source_url,
          source_title: finding.source_title,
          provider: "brave",
        },
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (fragment) {
      memoryFragmentsCreated++;

      // Create edges
      if (sourceNodeId) {
        await supabase.from("tb_edges").insert({
          owner_user_id: userId,
          from_node_id: tbNodeId,
          to_node_id: sourceNodeId,
          edge_type: "has_source",
          metadata: {
            query: finding.query,
            retrieved_at: finding.retrieved_at,
          },
          created_at: new Date().toISOString(),
        });
      }

      await supabase.from("tb_edges").insert({
        owner_user_id: userId,
        from_node_id: tbNodeId,
        to_node_id: fragment.id,
        edge_type: "has_evidence",
        metadata: {
          source_type: "intelligence",
          query: finding.query,
        },
        created_at: new Date().toISOString(),
      });
    }
  }

  // Step 6: Generate derived summary and update CRM
  const summary = generateSummary(allFindings);
  const tableName = entityType === "person" ? "crm_contacts" : "crm_organizations";

  await supabase
    .from(tableName)
    .update({
      intel_summary: summary,
      updated_at: new Date().toISOString(),
    })
    .eq("owner_user_id", userId)
    .eq("id", entityId);

  return {
    findings: allFindings,
    memory_fragments_created: memoryFragmentsCreated,
    summary,
  };
}

/**
 * Generate search queries for an entity
 * Includes site-specific queries for LinkedIn, TikTok, Facebook, etc.
 */
function generateQueries(
  entityType: "person" | "organization",
  name: string,
  details: any
): string[] {
  const queries: string[] = [];

  if (entityType === "person") {
    const company = details.company_name || details.organization?.name || "";
    
    // Core identity queries
    queries.push(name);
    if (company) {
      queries.push(`${name} ${company}`);
      queries.push(`${name} ${company} LinkedIn`);
    }
    
    // Site-specific queries (high priority for finding profiles)
    queries.push(`${name} site:linkedin.com/in`);
    if (company) {
      queries.push(`${name} ${company} site:linkedin.com`);
    }
    queries.push(`${name} LinkedIn`);
    
    queries.push(`${name} TikTok`);
    queries.push(`${name} site:tiktok.com`);
    
    queries.push(`${name} Facebook`);
    queries.push(`${name} site:facebook.com`);
    
    // Email and professional queries
    if (details.primary_email) {
      queries.push(`${name} ${details.primary_email}`);
    }
    if (company) {
      queries.push(`${name} ${company} email`);
      queries.push(`${company} leadership team ${name}`);
    }
    queries.push(`${name} ${company || ""} email`.trim());
    
    // News and content
    if (company) {
      queries.push(`${company} news`);
    }
  } else {
    // organization
    queries.push(name);
    if (details.domain) {
      queries.push(`${name} ${details.domain}`);
    }
    queries.push(`${name} company`);
    queries.push(`${name} about`);
  }

  return queries.slice(0, 10); // Limit to 10 queries (was 5, increased for better coverage)
}

/**
 * Generate summary from findings
 */
function generateSummary(findings: IntelFinding[]): string {
  if (findings.length === 0) {
    return "No intelligence found.";
  }

  const snippets = findings.slice(0, 3).map((f) => f.snippet.substring(0, 150));
  const summary = snippets.join("... ");

  return summary.length > 500 ? summary.substring(0, 500) + "..." : summary;
}

