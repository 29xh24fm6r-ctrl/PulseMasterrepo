/**
 * Relationship Engine v1
 * lib/relationships/engine.ts
 * 
 * Tracks relationship health, interaction history, and suggests follow-ups
 */

import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { getOpenAI } from "@/services/ai/openai";

// ... existing code ...

// ============================================
// TYPES
// ============================================

export interface Relationship {
  id: string;
  userId: string;
  contactId?: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  relationship: "colleague" | "client" | "prospect" | "vendor" | "personal" | "mentor" | "mentee";
  importance: "low" | "normal" | "key" | "vip";
  healthScore: number; // 0-100
  lastContactAt?: Date;
  nextFollowupAt?: Date;
  followupCadenceDays: number;
  interactionCount: number;
  notes?: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Interaction {
  id: string;
  userId: string;
  relationshipId: string;
  type: "email" | "call" | "meeting" | "message" | "note";
  direction: "inbound" | "outbound";
  subject?: string;
  summary?: string;
  sentiment?: "positive" | "neutral" | "negative";
  occurredAt: Date;
  createdAt: Date;
}

export interface RelationshipInsight {
  relationshipId: string;
  name: string;
  type: "needs_attention" | "going_cold" | "overdue_followup" | "strengthen";
  message: string;
  suggestedAction?: string;
  priority: "low" | "medium" | "high";
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Get all relationships for a user
 */
export async function getRelationships(
  userId: string,
  options?: {
    importance?: Relationship["importance"][];
    relationship?: Relationship["relationship"][];
    needsAttention?: boolean;
    limit?: number;
  }
): Promise<Relationship[]> {
  let query = getSupabaseAdminRuntimeClient()
    .from("relationships")
    .select("*")
    .eq("user_id_uuid", userId);

  if (options?.importance?.length) {
    query = query.in("importance", options.importance);
  }
  if (options?.relationship?.length) {
    query = query.in("relationship", options.relationship);
  }
  if (options?.needsAttention) {
    query = query.lt("health_score", 50);
  }

  query = query.order("health_score", { ascending: true }).limit(options?.limit || 50);

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map(mapRelationship);
}

/**
 * Get a single relationship
 */
export async function getRelationship(userId: string, id: string): Promise<Relationship | null> {
  const { data, error } = await getSupabaseAdminRuntimeClient()
    .from("relationships")
    .select("*")
    .eq("user_id_uuid", userId)
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return mapRelationship(data);
}

/**
 * Create or update a relationship
 */
export async function upsertRelationship(
  userId: string,
  data: Partial<Relationship> & { name: string }
): Promise<Relationship | null> {
  const now = new Date().toISOString();

  const record = {
    user_id_uuid: userId,
    name: data.name,
    email: data.email,
    phone: data.phone,
    company: data.company,
    role: data.role,
    relationship: data.relationship || "personal",
    importance: data.importance || "normal",
    health_score: data.healthScore ?? 75,
    last_contact_at: data.lastContactAt?.toISOString(),
    next_followup_at: data.nextFollowupAt?.toISOString(),
    followup_cadence_days: data.followupCadenceDays ?? 30,
    interaction_count: data.interactionCount ?? 0,
    notes: data.notes,
    tags: data.tags || [],
    updated_at: now,
  };

  if (data.id) {
    const { data: updated, error } = await getSupabaseAdminRuntimeClient()
      .from("relationships")
      .update(record)
      .eq("id", data.id)
      .eq("user_id_uuid", userId)
      .select()
      .single();

    if (error || !updated) return null;
    return mapRelationship(updated);
  }

  const { data: created, error } = await getSupabaseAdminRuntimeClient()
    .from("relationships")
    .insert({ ...record, created_at: now })
    .select()
    .single();

  if (error || !created) return null;
  return mapRelationship(created);
}

/**
 * Log an interaction
 */
export async function logInteraction(
  userId: string,
  relationshipId: string,
  interaction: {
    type: Interaction["type"];
    direction: Interaction["direction"];
    subject?: string;
    summary?: string;
    sentiment?: Interaction["sentiment"];
    occurredAt?: Date;
  }
): Promise<boolean> {
  const now = new Date();

  // Insert interaction
  const { error: interactionError } = await getSupabaseAdminRuntimeClient()
    .from("relationship_interactions")
    .insert({
      user_id_uuid: userId,
      relationship_id: relationshipId,
      type: interaction.type,
      direction: interaction.direction,
      subject: interaction.subject,
      summary: interaction.summary,
      sentiment: interaction.sentiment || "neutral",
      occurred_at: (interaction.occurredAt || now).toISOString(),
      created_at: now.toISOString(),
    });

  if (interactionError) return false;

  // Update relationship
  const { data: rel } = await getSupabaseAdminRuntimeClient()
    .from("relationships")
    .select("interaction_count, followup_cadence_days")
    .eq("id", relationshipId)
    .single();

  const nextFollowup = new Date();
  nextFollowup.setDate(nextFollowup.getDate() + (rel?.followup_cadence_days || 30));

  await getSupabaseAdminRuntimeClient()
    .from("relationships")
    .update({
      last_contact_at: now.toISOString(),
      next_followup_at: nextFollowup.toISOString(),
      interaction_count: (rel?.interaction_count || 0) + 1,
      health_score: Math.min(100, 75 + (interaction.sentiment === "positive" ? 10 : 0)),
      updated_at: now.toISOString(),
    })
    .eq("id", relationshipId);

  return true;
}

/**
 * Calculate health scores for all relationships
 */
export async function recalculateHealthScores(userId: string): Promise<number> {
  const { data: relationships } = await getSupabaseAdminRuntimeClient()
    .from("relationships")
    .select("id, last_contact_at, followup_cadence_days, next_followup_at")
    .eq("user_id_uuid", userId);

  if (!relationships) return 0;

  const now = new Date();
  let updated = 0;

  for (const rel of relationships) {
    let score = 75; // Base score

    if (rel.last_contact_at) {
      const lastContact = new Date(rel.last_contact_at);
      const daysSince = Math.floor((now.getTime() - lastContact.getTime()) / (1000 * 60 * 60 * 24));
      const cadence = rel.followup_cadence_days || 30;

      if (daysSince <= cadence * 0.5) {
        score = 90; // Recently contacted
      } else if (daysSince <= cadence) {
        score = 75; // On track
      } else if (daysSince <= cadence * 1.5) {
        score = 50; // Needs attention
      } else if (daysSince <= cadence * 2) {
        score = 30; // Going cold
      } else {
        score = 10; // Cold
      }
    } else {
      score = 50; // Never contacted
    }

    await getSupabaseAdminRuntimeClient()
      .from("relationships")
      .update({ health_score: score, updated_at: now.toISOString() })
      .eq("id", rel.id);

    updated++;
  }

  return updated;
}

/**
 * Get relationship insights
 */
export async function getRelationshipInsights(userId: string): Promise<RelationshipInsight[]> {
  const relationships = await getRelationships(userId, { limit: 100 });
  const insights: RelationshipInsight[] = [];
  const now = new Date();

  for (const rel of relationships) {
    // Overdue follow-up
    if (rel.nextFollowupAt && rel.nextFollowupAt < now) {
      const daysOverdue = Math.floor((now.getTime() - rel.nextFollowupAt.getTime()) / (1000 * 60 * 60 * 24));
      insights.push({
        relationshipId: rel.id,
        name: rel.name,
        type: "overdue_followup",
        message: `Follow-up with ${rel.name} is ${daysOverdue} days overdue`,
        suggestedAction: `Send a quick check-in message to ${rel.name}`,
        priority: daysOverdue > 14 ? "high" : daysOverdue > 7 ? "medium" : "low",
      });
    }

    // Going cold
    if (rel.healthScore < 30 && rel.importance !== "low") {
      insights.push({
        relationshipId: rel.id,
        name: rel.name,
        type: "going_cold",
        message: `Your relationship with ${rel.name} is going cold (score: ${rel.healthScore})`,
        suggestedAction: `Schedule a call or coffee with ${rel.name}`,
        priority: rel.importance === "vip" ? "high" : "medium",
      });
    }

    // Key relationships need attention
    if (rel.healthScore < 50 && (rel.importance === "key" || rel.importance === "vip")) {
      insights.push({
        relationshipId: rel.id,
        name: rel.name,
        type: "needs_attention",
        message: `${rel.importance.toUpperCase()} contact ${rel.name} needs attention`,
        suggestedAction: `Reach out to ${rel.name} this week`,
        priority: "high",
      });
    }
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return insights.slice(0, 10);
}

/**
 * Get recent interactions for a relationship
 */
export async function getInteractions(
  userId: string,
  relationshipId: string,
  limit = 20
): Promise<Interaction[]> {
  const { data, error } = await getSupabaseAdminRuntimeClient()
    .from("relationship_interactions")
    .select("*")
    .eq("user_id_uuid", userId)
    .eq("relationship_id", relationshipId)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    userId: row.user_id_uuid,
    relationshipId: row.relationship_id,
    type: row.type,
    direction: row.direction,
    subject: row.subject,
    summary: row.summary,
    sentiment: row.sentiment,
    occurredAt: new Date(row.occurred_at),
    createdAt: new Date(row.created_at),
  }));
}

// ============================================
// AI FUNCTIONS
// ============================================

/**
 * Generate AI-powered relationship summary
 */
export async function generateRelationshipSummary(
  userId: string,
  relationshipId: string
): Promise<string | null> {
  const relationship = await getRelationship(userId, relationshipId);
  if (!relationship) return null;

  const interactions = await getInteractions(userId, relationshipId, 10);

  const prompt = `Summarize this professional relationship:

Name: ${relationship.name}
Company: ${relationship.company || "Unknown"}
Role: ${relationship.role || "Unknown"}
Relationship Type: ${relationship.relationship}
Importance: ${relationship.importance}
Health Score: ${relationship.healthScore}/100
Last Contact: ${relationship.lastContactAt?.toLocaleDateString() || "Never"}

Recent Interactions:
${interactions.map((i) => `- ${i.occurredAt.toLocaleDateString()}: ${i.type} (${i.direction}) - ${i.summary || i.subject || "No details"}`).join("\n") || "No interactions logged"}

Provide a 2-3 sentence summary of this relationship and one suggestion for strengthening it.`;

  try {
    const openai = await getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
    });

    return completion.choices[0].message.content;
  } catch (err) {
    console.error("[RelationshipEngine] AI error:", err);
    return null;
  }
}

// ============================================
// MAPPER
// ============================================

function mapRelationship(row: any): Relationship {
  return {
    id: row.id,
    userId: row.user_id_uuid,
    contactId: row.contact_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    role: row.role,
    relationship: row.relationship,
    importance: row.importance,
    healthScore: row.health_score,
    lastContactAt: row.last_contact_at ? new Date(row.last_contact_at) : undefined,
    nextFollowupAt: row.next_followup_at ? new Date(row.next_followup_at) : undefined,
    followupCadenceDays: row.followup_cadence_days,
    interactionCount: row.interaction_count,
    notes: row.notes,
    tags: row.tags || [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}