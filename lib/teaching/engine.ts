/**
 * Machine Teaching Engine v1
 * lib/teaching/engine.ts
 * 
 * User-driven AI training through feedback, corrections, and examples
 */

import { supabaseAdmin } from "@/lib/supabase";
import { getOpenAI } from "@/services/ai/openai";

// remove module scope init

// ============================================
// TYPES
// ============================================

export interface Teaching {
  id: string;
  userId: string;
  type: TeachingType;
  category: string;
  trigger?: string;
  instruction: string;
  examples?: TeachingExample[];
  priority: number;
  isActive: boolean;
  usageCount: number;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type TeachingType =
  | "preference"      // "I prefer X over Y"
  | "correction"      // "Don't do X, do Y instead"
  | "shortcut"        // "When I say X, I mean Y"
  | "rule"            // "Always/Never do X"
  | "context"         // "In situation X, do Y"
  | "persona"         // "Act like X when..."
  | "template";       // "Use this format for..."

export interface TeachingExample {
  input: string;
  expectedOutput: string;
}

export interface Feedback {
  id: string;
  userId: string;
  messageId?: string;
  rating: "positive" | "negative" | "neutral";
  category?: string;
  comment?: string;
  correction?: string;
  createdAt: Date;
}

export interface TeachingContext {
  teachings: Teaching[];
  recentFeedback: Feedback[];
  compiledInstructions: string;
}

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Create a new teaching
 */
export async function createTeaching(
  userId: string,
  teaching: {
    type: TeachingType;
    category: string;
    trigger?: string;
    instruction: string;
    examples?: TeachingExample[];
    priority?: number;
  }
): Promise<Teaching | null> {
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("teachings")
    .insert({
      user_id: userId,
      type: teaching.type,
      category: teaching.category,
      trigger: teaching.trigger,
      instruction: teaching.instruction,
      examples: teaching.examples || [],
      priority: teaching.priority || 5,
      is_active: true,
      usage_count: 0,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error || !data) return null;
  return mapTeaching(data);
}

/**
 * Get all teachings for a user
 */
export async function getTeachings(
  userId: string,
  options?: {
    type?: TeachingType;
    category?: string;
    activeOnly?: boolean;
  }
): Promise<Teaching[]> {
  let query = supabaseAdmin
    .from("teachings")
    .select("*")
    .eq("user_id", userId);

  if (options?.type) {
    query = query.eq("type", options.type);
  }
  if (options?.category) {
    query = query.eq("category", options.category);
  }
  if (options?.activeOnly !== false) {
    query = query.eq("is_active", true);
  }

  const { data } = await query.order("priority", { ascending: false });

  return (data || []).map(mapTeaching);
}

/**
 * Update a teaching
 */
export async function updateTeaching(
  userId: string,
  teachingId: string,
  updates: Partial<Teaching>
): Promise<Teaching | null> {
  const record: any = { updated_at: new Date().toISOString() };

  if (updates.instruction !== undefined) record.instruction = updates.instruction;
  if (updates.trigger !== undefined) record.trigger = updates.trigger;
  if (updates.examples !== undefined) record.examples = updates.examples;
  if (updates.priority !== undefined) record.priority = updates.priority;
  if (updates.isActive !== undefined) record.is_active = updates.isActive;

  const { data, error } = await supabaseAdmin
    .from("teachings")
    .update(record)
    .eq("id", teachingId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !data) return null;
  return mapTeaching(data);
}

/**
 * Delete a teaching
 */
export async function deleteTeaching(userId: string, teachingId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("teachings")
    .delete()
    .eq("id", teachingId)
    .eq("user_id", userId);

  return !error;
}

/**
 * Record teaching usage
 */
export async function recordTeachingUsage(teachingId: string): Promise<void> {
  await supabaseAdmin.rpc("increment_teaching_usage", { teaching_id: teachingId });
}

// ============================================
// FEEDBACK
// ============================================

/**
 * Submit feedback on AI response
 */
export async function submitFeedback(
  userId: string,
  feedback: {
    messageId?: string;
    rating: Feedback["rating"];
    category?: string;
    comment?: string;
    correction?: string;
  }
): Promise<Feedback | null> {
  const { data, error } = await supabaseAdmin
    .from("feedback")
    .insert({
      user_id: userId,
      message_id: feedback.messageId,
      rating: feedback.rating,
      category: feedback.category,
      comment: feedback.comment,
      correction: feedback.correction,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !data) return null;

  // Auto-create teaching from correction
  if (feedback.correction && feedback.rating === "negative") {
    await createTeachingFromFeedback(userId, feedback);
  }

  return {
    id: data.id,
    userId: data.user_id,
    messageId: data.message_id,
    rating: data.rating,
    category: data.category,
    comment: data.comment,
    correction: data.correction,
    createdAt: new Date(data.created_at),
  };
}

/**
 * Auto-create teaching from negative feedback
 */
async function createTeachingFromFeedback(
  userId: string,
  feedback: { comment?: string; correction?: string; category?: string }
): Promise<void> {
  if (!feedback.correction) return;

  await createTeaching(userId, {
    type: "correction",
    category: feedback.category || "general",
    instruction: feedback.correction,
    priority: 7, // Higher priority for user corrections
  });
}

/**
 * Get recent feedback
 */
export async function getRecentFeedback(userId: string, limit = 20): Promise<Feedback[]> {
  const { data } = await supabaseAdmin
    .from("feedback")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data || []).map((f) => ({
    id: f.id,
    userId: f.user_id,
    messageId: f.message_id,
    rating: f.rating,
    category: f.category,
    comment: f.comment,
    correction: f.correction,
    createdAt: new Date(f.created_at),
  }));
}

// ============================================
// CONTEXT BUILDING
// ============================================

/**
 * Build teaching context for AI calls
 */
export async function buildTeachingContext(
  userId: string,
  query?: string
): Promise<TeachingContext> {
  const teachings = await getTeachings(userId, { activeOnly: true });
  const recentFeedback = await getRecentFeedback(userId, 10);

  // Compile instructions
  const compiledInstructions = compileInstructions(teachings, query);

  return {
    teachings,
    recentFeedback,
    compiledInstructions,
  };
}

/**
 * Compile teachings into system prompt addition
 */
function compileInstructions(teachings: Teaching[], query?: string): string {
  if (teachings.length === 0) return "";

  const sections: string[] = [];

  // Group by type
  const byType = new Map<TeachingType, Teaching[]>();
  for (const t of teachings) {
    const existing = byType.get(t.type) || [];
    existing.push(t);
    byType.set(t.type, existing);
  }

  // Rules (highest priority)
  const rules = byType.get("rule") || [];
  if (rules.length > 0) {
    sections.push("RULES:\n" + rules.map((r) => `- ${r.instruction}`).join("\n"));
  }

  // Corrections
  const corrections = byType.get("correction") || [];
  if (corrections.length > 0) {
    sections.push("CORRECTIONS:\n" + corrections.map((c) => `- ${c.instruction}`).join("\n"));
  }

  // Preferences
  const preferences = byType.get("preference") || [];
  if (preferences.length > 0) {
    sections.push("PREFERENCES:\n" + preferences.map((p) => `- ${p.instruction}`).join("\n"));
  }

  // Shortcuts
  const shortcuts = byType.get("shortcut") || [];
  if (shortcuts.length > 0) {
    sections.push("SHORTCUTS:\n" + shortcuts.map((s) => `- "${s.trigger}" → ${s.instruction}`).join("\n"));
  }

  // Context rules
  const contexts = byType.get("context") || [];
  if (contexts.length > 0) {
    sections.push("CONTEXT RULES:\n" + contexts.map((c) => `- ${c.instruction}`).join("\n"));
  }

  // Templates
  const templates = byType.get("template") || [];
  if (templates.length > 0) {
    sections.push("TEMPLATES:\n" + templates.map((t) => `- ${t.category}: ${t.instruction}`).join("\n"));
  }

  if (sections.length === 0) return "";

  return `\n\nUSER TEACHINGS (apply these to your responses):\n${sections.join("\n\n")}`;
}

/**
 * Extract teachings from natural language
 */
export async function extractTeachingFromText(
  userId: string,
  text: string
): Promise<Teaching | null> {
  const prompt = `Extract a teaching/instruction from this user input:

"${text}"

Determine:
1. Type: preference, correction, shortcut, rule, context, or template
2. Category: communication, formatting, tone, content, behavior, or general
3. Trigger (if shortcut): what phrase triggers this
4. Instruction: the actual rule/preference

Respond in JSON:
{
  "type": "string",
  "category": "string",
  "trigger": "string or null",
  "instruction": "string",
  "confidence": 0.0-1.0
}`;

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");

    if (result.confidence < 0.5) return null;

    return await createTeaching(userId, {
      type: result.type,
      category: result.category,
      trigger: result.trigger,
      instruction: result.instruction,
    });
  } catch (err) {
    console.error("[Teaching] Extraction error:", err);
    return null;
  }
}

// ============================================
// ANALYTICS
// ============================================

/**
 * Get teaching analytics
 */
export async function getTeachingAnalytics(userId: string): Promise<{
  totalTeachings: number;
  byType: Record<string, number>;
  mostUsed: Teaching[];
  feedbackSummary: { positive: number; negative: number; neutral: number };
}> {
  const teachings = await getTeachings(userId, { activeOnly: false });
  const feedback = await getRecentFeedback(userId, 100);

  const byType: Record<string, number> = {};
  for (const t of teachings) {
    byType[t.type] = (byType[t.type] || 0) + 1;
  }

  const mostUsed = [...teachings]
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 5);

  const feedbackSummary = {
    positive: feedback.filter((f) => f.rating === "positive").length,
    negative: feedback.filter((f) => f.rating === "negative").length,
    neutral: feedback.filter((f) => f.rating === "neutral").length,
  };

  return {
    totalTeachings: teachings.length,
    byType,
    mostUsed,
    feedbackSummary,
  };
}

// ============================================
// HELPERS
// ============================================

function mapTeaching(row: any): Teaching {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    category: row.category,
    trigger: row.trigger,
    instruction: row.instruction,
    examples: row.examples || [],
    priority: row.priority,
    isActive: row.is_active,
    usageCount: row.usage_count,
    lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}