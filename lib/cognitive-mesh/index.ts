// Third Brain v3: Cognitive Mesh Core Library
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getOpenAI } from "@/lib/llm/client";

// Removed global openai init

function getSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ============================================
// EVENT INGESTION
// ============================================

export async function ingestRawEvent(
  userId: string,
  input: CreateRawEventInput
): Promise<RawEvent> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("tb_raw_events")
    .insert({
      user_id: userId,
      source: input.source,
      source_id: input.source_id,
      occurred_at: input.occurred_at || new Date().toISOString(),
      payload: input.payload,
      processed: false,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to ingest event: ${error.message}`);
  return data;
}

export async function markEventProcessed(
  eventId: string,
  error?: string
): Promise<void> {
  const supabase = getSupabase();

  await supabase
    .from("tb_raw_events")
    .update({
      processed: true,
      processing_error: error || null,
    })
    .eq("id", eventId);
}

// ============================================
// MEMORY FRAGMENTS
// ============================================

export async function createFragment(
  userId: string,
  input: CreateFragmentInput
): Promise<MemoryFragment> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("tb_memory_fragments")
    .insert({
      user_id: userId,
      fragment_type: input.fragment_type,
      content: input.content,
      metadata: input.metadata || {},
      importance: input.importance ?? 5,
      time_scope: input.time_scope,
      occurred_at: input.occurred_at || new Date().toISOString(),
      raw_event_id: input.raw_event_id,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create fragment: ${error.message}`);

  // Generate embedding asynchronously
  generateAndStoreEmbedding(userId, data.id, data.content).catch(console.error);

  return data;
}

export async function getFragments(
  userId: string,
  options: {
    limit?: number;
    fragmentTypes?: FragmentType[];
    minImportance?: number;
    since?: string;
  } = {}
): Promise<MemoryFragment[]> {
  const supabase = getSupabase();

  let query = supabase
    .from("tb_memory_fragments")
    .select("*")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false });

  if (options.fragmentTypes?.length) {
    query = query.in("fragment_type", options.fragmentTypes);
  }
  if (options.minImportance) {
    query = query.gte("importance", options.minImportance);
  }
  if (options.since) {
    query = query.gte("occurred_at", options.since);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to get fragments: ${error.message}`);
  return data || [];
}

// ============================================
// EMBEDDINGS & SEMANTIC SEARCH
// ============================================

export async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAI();
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

export async function generateAndStoreEmbedding(
  userId: string,
  fragmentId: string,
  content: string
): Promise<void> {
  const supabase = getSupabase();

  try {
    const embedding = await generateEmbedding(content);

    await supabase.from("tb_embeddings").insert({
      user_id: userId,
      fragment_id: fragmentId,
      embedding: embedding,
      model: "text-embedding-3-small",
    });
  } catch (error) {
    console.error(`Failed to generate embedding for ${fragmentId}:`, error);
  }
}

export async function semanticSearch(
  userId: string,
  options: SemanticSearchOptions
): Promise<(MemoryFragment & { similarity: number })[]> {
  const supabase = getSupabase();

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(options.query);

  // Use Supabase RPC for vector similarity search
  const { data, error } = await supabase.rpc("search_fragments_by_embedding", {
    query_embedding: queryEmbedding,
    match_user_id: userId,
    match_count: options.limit || 10,
    min_importance: options.minImportance || 0,
  });

  if (error) {
    console.error("Semantic search error:", error);
    // Fallback to text search
    return textSearch(userId, options);
  }

  return data || [];
}

async function textSearch(
  userId: string,
  options: SemanticSearchOptions
): Promise<(MemoryFragment & { similarity: number })[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("tb_memory_fragments")
    .select("*")
    .eq("user_id", userId)
    .ilike("content", `%${options.query}%`)
    .order("importance", { ascending: false })
    .limit(options.limit || 10);

  if (error) throw error;
  return (data || []).map(d => ({ ...d, similarity: 0.5 }));
}

// ============================================
// ENTITIES
// ============================================

export async function createEntity(
  userId: string,
  input: CreateEntityInput
): Promise<Entity> {
  const supabase = getSupabase();

  // Check for existing entity with same canonical key
  if (input.canonical_key) {
    const { data: existing } = await supabase
      .from("tb_entities")
      .select("*")
      .eq("user_id", userId)
      .eq("canonical_key", input.canonical_key)
      .single();

    if (existing) {
      // Update mention count and last_seen
      await supabase
        .from("tb_entities")
        .update({
          mention_count: existing.mention_count + 1,
          last_seen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      return existing;
    }
  }

  const { data, error } = await supabase
    .from("tb_entities")
    .insert({
      user_id: userId,
      entity_type: input.entity_type,
      name: input.name,
      aliases: input.aliases || [],
      canonical_key: input.canonical_key,
      description: input.description,
      metadata: input.metadata || {},
      importance: input.importance ?? 5,
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      mention_count: 1,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create entity: ${error.message}`);
  return data;
}

export async function findOrCreateEntity(
  userId: string,
  input: CreateEntityInput
): Promise<Entity> {
  const supabase = getSupabase();

  // Try to find by canonical key first
  if (input.canonical_key) {
    const { data: existing } = await supabase
      .from("tb_entities")
      .select("*")
      .eq("user_id", userId)
      .eq("canonical_key", input.canonical_key)
      .single();

    if (existing) {
      // Update mention count
      await supabase
        .from("tb_entities")
        .update({
          mention_count: existing.mention_count + 1,
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      return { ...existing, mention_count: existing.mention_count + 1 };
    }
  }

  // Try to find by name
  const { data: byName } = await supabase
    .from("tb_entities")
    .select("*")
    .eq("user_id", userId)
    .eq("entity_type", input.entity_type)
    .ilike("name", input.name)
    .single();

  if (byName) {
    await supabase
      .from("tb_entities")
      .update({
        mention_count: byName.mention_count + 1,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", byName.id);
    return { ...byName, mention_count: byName.mention_count + 1 };
  }

  // Create new
  return createEntity(userId, input);
}

export async function searchEntities(
  userId: string,
  options: EntitySearchOptions
): Promise<Entity[]> {
  const supabase = getSupabase();

  let query = supabase
    .from("tb_entities")
    .select("*")
    .eq("user_id", userId)
    .order("importance", { ascending: false });

  if (options.query) {
    query = query.or(`name.ilike.%${options.query}%,description.ilike.%${options.query}%`);
  }
  if (options.entityTypes?.length) {
    query = query.in("entity_type", options.entityTypes);
  }
  if (options.minImportance) {
    query = query.gte("importance", options.minImportance);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to search entities: ${error.message}`);
  return data || [];
}

export async function getEntity(
  userId: string,
  entityId: string
): Promise<Entity | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("tb_entities")
    .select("*")
    .eq("user_id", userId)
    .eq("id", entityId)
    .single();

  if (error) return null;
  return data;
}

// ============================================
// ENTITY EDGES (RELATIONSHIPS)
// ============================================

export async function createEdge(
  userId: string,
  input: CreateEdgeInput
): Promise<EntityEdge> {
  const supabase = getSupabase();

  // Check for existing edge
  const { data: existing } = await supabase
    .from("tb_entity_edges")
    .select("*")
    .eq("user_id", userId)
    .eq("from_entity_id", input.from_entity_id)
    .eq("to_entity_id", input.to_entity_id)
    .eq("relation_type", input.relation_type)
    .single();

  if (existing) {
    // Strengthen existing edge
    const newWeight = Math.min(1, existing.weight + 0.1);
    await supabase
      .from("tb_entity_edges")
      .update({ weight: newWeight, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    return { ...existing, weight: newWeight };
  }

  const { data, error } = await supabase
    .from("tb_entity_edges")
    .insert({
      user_id: userId,
      from_entity_id: input.from_entity_id,
      to_entity_id: input.to_entity_id,
      relation_type: input.relation_type,
      weight: input.weight ?? 0.5,
      bidirectional: input.bidirectional ?? false,
      metadata: input.metadata || {},
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create edge: ${error.message}`);
  return data;
}

export async function getEntityEdges(
  userId: string,
  entityId: string,
  direction: "from" | "to" | "both" = "both"
): Promise<EntityEdge[]> {
  const supabase = getSupabase();

  let query = supabase
    .from("tb_entity_edges")
    .select("*")
    .eq("user_id", userId);

  if (direction === "from") {
    query = query.eq("from_entity_id", entityId);
  } else if (direction === "to") {
    query = query.eq("to_entity_id", entityId);
  } else {
    query = query.or(`from_entity_id.eq.${entityId},to_entity_id.eq.${entityId}`);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to get edges: ${error.message}`);
  return data || [];
}

// ============================================
// GRAPH TRAVERSAL
// ============================================

export async function traverseGraph(
  userId: string,
  options: GraphTraversalOptions
): Promise<{ entities: Entity[]; edges: EntityEdge[] }> {
  const supabase = getSupabase();
  const visited = new Set<string>();
  const entities: Entity[] = [];
  const edges: EntityEdge[] = [];
  const queue: { entityId: string; depth: number }[] = [
    { entityId: options.startEntityId, depth: 0 },
  ];

  while (queue.length > 0) {
    const { entityId, depth } = queue.shift()!;

    if (visited.has(entityId)) continue;
    if (depth > (options.maxDepth || 2)) continue;

    visited.add(entityId);

    // Get entity
    const entity = await getEntity(userId, entityId);
    if (entity) entities.push(entity);

    // Get connected edges
    let edgeQuery = supabase
      .from("tb_entity_edges")
      .select("*")
      .eq("user_id", userId)
      .or(`from_entity_id.eq.${entityId},to_entity_id.eq.${entityId}`);

    if (options.relationTypes?.length) {
      edgeQuery = edgeQuery.in("relation_type", options.relationTypes);
    }
    if (options.minWeight) {
      edgeQuery = edgeQuery.gte("weight", options.minWeight);
    }

    const { data: connectedEdges } = await edgeQuery;

    for (const edge of connectedEdges || []) {
      if (!edges.find(e => e.id === edge.id)) {
        edges.push(edge);
      }

      // Add connected entity to queue
      const nextEntityId = edge.from_entity_id === entityId
        ? edge.to_entity_id
        : edge.from_entity_id;

      if (!visited.has(nextEntityId)) {
        queue.push({ entityId: nextEntityId, depth: depth + 1 });
      }
    }
  }

  return { entities, edges };
}

// ============================================
// ENTITY-FRAGMENT LINKING
// ============================================

export async function linkEntityToFragment(
  userId: string,
  entityId: string,
  fragmentId: string,
  relevance: number = 0.5
): Promise<void> {
  const supabase = getSupabase();

  await supabase.from("tb_entity_fragment_links").upsert({
    user_id: userId,
    entity_id: entityId,
    fragment_id: fragmentId,
    relevance,
  });
}

export async function getEntityFragments(
  userId: string,
  entityId: string,
  limit: number = 20
): Promise<MemoryFragment[]> {
  const supabase = getSupabase();

  const { data: links } = await supabase
    .from("tb_entity_fragment_links")
    .select("fragment_id, relevance")
    .eq("user_id", userId)
    .eq("entity_id", entityId)
    .order("relevance", { ascending: false })
    .limit(limit);

  if (!links?.length) return [];

  const fragmentIds = links.map(l => l.fragment_id);
  const { data: fragments } = await supabase
    .from("tb_memory_fragments")
    .select("*")
    .in("id", fragmentIds);

  return fragments || [];
}

// ============================================
// CONTEXT BUILDING
// ============================================

export async function buildContext(
  userId: string,
  options: {
    query?: string;
    entityIds?: string[];
    includeRecentFragments?: boolean;
    maxTokens?: number;
  } = {}
): Promise<{
  fragments: MemoryFragment[];
  entities: Entity[];
  edges: EntityEdge[];
  summary: string;
}> {
  const fragments: MemoryFragment[] = [];
  const entities: Entity[] = [];
  const edges: EntityEdge[] = [];

  // Get recent important fragments
  if (options.includeRecentFragments !== false) {
    const recent = await getFragments(userId, {
      limit: 10,
      minImportance: 5,
    });
    fragments.push(...recent);
  }

  // Semantic search if query provided
  if (options.query) {
    const relevant = await semanticSearch(userId, {
      query: options.query,
      limit: 10,
      minImportance: 3,
    });
    fragments.push(...relevant);
  }

  // Get specified entities and their graphs
  if (options.entityIds?.length) {
    for (const entityId of options.entityIds) {
      const graph = await traverseGraph(userId, {
        startEntityId: entityId,
        maxDepth: 1,
      });
      entities.push(...graph.entities);
      edges.push(...graph.edges);
    }
  }

  // Build summary
  const summary = buildContextSummary(fragments, entities, edges);

  return {
    fragments: dedupeById(fragments),
    entities: dedupeById(entities),
    edges: dedupeById(edges),
    summary,
  };
}

function buildContextSummary(
  fragments: MemoryFragment[],
  entities: Entity[],
  edges: EntityEdge[]
): string {
  const parts: string[] = [];

  if (fragments.length > 0) {
    parts.push(`Recent knowledge (${fragments.length} items):`);
    for (const f of fragments.slice(0, 5)) {
      parts.push(`- [${f.fragment_type}] ${f.content.substring(0, 100)}...`);
    }
  }

  if (entities.length > 0) {
    parts.push(`\nRelevant entities (${entities.length}):`);
    for (const e of entities.slice(0, 10)) {
      parts.push(`- ${e.entity_type}: ${e.name}`);
    }
  }

  if (edges.length > 0) {
    parts.push(`\nRelationships (${edges.length}):`);
    // Would need entity names to make this readable
  }

  return parts.join("\n");
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

// ============================================
// EXPORTS
// ============================================

export const CognitiveMesh = {
  // Events
  ingestRawEvent,
  markEventProcessed,

  // Fragments
  createFragment,
  getFragments,

  // Embeddings
  generateEmbedding,
  semanticSearch,

  // Entities
  createEntity,
  findOrCreateEntity,
  searchEntities,
  getEntity,

  // Edges
  createEdge,
  getEntityEdges,
  traverseGraph,

  // Linking
  linkEntityToFragment,
  getEntityFragments,

  // Context
  buildContext,
};

export default CognitiveMesh;