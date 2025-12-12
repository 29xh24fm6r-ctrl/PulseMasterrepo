// Safety Policy Seeds
// lib/safety/seed.ts

import { supabaseAdmin } from "@/lib/supabase";
import { SafetyPolicyConfig } from "./types";

export const GLOBAL_DEFAULT_POLICY: SafetyPolicyConfig & { name: string; description: string } = {
  key: "global_default",
  name: "Global Default Safety Policy",
  description: "Core safety rules that apply to all coaches and personas",
  core_values: [
    "Never sexual with the user in any way.",
    "Always protective of user safety and dignity.",
    "Never encourage self-harm, abuse, or harmful behavior.",
    "Never manipulate; always respect user autonomy and consent.",
    "Stay within role: AI coach, not a licensed professional.",
  ],
  hard_rules: [
    {
      id: "no_sexual_content",
      description: "Block any sexual content, sexting, explicit descriptions, or erotic roleplay",
      category: "sexual",
      triggers: {
        input_patterns: [
          "sex",
          "sexual",
          "sexting",
          "erotic",
          "porn",
          "nude",
          "naked",
          "orgasm",
          "masturbat",
          "fuck me",
          "fuck you",
          "dick",
          "pussy",
          "cock",
          "cum",
        ],
        output_patterns: [
          "sexual",
          "erotic",
          "sexting",
          "intimate",
          "bedroom",
        ],
      },
      action: "block",
      severity: 5,
    },
    {
      id: "self_harm_route",
      description: "Route self-harm or suicide discussions to supportive help resources",
      category: "self_harm",
      triggers: {
        input_patterns: [
          "kill myself",
          "suicide",
          "end my life",
          "hurt myself",
          "cut myself",
          "self harm",
          "want to die",
          "not worth living",
        ],
        output_patterns: [
          "kill yourself",
          "end your life",
          "hurt yourself",
          "suicide",
        ],
      },
      action: "route_to_help",
      severity: 5,
    },
    {
      id: "violence_block",
      description: "Block violence, criminal activity, weapons, or hacking instructions",
      category: "violence",
      triggers: {
        input_patterns: [
          "kill",
          "murder",
          "assassinate",
          "bomb",
          "weapon",
          "gun",
          "hack",
          "illegal",
          "crime",
          "rob",
          "steal",
          "violence",
        ],
        output_patterns: [
          "kill",
          "murder",
          "violence",
          "weapon",
          "illegal",
        ],
      },
      action: "block",
      severity: 4,
    },
    {
      id: "hate_harassment_block",
      description: "Block hate speech, slurs, dehumanization, or targeted harassment",
      category: "hate_harassment",
      triggers: {
        input_patterns: [
          "nigger",
          "faggot",
          "retard",
          "bitch",
          "slut",
          "whore",
          "hate",
          "racist",
          "sexist",
        ],
        output_patterns: [
          "hate",
          "slur",
          "dehumaniz",
        ],
      },
      action: "block",
      severity: 5,
    },
    {
      id: "medical_diagnosis_sanitize",
      description: "Sanitize medical diagnoses or prescriptions; encourage professional consultation",
      category: "medical_diagnosis",
      triggers: {
        input_patterns: [
          "diagnose",
          "prescription",
          "medication",
          "treatment",
          "cure",
          "disease",
          "symptom",
        ],
        output_patterns: [
          "you have",
          "diagnosis",
          "prescribe",
          "take this medication",
          "you are sick",
        ],
      },
      action: "sanitize",
      severity: 3,
    },
    {
      id: "financial_high_risk_sanitize",
      description: "Sanitize high-risk financial advice; encourage professional consultation",
      category: "financial_advice_high_risk",
      triggers: {
        input_patterns: [
          "invest in",
          "buy stock",
          "crypto",
          "trading",
          "investment",
          "financial advice",
        ],
        output_patterns: [
          "invest now",
          "buy this",
          "guaranteed return",
          "financial advice",
        ],
      },
      action: "sanitize",
      severity: 3,
    },
    {
      id: "substances_sanitize",
      description: "Sanitize substance use advice; only harm-reduction and quitting support",
      category: "substances",
      triggers: {
        input_patterns: [
          "drug",
          "cocaine",
          "heroin",
          "meth",
          "alcohol",
          "drinking",
        ],
        output_patterns: [
          "use drugs",
          "take drugs",
          "how to use",
        ],
      },
      action: "sanitize",
      severity: 3,
    },
    {
      id: "no_pretend_professional",
      description: "Never pretend to be a licensed professional (doctor, lawyer, therapist)",
      category: "other",
      triggers: {
        output_patterns: [
          "i am a doctor",
          "i am a lawyer",
          "i am a therapist",
          "as a licensed",
          "my medical license",
        ],
      },
      action: "sanitize",
      severity: 2,
    },
  ],
  soft_guidelines: [
    "No shaming or judgmental language",
    "No pushiness or manipulation",
    "Respect user autonomy and consent",
    "Maintain appropriate boundaries",
    "Be supportive but not directive in crisis situations",
  ],
};

/**
 * Seed global default safety policy
 */
export async function seedSafetyPolicies(): Promise<void> {
  await supabaseAdmin
    .from("safety_policies")
    .upsert(
      {
        key: GLOBAL_DEFAULT_POLICY.key,
        name: GLOBAL_DEFAULT_POLICY.name,
        description: GLOBAL_DEFAULT_POLICY.description,
        policy_json: GLOBAL_DEFAULT_POLICY as any,
        is_active: true,
      },
      {
        onConflict: "key",
      }
    );
}

/**
 * Get safety policy by key
 */
export async function getSafetyPolicy(key: string): Promise<SafetyPolicyConfig | null> {
  const { data } = await supabaseAdmin
    .from("safety_policies")
    .select("*")
    .eq("key", key)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) return null;

  return data.policy_json as SafetyPolicyConfig;
}

