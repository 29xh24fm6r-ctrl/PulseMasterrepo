// Persona DNA System
// lib/personas/dna.ts

import { supabaseAdmin } from "@/lib/supabase";
import { PersonaProfile, ToneMatrix } from "./types";

export interface PersonaDNA {
  version: number;
  genes: {
    tone: {
      energy: number;
      warmth: number;
      pacing: "fast" | "normal" | "slow";
      sentence_length: "short" | "medium" | "long";
    };
    cognition: {
      structure_level: number; // 0-100
      abstraction_level: number; // 0-100
      step_by_step_bias: number; // 0-100
    };
    relational: {
      empathy_bias: number; // 0-100
      challenge_bias: number; // 0-100
      validation_style: "direct" | "indirect" | "balanced";
    };
    motivation: {
      push_vs_pull: number; // 0-100 (0 = pull, 100 = push)
      risk_tolerance: number; // 0-100
    };
    narrative: {
      metaphor_density: number; // 0-100
      story_usage: number; // 0-100
      temporal_focus: "past" | "present" | "future";
    };
  };
}

/**
 * Encode persona to DNA
 */
export function encodePersonaToDNA(persona: PersonaProfile): PersonaDNA {
  const style = persona.style;

  return {
    version: 1,
    genes: {
      tone: {
        energy: style.energy,
        warmth: style.warmth,
        pacing: style.pacing,
        sentence_length: style.sentence_length,
      },
      cognition: {
        structure_level: style.decisiveness || 50,
        abstraction_level: style.metaphor_density || 30,
        step_by_step_bias: style.directiveness || 50,
      },
      relational: {
        empathy_bias: style.emotional_reflection || 50,
        challenge_bias: 100 - (style.warmth || 50),
        validation_style:
          (style.warmth || 50) > 70
            ? "indirect"
            : (style.directiveness || 50) > 70
            ? "direct"
            : "balanced",
      },
      motivation: {
        push_vs_pull: style.energy || 50,
        risk_tolerance: style.decisiveness || 50,
      },
      narrative: {
        metaphor_density: style.metaphor_density || 30,
        story_usage: style.rhetorical_intensity || 40,
        temporal_focus: "future", // Default, can be inferred from phrasing patterns
      },
    },
  };
}

/**
 * Decode DNA to persona
 */
export function decodeDNAToPersona(dna: PersonaDNA, basePersona: PersonaProfile): PersonaProfile {
  const genes = dna.genes;

  return {
    ...basePersona,
    style: {
      ...basePersona.style,
      energy: genes.tone.energy,
      warmth: genes.tone.warmth,
      pacing: genes.tone.pacing,
      sentence_length: genes.tone.sentence_length,
      decisiveness: genes.cognition.structure_level,
      directiveness: genes.cognition.step_by_step_bias,
      metaphor_density: genes.narrative.metaphor_density,
      rhetorical_intensity: genes.narrative.story_usage,
      emotional_reflection: genes.relational.empathy_bias,
    },
  };
}

/**
 * Mutate DNA
 */
export function mutateDNA(
  dna: PersonaDNA,
  options?: { intensity?: number }
): PersonaDNA {
  const intensity = options?.intensity || 5; // Default 5% mutation
  const mutated = JSON.parse(JSON.stringify(dna)); // Deep clone

  // Mutate numeric genes
  const mutateNumeric = (value: number, min: number = 0, max: number = 100): number => {
    const delta = (Math.random() - 0.5) * 2 * intensity;
    return Math.max(min, Math.min(max, value + delta));
  };

  // Tone genes
  mutated.genes.tone.energy = mutateNumeric(mutated.genes.tone.energy);
  mutated.genes.tone.warmth = mutateNumeric(mutated.genes.tone.warmth);

  // Cognition genes
  mutated.genes.cognition.structure_level = mutateNumeric(mutated.genes.cognition.structure_level);
  mutated.genes.cognition.abstraction_level = mutateNumeric(
    mutated.genes.cognition.abstraction_level
  );
  mutated.genes.cognition.step_by_step_bias = mutateNumeric(
    mutated.genes.cognition.step_by_step_bias
  );

  // Relational genes
  mutated.genes.relational.empathy_bias = mutateNumeric(mutated.genes.relational.empathy_bias);
  mutated.genes.relational.challenge_bias = mutateNumeric(mutated.genes.relational.challenge_bias);

  // Motivation genes
  mutated.genes.motivation.push_vs_pull = mutateNumeric(mutated.genes.motivation.push_vs_pull);
  mutated.genes.motivation.risk_tolerance = mutateNumeric(mutated.genes.motivation.risk_tolerance);

  // Narrative genes
  mutated.genes.narrative.metaphor_density = mutateNumeric(
    mutated.genes.narrative.metaphor_density
  );
  mutated.genes.narrative.story_usage = mutateNumeric(mutated.genes.narrative.story_usage);

  // Mutate categorical genes (small chance)
  if (Math.random() < 0.1) {
    const pacingOptions: ("fast" | "normal" | "slow")[] = ["fast", "normal", "slow"];
    mutated.genes.tone.pacing =
      pacingOptions[Math.floor(Math.random() * pacingOptions.length)];
  }

  if (Math.random() < 0.1) {
    const lengthOptions: ("short" | "medium" | "long")[] = ["short", "medium", "long"];
    mutated.genes.tone.sentence_length =
      lengthOptions[Math.floor(Math.random() * lengthOptions.length)];
  }

  return mutated;
}

/**
 * Recombine two DNA sequences
 */
export function recombineDNA(
  dnaA: PersonaDNA,
  dnaB: PersonaDNA,
  options?: { ratioA?: number; ratioB?: number }
): PersonaDNA {
  const ratioA = options?.ratioA || 50;
  const ratioB = options?.ratioB || 50;
  const total = ratioA + ratioB;
  const normalizedA = ratioA / total;
  const normalizedB = ratioB / total;

  const recombined: PersonaDNA = {
    version: Math.max(dnaA.version, dnaB.version) + 1,
    genes: {
      tone: {
        energy: Math.round(dnaA.genes.tone.energy * normalizedA + dnaB.genes.tone.energy * normalizedB),
        warmth: Math.round(dnaA.genes.tone.warmth * normalizedA + dnaB.genes.tone.warmth * normalizedB),
        pacing: normalizedA > normalizedB ? dnaA.genes.tone.pacing : dnaB.genes.tone.pacing,
        sentence_length:
          normalizedA > normalizedB ? dnaA.genes.tone.sentence_length : dnaB.genes.tone.sentence_length,
      },
      cognition: {
        structure_level: Math.round(
          dnaA.genes.cognition.structure_level * normalizedA +
            dnaB.genes.cognition.structure_level * normalizedB
        ),
        abstraction_level: Math.round(
          dnaA.genes.cognition.abstraction_level * normalizedA +
            dnaB.genes.cognition.abstraction_level * normalizedB
        ),
        step_by_step_bias: Math.round(
          dnaA.genes.cognition.step_by_step_bias * normalizedA +
            dnaB.genes.cognition.step_by_step_bias * normalizedB
        ),
      },
      relational: {
        empathy_bias: Math.round(
          dnaA.genes.relational.empathy_bias * normalizedA +
            dnaB.genes.relational.empathy_bias * normalizedB
        ),
        challenge_bias: Math.round(
          dnaA.genes.relational.challenge_bias * normalizedA +
            dnaB.genes.relational.challenge_bias * normalizedB
        ),
        validation_style:
          normalizedA > normalizedB
            ? dnaA.genes.relational.validation_style
            : dnaB.genes.relational.validation_style,
      },
      motivation: {
        push_vs_pull: Math.round(
          dnaA.genes.motivation.push_vs_pull * normalizedA +
            dnaB.genes.motivation.push_vs_pull * normalizedB
        ),
        risk_tolerance: Math.round(
          dnaA.genes.motivation.risk_tolerance * normalizedA +
            dnaB.genes.motivation.risk_tolerance * normalizedB
        ),
      },
      narrative: {
        metaphor_density: Math.round(
          dnaA.genes.narrative.metaphor_density * normalizedA +
            dnaB.genes.narrative.metaphor_density * normalizedB
        ),
        story_usage: Math.round(
          dnaA.genes.narrative.story_usage * normalizedA +
            dnaB.genes.narrative.story_usage * normalizedB
        ),
        temporal_focus:
          normalizedA > normalizedB
            ? dnaA.genes.narrative.temporal_focus
            : dnaB.genes.narrative.temporal_focus,
      },
    },
  };

  return recombined;
}

/**
 * Save DNA to database
 */
export async function savePersonaDNA(
  personaId: string,
  dna: PersonaDNA
): Promise<void> {
  // Get latest version
  const { data: latest } = await supabaseAdmin
    .from("persona_dna")
    .select("version")
    .eq("persona_id", personaId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (latest?.version || 0) + 1;

  await supabaseAdmin.from("persona_dna").insert({
    persona_id: personaId,
    version: nextVersion,
    dna: dna as any,
  });
}

/**
 * Get latest DNA for persona
 */
export async function getPersonaDNA(personaId: string): Promise<PersonaDNA | null> {
  const { data } = await supabaseAdmin
    .from("persona_dna")
    .select("dna")
    .eq("persona_id", personaId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;

  return data.dna as PersonaDNA;
}




