// CRM Graph Integration
// lib/crm/graph.ts

import { supabaseAdmin } from "@/lib/supabase";
import { getContacts } from "./contacts";
import { getDeals } from "./deals";

/**
 * Sync contacts to Intelligence Graph
 */
export async function syncContactsToGraph(userId: string): Promise<void> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Check if Intelligence Graph tables exist
  const { data: nodesTableExists } = await supabaseAdmin
    .from("intelligence_graph_nodes")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (!nodesTableExists) {
    // Intelligence Graph not yet implemented - skip
    return;
  }

  const contacts = await getContacts(userId);

  for (const contact of contacts) {
    // Check if node already exists
    const { data: existing } = await supabaseAdmin
      .from("intelligence_graph_nodes")
      .select("id")
      .eq("user_id", dbUserId)
      .eq("node_type", "contact")
      .eq("node_id", `crm_contact_${contact.id}`)
      .maybeSingle();

    const nodeData = {
      user_id: dbUserId,
      node_type: "contact",
      node_id: `crm_contact_${contact.id}`,
      title: contact.fullName,
      metadata: {
        label: contact.fullName,
        crm_contact_id: contact.id,
        type: contact.type,
        importance: contact.relationship_importance,
        tags: contact.tags || [],
        email: contact.primaryEmail,
        company: contact.companyName,
      },
      created_at: contact.createdAt,
      updated_at: contact.updatedAt || contact.createdAt,
    };

    if (existing) {
      // Update existing node
      await supabaseAdmin
        .from("intelligence_graph_nodes")
        .update(nodeData)
        .eq("id", existing.id);
    } else {
      // Create new node
      await supabaseAdmin
        .from("intelligence_graph_nodes")
        .insert(nodeData);
    }
  }
}

/**
 * Sync deals to Intelligence Graph
 */
export async function syncDealsToGraph(userId: string): Promise<void> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Check if Intelligence Graph tables exist
  const { data: nodesTableExists } = await supabaseAdmin
    .from("intelligence_graph_nodes")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (!nodesTableExists) {
    // Intelligence Graph not yet implemented - skip
    return;
  }

  const deals = await getDeals(userId);

  for (const deal of deals) {
    // Check if node already exists
    const { data: existing } = await supabaseAdmin
      .from("intelligence_graph_nodes")
      .select("id")
      .eq("user_id", dbUserId)
      .eq("node_type", "deal")
      .eq("node_id", `crm_deal_${deal.id}`)
      .maybeSingle();

    const nodeData = {
      user_id: dbUserId,
      node_type: "deal",
      node_id: `crm_deal_${deal.id}`,
      title: deal.name,
      metadata: {
        label: deal.name,
        crm_deal_id: deal.id,
        stage: deal.stage,
        amount: deal.amount,
        closeDate: deal.closeDate,
        tags: deal.tags || [],
        primaryContactId: deal.primaryContactId,
        organizationId: deal.organizationId,
      },
      created_at: deal.createdAt,
      updated_at: deal.updatedAt || deal.createdAt,
    };

    if (existing) {
      // Update existing node
      await supabaseAdmin
        .from("intelligence_graph_nodes")
        .update(nodeData)
        .eq("id", existing.id);
    } else {
      // Create new node
      await supabaseAdmin
        .from("intelligence_graph_nodes")
        .insert(nodeData);
    }

    // Create edges: deal -> contact, deal -> organization
    if (deal.primaryContactId) {
      await createDealContactEdge(dbUserId, deal.id, deal.primaryContactId);
    }
    if (deal.organizationId) {
      await createDealOrgEdge(dbUserId, deal.id, deal.organizationId);
    }
  }
}

/**
 * Create edge between deal and contact
 */
async function createDealContactEdge(
  userId: string,
  dealId: string,
  contactId: string
): Promise<void> {
  const dealNodeId = `crm_deal_${dealId}`;
  const contactNodeId = `crm_contact_${contactId}`;

  // Check if edge exists
  const { data: existing } = await supabaseAdmin
    .from("intelligence_graph_edges")
    .select("id")
    .eq("user_id", userId)
    .eq("source_id", dealNodeId)
    .eq("target_id", contactNodeId)
    .eq("edge_type", "involves")
    .maybeSingle();

  if (!existing) {
    await supabaseAdmin
      .from("intelligence_graph_edges")
      .insert({
        user_id: userId,
        source_id: dealNodeId,
        target_id: contactNodeId,
        edge_type: "involves",
        metadata: {},
        created_at: new Date().toISOString(),
      });
  }
}

/**
 * Create edge between deal and organization
 */
async function createDealOrgEdge(
  userId: string,
  dealId: string,
  organizationId: string
): Promise<void> {
  const dealNodeId = `crm_deal_${dealId}`;
  const orgNodeId = `crm_org_${organizationId}`;

  // Check if edge exists
  const { data: existing } = await supabaseAdmin
    .from("intelligence_graph_edges")
    .select("id")
    .eq("user_id", userId)
    .eq("source_id", dealNodeId)
    .eq("target_id", orgNodeId)
    .eq("edge_type", "belongs_to")
    .maybeSingle();

  if (!existing) {
    await supabaseAdmin
      .from("intelligence_graph_edges")
      .insert({
        user_id: userId,
        source_id: dealNodeId,
        target_id: orgNodeId,
        edge_type: "belongs_to",
        metadata: {},
        created_at: new Date().toISOString(),
      });
  }
}

/**
 * Sync all CRM data to graph
 */
export async function syncCrmToGraph(userId: string): Promise<void> {
  await Promise.all([
    syncContactsToGraph(userId),
    syncDealsToGraph(userId),
  ]);
}




