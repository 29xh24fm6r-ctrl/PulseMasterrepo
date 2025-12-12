// Persona Generator - AI-Created Personas
// lib/personas/generator.ts

import { supabaseAdmin } from "@/lib/supabase";
import { llmComplete } from "@/lib/llm/client";
import { ToneMatrix } from "./types";

export interface GenerationRequest {
  userId: string;
  description: string;
}

export interface GeneratedPersona {
  name: string;
  style: ToneMatrix;
  description: string;
  sampleLines: string[];
}

/**
 * Generate persona from description using LLM
 */
export async function generatePersona(
  request: GenerationRequest
): Promise<GeneratedPersona> {
  const prompt = `You are creating a new Pulse persona based on this description: "${request.description}"

Output ONLY valid JSON with this structure:
{
  "name": "Persona Name",
  "description": "Brief description of the persona",
  "tone": {
    "energy": 0-100,
    "warmth": 0-100,
    "pacing": "fast" | "normal" | "slow",
    "sentence_length": "short" | "medium" | "long",
    "decisiveness": 0-100,
    "humor": 0-100,
    "metaphor_density": 0-100,
    "rhetorical_intensity": 0-100,
    "directiveness": 0-100,
    "emotional_reflection": 0-100,
    "phrasing_patterns": ["signature phrase 1", "signature phrase 2", ...]
  },
  "sampleLines": ["Example line 1", "Example line 2", "Example line 3"]
}

Infer tone, pacing, warmth, metaphors, energy, signature lines, and persona name based on the textual description.`;

  try {
    const response = await llmComplete(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.8,
      json: true,
    });

    const parsed = typeof response === "string" ? JSON.parse(response) : response;

    // Validate and normalize
    const persona: GeneratedPersona = {
      name: parsed.name || "Generated Persona",
      description: parsed.description || request.description,
      style: {
        energy: Math.max(0, Math.min(100, parsed.tone?.energy || 50)),
        warmth: Math.max(0, Math.min(100, parsed.tone?.warmth || 50)),
        pacing: parsed.tone?.pacing || "normal",
        sentence_length: parsed.tone?.sentence_length || "medium",
        decisiveness: Math.max(0, Math.min(100, parsed.tone?.decisiveness || 50)),
        humor: Math.max(0, Math.min(100, parsed.tone?.humor || 30)),
        metaphor_density: parsed.tone?.metaphor_density !== undefined ? Math.max(0, Math.min(100, parsed.tone.metaphor_density)) : 20,
        rhetorical_intensity: parsed.tone?.rhetorical_intensity !== undefined ? Math.max(0, Math.min(100, parsed.tone.rhetorical_intensity)) : 40,
        directiveness: parsed.tone?.directiveness !== undefined ? Math.max(0, Math.min(100, parsed.tone.directiveness)) : 50,
        emotional_reflection: parsed.tone?.emotional_reflection !== undefined ? Math.max(0, Math.min(100, parsed.tone.emotional_reflection)) : 50,
        phrasing_patterns: Array.isArray(parsed.tone?.phrasing_patterns)
          ? parsed.tone.phrasing_patterns.slice(0, 10)
          : [],
      },
      sampleLines: Array.isArray(parsed.sampleLines) ? parsed.sampleLines : [],
    };

    return persona;
  } catch (error) {
    console.error("[PersonaGenerator] Error:", error);
    throw new Error("Failed to generate persona");
  }
}

/**
 * Save generated persona to database
 */
export async function saveGeneratedPersona(
  userId: string,
  requestId: string,
  persona: GeneratedPersona
): Promise<string> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Generate key from name
  const key = persona.name.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now();

  // Insert into voice_profiles
  const { data: profile, error } = await supabaseAdmin
    .from("voice_profiles")
    .insert({
      key,
      name: persona.name,
      description: persona.description,
      style: persona.style,
      is_generated: true,
      metadata: {
        sample_lines: persona.sampleLines,
        generated_at: new Date().toISOString(),
      },
    })
    .select("id")
    .single();

  if (error || !profile) {
    throw new Error("Failed to save persona");
  }

  // Update generation request
  await supabaseAdmin
    .from("persona_generation_requests")
    .update({
      generated_profile_id: profile.id,
      status: "completed",
    })
    .eq("id", requestId);

  return profile.id;
}

