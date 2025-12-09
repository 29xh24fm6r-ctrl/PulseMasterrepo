// ============================================================================
// PULSE A.C.D. — Type Definitions
// ============================================================================

export type WorkStyle = "FOCUS_MINIMAL" | "HYBRID" | "GAMIFIED_HUD";
export type DifficultyMode = "EASY" | "NORMAL" | "HARD" | "DYNAMIC";
export type WidgetCategory = "CORE" | "PRODUCTIVITY" | "RELATIONSHIPS" | "INSIGHTS" | "COACHES" | "PHILOSOPHY";
export type PanelKey = "GUIDANCE" | "XP" | "TOOLS";
export type TelemetryEventType = "CLICK" | "OPEN" | "CLOSE" | "DISMISS" | "HIDE" | "FOCUS_MODE_TOGGLE" | "ERROR";
export type EmotionalState = "CALM" | "FOCUSED" | "OVERWHELMED" | "LOW" | "HYPED";
export type VisualNoiseTolerance = "LOW" | "MEDIUM" | "HIGH";
export type PrimaryMode = "SALES" | "MANAGER" | "IC" | "CREATOR" | "OTHER";
export type PreferredTone = "SENSEI" | "COACH" | "CALM_ASSISTANT" | "HYPE";
export type LoadLevel = "HIGH" | "MEDIUM" | "LOW";
export type LayoutDensity = "LOW" | "MEDIUM" | "HIGH";

export interface CognitiveProfile {
  hasAdhdLikeTraits: boolean;
  visualNoiseTolerance: VisualNoiseTolerance;
  prefersSingleNextAction: boolean;
  overwhelmProneTimes: string[];
}

export interface ProfessionalIdentity {
  roleTitle: string;
  primaryMode: PrimaryMode;
  coreRepeatedActions: string[];
  relationshipIntensity: number;
}

export interface MotivationProfile {
  likesGamification: boolean;
  likesCelebrations: boolean;
  preferredTone: PreferredTone;
  pushIntensity: number;
}

export interface UserProfile {
  id: string;
  user_id: string;
  work_style: WorkStyle;
  cognitive_profile: CognitiveProfile;
  professional_identity: ProfessionalIdentity;
  motivation_profile: MotivationProfile;
  difficulty_setting: DifficultyMode;
  interview_completed: boolean;
}

export interface PanelConfig {
  widgets: string[];
}

export interface LayoutJson {
  panels: Record<PanelKey, PanelConfig>;
  density: LayoutDensity;
}

export interface InterviewQuestion {
  id: string;
  category: "COGNITIVE" | "PROFESSIONAL" | "MOTIVATION";
  question: string;
  type: "YES_NO" | "SCALE" | "CHOICE" | "MULTI_CHOICE" | "FREE_TEXT";
  options?: string[];
  scale?: { min: number; max: number };
}

export interface InterviewAnswer {
  questionId: string;
  answer: unknown;
}

export interface GuidanceCard {
  id: string;
  title: string;
  body: string;
  priority: number;
  ctaLabel?: string;
  ctaAction?: string;
  source: "XP" | "TASKS" | "RELATIONSHIPS" | "FORECAST" | "COACHING" | "SYSTEM";
  dismissible: boolean;
}

export interface WidgetUsageStat {
  opens: number;
  avgDurationMs: number;
  clicks?: number;
  dismissals?: number;
}
