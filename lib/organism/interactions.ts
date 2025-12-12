/**
 * Universal Interaction Logger
 * Single source of truth for all activity (email/call/meeting/note)
 * lib/organism/interactions.ts
 */

import { supabaseServer } from "@/lib/supabase/server";
import { InteractionInput } from "./types";
import { ensureTBNodeForEntity } from "./identity";

/**
 * Log a universal interaction and create Second Brain evidence
 * Creates exactly one crm_interactions record + tb_memory_fragments
 */
export async function logInteraction(
  userId: string,
  input: InteractionInput
): Promise<{
  interaction_id: string;
  memory_fragment_id: string | null;
}> {
  const supabase = supabaseServer();

  // Step 1: Create interaction record
  const { data: interaction, error: interactionError } = await supabase
    .from("crm_interactions")
    .insert({
      owner_user_id: userId,
      contact_id: input.contact_id || null,
      organization_id: input.organization_id || null,
      deal_id: input.deal_id || null,
      type: input.type,
      occurred_at: input.occurred_at,
      subject: input.subject || null,
      summary: input.summary || null,
      channel: input.channel || null,
      metadata: input.metadata || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (interactionError) {
    throw new Error(`Failed to create interaction: ${interactionError.message}`);
  }

  // Step 2: Create Second Brain evidence fragment
  let memoryFragmentId: string | null = null;

  if (input.summary || input.subject) {
    // Resolve entity TB node
    let entityTbNodeId: string | null = null;

    if (input.contact_id) {
      const nodeResult = await ensureTBNodeForEntity(userId, "person", input.contact_id);
      entityTbNodeId = nodeResult.tb_node_id;
    } else if (input.organization_id) {
      const nodeResult = await ensureTBNodeForEntity(userId, "organization", input.organization_id);
      entityTbNodeId = nodeResult.tb_node_id;
    } else if (input.deal_id) {
      const nodeResult = await ensureTBNodeForEntity(userId, "deal", input.deal_id);
      entityTbNodeId = nodeResult.tb_node_id;
    }

    if (entityTbNodeId) {
      // Create memory fragment
      const content = [
        input.subject,
        input.summary,
      ]
        .filter(Boolean)
        .join("\n\n");

      const { data: fragment, error: fragmentError } = await supabase
        .from("tb_memory_fragments")
        .insert({
          owner_user_id: userId,
          entity_tb_node_id: entityTbNodeId,
          source_type: input.type,
          source_id: interaction.id,
          content,
          provenance: {
            interaction_id: interaction.id,
            occurred_at: input.occurred_at,
            ...input.metadata,
          },
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (!fragmentError && fragment) {
        memoryFragmentId = fragment.id;

        // Create edge: entity -> fragment
        await supabase.from("tb_edges").insert({
          owner_user_id: userId,
          from_node_id: entityTbNodeId,
          to_node_id: fragment.id,
          edge_type: "has_evidence",
          metadata: {
            interaction_type: input.type,
            occurred_at: input.occurred_at,
          },
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  return {
    interaction_id: interaction.id,
    memory_fragment_id: memoryFragmentId,
  };
}

