// Roleplay Coach Types - Relationship-Aware Conversation Practice

// ============================================
// RELATIONSHIP PROFILE
// ============================================

export type RelationshipType =
  | "spouse"
  | "partner"
  | "ex_partner"
  | "date"
  | "parent"
  | "child"
  | "sibling"
  | "in_law"
  | "friend"
  | "roommate"
  | "boss"
  | "coworker"
  | "direct_report"
  | "client"
  | "prospect"
  | "vendor"
  | "interviewer"
  | "mentor"
  | "mentee"
  | "stranger"
  | "other";

export type ConflictStyle =
  | "avoidant"
  | "aggressive"
  | "passive_aggressive"
  | "collaborative"
  | "accommodating"
  | "competitive";

export type CommunicationTone =
  | "formal"
  | "casual"
  | "playful"
  | "serious"
  | "blunt"
  | "diplomatic";

export type EmotionalIntensity = 1 | 2 | 3 | 4 | 5;
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export interface RelationshipProfile {
  id: string;
  name: string;
  relationship_type: RelationshipType;

  // High-level summary
  summary: string;

  // Core motivations / fears
  core_motives: string[];
  core_fears: string[];

  // Communication style
  communication_style: {
    tone: CommunicationTone;
    directness: 1 | 2 | 3 | 4 | 5;
    emotional_intensity: EmotionalIntensity;
    conflict_style: ConflictStyle;
    likes_detail: boolean;
    prefers_facts_over_feelings: boolean;
    prefers_feelings_over_facts: boolean;
  };

  // Triggers & green lights
  triggers: string[];
  green_lights: string[];

  // Known patterns & history
  patterns: {
    recurring_conflicts: string[];
    successful_repair_moves: string[];
    escalation_patterns: string[];
  };

  // Voice & phrasing
  common_phrases: string[];
  swears_or_not: boolean;
  uses_humor: boolean;
  uses_emojis_or_text_slang: boolean;

  // Relationship status
  trust_level: 1 | 2 | 3 | 4 | 5;
  current_tension: 1 | 2 | 3 | 4 | 5;

  // Meta
  last_updated: string;
}

// ============================================
// SESSION CONFIG
// ============================================

export type ContextType =
  | "business"
  | "sales"
  | "leadership"
  | "interview"
  | "networking"
  | "dating"
  | "romantic"
  | "family"
  | "friends"
  | "personal_conflict"
  | "social_skills_practice"
  | "other";

export interface UserProfile {
  social_confidence: 1 | 2 | 3 | 4 | 5;
  anxiety_level: 1 | 2 | 3 | 4 | 5;
  prefers_short_turns: boolean;
  wants_soft_training: boolean;
}

export interface RoleplaySessionConfig {
  session_id: string;
  scenario_description: string;
  user_goal: string;
  difficulty: DifficultyLevel;
  relationship_profile?: RelationshipProfile;
  context_type: ContextType;
  user_profile?: UserProfile;
}

// ============================================
// SESSION STATE
// ============================================

export type RoleplayState = "SETUP" | "ROLEPLAY" | "COACH";

export interface InternalState {
  trust: number; // 0-100
  frustration: number; // 0-100
  openness: number; // 0-100
  engagement: number; // 0-100
}

export interface RoleplaySession {
  config: RoleplaySessionConfig;
  state: RoleplayState;
  internal_state: InternalState;
  messages: RoleplayMessage[];
  started_at: string;
  ended_at?: string;
}

export interface RoleplayMessage {
  role: "user" | "character" | "coach" | "system";
  content: string;
  timestamp: string;
  internal_state_snapshot?: InternalState;
}

// ============================================
// SESSION SUMMARY (OUTPUT)
// ============================================

export type SessionOutcome =
  | "improved"
  | "won"
  | "lost"
  | "neutral"
  | "open_ended";

export interface SessionScores {
  rapport_empathy: number; // 1-10
  clarity_of_goal: number; // 1-10
  listening_and_questions: number; // 1-10
  emotional_regulation: number; // 1-10
  handling_objections_conflict: number; // 1-10
  closing_or_next_step: number; // 1-10
}

export interface XPAwards {
  social_confidence_xp?: number;
  sales_xp?: number;
  leadership_xp?: number;
  conflict_navigation_xp?: number;
  dating_relationship_xp?: number;
  family_relationship_xp?: number;
  general_communication_xp?: number;
}

export interface RoleplaySessionSummary {
  session_id: string;
  timestamp: string;

  context_type: ContextType;
  scenario_description: string;
  user_goal: string;

  relationship_used: boolean;
  person_name?: string;
  relationship_type?: RelationshipType;

  outcome: SessionOutcome;
  scores: SessionScores;

  strengths: string[];
  improvement_areas: string[];
  suggested_phrases: string[];
  micro_drills: string[];

  emotional_trajectory: string;
  xp_awards: XPAwards;
  profile_update_notes?: string[];
}

// ============================================
// API REQUEST/RESPONSE
// ============================================

export interface RoleplayRequest {
  action: "start" | "message" | "end" | "get_feedback";
  session_id?: string;
  config?: Partial<RoleplaySessionConfig>;
  message?: string;
}

export interface RoleplayResponse {
  session_id: string;
  state: RoleplayState;
  message: string;
  character_name?: string;
  internal_hint?: string; // For UI to show mood indicators
  summary?: RoleplaySessionSummary;
  suggested_responses?: string[]; // Help for anxious users
}

// ============================================
// PERSONA TEMPLATES
// ============================================

export interface PersonaTemplate {
  name: string;
  description: string;
  default_tone: CommunicationTone;
  default_directness: number;
  default_intensity: EmotionalIntensity;
  default_conflict_style: ConflictStyle;
  common_behaviors: string[];
  typical_objections: string[];
}

export const PERSONA_TEMPLATES: Record<string, PersonaTemplate> = {
  skeptical_prospect: {
    name: "Skeptical Prospect",
    description: "A busy decision-maker who's heard it all before",
    default_tone: "serious",
    default_directness: 4,
    default_intensity: 2,
    default_conflict_style: "competitive",
    common_behaviors: [
      "Asks about price early",
      "Compares to competitors",
      "Questions ROI claims",
      "Has limited time",
    ],
    typical_objections: [
      "We're happy with our current solution",
      "The timing isn't right",
      "I need to discuss with my team",
      "Your price is too high",
    ],
  },
  tired_boss: {
    name: "Overwhelmed Manager",
    description: "A stressed manager dealing with too many priorities",
    default_tone: "serious",
    default_directness: 3,
    default_intensity: 3,
    default_conflict_style: "avoidant",
    common_behaviors: [
      "Distracted by other tasks",
      "Wants brevity",
      "Delegates when possible",
      "Values solutions over problems",
    ],
    typical_objections: [
      "Can this wait?",
      "What's the bottom line?",
      "Handle it yourself if you can",
      "I don't have bandwidth for this",
    ],
  },
  anxious_interviewer: {
    name: "Formal Interviewer",
    description: "A hiring manager following a structured interview process",
    default_tone: "formal",
    default_directness: 3,
    default_intensity: 2,
    default_conflict_style: "collaborative",
    common_behaviors: [
      "Asks behavioral questions",
      "Takes notes",
      "Probes for specifics",
      "Watches for red flags",
    ],
    typical_objections: [
      "Can you give me a specific example?",
      "What would you do differently?",
      "Why are you leaving your current role?",
      "Where do you see yourself in 5 years?",
    ],
  },
  nervous_first_date: {
    name: "First Date",
    description: "Someone genuinely interested but a bit nervous",
    default_tone: "casual",
    default_directness: 2,
    default_intensity: 3,
    default_conflict_style: "accommodating",
    common_behaviors: [
      "Asks getting-to-know-you questions",
      "Shares personal stories",
      "Looks for common interests",
      "May have awkward silences",
    ],
    typical_objections: [],
  },
  upset_spouse: {
    name: "Frustrated Partner",
    description: "A partner who feels unheard or taken for granted",
    default_tone: "serious",
    default_directness: 4,
    default_intensity: 4,
    default_conflict_style: "passive_aggressive",
    common_behaviors: [
      "Brings up past issues",
      "Uses 'you always' or 'you never'",
      "Wants to feel validated",
      "Tests if you're really listening",
    ],
    typical_objections: [
      "You always say that",
      "This isn't the first time",
      "You don't understand",
      "I shouldn't have to explain this",
    ],
  },
  supportive_friend: {
    name: "Supportive Friend",
    description: "A good friend who wants to help you practice",
    default_tone: "casual",
    default_directness: 3,
    default_intensity: 2,
    default_conflict_style: "collaborative",
    common_behaviors: [
      "Encouraging but honest",
      "Asks follow-up questions",
      "Shares own experiences",
      "Validates feelings",
    ],
    typical_objections: [],
  },
  difficult_parent: {
    name: "Traditional Parent",
    description: "A parent with strong opinions about your life choices",
    default_tone: "serious",
    default_directness: 4,
    default_intensity: 4,
    default_conflict_style: "competitive",
    common_behaviors: [
      "Offers unsolicited advice",
      "Compares to siblings or others",
      "References their own sacrifices",
      "Has trouble accepting boundaries",
    ],
    typical_objections: [
      "I'm only saying this because I love you",
      "When I was your age...",
      "You'll understand when you're older",
      "Is that really what you want?",
    ],
  },
  stranger_small_talk: {
    name: "Friendly Stranger",
    description: "Someone open to casual conversation",
    default_tone: "casual",
    default_directness: 2,
    default_intensity: 2,
    default_conflict_style: "accommodating",
    common_behaviors: [
      "Responds to conversation starters",
      "Shares basic info about themselves",
      "Looks for common ground",
      "Polite but not overly engaged initially",
    ],
    typical_objections: [],
  },
};

// ============================================
// CONTEXT-BASED XP MAPPING
// ============================================

export const CONTEXT_XP_MAPPING: Record<ContextType, keyof XPAwards> = {
  business: "general_communication_xp",
  sales: "sales_xp",
  leadership: "leadership_xp",
  interview: "social_confidence_xp",
  networking: "social_confidence_xp",
  dating: "dating_relationship_xp",
  romantic: "dating_relationship_xp",
  family: "family_relationship_xp",
  friends: "general_communication_xp",
  personal_conflict: "conflict_navigation_xp",
  social_skills_practice: "social_confidence_xp",
  other: "general_communication_xp",
};

// ============================================
// SCORE CALCULATION HELPERS
// ============================================

export function calculateBaseXP(scores: SessionScores, difficulty: DifficultyLevel): number {
  const avgScore = Object.values(scores).reduce((a, b) => a + b, 0) / 6;
  const baseXP = Math.round(avgScore * 5); // 5-50 base
  const difficultyMultiplier = 0.5 + (difficulty * 0.25); // 0.75x to 1.75x
  return Math.round(baseXP * difficultyMultiplier);
}

export function getDefaultInternalState(profile?: RelationshipProfile): InternalState {
  if (profile) {
    return {
      trust: profile.trust_level * 20,
      frustration: profile.current_tension * 15,
      openness: 50 - (profile.current_tension * 5),
      engagement: 50,
    };
  }
  return {
    trust: 50,
    frustration: 20,
    openness: 50,
    engagement: 60,
  };
}
