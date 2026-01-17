/**
 * Butler Personas v1
 * lib/personas/engine.ts
 * 
 * Customizable AI personality profiles for different contexts
 */

import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

// ============================================
// TYPES
// ============================================

export interface Persona {
  id: string;
  userId: string;
  name: string;
  description: string;
  tone: "formal" | "casual" | "friendly" | "professional" | "motivational";
  verbosity: "concise" | "balanced" | "detailed";
  traits: string[];
  systemPrompt: string;
  context?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonaTemplate {
  id: string;
  name: string;
  description: string;
  tone: Persona["tone"];
  verbosity: Persona["verbosity"];
  traits: string[];
  systemPrompt: string;
}

// ============================================
// BUILT-IN PERSONAS
// ============================================

export const PERSONA_TEMPLATES: PersonaTemplate[] = [
  {
    id: "executive-assistant",
    name: "Executive Assistant",
    description: "Professional, efficient, focused on productivity",
    tone: "professional",
    verbosity: "concise",
    traits: ["efficient", "organized", "proactive", "detail-oriented"],
    systemPrompt: `You are Pulse, an elite executive assistant. Be concise, professional, and action-oriented. 
Prioritize clarity and efficiency. Anticipate needs and offer proactive suggestions.
Focus on high-impact tasks and strategic priorities. Keep responses brief unless detail is requested.`,
  },
  {
    id: "life-coach",
    name: "Life Coach",
    description: "Supportive, motivational, growth-focused",
    tone: "motivational",
    verbosity: "balanced",
    traits: ["encouraging", "empathetic", "growth-minded", "supportive"],
    systemPrompt: `You are Pulse, a supportive life coach and personal growth partner.
Be warm, encouraging, and focused on the user's wellbeing and personal development.
Celebrate wins, provide perspective on challenges, and help maintain work-life balance.
Ask thoughtful questions and offer gentle accountability.`,
  },
  {
    id: "strategic-advisor",
    name: "Strategic Advisor",
    description: "Analytical, thoughtful, big-picture thinking",
    tone: "formal",
    verbosity: "detailed",
    traits: ["analytical", "strategic", "thoughtful", "thorough"],
    systemPrompt: `You are Pulse, a strategic advisor and thought partner.
Provide thorough analysis, consider multiple perspectives, and think long-term.
Help connect dots between different areas of life and work.
Offer frameworks and structured thinking for complex decisions.`,
  },
  {
    id: "friendly-companion",
    name: "Friendly Companion",
    description: "Casual, warm, conversational",
    tone: "friendly",
    verbosity: "balanced",
    traits: ["warm", "casual", "supportive", "personable"],
    systemPrompt: `You are Pulse, a friendly companion and daily helper.
Be warm, casual, and conversational. Use a relaxed tone while still being helpful.
Remember personal details and reference them naturally.
Make interactions feel like chatting with a knowledgeable friend.`,
  },
  {
    id: "productivity-guru",
    name: "Productivity Guru",
    description: "Systems-focused, efficiency-obsessed",
    tone: "professional",
    verbosity: "concise",
    traits: ["systematic", "efficient", "disciplined", "results-focused"],
    systemPrompt: `You are Pulse, a productivity systems expert.
Focus relentlessly on efficiency, systems, and measurable outcomes.
Suggest optimizations, time-saving techniques, and workflow improvements.
Hold the user accountable to their goals and commitments.`,
  },
];

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Get all personas for a user
 */
export async function getPersonas(userId: string): Promise<Persona[]> {
  const { data, error } = await getSupabaseAdminRuntimeClient()
    .from("personas")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("name");

  if (error || !data) return [];
  return data.map(mapPersona);
}

/**
 * Get active persona
 */
export async function getActivePersona(userId: string): Promise<Persona | null> {
  const { data, error } = await getSupabaseAdminRuntimeClient()
    .from("personas")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    // Return default template as fallback
    return templateToPersona(PERSONA_TEMPLATES[0], userId);
  }

  return mapPersona(data);
}

/**
 * Create persona from template
 */
export async function createPersonaFromTemplate(
  userId: string,
  templateId: string,
  customizations?: Partial<Persona>
): Promise<Persona | null> {
  const template = PERSONA_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return null;

  const now = new Date().toISOString();

  const { data, error } = await getSupabaseAdminRuntimeClient()
    .from("personas")
    .insert({
      user_id: userId,
      name: customizations?.name || template.name,
      description: customizations?.description || template.description,
      tone: customizations?.tone || template.tone,
      verbosity: customizations?.verbosity || template.verbosity,
      traits: customizations?.traits || template.traits,
      system_prompt: customizations?.systemPrompt || template.systemPrompt,
      context: customizations?.context,
      is_default: false,
      is_active: false,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error || !data) return null;
  return mapPersona(data);
}

/**
 * Create custom persona
 */
export async function createPersona(
  userId: string,
  persona: {
    name: string;
    description?: string;
    tone: Persona["tone"];
    verbosity: Persona["verbosity"];
    traits: string[];
    systemPrompt: string;
    context?: string;
  }
): Promise<Persona | null> {
  const now = new Date().toISOString();

  const { data, error } = await getSupabaseAdminRuntimeClient()
    .from("personas")
    .insert({
      user_id: userId,
      name: persona.name,
      description: persona.description,
      tone: persona.tone,
      verbosity: persona.verbosity,
      traits: persona.traits,
      system_prompt: persona.systemPrompt,
      context: persona.context,
      is_default: false,
      is_active: false,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error || !data) return null;
  return mapPersona(data);
}

/**
 * Update persona
 */
export async function updatePersona(
  userId: string,
  personaId: string,
  updates: Partial<Persona>
): Promise<Persona | null> {
  const record: any = { updated_at: new Date().toISOString() };

  if (updates.name !== undefined) record.name = updates.name;
  if (updates.description !== undefined) record.description = updates.description;
  if (updates.tone !== undefined) record.tone = updates.tone;
  if (updates.verbosity !== undefined) record.verbosity = updates.verbosity;
  if (updates.traits !== undefined) record.traits = updates.traits;
  if (updates.systemPrompt !== undefined) record.system_prompt = updates.systemPrompt;
  if (updates.context !== undefined) record.context = updates.context;

  const { data, error } = await getSupabaseAdminRuntimeClient()
    .from("personas")
    .update(record)
    .eq("id", personaId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error || !data) return null;
  return mapPersona(data);
}

/**
 * Set active persona
 */
export async function setActivePersona(userId: string, personaId: string): Promise<boolean> {
  // Deactivate all
  await getSupabaseAdminRuntimeClient()
    .from("personas")
    .update({ is_active: false })
    .eq("user_id", userId);

  // Activate selected
  const { error } = await getSupabaseAdminRuntimeClient()
    .from("personas")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("id", personaId)
    .eq("user_id", userId);

  return !error;
}

/**
 * Delete persona
 */
export async function deletePersona(userId: string, personaId: string): Promise<boolean> {
  const { error } = await getSupabaseAdminRuntimeClient()
    .from("personas")
    .delete()
    .eq("id", personaId)
    .eq("user_id", userId)
    .eq("is_default", false); // Can't delete default

  return !error;
}

/**
 * Generate system prompt for AI calls
 */
export async function getSystemPromptForUser(userId: string): Promise<string> {
  const persona = await getActivePersona(userId);

  if (!persona) {
    return PERSONA_TEMPLATES[0].systemPrompt;
  }

  let prompt = persona.systemPrompt;

  // Add context if available
  if (persona.context) {
    prompt += `\n\nAdditional context about the user:\n${persona.context}`;
  }

  // Add verbosity instruction
  const verbosityInstructions = {
    concise: "Keep responses brief and to the point. Use bullet points when listing items.",
    balanced: "Provide clear, well-structured responses with appropriate detail.",
    detailed: "Provide thorough, comprehensive responses with examples when helpful.",
  };

  prompt += `\n\nResponse style: ${verbosityInstructions[persona.verbosity]}`;

  return prompt;
}

/**
 * Initialize default personas for new user
 */
export async function initializeDefaultPersonas(userId: string): Promise<void> {
  const { count } = await getSupabaseAdminRuntimeClient()
    .from("personas")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (count && count > 0) return; // Already initialized

  const now = new Date().toISOString();
  const defaultTemplate = PERSONA_TEMPLATES[0];

  await getSupabaseAdminRuntimeClient().from("personas").insert({
    user_id: userId,
    name: defaultTemplate.name,
    description: defaultTemplate.description,
    tone: defaultTemplate.tone,
    verbosity: defaultTemplate.verbosity,
    traits: defaultTemplate.traits,
    system_prompt: defaultTemplate.systemPrompt,
    is_default: true,
    is_active: true,
    created_at: now,
    updated_at: now,
  });
}

// ============================================
// HELPERS
// ============================================

function mapPersona(row: any): Persona {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    tone: row.tone,
    verbosity: row.verbosity,
    traits: row.traits || [],
    systemPrompt: row.system_prompt,
    context: row.context,
    isDefault: row.is_default,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function templateToPersona(template: PersonaTemplate, userId: string): Persona {
  return {
    id: template.id,
    userId,
    name: template.name,
    description: template.description,
    tone: template.tone,
    verbosity: template.verbosity,
    traits: template.traits,
    systemPrompt: template.systemPrompt,
    isDefault: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}