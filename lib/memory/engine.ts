/**
 * Long-Term Memory v2
 * lib/memory/engine.ts
 * 
 * Persistent memory with semantic search, patterns, and context recall
 */

import { supabaseAdmin } from "../supabase";
import { Memory, MemoryType, MemoryPattern, MemoryContext, MemoryLayer } from "./types";

import { getOpenAI } from "@/services/ai/openai";

// removed module scope init

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Store a new memory
 */
/**
 * Store a new memory
 */
export async function storeMemory(
  userId: string,
  memory: {
    type: MemoryType;
    layer?: MemoryLayer; // Explicit assignment
    category: string;
    content: string;
    context?: string;
    importance?: number;
    tags?: string[];
    source?: string;
    sourceId?: string;
    expiresAt?: Date;
    meta?: Record<string, any>;
  }
): Promise<Memory | null> {
  const now = new Date().toISOString();

  // Auto-stratification logic if layer is not provided
  let targetLayer = memory.layer;
  if (!targetLayer) {
    if (memory.type === 'narrative_anchor') targetLayer = 'M5_Core';
    else if (memory.type === 'pattern' || memory.type === 'insight') targetLayer = 'M3_LongTerm';
    else if ((memory.importance || 5) >= 8) targetLayer = 'M3_LongTerm';
    else targetLayer = 'M2_ShortTerm';
  }

  // Generate embedding for semantic search
  const embedding = await generateEmbedding(memory.content);

  const { data, error } = await supabaseAdmin
    .from("memories")
    .insert({
      owner_user_id: userId, // Updated to owner_user_id to match schema patterns
      type: memory.type,
      layer: targetLayer,
      category: memory.category,
      content: memory.content,
      context: memory.context,
      importance: memory.importance || 5,
      embedding,
      tags: memory.tags || [],
      source: memory.source,
      source_id: memory.sourceId,
      expires_at: memory.expiresAt?.toISOString(),
      access_count: 0,
      created_at: now,
      updated_at: now,
      meta: memory.meta || {},
    })
    .select()
    .single();

  if (error || !data) {
    if (error) console.error("Memory Store Error:", error);
    return null;
  }
  return mapMemory(data);
}

/**
 * Search memories semantically
 */
export async function searchMemories(
  userId: string,
  query: string,
  options?: {
    types?: MemoryType[];
    categories?: string[];
    limit?: number;
    minImportance?: number;
  }
): Promise<Memory[]> {
  const embedding = await generateEmbedding(query);
  if (!embedding) return [];

  // Use Supabase vector similarity search
  const { data, error } = await supabaseAdmin.rpc("search_memories", {
    query_embedding: embedding,
    match_user_id: userId,
    match_types: options?.types || null,
    match_categories: options?.categories || null,
    min_importance: options?.minImportance || 1,
    match_count: options?.limit || 10,
  });

  if (error || !data) {
    // Fallback to basic search
    return basicSearch(userId, query, options);
  }

  // Update access counts
  const ids = data.map((m: any) => m.id);
  await supabaseAdmin
    .from("memories")
    .update({
      access_count: supabaseAdmin.rpc("increment_access_count"),
      last_accessed_at: new Date().toISOString(),
    })
    .in("id", ids);

  return data.map(mapMemory);
}

/**
 * Basic text search fallback
 */
async function basicSearch(
  userId: string,
  query: string,
  options?: {
    types?: MemoryType[];
    categories?: string[];
    limit?: number;
    minImportance?: number;
  }
): Promise<Memory[]> {
  let dbQuery = supabaseAdmin
    .from("memories")
    .select("*")
    .eq("user_id", userId)
    .ilike("content", `%${query}%`);

  if (options?.types?.length) {
    dbQuery = dbQuery.in("type", options.types);
  }
  if (options?.categories?.length) {
    dbQuery = dbQuery.in("category", options.categories);
  }
  if (options?.minImportance) {
    dbQuery = dbQuery.gte("importance", options.minImportance);
  }

  const { data } = await dbQuery
    .order("importance", { ascending: false })
    .limit(options?.limit || 10);

  return (data || []).map(mapMemory);
}

/**
 * Get memories by type
 */
export async function getMemoriesByType(
  userId: string,
  type: MemoryType,
  limit = 20
): Promise<Memory[]> {
  const { data } = await supabaseAdmin
    .from("memories")
    .select("*")
    .eq("user_id", userId)
    .eq("type", type)
    .order("importance", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data || []).map(mapMemory);
}

/**
 * Get recent memories
 */
export async function getRecentMemories(userId: string, limit = 20): Promise<Memory[]> {
  const { data } = await supabaseAdmin
    .from("memories")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data || []).map(mapMemory);
}

/**
 * Update memory importance
 */
export async function updateMemoryImportance(
  userId: string,
  memoryId: string,
  importance: number
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("memories")
    .update({ importance, updated_at: new Date().toISOString() })
    .eq("id", memoryId)
    .eq("user_id", userId);

  return !error;
}

/**
 * Delete memory
 */
export async function deleteMemory(userId: string, memoryId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("memories")
    .delete()
    .eq("id", memoryId)
    .eq("user_id", userId);

  return !error;
}

// ============================================
// PATTERN DETECTION
// ============================================

/**
 * Detect patterns from recent activity
 */
export async function detectPatterns(userId: string): Promise<MemoryPattern[]> {
  // Get recent memories and activities
  const memories = await getRecentMemories(userId, 100);

  if (memories.length < 10) return [];

  const prompt = `Analyze these user memories and activities for patterns:

${memories.slice(0, 50).map((m) => `- [${m.type}] ${m.content}`).join("\n")}

Identify 2-3 behavioral patterns. For each pattern provide:
1. Pattern type (time_preference, work_style, communication, habit, interest)
2. Description (1 sentence)
3. Confidence (0.0-1.0)

Respond in JSON:
{
  "patterns": [
    { "type": "string", "description": "string", "confidence": 0.0-1.0 }
  ]
}`;

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    const patterns: MemoryPattern[] = [];

    for (const p of result.patterns || []) {
      // Store pattern
      const { data } = await supabaseAdmin
        .from("memory_patterns")
        .upsert({
          user_id: userId,
          pattern_type: p.type,
          description: p.description,
          confidence: p.confidence,
          frequency: 1,
          last_occurred: new Date().toISOString(),
          data: {},
        }, { onConflict: "user_id,pattern_type" })
        .select()
        .single();

      if (data) {
        patterns.push({
          id: data.id,
          userId: data.user_id,
          patternType: data.pattern_type,
          description: data.description,
          frequency: data.frequency,
          confidence: data.confidence,
          lastOccurred: new Date(data.last_occurred),
          data: data.data || {},
        });
      }
    }

    return patterns;
  } catch (err) {
    console.error("[Memory] Pattern detection error:", err);
    return [];
  }
}

/**
 * Get user patterns
 */
export async function getPatterns(userId: string): Promise<MemoryPattern[]> {
  const { data } = await supabaseAdmin
    .from("memory_patterns")
    .select("*")
    .eq("user_id", userId)
    .order("confidence", { ascending: false });

  return (data || []).map((p) => ({
    id: p.id,
    userId: p.user_id,
    patternType: p.pattern_type,
    description: p.description,
    frequency: p.frequency,
    confidence: p.confidence,
    lastOccurred: new Date(p.last_occurred),
    data: p.data || {},
  }));
}

// ============================================
// CONTEXT BUILDING
// ============================================

/**
 * Build context for AI interactions
 */
export async function buildContextForQuery(
  userId: string,
  query: string
): Promise<MemoryContext> {
  const [relevantMemories, patterns] = await Promise.all([
    searchMemories(userId, query, { limit: 5, minImportance: 3 }),
    getPatterns(userId),
  ]);

  // Generate summary
  let summary = "";
  if (relevantMemories.length > 0 || patterns.length > 0) {
    const prompt = `Summarize this context about the user in 2-3 sentences:

Relevant memories:
${relevantMemories.map((m) => `- ${m.content}`).join("\n") || "None"}

Known patterns:
${patterns.map((p) => `- ${p.description}`).join("\n") || "None"}

Current query: "${query}"`;

    try {
      const completion = await getOpenAI().chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
      });
      summary = completion.choices[0].message.content || "";
    } catch {
      summary = "";
    }
  }

  return { relevantMemories, patterns, summary };
}

/**
 * Extract and store memories from conversation
 */
export async function extractMemoriesFromConversation(
  userId: string,
  messages: Array<{ role: string; content: string }>
): Promise<number> {
  const conversation = messages
    .slice(-10)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const prompt = `Extract important facts, preferences, or decisions from this conversation that should be remembered:

${conversation}

For each memory, provide:
- type: fact, preference, decision, goal, or feedback
- category: work, personal, health, relationships, or general
- content: the specific information (1 sentence)
- importance: 1-10

Respond in JSON:
{
  "memories": [
    { "type": "string", "category": "string", "content": "string", "importance": 1-10 }
  ]
}

Only extract genuinely important, long-term relevant information. If nothing important, return empty array.`;

  try {
    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    let stored = 0;

    for (const m of result.memories || []) {
      const memory = await storeMemory(userId, {
        type: m.type,
        category: m.category,
        content: m.content,
        importance: m.importance,
        source: "conversation",
      });
      if (memory) stored++;
    }

    return stored;
  } catch (err) {
    console.error("[Memory] Extraction error:", err);
    return 0;
  }
}

// ============================================
// HELPERS
// ============================================

async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const openai = getOpenAI();
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
    return embedding.data[0].embedding;
  } catch {
    return null;
  }
}

function mapMemory(row: any): Memory {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    category: row.category,
    content: row.content,
    context: row.context,
    importance: row.importance,
    embedding: row.embedding,
    tags: row.tags || [],
    source: row.source,
    sourceId: row.source_id,
    expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
    accessCount: row.access_count,
    lastAccessedAt: row.last_accessed_at ? new Date(row.last_accessed_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    meta: row.meta || {},
    layer: row.layer as MemoryLayer || 'M2_ShortTerm',
  };
}